// Shared Calculation Utilities
// Pure functions used across all foundation modules

import {
  CONCRETE_GRADES,
  STEEL_GRADES,
  PHI_FACTORS,
  FLEXURE_TABLE,
  REBAR_TABLE,
  ELU_COMBINATIONS,
  getMinReinforcementRatio,
  type LoadCombination,
} from "@/lib/constants/cirsoc"
import type {
  LoadComponents,
  LoadsUltimate,
  FlexureResult,
  ShearCheckResult,
  PunchingCheckResult,
} from "@/lib/types/foundation"

// ─── Interpolation on Dimensionless Table ────────────────────────────
export function interpolateFlexure(mu: number): { omega: number; xi: number } {
  const table = FLEXURE_TABLE
  if (mu <= table[0].mu) return { omega: table[0].omega, xi: table[0].xi }
  if (mu >= table[table.length - 1].mu)
    return { omega: table[table.length - 1].omega, xi: table[table.length - 1].xi }

  for (let i = 0; i < table.length - 1; i++) {
    if (mu >= table[i].mu && mu <= table[i + 1].mu) {
      const t = (mu - table[i].mu) / (table[i + 1].mu - table[i].mu)
      return {
        omega: table[i].omega + t * (table[i + 1].omega - table[i].omega),
        xi: table[i].xi + t * (table[i + 1].xi - table[i].xi),
      }
    }
  }
  return { omega: 0, xi: 0 }
}

// ─── Select Commercial Rebar ─────────────────────────────────────────
export function selectRebar(
  asRequired: number, // cm²
  bAvailable: number, // cm - width available for bars
  minSpacing: number = 10, // cm - minimum spacing
  maxSpacing: number = 30 // cm - maximum spacing
): {
  count: number
  diameter: number
  spacing: number
  totalArea: number
  designation: string
} {
  const candidates: Array<{
    count: number
    diameter: number
    spacing: number
    totalArea: number
    designation: string
    score: number
  }> = []

  for (const bar of REBAR_TABLE) {
    if (bar.diameter < 10) continue // min ø10 for foundations

    const nMin = Math.ceil(asRequired / bar.area)
    for (let n = nMin; n <= nMin + 6; n++) {
      if (n < 2) continue
      const spacing = (bAvailable - 2 * 5) / (n - 1) // 5cm edge distance
      if (spacing < minSpacing || spacing > maxSpacing) continue

      const totalArea = n * bar.area
      if (totalArea < asRequired) continue

      const waste = totalArea - asRequired
      const score = waste / asRequired + (bar.diameter > 25 ? 0.5 : 0)
      candidates.push({
        count: n,
        diameter: bar.diameter,
        spacing: Math.round(spacing * 10) / 10,
        totalArea: Math.round(totalArea * 100) / 100,
        designation: bar.designation,
        score,
      })
    }
  }

  if (candidates.length === 0) {
    // Fallback: use ø20 with required count
    const bar = REBAR_TABLE.find((b) => b.diameter === 20)!
    const n = Math.ceil(asRequired / bar.area)
    return {
      count: n,
      diameter: 20,
      spacing: Math.round(((bAvailable - 10) / Math.max(n - 1, 1)) * 10) / 10,
      totalArea: Math.round(n * bar.area * 100) / 100,
      designation: "ø20",
    }
  }

  candidates.sort((a, b) => a.score - b.score)
  const best = candidates[0]
  return {
    count: best.count,
    diameter: best.diameter,
    spacing: best.spacing,
    totalArea: best.totalArea,
    designation: best.designation,
  }
}

// ─── Calculate ELU Loads from Components ─────────────────────────────
export function calculateELULoads(components: LoadComponents): LoadsUltimate[] {
  const results: LoadsUltimate[] = []

  for (const combo of ELU_COMBINATIONS) {
    let Nu = 0
    let Mxu = 0

    // Axial loads
    if (combo.factors.D) Nu += combo.factors.D * (components.D || 0)
    if (combo.factors.L) Nu += combo.factors.L * (components.L || 0)
    if (combo.factors.W) Nu += combo.factors.W * 0 // Wind typically lateral
    if (combo.factors.E) Nu += combo.factors.E * 0 // Earthquake typically lateral
    if (combo.factors.Lr) Nu += combo.factors.Lr * (components.Lr || 0)
    if (combo.factors.S) Nu += combo.factors.S * (components.S || 0)
    if (combo.factors.R) Nu += combo.factors.R * (components.R || 0)

    // Moments (for M2)
    if (combo.factors.D) Mxu += combo.factors.D * (components.MD || 0)
    if (combo.factors.L) Mxu += combo.factors.L * (components.ML || 0)
    if (combo.factors.W) Mxu += combo.factors.W * (components.MW || 0)
    if (combo.factors.E) Mxu += combo.factors.E * (components.ME || 0)

    results.push({
      Nu: Math.round(Nu * 100) / 100,
      Mxu: Math.round(Mxu * 100) / 100,
      combination: combo.id,
    })
  }

  return results
}

// ─── Get Governing ELU Combination ───────────────────────────────────
export function getGoverningELU(loads: LoadsUltimate[]): LoadsUltimate {
  return loads.reduce((gov, curr) => (curr.Nu > gov.Nu ? curr : gov), loads[0])
}

// ─── Flexural Reinforcement Calculation ──────────────────────────────
export function calculateFlexure(
  Mu: number, // kN·m
  b: number, // m - section width
  d: number, // m - effective depth
  fck: number, // MPa
  fy: number, // MPa
  direction: string = "X"
): FlexureResult {
  const phi = PHI_FACTORS.flexion

  // Dimensionless moment
  const mu = (Mu * 1e6) / (phi * b * 1000 * (d * 1000) ** 2 * fck)

  const { omega, xi } = interpolateFlexure(mu)

  // Required steel area
  const AsReq = (omega * b * 100 * d * 100 * fck) / fy // cm²

  // Minimum steel
  const rhoMin = getMinReinforcementRatio(fck, fy)
  const AsMin = rhoMin * b * 100 * d * 100 // cm²

  const AsDesign = Math.max(AsReq, AsMin)

  // Select commercial bars
  const bars = selectRebar(AsDesign, b * 100)

  return {
    Mu,
    AsReq: Math.round(AsReq * 100) / 100,
    AsMin: Math.round(AsMin * 100) / 100,
    AsDesign: Math.round(AsDesign * 100) / 100,
    omega: Math.round(omega * 10000) / 10000,
    xi: Math.round(xi * 10000) / 10000,
    bars: {
      count: bars.count,
      diameter: bars.diameter,
      spacing: bars.spacing,
      totalArea: bars.totalArea,
    },
    reference: `CIRSOC 201-05 Cap.10 - Dirección ${direction}`,
  }
}

// ─── Wide Beam Shear Check ───────────────────────────────────────────
export function checkShear(
  Nu: number, // kN - factored load
  sigma_u: number, // kN/m² - factored soil pressure
  B: number, // m - footing dimension perpendicular to check
  L: number, // m - footing dimension parallel to check
  col: number, // m - column dimension parallel to check
  d: number, // m - effective depth
  fck: number, // MPa
  direction: string = "X"
): ShearCheckResult {
  const phi = PHI_FACTORS.cortante

  // Critical section at d from column face
  const criticalDist = col / 2 + d
  const Lv = L / 2 - criticalDist // cantilever from critical section

  if (Lv <= 0) {
    return {
      Vu: 0,
      phiVc: 999,
      ratio: 0,
      pass: true,
      criticalSection: criticalDist,
      reference: `CIRSOC 201-05 11.1 - Dir. ${direction} (sección dentro de columna)`,
    }
  }

  const Vu = sigma_u * B * Lv

  // Vc = 0.17 * √f'c * b * d (CIRSOC 201-05 Eq. 11-3)
  const Vc = 0.17 * Math.sqrt(fck) * (B * 1000) * (d * 1000) / 1000 // kN

  const phiVc = phi * Vc

  return {
    Vu: Math.round(Vu * 100) / 100,
    phiVc: Math.round(phiVc * 100) / 100,
    ratio: Math.round((Vu / phiVc) * 1000) / 1000,
    pass: Vu <= phiVc,
    criticalSection: Math.round(criticalDist * 1000) / 1000,
    reference: `CIRSOC 201-05 11.1 & 11.3 - Dir. ${direction}`,
  }
}

// ─── Punching Shear Check ────────────────────────────────────────────
export function checkPunching(
  Nu: number, // kN - factored load
  sigma_u: number, // kN/m² - factored soil pressure
  B: number, // m - footing width
  L: number, // m - footing length
  colX: number, // m - column X
  colY: number, // m - column Y
  d: number, // m - effective depth
  fck: number, // MPa
  beta_c: number = 1 // column aspect ratio (long/short)
): PunchingCheckResult {
  const phi = PHI_FACTORS.punzonado

  // Critical perimeter at d/2 from column face
  const b1 = colX + d // m
  const b2 = colY + d // m
  const bo = 2 * (b1 + b2) // m - critical perimeter
  const Apunch = b1 * b2 // m² - area within critical perimeter

  // Factored punching force
  const Vu = Nu - sigma_u * Apunch // kN (subtract reaction inside perimeter)

  // Three Vc equations (CIRSOC 201-05 11.12.2)
  const d_mm = d * 1000
  const bo_mm = bo * 1000

  // Eq 11-35: Vc1 = 0.17(1 + 2/βc)√f'c · bo · d
  const Vc1 = (0.17 * (1 + 2 / Math.max(beta_c, 1)) * Math.sqrt(fck) * bo_mm * d_mm) / 1000

  // Eq 11-36: Vc2 = 0.083(αs·d/bo + 2)√f'c · bo · d
  const alphaS = 40 // interior column
  const Vc2 = (0.083 * (alphaS * d_mm / bo_mm + 2) * Math.sqrt(fck) * bo_mm * d_mm) / 1000

  // Eq 11-37: Vc3 = 0.33√f'c · bo · d
  const Vc3 = (0.33 * Math.sqrt(fck) * bo_mm * d_mm) / 1000

  const VcGov = Math.min(Vc1, Vc2, Vc3)
  const phiVc = phi * VcGov

  return {
    Vu: Math.round(Math.max(Vu, 0) * 100) / 100,
    phiVc: Math.round(phiVc * 100) / 100,
    ratio: Math.round((Math.max(Vu, 0) / phiVc) * 1000) / 1000,
    pass: Vu <= phiVc,
    bo: Math.round(bo * 1000) / 1000,
    d,
    Vc1: Math.round(Vc1 * 100) / 100,
    Vc2: Math.round(Vc2 * 100) / 100,
    Vc3: Math.round(Vc3 * 100) / 100,
    VcGov: Math.round(VcGov * 100) / 100,
    reference: "CIRSOC 201-05 11.12.2 (Ec. 11-35, 11-36, 11-37)",
  }
}

// ─── Calculate Flexural Moment at Column Face ────────────────────────
export function calculateFootingMoment(
  sigma_u: number, // kN/m² - factored pressure
  B: number, // m - footing width perpendicular to moment
  L: number, // m - footing length parallel to moment
  col: number // m - column dimension parallel to moment
): number {
  const Lv = (L - col) / 2 // m - cantilever length
  return sigma_u * B * Lv * Lv / 2 // kN·m
}

// ─── Net Admissible Pressure ─────────────────────────────────────────
export function calculateNetAdmissible(
  sigmaAdm: number, // kN/m² - gross admissible
  Df: number, // m - foundation depth
  gamma_s: number, // kN/m³ - soil unit weight
  gamma_c: number = 24, // kN/m³ - concrete unit weight
  H: number = 0.5 // m - footing height
): number {
  // σ_net = σ_adm - γs·(Df - H) - γc·H
  return sigmaAdm - gamma_s * (Df - H) - gamma_c * H
}

// ─── Footing Dimensioning ────────────────────────────────────────────
export function dimensionFooting(
  N: number, // kN - service load
  sigmaNet: number, // kN/m² - net admissible pressure
  colX: number, // m - column X
  colY: number, // m - column Y
  aspectRatio: number = 1 // B/L ratio (1 = square)
): { B: number; L: number; Af: number } {
  // Required area
  const Af_req = N / sigmaNet

  // For square footing
  let B = Math.sqrt(Af_req / aspectRatio)
  let L = B * aspectRatio

  // Round up to nearest 5cm
  B = Math.ceil(B * 20) / 20
  L = Math.ceil(L * 20) / 20

  // Minimum: column dimension + 2*15cm overhang
  B = Math.max(B, colX + 0.3)
  L = Math.max(L, colY + 0.3)

  return {
    B: Math.round(B * 100) / 100,
    L: Math.round(L * 100) / 100,
    Af: Math.round(B * L * 10000) / 10000,
  }
}

// ─── Estimate Footing Height ─────────────────────────────────────────
export function estimateHeight(
  B: number, // m
  L: number, // m
  colX: number, // m
  colY: number // m
): number {
  // Rule of thumb: H ≈ max cantilever / 3, min 30cm
  const cantX = (B - colX) / 2
  const cantY = (L - colY) / 2
  const maxCant = Math.max(cantX, cantY)
  let H = Math.max(maxCant / 3, 0.3)
  // Round up to nearest 5cm
  H = Math.ceil(H * 20) / 20
  return Math.round(H * 100) / 100
}
