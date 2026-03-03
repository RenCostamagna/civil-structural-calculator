// M2 Calculation Engine - Base Centrada con Momento
// Axial load + bending moment (trapezoidal/triangular pressure)

import { CONCRETE_GRADES, STEEL_GRADES, ELS_COMBINATIONS } from "@/lib/constants/cirsoc"
import type {
  M2Input,
  M2Results,
  DimensioningResult,
  PressureDistribution,
  StabilityCheck,
  PunchingWithMomentResult,
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

// ─── Pressure Distribution ───────────────────────────────────────────
function calculatePressure(
  N: number, // kN
  M: number, // kN·m
  B: number, // m
  L: number // m - direction of moment
): PressureDistribution {
  const A = B * L
  const e = Math.abs(M) / N // eccentricity
  const kernel = L / 6 // kern limit

  const sigmaMax = N / A + (6 * Math.abs(M)) / (B * L * L)
  const sigmaMin = N / A - (6 * Math.abs(M)) / (B * L * L)

  let type: PressureDistribution["type"]
  let contactLength: number | undefined

  if (Math.abs(e) < 0.001) {
    type = "uniform"
  } else if (e <= kernel) {
    type = "trapezoidal"
  } else if (Math.abs(e - kernel) < 0.001) {
    type = "triangular"
    contactLength = L
  } else {
    type = "partial"
    contactLength = 3 * (L / 2 - e)
  }

  return {
    sigmaMax: Math.round(sigmaMax * 100) / 100,
    sigmaMin: Math.round(sigmaMin * 100) / 100,
    type,
    eccentricity: Math.round(e * 10000) / 10000,
    kernelLimit: Math.round(kernel * 10000) / 10000,
    contactLength,
  }
}

// ─── Stability Checks ────────────────────────────────────────────────
function checkOverturning(
  N: number, // kN - service axial
  M: number, // kN·m - service moment
  B: number, // m
  L: number, // m - direction of moment
  Df: number // m - foundation depth
): StabilityCheck {
  const resistingMoment = N * (L / 2) // kN·m
  const drivingMoment = Math.abs(M) // kN·m
  const FS = drivingMoment > 0 ? resistingMoment / drivingMoment : 999

  return {
    type: "overturning",
    FS: Math.round(FS * 100) / 100,
    FSmin: 2.0,
    pass: FS >= 2.0,
    drivingForce: Math.round(drivingMoment * 100) / 100,
    resistingForce: Math.round(resistingMoment * 100) / 100,
    reference: "CIRSOC 201-05 / Práctica habitual FS ≥ 2.0",
  }
}

function checkSliding(
  N: number, // kN - service axial
  V: number, // kN - service lateral force
  mu: number = 0.4 // friction coefficient
): StabilityCheck {
  const resistingForce = mu * N // kN
  const drivingForce = Math.abs(V) // kN
  const FS = drivingForce > 0 ? resistingForce / drivingForce : 999

  return {
    type: "sliding",
    FS: Math.round(FS * 100) / 100,
    FSmin: 1.5,
    pass: FS >= 1.5,
    drivingForce: Math.round(drivingForce * 100) / 100,
    resistingForce: Math.round(resistingForce * 100) / 100,
    reference: "CIRSOC 201-05 / Práctica habitual FS ≥ 1.5",
  }
}

// ─── Punching with Moment Transfer (CIRSOC 11.12.6) ─────────────────
function checkPunchingWithMoment(
  Nu: number, // kN
  Mu: number, // kN·m
  sigma_u: number, // kN/m²
  B: number,
  L: number,
  colX: number,
  colY: number,
  d: number,
  fck: number
): PunchingWithMomentResult {
  const base = checkPunching(Nu, sigma_u, B, L, colX, colY, d, fck)

  // gamma_v per CIRSOC 11.12.6.1
  const b1 = colX + d // m - dimension parallel to moment
  const b2 = colY + d // m - dimension perpendicular
  const gamma_v = 1 - 1 / (1 + (2 / 3) * Math.sqrt(b1 / b2))

  // Jc - polar moment of critical section (simplified for rectangle)
  const b1_cm = b1 * 100
  const b2_cm = b2 * 100
  const d_cm = d * 100
  const Jc =
    (d_cm * b1_cm ** 3) / 6 +
    (b1_cm * d_cm ** 3) / 6 +
    (d_cm * b2_cm * b1_cm ** 2) / 2 // cm⁴

  // Maximum shear stress
  const Vu_N = base.Vu * 1000 // N
  const Mu_Nmm = Math.abs(Mu) * 1e6 // N·mm
  const bo_mm = base.bo * 1000

  const vu_avg = Vu_N / (bo_mm * d * 1000) // MPa
  const vu_moment = (gamma_v * Mu_Nmm * (b1 * 500)) / (Jc * 100) // MPa (approx)
  const vu_max = vu_avg + vu_moment

  return {
    ...base,
    gamma_v: Math.round(gamma_v * 10000) / 10000,
    Jc: Math.round(Jc * 100) / 100,
    vu_max: Math.round(vu_max * 1000) / 1000,
    reference: "CIRSOC 201-05 11.12.6 (transferencia de momento por corte)",
  }
}

// ─── Main M2 Calculation ─────────────────────────────────────────────
export function calculateM2(input: M2Input): M2Results {
  const concrete = CONCRETE_GRADES[input.materials.concreteGrade]
  const steel = STEEL_GRADES[input.materials.steelGrade]
  const fck = concrete.fck
  const fy = steel.fy

  const colX = input.column.width / 100
  const colY = input.column.depth / 100
  const N = input.loads.N
  const M = input.loads.Mx || 0

  // ─── Dimensioning ────────────────────────────────────────────
  const H_est = input.footingHeight || 0.5
  const sigmaNet = calculateNetAdmissible(
    input.soil.sigmaAdm,
    input.soil.Df,
    input.soil.gamma_s,
    24,
    H_est
  )

  // For moment, increase area by ~30% initially
  const e = Math.abs(M) / N
  const factorMoment = 1 + 6 * e / 2 // approximate increase
  const { B: B_calc, L: L_calc } = dimensionFooting(
    N * Math.max(factorMoment, 1.3),
    sigmaNet,
    colX,
    colY
  )

  const B = input.footingWidth || B_calc
  const L = input.footingDepth || Math.max(L_calc, B_calc * 1.2) // slightly longer in moment dir
  const H = input.footingHeight || estimateHeight(B, L, colX, colY)

  const cover = input.materials.cover / 1000
  const d = H - cover - 0.01

  const sigmaSol = N / (B * L)

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

  // ─── ELS Pressure Distribution ────────────────────────────────
  const pressureELS = calculatePressure(N, M, B, L)

  // Find governing ELS combination
  let elsGov = "S1"
  let maxSigma = 0
  for (const combo of ELS_COMBINATIONS) {
    const Nels =
      (combo.factors.D || 0) * (input.loadComponents.D || 0) +
      (combo.factors.L || 0) * (input.loadComponents.L || 0)
    const Mels =
      (combo.factors.D || 0) * (input.loadComponents.MD || 0) +
      (combo.factors.L || 0) * (input.loadComponents.ML || 0) +
      (combo.factors.W || 0) * (input.loadComponents.MW || 0) +
      (combo.factors.E || 0) * (input.loadComponents.ME || 0)

    const press = calculatePressure(Nels || 1, Mels, B, L)
    if (press.sigmaMax > maxSigma) {
      maxSigma = press.sigmaMax
      elsGov = combo.id
    }
  }

  // ─── Stability Checks ────────────────────────────────────────
  const V_service = input.loads.Vx || (M > 0 ? M / (input.soil.Df || 1) * 0.3 : 0)
  const overturning = checkOverturning(N, M, B, L, input.soil.Df)
  const sliding = checkSliding(N, V_service)

  // ─── ELU Combinations ────────────────────────────────────────
  const eluLoads = calculateELULoads(input.loadComponents)
  const govELU = getGoverningELU(eluLoads)
  const Nu = govELU.Nu
  const Mxu = govELU.Mxu || 0
  const sigma_u = Nu / (B * L)

  // ─── Shear Checks ────────────────────────────────────────────
  // For M2 with moment, use maximum pressure side
  const sigma_u_max = Nu / (B * L) + (6 * Math.abs(Mxu)) / (B * L * L)
  const shearX = checkShear(Nu, sigma_u_max, B, L, colY, d, fck, "X")
  const shearY = checkShear(Nu, sigma_u, L, B, colX, d, fck, "Y")

  // ─── Punching with Moment ────────────────────────────────────
  const beta_c = Math.max(colX, colY) / Math.min(colX, colY)
  const punching = checkPunchingWithMoment(
    Nu, Mxu, sigma_u, B, L, colX, colY, d, fck
  )

  // ─── Flexure ─────────────────────────────────────────────────
  // Bottom reinforcement (tension from pressure)
  const MuX = calculateFootingMoment(sigma_u_max, B, L, colY)
  const MuY = calculateFootingMoment(sigma_u, L, B, colX)

  const flexureX = calculateFlexure(MuX, B, d, fck, fy, "X")
  const flexureY = calculateFlexure(MuY, L, d, fck, fy, "Y")

  // Top reinforcement if minimum pressure is negative (uplift)
  let flexureSuperior: M2Results["flexureSuperior"]
  if (pressureELS.sigmaMin < 0) {
    const MuTop = Math.abs(pressureELS.sigmaMin) * B * ((L - colY) / 2) ** 2 / 2
    if (MuTop > 0) {
      flexureSuperior = calculateFlexure(MuTop, B, d, fck, fy, "X-sup")
    }
  }

  return {
    dimensioning,
    pressureELS,
    stability: [overturning, sliding],
    shearX,
    shearY,
    punching,
    flexureX,
    flexureY,
    flexureSuperior,
    ultimateLoads: eluLoads,
    governingCombination: govELU.combination,
    elsCombiGov: elsGov,
  }
}
