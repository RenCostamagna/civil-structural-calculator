// M6 Calculation Engine - Base Unificada (Trapezoidal/Rectangular)
// Combined footing for 2 columns with resultant/centroid calculation

import { CONCRETE_GRADES, STEEL_GRADES, PHI_FACTORS } from "@/lib/constants/cirsoc"
import type { LoadComponents, DimensioningResult, ShearCheckResult, FlexureResult } from "@/lib/types/foundation"
import {
  calculateNetAdmissible,
  estimateHeight,
  calculateELULoads,
  getGoverningELU,
  checkShear,
  calculateFlexure,
  selectRebar,
} from "./shared"

export interface M6Input {
  projectName: string
  column1: { width: number; depth: number; shape: "rectangular" | "circular" }
  column2: { width: number; depth: number; shape: "rectangular" | "circular" }
  loads1: { N: number }
  loads2: { N: number }
  loadComponents?: LoadComponents
  soil: { sigmaAdm: number; gamma_s: number; Df: number }
  materials: { concreteGrade: string; steelGrade: string; cover: number }
  distanceBetweenColumns: number // m
  footingShape: "rectangular" | "trapezoidal"
  footingLength?: number // m override
  footingHeight?: number // m override
}

export interface M6Results {
  shape: "rectangular" | "trapezoidal"
  resultant: { N_total: number; x_bar: number } // total load and centroid position
  dimensioning: {
    L_total: number // m - total length
    B1: number // m - width at column 1 end
    B2: number // m - width at column 2 end
    H: number // m - height
    d: number // m - effective depth
    Af: number // m2 - area
  }
  pressures: {
    sigma1: number // kN/m2 at col1 end
    sigma2: number // kN/m2 at col2 end
    sigmaNet: number // kN/m2
    pass: boolean
  }
  shearChecks: ShearCheckResult[]
  flexureX: FlexureResult // longitudinal
  flexureY: FlexureResult // transversal
  transversalBands: {
    band1: FlexureResult // under col 1
    band2: FlexureResult // under col 2
  }
  governingCombination: string
}

export function calculateM6(input: M6Input): M6Results {
  const concrete = CONCRETE_GRADES[input.materials.concreteGrade]
  const steel = STEEL_GRADES[input.materials.steelGrade]
  const fck = concrete.fck
  const fy = steel.fy

  const N1 = input.loads1.N
  const N2 = input.loads2.N
  const N_total = N1 + N2
  const Lc = input.distanceBetweenColumns

  const cover = input.materials.cover / 1000

  // Resultant position from column 1
  const x_bar = (N2 * Lc) / N_total // m from col1

  // Total footing length: center resultant
  // L/2 should coincide with x_bar
  const L_total = input.footingLength || Math.ceil((2 * x_bar + 0.3) * 20) / 20

  const sigmaNet = calculateNetAdmissible(input.soil.sigmaAdm, input.soil.Df, input.soil.gamma_s)

  let B1: number, B2: number

  if (input.footingShape === "rectangular") {
    // Uniform width
    const B_req = N_total / (sigmaNet * L_total)
    const B = Math.ceil(B_req * 20) / 20
    B1 = B
    B2 = B
  } else {
    // Trapezoidal: B1 and B2 such that centroid of trapezoid aligns with resultant
    // Area = (B1+B2)/2 * L, centroid at L/3 * (B1+2*B2)/(B1+B2) from B1 end
    const Af_req = N_total / sigmaNet
    const B_avg = Af_req / L_total
    // Centroid condition: x_bar_trap = L/3 * (B1+2*B2)/(B1+B2)
    // From area: (B1+B2)/2 * L = Af_req
    // Solve: B1+B2 = 2*B_avg
    // x_bar = L/3 * (B1+2*B2)/(B1+B2)
    const ratio = x_bar / (L_total / 3)
    // (B1+2*B2)/(B1+B2) = ratio => B1+2*B2 = ratio*(B1+B2)
    // B1(1-ratio) + B2(2-ratio) = 0 => B1 = B2*(ratio-2)/(1-ratio)
    // Combined with B1+B2 = 2*B_avg
    B2 = (2 * B_avg) / (1 + (ratio - 2) / (1 - ratio + 0.001))
    B1 = 2 * B_avg - B2

    // Ensure positive widths
    B1 = Math.max(Math.ceil(B1 * 20) / 20, 0.3)
    B2 = Math.max(Math.ceil(B2 * 20) / 20, 0.3)
  }

  const Af = (B1 + B2) / 2 * L_total
  const H = input.footingHeight || estimateHeight(Math.max(B1, B2), L_total, 0.4, 0.4)
  const d = H - cover - 0.01

  // Pressure check
  const sigma1 = N_total / Af + (N_total * (L_total / 2 - x_bar) * L_total / 2) / ((B1 + B2) / 2 * L_total ** 3 / 12)
  const sigma2 = N_total / Af - (N_total * (L_total / 2 - x_bar) * L_total / 2) / ((B1 + B2) / 2 * L_total ** 3 / 12)

  // ELU
  const loadComponents = input.loadComponents || { D: N_total * 0.6, L: N_total * 0.4 }
  const eluLoads = calculateELULoads(loadComponents)
  const govELU = getGoverningELU(eluLoads)
  const factor = govELU.Nu / N_total || 1.4
  const sigma_u = (N_total * factor) / Af

  // Shear at critical sections (d from face of each column)
  const colY1 = input.column1.depth / 100
  const colY2 = input.column2.depth / 100
  const B_avg = (B1 + B2) / 2

  const shear1 = checkShear(N1 * factor, sigma_u, B_avg, L_total, colY1, d, fck, "Col1")
  const shear2 = checkShear(N2 * factor, sigma_u, B_avg, L_total, colY2, d, fck, "Col2")

  // Longitudinal flexure (beam between columns)
  const Mu_long = sigma_u * B_avg * (Lc / 2) ** 2 / 2 // approximate
  const flexureX = calculateFlexure(Mu_long, B_avg, d, fck, fy, "Longitudinal")

  // Transversal flexure (at each column)
  const cantY = (B_avg - colY1) / 2
  const Mu_trans = sigma_u * L_total * cantY ** 2 / 2
  const flexureY = calculateFlexure(Mu_trans, L_total, d, fck, fy, "Transversal")

  // Transversal bands under each column
  const bandWidth1 = colY1 + d
  const Mu_band1 = sigma_u * bandWidth1 * ((B1 - colY1) / 2) ** 2 / 2
  const band1 = calculateFlexure(Mu_band1, bandWidth1, d, fck, fy, "Banda C1")

  const bandWidth2 = colY2 + d
  const Mu_band2 = sigma_u * bandWidth2 * ((B2 - colY2) / 2) ** 2 / 2
  const band2 = calculateFlexure(Mu_band2, bandWidth2, d, fck, fy, "Banda C2")

  return {
    shape: input.footingShape,
    resultant: {
      N_total: Math.round(N_total * 100) / 100,
      x_bar: Math.round(x_bar * 1000) / 1000,
    },
    dimensioning: {
      L_total: Math.round(L_total * 100) / 100,
      B1: Math.round(B1 * 100) / 100,
      B2: Math.round(B2 * 100) / 100,
      H, d: Math.round(d * 1000) / 1000,
      Af: Math.round(Af * 10000) / 10000,
    },
    pressures: {
      sigma1: Math.round(sigma1 * 100) / 100,
      sigma2: Math.round(sigma2 * 100) / 100,
      sigmaNet: Math.round(sigmaNet * 100) / 100,
      pass: Math.max(sigma1, sigma2) <= sigmaNet,
    },
    shearChecks: [shear1, shear2],
    flexureX,
    flexureY,
    transversalBands: { band1, band2 },
    governingCombination: govELU.combination,
  }
}
