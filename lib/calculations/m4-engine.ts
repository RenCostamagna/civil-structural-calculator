// M4 Calculation Engine - Base Excentrica con Tensor
// Eccentric footing with tie beam, short bracket (mensula), shear-friction

import { CONCRETE_GRADES, STEEL_GRADES, PHI_FACTORS } from "@/lib/constants/cirsoc"
import type { LoadComponents, DimensioningResult, ShearCheckResult, FlexureResult } from "@/lib/types/foundation"
import {
  calculateNetAdmissible,
  dimensionFooting,
  estimateHeight,
  calculateELULoads,
  getGoverningELU,
  checkShear,
  checkPunching,
  calculateFlexure,
  calculateFootingMoment,
  selectRebar,
} from "./shared"

export interface M4Input {
  projectName: string
  column: { width: number; depth: number; shape: "rectangular" | "circular" }
  columnInterior: { width: number; depth: number; shape: "rectangular" | "circular" }
  loads: { N: number; Mx?: number }
  loadsInterior: { N: number }
  loadComponents?: LoadComponents
  soil: { sigmaAdm: number; gamma_s: number; Df: number }
  materials: { concreteGrade: string; steelGrade: string; cover: number }
  distanceBetweenColumns: number // m
  edgeDistance: number // m - from column edge to property line
  footingWidth?: number
  footingDepth?: number
  footingHeight?: number
}

export interface ShearFrictionResult {
  Vuf: number // kN - factored shear at interface
  Avf: number // cm2 - friction reinforcement
  mu_f: number // friction coefficient (1.4 monolithic, 1.0 rough, 0.6 smooth)
  pass: boolean
  reference: string
}

export interface MensulaResult {
  Vu_mensula: number // kN
  Mu_mensula: number // kN.m
  Nuc: number // kN - horizontal tension
  As_flex: number // cm2 - flexure steel
  As_shear: number // cm2 - shear steel
  Ah: number // cm2 - horizontal stirrups >= 0.5*(As_flex - As_shear)
  aOverD: number // a/d ratio (must be <= 1.0 for mensula)
  pass: boolean
  reference: string
}

export interface M4Results {
  footing1: {
    dimensioning: DimensioningResult
    shearX: ShearCheckResult
    shearY: ShearCheckResult
    flexureX: FlexureResult
    flexureY: FlexureResult
  }
  footing2: {
    dimensioning: DimensioningResult
    shearX: ShearCheckResult
    shearY: ShearCheckResult
    flexureX: FlexureResult
    flexureY: FlexureResult
  }
  tensor: {
    tensionForce: number // kN
    AsRequired: number // cm2
    bars: { count: number; diameter: number; spacing: number; totalArea: number }
  }
  mensula: MensulaResult
  shearFriction: ShearFrictionResult
  slenderness: { lambda: number; isSlender: boolean; limit: number }
  governingCombination: string
}

export function calculateM4(input: M4Input): M4Results {
  const concrete = CONCRETE_GRADES[input.materials.concreteGrade]
  const steel = STEEL_GRADES[input.materials.steelGrade]
  const fck = concrete.fck
  const fy = steel.fy

  const colX1 = input.column.width / 100
  const colY1 = input.column.depth / 100
  const colX2 = input.columnInterior.width / 100
  const colY2 = input.columnInterior.depth / 100

  const N1 = input.loads.N
  const N2 = input.loadsInterior.N
  const Lc = input.distanceBetweenColumns
  const e = input.edgeDistance

  const cover = input.materials.cover / 1000

  // Eccentricity: reaction shifts towards the edge
  // Tensor force to balance the moment from eccentricity
  const ecc = colX1 / 2 + e // eccentricity of N1 from footing center
  const T_tensor = (N1 * ecc) / Lc // tension in the tie beam

  // Footing 1 (edge column) - increased load from tensor effect
  const R1 = N1 + T_tensor
  const sigmaNet1 = calculateNetAdmissible(input.soil.sigmaAdm, input.soil.Df, input.soil.gamma_s)
  const dim1 = dimensionFooting(R1, sigmaNet1, colX1, colY1)
  const B1 = input.footingWidth || dim1.B
  const L1 = input.footingDepth || dim1.L
  const H1 = input.footingHeight || estimateHeight(B1, L1, colX1, colY1)
  const d1 = H1 - cover - 0.01

  // Footing 2 (interior column) - reduced by tensor
  const R2 = N2 - T_tensor
  const dim2 = dimensionFooting(Math.max(R2, N2 * 0.5), sigmaNet1, colX2, colY2)
  const B2 = dim2.B
  const L2 = dim2.L
  const H2 = estimateHeight(B2, L2, colX2, colY2)
  const d2 = H2 - cover - 0.01

  // ELU
  const loadComponents = input.loadComponents || { D: N1 * 0.6, L: N1 * 0.4 }
  const eluLoads = calculateELULoads(loadComponents)
  const govELU = getGoverningELU(eluLoads)
  const factorULS = govELU.Nu / N1

  const Nu1 = R1 * factorULS
  const sigma_u1 = Nu1 / (B1 * L1)
  const Nu2 = Math.max(R2 * factorULS, R2)
  const sigma_u2 = Nu2 / (B2 * L2)

  // Footing 1 checks
  const shearX1 = checkShear(Nu1, sigma_u1, B1, L1, colY1, d1, fck, "X")
  const shearY1 = checkShear(Nu1, sigma_u1, L1, B1, colX1, d1, fck, "Y")
  const MuX1 = calculateFootingMoment(sigma_u1, B1, L1, colY1)
  const MuY1 = calculateFootingMoment(sigma_u1, L1, B1, colX1)
  const flexureX1 = calculateFlexure(MuX1, B1, d1, fck, fy, "X")
  const flexureY1 = calculateFlexure(MuY1, L1, d1, fck, fy, "Y")

  // Footing 2 checks
  const shearX2 = checkShear(Nu2, sigma_u2, B2, L2, colY2, d2, fck, "X")
  const shearY2 = checkShear(Nu2, sigma_u2, L2, B2, colX2, d2, fck, "Y")
  const MuX2 = calculateFootingMoment(sigma_u2, B2, L2, colY2)
  const MuY2 = calculateFootingMoment(sigma_u2, L2, B2, colX2)
  const flexureX2 = calculateFlexure(MuX2, B2, d2, fck, fy, "X")
  const flexureY2 = calculateFlexure(MuY2, L2, d2, fck, fy, "Y")

  // Tensor reinforcement
  const Tu = T_tensor * factorULS
  const phi_t = PHI_FACTORS.traccion
  const AsT = (Tu * 10) / (phi_t * fy) // cm2 (Tu in kN, fy in MPa -> *10 for cm2)
  const tensorBars = selectRebar(AsT, 40)

  // Mensula corta (short bracket) - CIRSOC 201-05 11.9
  const a = e // distance from load to column face
  const d_mensula = Math.min(H1, colY1) - cover - 0.01
  const aOverD = a / d_mensula
  const Vu_mensula = Nu1
  const Nuc = Math.max(Tu * 0.2, 0) // horizontal tension (min 0.2*Vu)
  const Mu_mensula = Vu_mensula * a + Nuc * (H1 - d_mensula)

  const phi_m = PHI_FACTORS.cortante
  const As_flex = (Mu_mensula * 1e6) / (phi_m * fy * d_mensula * 1000) / 100 // cm2
  const As_shear = (Vu_mensula * 1000) / (phi_m * fy * 1.4) // cm2 (mu=1.4 monolithic)
  const Ah = Math.max(0.5 * (As_flex - As_shear), 0)

  // Shear friction - CIRSOC 201-05 11.7
  const mu_f = 1.4 // monolithic concrete
  const Avf = (Vu_mensula * 1000) / (phi_m * fy * mu_f) // mm2 -> cm2
  const AvfMax = 0.2 * fck * colX1 * 1000 * d_mensula * 1000 / 1000 // kN limit

  // Column slenderness
  const Leff = Lc * 0.7 // effective length (fixed-fixed assumed)
  const r = colX1 * 1000 / Math.sqrt(12) // radius of gyration (mm)
  const lambda = (Leff * 1000) / r
  const lambdaLimit = 22 // short column limit

  return {
    footing1: {
      dimensioning: {
        B: B1, L: L1, H: H1, d: Math.round(d1 * 1000) / 1000,
        Af: B1 * L1, sigmaNet: Math.round(sigmaNet1 * 100) / 100,
        sigmaSol: Math.round((R1 / (B1 * L1)) * 100) / 100,
        ratio: Math.round((R1 / (B1 * L1 * sigmaNet1)) * 1000) / 1000,
      },
      shearX: shearX1, shearY: shearY1, flexureX: flexureX1, flexureY: flexureY1,
    },
    footing2: {
      dimensioning: {
        B: B2, L: L2, H: H2, d: Math.round(d2 * 1000) / 1000,
        Af: B2 * L2, sigmaNet: Math.round(sigmaNet1 * 100) / 100,
        sigmaSol: Math.round((R2 / (B2 * L2)) * 100) / 100,
        ratio: Math.round((R2 / (B2 * L2 * sigmaNet1)) * 1000) / 1000,
      },
      shearX: shearX2, shearY: shearY2, flexureX: flexureX2, flexureY: flexureY2,
    },
    tensor: {
      tensionForce: Math.round(Tu * 100) / 100,
      AsRequired: Math.round(AsT * 100) / 100,
      bars: tensorBars,
    },
    mensula: {
      Vu_mensula: Math.round(Vu_mensula * 100) / 100,
      Mu_mensula: Math.round(Mu_mensula * 100) / 100,
      Nuc: Math.round(Nuc * 100) / 100,
      As_flex: Math.round(As_flex * 100) / 100,
      As_shear: Math.round(As_shear * 100) / 100,
      Ah: Math.round(Ah * 100) / 100,
      aOverD: Math.round(aOverD * 1000) / 1000,
      pass: aOverD <= 1.0,
      reference: "CIRSOC 201-05 11.9 (Mensula corta)",
    },
    shearFriction: {
      Vuf: Math.round(Vu_mensula * 100) / 100,
      Avf: Math.round(Avf * 100) / 100,
      mu_f,
      pass: Vu_mensula <= AvfMax,
      reference: "CIRSOC 201-05 11.7 (Corte por friccion)",
    },
    slenderness: {
      lambda: Math.round(lambda * 10) / 10,
      isSlender: lambda > lambdaLimit,
      limit: lambdaLimit,
    },
    governingCombination: govELU.combination,
  }
}
