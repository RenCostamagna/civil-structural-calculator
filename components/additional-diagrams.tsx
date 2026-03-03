"use client"

// Additional SVG diagrams for M3-M8 modules

function ArrowDefs() {
  return (
    <defs>
      <marker id="arrR" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6" fill="none" stroke="currentColor" strokeWidth={0.8} className="text-muted-foreground" />
      </marker>
      <marker id="arrL" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto">
        <path d="M6,0 L0,3 L6,6" fill="none" stroke="currentColor" strokeWidth={0.8} className="text-muted-foreground" />
      </marker>
      <pattern id="hatch2" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth={0.5} className="text-primary/20" />
      </pattern>
      <pattern id="soilHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
        <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth={0.4} className="text-muted-foreground/30" />
      </pattern>
    </defs>
  )
}

/* ---- Rebar Plan View ---- */
export function RebarPlanView({
  B, L, rebarCountX, rebarCountY, spacingX, spacingY, diamX, diamY,
}: {
  B: number; L: number
  rebarCountX: number; rebarCountY: number
  spacingX: number; spacingY: number
  diamX: number; diamY: number
}) {
  const scale = 180 / Math.max(B, L)
  const w = B * scale
  const h = L * scale
  const pad = 45
  const svgW = w + pad * 2
  const svgH = h + pad * 2
  const ox = pad
  const oy = pad
  const cover = 6

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-xs" role="img" aria-label="Armaduras en planta">
      <ArrowDefs />
      <rect x={ox} y={oy} width={w} height={h} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-foreground" rx={2} />

      {/* X-direction bars (horizontal, bottom layer) */}
      {Array.from({ length: Math.min(rebarCountX, 20) }).map((_, i) => {
        const spacing = (h - cover * 2) / (Math.min(rebarCountX, 20) - 1 || 1)
        const y = oy + cover + i * spacing
        return (
          <line key={`x${i}`} x1={ox + cover} y1={y} x2={ox + w - cover} y2={y}
            stroke="oklch(0.72 0.12 180)" strokeWidth={Math.max(1, diamX / 8)} opacity={0.7} />
        )
      })}

      {/* Y-direction bars (vertical, top layer) */}
      {Array.from({ length: Math.min(rebarCountY, 20) }).map((_, i) => {
        const spacing = (w - cover * 2) / (Math.min(rebarCountY, 20) - 1 || 1)
        const x = ox + cover + i * spacing
        return (
          <line key={`y${i}`} x1={x} y1={oy + cover} x2={x} y2={oy + h - cover}
            stroke="oklch(0.58 0.22 27)" strokeWidth={Math.max(1, diamY / 8)} opacity={0.6} />
        )
      })}

      {/* Labels */}
      <text x={ox + w / 2} y={oy - 8} textAnchor="middle" fill="currentColor" fontSize={9} fontWeight="bold" className="text-foreground">
        ARMADURAS EN PLANTA
      </text>
      <text x={ox + w + 5} y={oy + h / 2 - 6} fill="oklch(0.72 0.12 180)" fontSize={7} fontFamily="monospace">
        {rebarCountX}d{diamX} c/{spacingX.toFixed(0)}cm
      </text>
      <text x={ox + w / 2} y={oy + h + 14} textAnchor="middle" fill="oklch(0.58 0.22 27)" fontSize={7} fontFamily="monospace">
        {rebarCountY}d{diamY} c/{spacingY.toFixed(0)}cm
      </text>
    </svg>
  )
}

/* ---- Tensor Diagram (M4) ---- */
export function TensorDiagram({
  footingB, footingL, tensorLength, tensorSection,
}: {
  footingB: number; footingL: number; tensorLength: number; tensorSection: { b: number; h: number }
}) {
  const totalLen = footingB + tensorLength
  const scale = 240 / totalLen
  const fw = footingB * scale
  const fh = footingL * scale * 0.4
  const tw = tensorLength * scale
  const th = tensorSection.h * scale * 0.5
  const pad = 40
  const svgW = fw + tw + pad * 2
  const svgH = Math.max(fh, th) + pad * 2
  const ox = pad
  const cy = pad + Math.max(fh, th) / 2

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-sm" role="img" aria-label="Esquema de tensor">
      <ArrowDefs />
      {/* Footing */}
      <rect x={ox} y={cy - fh / 2} width={fw} height={fh} fill="url(#hatch2)" stroke="currentColor" strokeWidth={1.5} className="text-foreground" rx={2} />
      {/* Tensor beam */}
      <rect x={ox + fw} y={cy - th / 2} width={tw} height={th} fill="oklch(0.72 0.12 180 / 0.15)" stroke="oklch(0.72 0.12 180)" strokeWidth={1.5} rx={1} />
      {/* Rebar line */}
      <line x1={ox + fw * 0.2} y1={cy} x2={ox + fw + tw * 0.8} y2={cy} stroke="oklch(0.58 0.22 27)" strokeWidth={2} strokeDasharray="6,3" />
      {/* Dimension - tensor */}
      <line x1={ox + fw} y1={cy + fh / 2 + 10} x2={ox + fw + tw} y2={cy + fh / 2 + 10} stroke="currentColor" strokeWidth={0.8} markerStart="url(#arrL)" markerEnd="url(#arrR)" className="text-muted-foreground" />
      <text x={ox + fw + tw / 2} y={cy + fh / 2 + 22} textAnchor="middle" fill="currentColor" fontSize={8} fontFamily="monospace" className="text-muted-foreground">
        Lt={tensorLength.toFixed(2)}m
      </text>
      <text x={ox + fw / 2} y={cy - fh / 2 - 6} textAnchor="middle" fill="currentColor" fontSize={9} fontWeight="bold" className="text-foreground">
        BASE
      </text>
      <text x={ox + fw + tw / 2} y={cy - th / 2 - 6} textAnchor="middle" fill="currentColor" fontSize={9} fontWeight="bold" className="text-foreground">
        TENSOR
      </text>
    </svg>
  )
}

/* ---- Equilibrium Beam Diagram (M5) ---- */
export function EquilibriumBeamDiagram({
  base1B, base2B, beamLength, beamSection,
}: {
  base1B: number; base2B: number; beamLength: number; beamSection: { b: number; h: number }
}) {
  const totalLen = base1B / 2 + beamLength + base2B / 2
  const scale = 260 / totalLen
  const f1w = base1B * scale
  const f2w = base2B * scale
  const bw = beamLength * scale
  const fh = 30
  const bh = beamSection.h * scale * 0.3
  const pad = 35
  const svgW = f1w + bw + f2w + pad * 2
  const svgH = fh + bh + pad * 2
  const ox = pad
  const oy = pad

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md" role="img" aria-label="Viga de equilibrio">
      <ArrowDefs />
      {/* Base 1 (medianera) */}
      <rect x={ox} y={oy} width={f1w} height={fh} fill="url(#hatch2)" stroke="currentColor" strokeWidth={1.5} className="text-foreground" rx={2} />
      <text x={ox + f1w / 2} y={oy - 5} textAnchor="middle" fill="currentColor" fontSize={8} fontWeight="bold" className="text-foreground">C1 (med.)</text>
      {/* Beam */}
      <rect x={ox + f1w} y={oy + (fh - bh) / 2} width={bw} height={bh} fill="oklch(0.72 0.12 180 / 0.15)" stroke="oklch(0.72 0.12 180)" strokeWidth={1.5} rx={1} />
      {/* Base 2 (interior) */}
      <rect x={ox + f1w + bw} y={oy} width={f2w} height={fh} fill="url(#hatch2)" stroke="currentColor" strokeWidth={1.5} className="text-foreground" rx={2} />
      <text x={ox + f1w + bw + f2w / 2} y={oy - 5} textAnchor="middle" fill="currentColor" fontSize={8} fontWeight="bold" className="text-foreground">C2 (int.)</text>
      {/* Columns */}
      <rect x={ox + f1w * 0.3} y={oy - 15} width={12} height={15} fill="oklch(0.72 0.12 180 / 0.4)" stroke="oklch(0.72 0.12 180)" strokeWidth={1} />
      <rect x={ox + f1w + bw + f2w * 0.4} y={oy - 15} width={12} height={15} fill="oklch(0.72 0.12 180 / 0.4)" stroke="oklch(0.72 0.12 180)" strokeWidth={1} />
      {/* Beam dimension */}
      <line x1={ox + f1w} y1={oy + fh + 10} x2={ox + f1w + bw} y2={oy + fh + 10} stroke="currentColor" strokeWidth={0.8} markerStart="url(#arrL)" markerEnd="url(#arrR)" className="text-muted-foreground" />
      <text x={ox + f1w + bw / 2} y={oy + fh + 22} textAnchor="middle" fill="currentColor" fontSize={8} fontFamily="monospace" className="text-muted-foreground">
        L_viga={beamLength.toFixed(2)}m
      </text>
      <text x={ox + f1w + bw / 2} y={oy + (fh - bh) / 2 - 4} textAnchor="middle" fill="currentColor" fontSize={8} fontWeight="bold" className="text-foreground">
        VIGA EQ.
      </text>
    </svg>
  )
}

/* ---- Pile Cap Diagram (M7) ---- */
export function PileCapDiagram({
  numPiles, pileD, capB, capL, pileSpacing,
}: {
  numPiles: number; pileD: number; capB: number; capL: number; pileSpacing: number
}) {
  const scale = 180 / Math.max(capB, capL)
  const w = capB * scale
  const h = capL * scale
  const r = (pileD / 2) * scale * 0.5
  const pad = 40
  const svgW = w + pad * 2
  const svgH = h + pad * 2
  const ox = pad + (svgW - pad * 2 - w) / 2
  const oy = pad

  // Pile positions based on count (Jimenez Montoya layouts)
  const positions: [number, number][] = []
  const cx = w / 2
  const cy = h / 2
  const sp = pileSpacing * scale * 0.3

  if (numPiles === 2) {
    positions.push([cx - sp, cy], [cx + sp, cy])
  } else if (numPiles === 3) {
    positions.push([cx, cy - sp * 0.6], [cx - sp * 0.5, cy + sp * 0.4], [cx + sp * 0.5, cy + sp * 0.4])
  } else if (numPiles === 4) {
    positions.push([cx - sp, cy - sp], [cx + sp, cy - sp], [cx - sp, cy + sp], [cx + sp, cy + sp])
  } else if (numPiles === 5) {
    positions.push([cx, cy], [cx - sp, cy - sp], [cx + sp, cy - sp], [cx - sp, cy + sp], [cx + sp, cy + sp])
  } else if (numPiles === 6) {
    positions.push(
      [cx - sp, cy - sp], [cx, cy - sp], [cx + sp, cy - sp],
      [cx - sp, cy + sp], [cx, cy + sp], [cx + sp, cy + sp],
    )
  }

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-xs" role="img" aria-label={`Cabezal ${numPiles} pilotes`}>
      <ArrowDefs />
      {/* Cap outline */}
      <rect x={ox} y={oy} width={w} height={h} fill="url(#hatch2)" stroke="currentColor" strokeWidth={1.5} className="text-foreground" rx={3} />
      {/* Piles */}
      {positions.map(([px, py], i) => (
        <g key={i}>
          <circle cx={ox + px} cy={oy + py} r={r} fill="oklch(0.72 0.12 180 / 0.3)" stroke="oklch(0.72 0.12 180)" strokeWidth={1.5} />
          <text x={ox + px} y={oy + py + 3} textAnchor="middle" fill="oklch(0.72 0.12 180)" fontSize={7} fontWeight="bold">
            P{i + 1}
          </text>
        </g>
      ))}
      {/* Column (center) */}
      <rect x={ox + cx - 8} y={oy + cy - 8} width={16} height={16} fill="oklch(0.58 0.22 27 / 0.3)" stroke="oklch(0.58 0.22 27)" strokeWidth={1.5} />
      {/* Labels */}
      <text x={ox + w / 2} y={oy - 8} textAnchor="middle" fill="currentColor" fontSize={9} fontWeight="bold" className="text-foreground">
        CABEZAL - {numPiles} PILOTES
      </text>
      <text x={ox + w / 2} y={oy + h + 14} textAnchor="middle" fill="currentColor" fontSize={7} fontFamily="monospace" className="text-muted-foreground">
        {capB.toFixed(2)}m x {capL.toFixed(2)}m | D={pileD}cm | s={pileSpacing.toFixed(2)}m
      </text>
    </svg>
  )
}

/* ---- Broms Lateral Resistance (M8) ---- */
export function BromsLateralDiagram({
  pileLength, pileD, soilType, Hu, Mu,
}: {
  pileLength: number; pileD: number; soilType: "granular" | "cohesive"
  Hu: number; Mu: number
}) {
  const scale = 200 / pileLength
  const pileH = pileLength * scale
  const pw = Math.max(pileD * 0.6, 12)
  const pad = 50
  const svgW = 200
  const svgH = pileH + pad * 2
  const cx = svgW / 2
  const oy = pad

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-[200px]" role="img" aria-label="Resistencia lateral Broms">
      <ArrowDefs />
      {/* Ground level */}
      <line x1={20} y1={oy} x2={svgW - 20} y2={oy} stroke="currentColor" strokeWidth={1} className="text-muted-foreground" />
      {Array.from({ length: 14 }).map((_, i) => (
        <line key={i} x1={20 + i * 12} y1={oy} x2={20 + i * 12 - 5} y2={oy - 6} stroke="currentColor" strokeWidth={0.5} className="text-muted-foreground" />
      ))}
      {/* Pile shaft */}
      <rect x={cx - pw / 2} y={oy} width={pw} height={pileH} fill="oklch(0.72 0.12 180 / 0.2)" stroke="oklch(0.72 0.12 180)" strokeWidth={1.5} rx={1} />
      {/* Lateral force arrow */}
      <line x1={cx - pw / 2 - 30} y1={oy + 5} x2={cx - pw / 2} y2={oy + 5} stroke="oklch(0.58 0.22 27)" strokeWidth={2} markerEnd="url(#arrR)" />
      <text x={cx - pw / 2 - 32} y={oy + 9} textAnchor="end" fill="oklch(0.58 0.22 27)" fontSize={8} fontFamily="monospace">
        Hu={Hu.toFixed(0)}kN
      </text>
      {/* Soil pressure distribution */}
      {soilType === "granular" ? (
        // Triangular for granular
        <path d={`M${cx + pw / 2},${oy} L${cx + pw / 2 + 25},${oy + pileH} L${cx + pw / 2},${oy + pileH} Z`}
          fill="oklch(0.80 0.16 85 / 0.15)" stroke="oklch(0.80 0.16 85)" strokeWidth={0.8} />
      ) : (
        // Rectangular for cohesive
        <rect x={cx + pw / 2} y={oy + pileH * 0.2} width={20} height={pileH * 0.6}
          fill="oklch(0.80 0.16 85 / 0.15)" stroke="oklch(0.80 0.16 85)" strokeWidth={0.8} />
      )}
      {/* Labels */}
      <text x={cx} y={oy - 12} textAnchor="middle" fill="currentColor" fontSize={9} fontWeight="bold" className="text-foreground">
        BROMS - {soilType === "granular" ? "GRANULAR" : "COHESIVO"}
      </text>
      <text x={cx + pw / 2 + 30} y={oy + pileH / 2} fill="currentColor" fontSize={7} className="text-muted-foreground" fontFamily="monospace">
        L={pileLength.toFixed(1)}m
      </text>
      <text x={cx} y={oy + pileH + 16} textAnchor="middle" fill="currentColor" fontSize={7} fontFamily="monospace" className="text-muted-foreground">
        D={pileD}cm | Mu={Mu.toFixed(0)}kN.m
      </text>
    </svg>
  )
}
