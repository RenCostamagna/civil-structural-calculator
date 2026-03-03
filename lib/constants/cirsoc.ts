// CIRSOC 201-05 & CIRSOC 601 Constants
// Materials, load combinations, phi factors, commercial reinforcement

// ─── Concrete Properties ─────────────────────────────────────────────
export interface ConcreteGrade {
  label: string
  fck: number // MPa - characteristic compressive strength
  fctm: number // MPa - mean tensile strength
  Ec: number // MPa - elastic modulus
}

export const CONCRETE_GRADES: Record<string, ConcreteGrade> = {
  H20: { label: "H-20", fck: 20, fctm: 2.2, Ec: 25000 },
  H25: { label: "H-25", fck: 25, fctm: 2.6, Ec: 27000 },
  H30: { label: "H-30", fck: 30, fctm: 2.9, Ec: 29000 },
  H35: { label: "H-35", fck: 35, fctm: 3.2, Ec: 31000 },
  H40: { label: "H-40", fck: 40, fctm: 3.5, Ec: 33000 },
  H45: { label: "H-45", fck: 45, fctm: 3.8, Ec: 34500 },
  H50: { label: "H-50", fck: 50, fctm: 4.1, Ec: 36000 },
}

// ─── Steel Properties ────────────────────────────────────────────────
export interface SteelGrade {
  label: string
  fy: number // MPa - yield strength
  Es: number // MPa - elastic modulus
}

export const STEEL_GRADES: Record<string, SteelGrade> = {
  ADN420: { label: "ADN 420", fy: 420, Es: 200000 },
  AL220: { label: "AL 220", fy: 220, Es: 200000 },
}

// ─── Commercial Rebar ────────────────────────────────────────────────
export interface RebarSpec {
  designation: string
  diameter: number // mm
  area: number // cm²
  weight: number // kg/m
}

export const REBAR_TABLE: RebarSpec[] = [
  { designation: "ø6", diameter: 6, area: 0.283, weight: 0.222 },
  { designation: "ø8", diameter: 8, area: 0.503, weight: 0.395 },
  { designation: "ø10", diameter: 10, area: 0.785, weight: 0.617 },
  { designation: "ø12", diameter: 12, area: 1.131, weight: 0.888 },
  { designation: "ø16", diameter: 16, area: 2.011, weight: 1.578 },
  { designation: "ø20", diameter: 20, area: 3.142, weight: 2.466 },
  { designation: "ø25", diameter: 25, area: 4.909, weight: 3.853 },
  { designation: "ø32", diameter: 32, area: 8.042, weight: 6.313 },
]

// ─── Phi Factors (CIRSOC 201-05 Table 9.3.2) ───────────────────────
export const PHI_FACTORS = {
  flexion: 0.90, // Flexión
  cortante: 0.75, // Corte
  punzonado: 0.75, // Punzonado
  compresion_espiral: 0.75,
  compresion_estribos: 0.65,
  traccion: 0.90,
} as const

// ─── Load Combinations (CIRSOC 201-05 / CIRSOC 102) ─────────────────
export interface LoadCombination {
  id: string
  label: string
  expression: string
  factors: {
    D?: number // Dead
    L?: number // Live
    Lr?: number // Roof live
    W?: number // Wind
    E?: number // Earthquake
    S?: number // Snow
    R?: number // Rain
    H?: number // Soil/water pressure
  }
}

export const ELU_COMBINATIONS: LoadCombination[] = [
  {
    id: "U1",
    label: "U1",
    expression: "1.4D",
    factors: { D: 1.4 },
  },
  {
    id: "U2",
    label: "U2",
    expression: "1.2D + 1.6L + 0.5(Lr o S o R)",
    factors: { D: 1.2, L: 1.6, Lr: 0.5, S: 0.5, R: 0.5 },
  },
  {
    id: "U3",
    label: "U3",
    expression: "1.2D + 1.6(Lr o S o R) + (L o 0.5W)",
    factors: { D: 1.2, Lr: 1.6, S: 1.6, R: 1.6, L: 1.0, W: 0.5 },
  },
  {
    id: "U4",
    label: "U4",
    expression: "1.2D + 1.0W + L + 0.5(Lr o S o R)",
    factors: { D: 1.2, W: 1.0, L: 1.0, Lr: 0.5, S: 0.5, R: 0.5 },
  },
  {
    id: "U5",
    label: "U5",
    expression: "1.2D + 1.0E + L + 0.2S",
    factors: { D: 1.2, E: 1.0, L: 1.0, S: 0.2 },
  },
  {
    id: "U6",
    label: "U6",
    expression: "0.9D + 1.0W",
    factors: { D: 0.9, W: 1.0 },
  },
  {
    id: "U7",
    label: "U7",
    expression: "0.9D + 1.0E",
    factors: { D: 0.9, E: 1.0 },
  },
]

export const ELS_COMBINATIONS: LoadCombination[] = [
  {
    id: "S1",
    label: "S1",
    expression: "D + L",
    factors: { D: 1.0, L: 1.0 },
  },
  {
    id: "S2",
    label: "S2",
    expression: "D + L + W",
    factors: { D: 1.0, L: 1.0, W: 1.0 },
  },
  {
    id: "S3",
    label: "S3",
    expression: "D + L + E",
    factors: { D: 1.0, L: 1.0, E: 1.0 },
  },
  {
    id: "S4",
    label: "S4",
    expression: "D + 0.7E",
    factors: { D: 1.0, E: 0.7 },
  },
]

// ─── Soil Properties ─────────────────────────────────────────────────
export interface SoilType {
  id: string
  label: string
  sigmaAdm: number // kN/m² - typical admissible pressure
  gamma: number // kN/m³ - unit weight
}

export const SOIL_TYPES: SoilType[] = [
  { id: "roca_sana", label: "Roca sana", sigmaAdm: 800, gamma: 25 },
  { id: "roca_fisurada", label: "Roca fisurada", sigmaAdm: 400, gamma: 22 },
  { id: "grava_compacta", label: "Grava compacta", sigmaAdm: 350, gamma: 20 },
  { id: "arena_densa", label: "Arena densa", sigmaAdm: 200, gamma: 18 },
  { id: "arena_media", label: "Arena media", sigmaAdm: 120, gamma: 17 },
  { id: "arcilla_dura", label: "Arcilla dura", sigmaAdm: 200, gamma: 19 },
  { id: "arcilla_media", label: "Arcilla media", sigmaAdm: 100, gamma: 18 },
  { id: "arcilla_blanda", label: "Arcilla blanda", sigmaAdm: 50, gamma: 16 },
  { id: "limo", label: "Limo", sigmaAdm: 80, gamma: 17 },
  { id: "personalizado", label: "Personalizado", sigmaAdm: 0, gamma: 0 },
]

// ─── Cover Minimum (CIRSOC 201-05 Table 7.7.1) ──────────────────────
export const COVER_DEFAULTS = {
  contacto_suelo: 70, // mm - In contact with soil
  exterior_expuesto: 50, // mm
  interior: 40, // mm
} as const

// ─── Dimensionless Flexure Table (k, ω, ξ) ──────────────────────────
// For rectangular section without compression reinforcement
// μ = Mu / (b·d²·fck), ω = As·fy / (b·d·fck), ξ = x/d
export const FLEXURE_TABLE = [
  { mu: 0.0300, omega: 0.0306, xi: 0.0437 },
  { mu: 0.0400, omega: 0.0410, xi: 0.0586 },
  { mu: 0.0500, omega: 0.0515, xi: 0.0736 },
  { mu: 0.0600, omega: 0.0622, xi: 0.0889 },
  { mu: 0.0700, omega: 0.0730, xi: 0.1043 },
  { mu: 0.0800, omega: 0.0840, xi: 0.1200 },
  { mu: 0.0900, omega: 0.0951, xi: 0.1359 },
  { mu: 0.1000, omega: 0.1064, xi: 0.1520 },
  { mu: 0.1100, omega: 0.1179, xi: 0.1684 },
  { mu: 0.1200, omega: 0.1295, xi: 0.1850 },
  { mu: 0.1300, omega: 0.1413, xi: 0.2019 },
  { mu: 0.1400, omega: 0.1533, xi: 0.2190 },
  { mu: 0.1500, omega: 0.1655, xi: 0.2364 },
  { mu: 0.1600, omega: 0.1779, xi: 0.2542 },
  { mu: 0.1700, omega: 0.1905, xi: 0.2721 },
  { mu: 0.1800, omega: 0.2034, xi: 0.2906 },
  { mu: 0.1900, omega: 0.2165, xi: 0.3093 },
  { mu: 0.2000, omega: 0.2299, xi: 0.3284 },
  { mu: 0.2100, omega: 0.2436, xi: 0.3480 },
  { mu: 0.2200, omega: 0.2576, xi: 0.3680 },
  { mu: 0.2300, omega: 0.2719, xi: 0.3884 },
  { mu: 0.2400, omega: 0.2866, xi: 0.4094 },
  { mu: 0.2500, omega: 0.3017, xi: 0.4310 },
  { mu: 0.2600, omega: 0.3173, xi: 0.4533 },
  { mu: 0.2700, omega: 0.3334, xi: 0.4763 },
  { mu: 0.2800, omega: 0.3501, xi: 0.5001 },
  { mu: 0.2900, omega: 0.3674, xi: 0.5249 },
  { mu: 0.3000, omega: 0.3855, xi: 0.5507 },
  { mu: 0.3100, omega: 0.4046, xi: 0.5780 },
  { mu: 0.3200, omega: 0.4248, xi: 0.6069 },
  { mu: 0.3300, omega: 0.4466, xi: 0.6380 },
  { mu: 0.3400, omega: 0.4703, xi: 0.6719 },
  { mu: 0.3500, omega: 0.4968, xi: 0.7097 },
  { mu: 0.3600, omega: 0.5275, xi: 0.7536 },
  { mu: 0.3700, omega: 0.5660, xi: 0.8086 },
] as const

// ─── Minimum Reinforcement Ratios ────────────────────────────────────
export function getMinReinforcementRatio(fck: number, fy: number): number {
  // CIRSOC 201-05 10.5.1: As_min = max(0.25√f'c/fy , 1.4/fy) * b * d
  const ratio1 = (0.25 * Math.sqrt(fck)) / fy
  const ratio2 = 1.4 / fy
  return Math.max(ratio1, ratio2)
}

// ─── Maximum Reinforcement Ratio ─────────────────────────────────────
export function getMaxReinforcementRatio(fck: number, fy: number): number {
  // CIRSOC 201-05 - ρ_max ≈ 0.75 ρ_b
  const beta1 = fck <= 30 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (fck - 30) / 7)
  const rho_b = (0.85 * beta1 * fck * 0.003) / (fy * (0.003 + fy / 200000))
  return 0.75 * rho_b
}

// ─── Unit Conversions ────────────────────────────────────────────────
export const UNITS = {
  kN_to_N: 1000,
  MPa_to_kPa: 1000,
  m_to_mm: 1000,
  m_to_cm: 100,
  cm2_to_mm2: 100,
  mm2_to_cm2: 0.01,
} as const

// ─── Module Definitions ──────────────────────────────────────────────
export interface ModuleDefinition {
  id: string
  code: string
  name: string
  description: string
  icon: string
  steps: string[]
  available: boolean
}

export const MODULES: ModuleDefinition[] = [
  {
    id: "m1",
    code: "M1",
    name: "Base Centrada",
    description: "Zapata aislada centrada bajo columna con carga axial pura (sin momento).",
    icon: "square",
    steps: [
      "Datos de entrada",
      "Dimensionamiento",
      "Verificaciones",
      "Armaduras",
      "Resumen",
    ],
    available: true,
  },
  {
    id: "m2",
    code: "M2",
    name: "Base con Momento",
    description: "Zapata aislada centrada bajo columna con carga axial y momento flector.",
    icon: "rotate-ccw",
    steps: [
      "Datos de entrada",
      "Combinaciones ELS",
      "Presiones y estabilidad",
      "Combinaciones ELU",
      "Verificaciones",
      "Armaduras",
      "Resumen",
    ],
    available: true,
  },
  {
  id: "m3",
  code: "M3",
  name: "Base con Viga Central",
  description: "Zapata rectangular con viga central rigida (voladizo). Incluye diseño de viga.",
  icon: "move-horizontal",
  steps: [
    "Datos de entrada",
    "Dimensionamiento",
    "Verificaciones",
    "Viga central",
    "Armaduras",
    "Resumen",
  ],
  available: true,
  },
  {
  id: "m4",
  code: "M4",
  name: "Base Excéntrica con Tensor",
  description: "Zapata de medianera con tensor, mensula corta y corte por friccion (CIRSOC 201-05 11.7/11.9).",
  icon: "columns-2",
  steps: [
    "Datos de entrada",
    "Bases",
    "Tensor / Mensula",
    "Verificaciones",
    "Armaduras",
    "Resumen",
  ],
  available: true,
  },
  {
  id: "m5",
  code: "M5",
  name: "Base con Viga de Equilibrio",
  description: "Columna de medianera + interior conectadas por viga de equilibrio rigida.",
  icon: "minus",
  steps: [
    "Datos de entrada",
    "Bases",
    "Viga de equilibrio",
    "Verificaciones",
    "Armaduras",
    "Resumen",
  ],
  available: true,
  },
  {
  id: "m6",
  code: "M6",
  name: "Base Unificada (Combinada)",
  description: "Fundacion unificada rectangular o trapezoidal para 2 columnas. Fajas transversales.",
  icon: "link",
  steps: [
    "Datos de entrada",
    "Dimensionamiento",
    "Presiones",
    "Verificaciones",
    "Armaduras",
    "Resumen",
  ],
  available: true,
  },
  {
    id: "m7",
    code: "M7",
    name: "Pilotes (Cabezales)",
    description: "Fundacion profunda: perfil estratigrafico, cabezales Jimenez Montoya 2-6 pilotes, bielas y tirantes.",
    icon: "rectangle-horizontal",
    steps: [
      "Datos de entrada",
      "Perfil estratigrafico",
      "Capacidad pilotes",
      "Cabezal",
      "Armaduras",
      "Resumen",
    ],
    available: true,
  },
  {
    id: "m8",
    code: "M8",
    name: "Resistencia Lateral (Broms)",
    description: "Capacidad lateral de pilotes por metodo de Broms. Suelo granular y cohesivo, FS >= 2.00.",
    icon: "arrow-down-to-line",
    steps: [
      "Datos de entrada",
      "Parametros suelo",
      "Calculo Broms",
      "Verificaciones",
      "Resumen",
    ],
    available: true,
  },
]
