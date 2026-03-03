// M7 Calculation Engine - Pilotes (Cabezales)
// Deep foundations: soil profile, pile capacity, pile cap design (Jimenez Montoya 2-6 piles)

import { CONCRETE_GRADES, STEEL_GRADES, PHI_FACTORS } from "@/lib/constants/cirsoc"
import { selectRebar } from "./shared"

export interface SoilLayer {
  name: string
  thickness: number // m
  type: "granular" | "cohesive"
  gamma: number // kN/m3
  phi?: number // degrees (granular)
  Nspt?: number // SPT blows
  cu?: number // kPa (cohesive)
}

export interface M7Input {
  projectName: string
  column: { width: number; depth: number; shape: "rectangular" | "circular" }
  loads: { N: number; Mx?: number; My?: number }
  soilProfile: SoilLayer[]
  pileDiameter: number // cm
  pileLength: number // m
  pileType: "bored" | "driven"
  numPiles: 2 | 3 | 4 | 5 | 6
  materials: { concreteGrade: string; steelGrade: string; cover: number }
  pileSpacing?: number // diameters (default 3D)
}

interface PileCapacity {
  Qp: number // kN - tip resistance
  Qs: number // kN - shaft friction
  Qu: number // kN - ultimate
  Qadm: number // kN - admissible (FS=3 for tip, FS=2 for shaft)
}

interface PileCapDesign {
  type: string // "2-pile linear", "3-pile triangular", etc.
  width: number // m
  length: number // m
  height: number // m
  pilePositions: { x: number; y: number }[] // relative to center
  maxPileLoad: number // kN
  minPileLoad: number // kN
  passCapacity: boolean
}

interface StrutTie {
  Fc_strut: number // kN compression in strut
  Ft_tie: number // kN tension in tie
  thetaStrut: number // degrees
  As_tie: number // cm2
  bars: { count: number; diameter: number; spacing: number; totalArea: number }
}

export interface M7Results {
  pileCapacity: PileCapacity
  capDesign: PileCapDesign
  strutTie: StrutTie
  flexure: {
    Mu: number
    AsReq: number
    AsMin: number
    bars: { count: number; diameter: number; spacing: number; totalArea: number }
  }
  governingCombination: string
}

export function calculateM7(input: M7Input): M7Results {
  const concrete = CONCRETE_GRADES[input.materials.concreteGrade]
  const steel = STEEL_GRADES[input.materials.steelGrade]
  const fck = concrete.fck
  const fy = steel.fy
  const D = input.pileDiameter / 100 // m
  const Ap = Math.PI * D * D / 4 // m2
  const perimeter = Math.PI * D
  const L = input.pileLength
  const cover = input.materials.cover / 1000

  // Pile capacity from soil profile
  let Qs = 0 // shaft friction
  let depthAccum = 0

  for (const layer of input.soilProfile) {
    const midDepth = depthAccum + layer.thickness / 2
    if (layer.type === "granular") {
      // Beta method: fs = beta * sigma_v
      const sigma_v = midDepth * layer.gamma
      const beta = Math.min(0.25 + 0.01 * (layer.Nspt || 15), 1.2)
      const fs = beta * sigma_v // kPa
      Qs += fs * perimeter * Math.min(layer.thickness, L - depthAccum)
    } else {
      // Alpha method: fs = alpha * cu
      const alpha = Math.min(1.0, 0.55 - 0.1 * Math.log10((layer.cu || 50) / 25))
      const fs = Math.max(alpha, 0.3) * (layer.cu || 50) // kPa
      Qs += fs * perimeter * Math.min(layer.thickness, L - depthAccum)
    }
    depthAccum += layer.thickness
    if (depthAccum >= L) break
  }

  // Tip resistance
  const tipLayer = input.soilProfile[input.soilProfile.length - 1]
  let Qp: number
  if (tipLayer.type === "granular") {
    const Nq = Math.exp(Math.PI * Math.tan((tipLayer.phi || 30) * Math.PI / 180)) *
      Math.pow(Math.tan(Math.PI / 4 + (tipLayer.phi || 30) * Math.PI / 360), 2)
    const sigma_tip = L * (tipLayer.gamma || 18)
    Qp = Math.min(Nq * sigma_tip * Ap, 10000 * Ap) // limit tip
  } else {
    Qp = 9 * (tipLayer.cu || 50) * Ap
  }

  const Qu = Qp + Qs
  const Qadm = Qp / 3 + Qs / 2 // FS=3 tip, FS=2 shaft

  // Pile cap geometry (Jimenez Montoya patterns)
  const spacing = (input.pileSpacing || 3) * D // m
  const n = input.numPiles
  const colX = input.column.width / 100
  const colY = input.column.depth / 100

  let capWidth: number, capLength: number, pilePositions: { x: number; y: number }[]

  switch (n) {
    case 2:
      capWidth = spacing + D + 0.30
      capLength = D + 0.30 + colY
      pilePositions = [{ x: -spacing / 2, y: 0 }, { x: spacing / 2, y: 0 }]
      break
    case 3:
      capWidth = spacing + D + 0.30
      capLength = spacing * Math.sin(Math.PI / 3) + D + 0.30
      pilePositions = [
        { x: 0, y: spacing * Math.sin(Math.PI / 3) / 2 },
        { x: -spacing / 2, y: -spacing * Math.sin(Math.PI / 3) / 2 },
        { x: spacing / 2, y: -spacing * Math.sin(Math.PI / 3) / 2 },
      ]
      break
    case 4:
      capWidth = spacing + D + 0.30
      capLength = spacing + D + 0.30
      pilePositions = [
        { x: -spacing / 2, y: spacing / 2 },
        { x: spacing / 2, y: spacing / 2 },
        { x: -spacing / 2, y: -spacing / 2 },
        { x: spacing / 2, y: -spacing / 2 },
      ]
      break
    case 5:
      capWidth = spacing * 2 + D + 0.30
      capLength = spacing + D + 0.30
      pilePositions = [
        { x: -spacing, y: spacing / 2 },
        { x: 0, y: spacing / 2 },
        { x: spacing, y: spacing / 2 },
        { x: -spacing / 2, y: -spacing / 2 },
        { x: spacing / 2, y: -spacing / 2 },
      ]
      break
    default: // 6
      capWidth = spacing * 2 + D + 0.30
      capLength = spacing + D + 0.30
      pilePositions = [
        { x: -spacing, y: spacing / 2 },
        { x: 0, y: spacing / 2 },
        { x: spacing, y: spacing / 2 },
        { x: -spacing, y: -spacing / 2 },
        { x: 0, y: -spacing / 2 },
        { x: spacing, y: -spacing / 2 },
      ]
      break
  }

  capWidth = Math.ceil(capWidth * 20) / 20
  capLength = Math.ceil(capLength * 20) / 20
  const capHeight = Math.max(0.40, Math.ceil(spacing * 0.6 * 20) / 20)
  const d_cap = capHeight - cover - 0.016

  // Pile loads (assuming concentric load)
  const Nu = input.loads.N * 1.4 // simplified ELU
  const N_per_pile = Nu / n
  const Mx = (input.loads.Mx || 0) * 1.4
  const My = (input.loads.My || 0) * 1.4

  const sumX2 = pilePositions.reduce((s, p) => s + p.x * p.x, 0)
  const sumY2 = pilePositions.reduce((s, p) => s + p.y * p.y, 0)

  const pileLoads = pilePositions.map((p) => {
    return Nu / n + (Mx * p.y) / (sumY2 || 1) + (My * p.x) / (sumX2 || 1)
  })

  const maxPileLoad = Math.max(...pileLoads)
  const minPileLoad = Math.min(...pileLoads)
  const passCapacity = maxPileLoad / 1.4 <= Qadm // back to service

  // Strut and tie model
  const dist_pile = spacing / 2 // horizontal distance from column to nearest pile
  const thetaStrut = Math.atan(d_cap / dist_pile) * 180 / Math.PI
  const Fc_strut = maxPileLoad / Math.sin(thetaStrut * Math.PI / 180)
  const Ft_tie = maxPileLoad / Math.tan(thetaStrut * Math.PI / 180)
  const As_tie = Ft_tie / (fy * 1000 * PHI_FACTORS.flexion) * 10000 // cm2
  const tieBars = selectRebar(Math.max(As_tie, 2 * Math.PI * D * 100 * 0.0018 * d_cap * 100), capWidth)

  // Flexure
  const cantilever = (capWidth - colX) / 2
  const sigma_u_cap = Nu / (capWidth * capLength)
  const Mu_cap = sigma_u_cap * capLength * cantilever * cantilever / 2
  const AsReq = (Mu_cap * 1e6) / (0.9 * d_cap * 1000 * fy * 1000 * 0.85) // simplified
  const AsMin = 0.0018 * capWidth * 100 * d_cap * 100
  const flexBars = selectRebar(Math.max(AsReq, AsMin), capWidth)

  return {
    pileCapacity: {
      Qp: Math.round(Qp * 100) / 100,
      Qs: Math.round(Qs * 100) / 100,
      Qu: Math.round(Qu * 100) / 100,
      Qadm: Math.round(Qadm * 100) / 100,
    },
    capDesign: {
      type: `${n}-pile cap`,
      width: capWidth,
      length: capLength,
      height: capHeight,
      pilePositions,
      maxPileLoad: Math.round(maxPileLoad * 100) / 100,
      minPileLoad: Math.round(minPileLoad * 100) / 100,
      passCapacity,
    },
    strutTie: {
      Fc_strut: Math.round(Fc_strut * 100) / 100,
      Ft_tie: Math.round(Ft_tie * 100) / 100,
      thetaStrut: Math.round(thetaStrut * 10) / 10,
      As_tie: Math.round(As_tie * 100) / 100,
      bars: tieBars,
    },
    flexure: {
      Mu: Math.round(Mu_cap * 100) / 100,
      AsReq: Math.round(AsReq * 100) / 100,
      AsMin: Math.round(AsMin * 100) / 100,
      bars: flexBars,
    },
    governingCombination: "U1: 1.4D",
  }
}
