// M8 Calculation Engine - Resistencia Lateral (Broms Method)
// Lateral capacity of piles in granular and cohesive soils

export interface M8Input {
  projectName: string
  pileDiameter: number // cm
  pileLength: number // m
  pileType: "short-free" | "long-free" | "short-fixed" | "long-fixed"
  headCondition: "free" | "fixed"
  soilType: "granular" | "cohesive"
  // Granular
  gamma?: number // kN/m3
  phi?: number // degrees
  Kp?: number // passive pressure coeff (auto-calculated if not provided)
  // Cohesive
  cu?: number // kPa - undrained shear strength
  // Pile properties
  Ep?: number // MPa - pile modulus (default 25000 for concrete)
  My?: number // kN.m - yield moment of pile
  appliedLateralLoad: number // kN
  appliedMoment?: number // kN.m at pile head
}

export interface M8Results {
  classification: "short" | "long"
  kR: number // relative stiffness
  Hu_granular?: {
    Hu: number // kN ultimate lateral capacity
    Mmax: number // kN.m max moment
    zMax: number // m depth of max moment
    e_eff: number // m effective eccentricity
  }
  Hu_cohesive?: {
    Hu: number
    Mmax: number
    f: number // m depth to point of rotation
  }
  FS: number // factor of safety
  passFS: boolean // FS >= 2.00
  displacement: {
    yHead: number // mm at pile head
    yMax: number // mm
    passDisplacement: boolean // < 25mm typical
  }
  summary: string
}

export function calculateM8(input: M8Input): M8Results {
  const D = input.pileDiameter / 100 // m
  const L = input.pileLength // m
  const e = (input.appliedMoment || 0) / (input.appliedLateralLoad || 1) // eccentricity
  const H_applied = input.appliedLateralLoad
  const Ep = (input.Ep || 25000) * 1000 // kPa
  const Ip = Math.PI * Math.pow(D, 4) / 64 // m4
  const EI = Ep * Ip // kN.m2

  // My - yield moment (if not provided, estimate for reinforced concrete pile)
  const My = input.My || (0.1 * 25000 * Ip * 1000) // simplified

  let results: M8Results

  if (input.soilType === "granular") {
    const gamma = input.gamma || 18 // kN/m3
    const phi = (input.phi || 30) * Math.PI / 180
    const Kp = input.Kp || Math.pow(Math.tan(Math.PI / 4 + phi / 2), 2)

    // Broms: nh = gamma * Kp (coefficient of horizontal subgrade reaction)
    const nh = gamma * Kp // kN/m3 (simplified)

    // Relative stiffness factor
    const T = Math.pow(EI / nh, 0.2) // m
    const kR = L / T

    const isShort = kR <= 2
    const classification = isShort ? "short" : "long"

    let Hu: number, Mmax: number, zMax: number

    if (isShort) {
      // Short pile, free head (Broms)
      // Hu = 0.5 * gamma * Kp * D * L^3 / (L + e)
      Hu = 0.5 * gamma * Kp * D * L * L * L / (L + e)
      Mmax = Hu * (e + 0.67 * L)
      zMax = L * 0.67
    } else {
      // Long pile, free head (Broms)
      // Hu limited by pile yield moment My
      // My = Hu * (e + 0.544 * sqrt(Hu / (gamma * Kp * D)))
      // Iterative solve: start with Hu estimate
      Hu = My / (e + 0.544 * Math.sqrt(My / (gamma * Kp * D))) // first approx
      // Refine
      for (let i = 0; i < 5; i++) {
        const f = 0.544 * Math.sqrt(Hu / (gamma * Kp * D))
        Hu = My / (e + f)
      }
      Mmax = My
      zMax = 0.544 * Math.sqrt(Hu / (gamma * Kp * D))
    }

    const FS = Hu / H_applied
    const yHead = (H_applied * Math.pow(T, 3)) / (EI) * 2.4 * 1000 // mm (approx coefficient)

    results = {
      classification,
      kR: Math.round(kR * 100) / 100,
      Hu_granular: {
        Hu: Math.round(Hu * 100) / 100,
        Mmax: Math.round(Mmax * 100) / 100,
        zMax: Math.round(zMax * 1000) / 1000,
        e_eff: Math.round(e * 1000) / 1000,
      },
      FS: Math.round(FS * 100) / 100,
      passFS: FS >= 2.0,
      displacement: {
        yHead: Math.round(yHead * 100) / 100,
        yMax: Math.round(yHead * 1.2 * 100) / 100,
        passDisplacement: yHead <= 25,
      },
      summary: `Pilote en suelo granular (${classification}), Hu=${Hu.toFixed(1)} kN, FS=${FS.toFixed(2)}`,
    }
  } else {
    // Cohesive soil
    const cu = input.cu || 50 // kPa

    // Broms: characteristic length
    const k_h = (0.1 * cu * 1000) / D // subgrade reaction (Vesic approx)
    const R = Math.pow(4 * EI / (k_h * D), 0.25) // m
    const kR = L / R

    const isShort = kR <= 2
    const classification = isShort ? "short" : "long"

    let Hu: number, Mmax: number, f_depth: number

    if (isShort) {
      // Short pile, free head in cohesive
      // Hu = 9 * cu * D * L - resistance at base
      // Simplified: Hu = 2 * (9*cu*D) * (L - 1.5*D) for free head
      Hu = 9 * cu * D * (L - 1.5 * D)
      f_depth = 1.5 * D + Hu / (9 * cu * D)
      Mmax = Hu * (e + 0.5 * f_depth)
    } else {
      // Long pile: Hu limited by My
      // My = Hu * (e + 1.5*D + 0.5*f) where f = Hu/(9*cu*D)
      Hu = 0.5 * (-9 * cu * D * (1.5 * D + e) + Math.sqrt(
        Math.pow(9 * cu * D * (1.5 * D + e), 2) + 4 * 9 * cu * D * My
      ))
      f_depth = Hu / (9 * cu * D)
      Mmax = My
    }

    const FS = Hu / H_applied
    const yHead = (H_applied * Math.pow(R, 3)) / (EI) * 1.0 * 1000 // mm (approx)

    results = {
      classification,
      kR: Math.round(kR * 100) / 100,
      Hu_cohesive: {
        Hu: Math.round(Hu * 100) / 100,
        Mmax: Math.round(Mmax * 100) / 100,
        f: Math.round(f_depth * 1000) / 1000,
      },
      FS: Math.round(FS * 100) / 100,
      passFS: FS >= 2.0,
      displacement: {
        yHead: Math.round(yHead * 100) / 100,
        yMax: Math.round(yHead * 1.3 * 100) / 100,
        passDisplacement: yHead <= 25,
      },
      summary: `Pilote en suelo cohesivo (${classification}), Hu=${Hu.toFixed(1)} kN, FS=${FS.toFixed(2)}`,
    }
  }

  return results
}
