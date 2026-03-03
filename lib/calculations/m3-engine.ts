// M3 Calculation Engine - Base Rectangular con Viga Central
// Eccentric footing with central strip beam acting as cantilever

import { CONCRETE_GRADES, STEEL_GRADES } from "@/lib/constants/cirsoc"
import type { M1Results, DimensioningResult, LoadComponents } from "@/lib/types/foundation"
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

export interface M3Input {
  projectName: string
  column: { width: number; depth: number; shape: "rectangular" | "circular" }
  loads: { N: number; Mx?: number; Vx?: number }
  loadComponents?: LoadComponents
  soil: { sigmaAdm: number; gamma_s: number; Df: number }
  materials: { concreteGrade: string; steelGrade: string; cover: number }
  beamWidth: number // cm
  beamHeight: number // cm
  cantileverLength: number // m - voladizo from column face to edge
  footingWidth?: number
  footingDepth?: number
  footingHeight?: number
}

export interface M3Results extends M1Results {
  beam: {
    Mu_beam: number // kN.m - moment at column face (beam acts as cantilever)
    Vu_beam: number // kN - shear in beam
    AsPrincipal: number // cm2 - main beam reinforcement
    AsRep: number // cm2 - skin reinforcement = 0.20 * AsPrincipal
    bars: { count: number; diameter: number; spacing: number; totalArea: number }
    barsRep: { count: number; diameter: number; spacing: number; totalArea: number }
  }
}

export function calculateM3(input: M3Input): M3Results {
  const concrete = CONCRETE_GRADES[input.materials.concreteGrade]
  const steel = STEEL_GRADES[input.materials.steelGrade]
  const fck = concrete.fck
  const fy = steel.fy

  const colX = input.column.width / 100
  const colY = input.column.depth / 100
  const N = input.loads.N

  // Dimensioning of the base plate
  const H_est = input.footingHeight || estimateHeight(1.5, 1.5, colX, colY)
  const sigmaNet = calculateNetAdmissible(input.soil.sigmaAdm, input.soil.Df, input.soil.gamma_s, 24, H_est)
  const { B: B_calc, L: L_calc } = dimensionFooting(N, sigmaNet, colX, colY)

  const B = input.footingWidth || B_calc
  const L = input.footingDepth || L_calc
  const H = input.footingHeight || estimateHeight(B, L, colX, colY)

  const cover = input.materials.cover / 1000
  const d = H - cover - 0.01

  const sigmaSol = N / (B * L)

  const dimensioning: DimensioningResult = {
    B, L, H,
    d: Math.round(d * 1000) / 1000,
    Af: B * L,
    sigmaNet: Math.round(sigmaNet * 100) / 100,
    sigmaSol: Math.round(sigmaSol * 100) / 100,
    ratio: Math.round((sigmaSol / sigmaNet) * 1000) / 1000,
  }

  // ELU
  const loadComponents = input.loadComponents || { D: N * 0.6, L: N * 0.4 }
  const eluLoads = calculateELULoads(loadComponents)
  const govELU = getGoverningELU(eluLoads)
  const Nu = govELU.Nu
  const sigma_u = Nu / (B * L)

  // Standard checks (same as M1 for the base slab)
  const shearX = checkShear(Nu, sigma_u, B, L, colY, d, fck, "X")
  const shearY = checkShear(Nu, sigma_u, L, B, colX, d, fck, "Y")
  const beta_c = Math.max(colX, colY) / Math.min(colX, colY)
  const punching = checkPunching(Nu, sigma_u, B, L, colX, colY, d, fck, beta_c)

  const MuX = calculateFootingMoment(sigma_u, B, L, colY)
  const MuY = calculateFootingMoment(sigma_u, L, B, colX)
  const flexureX = calculateFlexure(MuX, B, d, fck, fy, "X")
  const flexureY = calculateFlexure(MuY, L, d, fck, fy, "Y")

  // Beam calculation (cantilever from column face)
  const bw = input.beamWidth / 100 // m
  const hb = input.beamHeight / 100 // m
  const db = hb - cover - 0.01
  const Lv = input.cantileverLength // m

  // Pressure on strip under beam
  const qBeam = sigma_u * bw // kN/m (distributed load)
  const Vu_beam = qBeam * Lv
  const Mu_beam = qBeam * Lv * Lv / 2

  // Beam reinforcement
  const beamFlexure = calculateFlexure(Mu_beam, bw, db, fck, fy, "Viga")
  const AsPrincipal = beamFlexure.AsDesign

  // Skin reinforcement: As_rep = 0.20 * As_principal (per spec)
  const AsRep = 0.20 * AsPrincipal
  const barsRep = selectRebar(AsRep, hb * 100)

  return {
    dimensioning,
    shearX,
    shearY,
    punching,
    flexureX,
    flexureY,
    ultimateLoads: eluLoads,
    governingCombination: govELU.combination,
    beam: {
      Mu_beam: Math.round(Mu_beam * 100) / 100,
      Vu_beam: Math.round(Vu_beam * 100) / 100,
      AsPrincipal: Math.round(AsPrincipal * 100) / 100,
      AsRep: Math.round(AsRep * 100) / 100,
      bars: beamFlexure.bars,
      barsRep: {
        count: barsRep.count,
        diameter: barsRep.diameter,
        spacing: barsRep.spacing,
        totalArea: barsRep.totalArea,
      },
    },
  }
}
