// Foundation Calculation Types
// All interfaces for M1 (Base Centrada) and M2 (Base con Momento)

// ─── Common Input Types ──────────────────────────────────────────────
export interface ColumnData {
  width: number // cm - column dimension X
  depth: number // cm - column dimension Y (or diameter)
  shape: "rectangular" | "circular"
}

export interface LoadsService {
  N: number // kN - axial load (service)
  Mx?: number // kN·m - moment X (service)
  My?: number // kN·m - moment Y (service)
  Vx?: number // kN - shear X (service)
  Vy?: number // kN - shear Y (service)
}

export interface LoadsUltimate {
  Nu: number // kN - factored axial load
  Mxu?: number // kN·m - factored moment X
  Myu?: number // kN·m - factored moment Y
  Vxu?: number // kN - factored shear X
  Vyu?: number // kN - factored shear Y
  combination: string // combination ID
}

export interface LoadComponents {
  D: number // kN - Dead
  L: number // kN - Live
  Lr?: number // kN - Roof live
  W?: number // kN - Wind
  E?: number // kN - Earthquake
  S?: number // kN - Snow
  R?: number // kN - Rain
  H?: number // kN - Soil/water pressure
  // Moments by load type (for M2)
  MD?: number // kN·m
  ML?: number // kN·m
  MW?: number // kN·m
  ME?: number // kN·m
}

export interface SoilData {
  sigmaAdm: number // kN/m² - admissible bearing pressure
  gamma_s: number // kN/m³ - soil unit weight
  Df: number // m - foundation depth
  waterTable?: number // m - water table depth (optional)
}

export interface MaterialData {
  concreteGrade: string // key from CONCRETE_GRADES
  steelGrade: string // key from STEEL_GRADES
  cover: number // mm - concrete cover
}

// ─── M1: Base Centrada ───────────────────────────────────────────────
export interface M1Input {
  projectName: string
  column: ColumnData
  loads: LoadsService
  loadComponents?: LoadComponents
  soil: SoilData
  materials: MaterialData
  // Optional overrides
  footingWidth?: number // m - override calculated B
  footingDepth?: number // m - override calculated L
  footingHeight?: number // m - override calculated H
}

export interface DimensioningResult {
  B: number // m - footing width
  L: number // m - footing length
  H: number // m - footing total height
  d: number // m - effective depth
  Af: number // m² - footing area
  sigmaNet: number // kN/m² - net admissible pressure
  sigmaSol: number // kN/m² - actual soil pressure
  ratio: number // sigmaSol / sigmaNet (should be <= 1.0)
}

export interface ShearCheckResult {
  Vu: number // kN - factored shear force
  phiVc: number // kN - design shear capacity
  ratio: number // Vu / phiVc
  pass: boolean
  criticalSection: number // m - distance from face
  reference: string // CIRSOC reference
}

export interface PunchingCheckResult {
  Vu: number // kN - punching shear force
  phiVc: number // kN - design punching capacity
  ratio: number // Vu / phiVc
  pass: boolean
  bo: number // m - critical perimeter
  d: number // m - effective depth
  Vc1: number // kN - eq 11-35
  Vc2: number // kN - eq 11-36
  Vc3: number // kN - eq 11-37
  VcGov: number // kN - governing Vc
  reference: string
}

export interface FlexureResult {
  Mu: number // kN·m - factored moment
  AsReq: number // cm² - required steel area
  AsMin: number // cm² - minimum steel area
  AsDesign: number // cm² - design steel area (max of req/min)
  omega: number // mechanical reinforcement ratio
  xi: number // neutral axis ratio
  bars: {
    count: number
    diameter: number // mm
    spacing: number // cm
    totalArea: number // cm²
  }
  reference: string
}

export interface M1Results {
  dimensioning: DimensioningResult
  shearX: ShearCheckResult
  shearY: ShearCheckResult
  punching: PunchingCheckResult
  flexureX: FlexureResult
  flexureY: FlexureResult
  ultimateLoads: LoadsUltimate[]
  governingCombination: string
}

// ─── M2: Base con Momento ────────────────────────────────────────────
export interface M2Input extends Omit<M1Input, "loads"> {
  loads: LoadsService & { Mx: number } // moment is required
  loadComponents: LoadComponents
  momentDirection: "x" | "y" | "biaxial"
}

export interface PressureDistribution {
  sigmaMax: number // kN/m² - maximum pressure
  sigmaMin: number // kN/m² - minimum pressure
  type: "uniform" | "trapezoidal" | "triangular" | "partial"
  eccentricity: number // m
  kernelLimit: number // m - L/6 or B/6
  contactLength?: number // m - for triangular/partial
}

export interface StabilityCheck {
  type: "overturning" | "sliding"
  FS: number // factor of safety
  FSmin: number // minimum required
  pass: boolean
  drivingForce: number // kN or kN·m
  resistingForce: number // kN or kN·m
  reference: string
}

export interface PunchingWithMomentResult extends PunchingCheckResult {
  gamma_v: number // fraction of moment transferred by shear
  Jc: number // property of critical section (cm⁴)
  vu_max: number // MPa - max shear stress
  reference: string
}

export interface M2Results extends Omit<M1Results, "punching"> {
  pressureELS: PressureDistribution
  stability: StabilityCheck[]
  punching: PunchingWithMomentResult
  flexureSuperior?: FlexureResult // top reinforcement for uplift
  elsCombiGov: string
}

// ─── Wizard State ────────────────────────────────────────────────────
export interface WizardStep {
  id: number
  label: string
  completed: boolean
  current: boolean
}

export interface VerificationStatus {
  label: string
  value: number
  limit: number
  ratio: number
  pass: boolean
  reference: string
  severity: "ok" | "warning" | "error"
}

// ─── Project ─────────────────────────────────────────────────────────
export interface Project {
  id: string
  name: string
  description?: string
  moduleType: string
  inputData: M1Input | M2Input
  results?: M1Results | M2Results
  createdAt: string
  updatedAt: string
}
