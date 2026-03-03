// M5 Calculation Engine - Base Excentrica con Viga de Equilibrio
// Two columns: C1 (medianera/edge) + C2 (interior), connected by balance beam

import { CONCRETE_GRADES, STEEL_GRADES, PHI_FACTORS } from "@/lib/constants/cirsoc"
import type { LoadComponents, DimensioningResult, ShearCheckResult, FlexureResult } from "@/lib/types/foundation"
import {
  calculateNetAdmissible,
  dimensionFooting,
  estimateHeight,
  calculateELULoads,
  getGoverningELU,
  checkShear,
  calculateFlexure,
  calculateFootingMoment,
  selectRebar,
} from "./shared"

export interface M5Input {
  projectName: string
  columnMedianera: { width: number; depth: number; shape: "rectangular" | "circular" }
  columnInterior: { width: number; depth: number; shape: "rectangular" | "circular" }
  loadsMedianera: { N: number; Mx?: number }
  loadsInterior: { N: number }
  loadComponents?: LoadComponents
  soil: { sigmaAdm: number; gamma_s: number; Df: number }
  materials: { concreteGrade: string; steelGrade: string; cover: number }
  distanceBetweenColumns: number // m center to center
  edgeDistance: number // m from C1 center to property edge
  beamWidth?: number // cm override
  beamHeight?: number // cm override
}

export interface BeamDesign {
  Mmax: number // kN.m - max moment in beam
  Mmin: number // kN.m - min moment (hogging)
  Vmax: number // kN - max shear
  AsPositive: number // cm2
  AsNegative: number // cm2
  barsPos: { count: number; diameter: number; spacing: number; totalArea: number }
  barsNeg: { count: number; diameter: number; spacing: number; totalArea: number }
  bw: number // cm
  h: number // cm
}

export interface M5Results {
  footing1: {
    dimensioning: DimensioningResult
    shearX: ShearCheckResult
    shearY: ShearCheckResult
    flexureX: FlexureResult
    flexureY: FlexureResult
    R1: number // kN - reaction at footing 1
  }
  footing2: {
    dimensioning: DimensioningResult
    shearX: ShearCheckResult
    shearY: ShearCheckResult
    flexureX: FlexureResult
    flexureY: FlexureResult
    R2: number // kN - reaction at footing 2
  }
  beam: BeamDesign
  governingCombination: string
}

export function calculateM5(input: M5Input): M5Results {
  const concrete = CONCRETE_GRADES[input.materials.concreteGrade]
  const steel = STEEL_GRADES[input.materials.steelGrade]
  const fck = concrete.fck
  const fy = steel.fy

  const colX1 = input.columnMedianera.width / 100
  const colY1 = input.columnMedianera.depth / 100
  const colX2 = input.columnInterior.width / 100
  const colY2 = input.columnInterior.depth / 100

  const N1 = input.loadsMedianera.N
  const N2 = input.loadsInterior.N
  const Lc = input.distanceBetweenColumns
  const e = input.edgeDistance

  const cover = input.materials.cover / 1000

  // Equilibrium: find footing reactions so that resultant falls within footing
  // C1 is at edge: eccentricity e from footing center
  // Take moments about C2: R1 * Lc = N1 * Lc + N1 * e (moment from eccentricity)
  // Simplified: R1 = N1 * (1 + e/Lc) and R2 = N2 + N1*e/Lc (balance beam transfers)
  const R1 = N1 * (1 + e / Lc)
  const R2 = N1 + N2 - R1

  const sigmaNet = calculateNetAdmissible(input.soil.sigmaAdm, input.soil.Df, input.soil.gamma_s)

  // Footing 1 (edge)
  const dim1 = dimensionFooting(R1, sigmaNet, colX1, colY1)
  const B1 = dim1.B
  const L1 = dim1.L
  const H1 = estimateHeight(B1, L1, colX1, colY1)
  const d1 = H1 - cover - 0.01

  // Footing 2 (interior)
  const dim2 = dimensionFooting(Math.max(R2, 1), sigmaNet, colX2, colY2)
  const B2 = dim2.B
  const L2 = dim2.L
  const H2 = estimateHeight(B2, L2, colX2, colY2)
  const d2 = H2 - cover - 0.01

  // ELU
  const loadComponents = input.loadComponents || { D: (N1 + N2) * 0.6, L: (N1 + N2) * 0.4 }
  const eluLoads = calculateELULoads(loadComponents)
  const govELU = getGoverningELU(eluLoads)
  const factor = govELU.Nu / (N1 + N2) || 1.4

  const Ru1 = R1 * factor
  const Ru2 = R2 * factor
  const sigma_u1 = Ru1 / (B1 * L1)
  const sigma_u2 = Math.max(Ru2, 1) / (B2 * L2)

  // Footing checks
  const shearX1 = checkShear(Ru1, sigma_u1, B1, L1, colY1, d1, fck, "X")
  const shearY1 = checkShear(Ru1, sigma_u1, L1, B1, colX1, d1, fck, "Y")
  const MuX1 = calculateFootingMoment(sigma_u1, B1, L1, colY1)
  const MuY1 = calculateFootingMoment(sigma_u1, L1, B1, colX1)
  const flexureX1 = calculateFlexure(MuX1, B1, d1, fck, fy, "X")
  const flexureY1 = calculateFlexure(MuY1, L1, d1, fck, fy, "Y")

  const shearX2 = checkShear(Ru2, sigma_u2, B2, L2, colY2, d2, fck, "X")
  const shearY2 = checkShear(Ru2, sigma_u2, L2, B2, colX2, d2, fck, "Y")
  const MuX2 = calculateFootingMoment(sigma_u2, B2, L2, colY2)
  const MuY2 = calculateFootingMoment(sigma_u2, L2, B2, colX2)
  const flexureX2 = calculateFlexure(MuX2, B2, d2, fck, fy, "X")
  const flexureY2 = calculateFlexure(MuY2, L2, d2, fck, fy, "Y")

  // Balance Beam Design
  const bw = (input.beamWidth || 40) / 100 // m
  const hb = (input.beamHeight || Math.max(Lc / 6, 0.6) * 100) / 100 // m
  const db = hb - cover - 0.01

  // Beam moment: simple span with reactions at footings
  // Max moment near C1 (hogging) and between columns
  const w_beam = 0 // self-weight ignored for simplicity (conservative)
  const Mmax = Ru1 * (Lc * 0.4) // approximate positive moment
  const Mmin = Ru1 * e // hogging moment at C1 face

  const Vmax = Math.max(Ru1, Math.abs(Ru2))

  const beamFlexPos = calculateFlexure(Mmax, bw, db, fck, fy, "Viga+")
  const beamFlexNeg = calculateFlexure(Math.abs(Mmin), bw, db, fck, fy, "Viga-")

  return {
    footing1: {
      dimensioning: {
        B: B1, L: L1, H: H1, d: Math.round(d1 * 1000) / 1000,
        Af: B1 * L1, sigmaNet: Math.round(sigmaNet * 100) / 100,
        sigmaSol: Math.round((R1 / (B1 * L1)) * 100) / 100,
        ratio: Math.round((R1 / (B1 * L1 * sigmaNet)) * 1000) / 1000,
      },
      shearX: shearX1, shearY: shearY1, flexureX: flexureX1, flexureY: flexureY1,
      R1: Math.round(R1 * 100) / 100,
    },
    footing2: {
      dimensioning: {
        B: B2, L: L2, H: H2, d: Math.round(d2 * 1000) / 1000,
        Af: B2 * L2, sigmaNet: Math.round(sigmaNet * 100) / 100,
        sigmaSol: Math.round((Math.max(R2, 1) / (B2 * L2)) * 100) / 100,
        ratio: Math.round((Math.max(R2, 1) / (B2 * L2 * sigmaNet)) * 1000) / 1000,
      },
      shearX: shearX2, shearY: shearY2, flexureX: flexureX2, flexureY: flexureY2,
      R2: Math.round(R2 * 100) / 100,
    },
    beam: {
      Mmax: Math.round(Mmax * 100) / 100,
      Mmin: Math.round(Mmin * 100) / 100,
      Vmax: Math.round(Vmax * 100) / 100,
      AsPositive: beamFlexPos.AsDesign,
      AsNegative: beamFlexNeg.AsDesign,
      barsPos: beamFlexPos.bars,
      barsNeg: beamFlexNeg.bars,
      bw: Math.round(bw * 100),
      h: Math.round(hb * 100),
    },
    governingCombination: govELU.combination,
  }
}
