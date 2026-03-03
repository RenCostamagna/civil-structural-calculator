// M1 Calculation Engine - Base Centrada (Centered Footing)
// Pure axial load, no moment

import { CONCRETE_GRADES, STEEL_GRADES } from "@/lib/constants/cirsoc"
import type {
  M1Input,
  M1Results,
  DimensioningResult,
} from "@/lib/types/foundation"
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
} from "./shared"

export function calculateM1(input: M1Input): M1Results {
  const concrete = CONCRETE_GRADES[input.materials.concreteGrade]
  const steel = STEEL_GRADES[input.materials.steelGrade]
  const fck = concrete.fck
  const fy = steel.fy

  const colX = input.column.width / 100 // m
  const colY = input.column.depth / 100 // m
  const N = input.loads.N // kN service

  // ─── Step 1: Dimensioning ────────────────────────────────────
  const H_est = input.footingHeight || estimateHeight(1.5, 1.5, colX, colY)
  const sigmaNet = calculateNetAdmissible(
    input.soil.sigmaAdm,
    input.soil.Df,
    input.soil.gamma_s,
    24,
    H_est
  )

  const { B: B_calc, L: L_calc, Af } = dimensionFooting(
    N,
    sigmaNet,
    colX,
    colY
  )

  const B = input.footingWidth || B_calc
  const L = input.footingDepth || L_calc
  const H = input.footingHeight || estimateHeight(B, L, colX, colY)

  const cover = input.materials.cover / 1000 // m
  const d = H - cover - 0.01 // m (effective depth, assume ø20 = 10mm radius)

  const sigmaSol = N / (B * L) // kN/m² actual service pressure

  const dimensioning: DimensioningResult = {
    B,
    L,
    H,
    d: Math.round(d * 1000) / 1000,
    Af: B * L,
    sigmaNet: Math.round(sigmaNet * 100) / 100,
    sigmaSol: Math.round(sigmaSol * 100) / 100,
    ratio: Math.round((sigmaSol / sigmaNet) * 1000) / 1000,
  }

  // ─── Step 2: ELU Combinations ────────────────────────────────
  const loadComponents = input.loadComponents || { D: N * 0.6, L: N * 0.4 }
  const eluLoads = calculateELULoads(loadComponents)
  const govELU = getGoverningELU(eluLoads)
  const Nu = govELU.Nu
  const sigma_u = Nu / (B * L) // kN/m² factored pressure

  // ─── Step 3: Shear Checks ───────────────────────────────────
  const shearX = checkShear(Nu, sigma_u, B, L, colY, d, fck, "X")
  const shearY = checkShear(Nu, sigma_u, L, B, colX, d, fck, "Y")

  // ─── Step 4: Punching Check ──────────────────────────────────
  const beta_c = Math.max(colX, colY) / Math.min(colX, colY)
  const punching = checkPunching(Nu, sigma_u, B, L, colX, colY, d, fck, beta_c)

  // ─── Step 5: Flexure ─────────────────────────────────────────
  const MuX = calculateFootingMoment(sigma_u, B, L, colY)
  const MuY = calculateFootingMoment(sigma_u, L, B, colX)

  const flexureX = calculateFlexure(MuX, B, d, fck, fy, "X")
  const flexureY = calculateFlexure(MuY, L, d, fck, fy, "Y")

  return {
    dimensioning,
    shearX,
    shearY,
    punching,
    flexureX,
    flexureY,
    ultimateLoads: eluLoads,
    governingCombination: govELU.combination,
  }
}
