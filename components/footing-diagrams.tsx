"use client"

// SVG Footing Diagrams - Plan view, Section view, Rebar layout
// All measurements shown with dimension lines and labels

interface FootingDiagramProps {
  B: number // m - width
  L: number // m - length
  H: number // m - height
  colX: number // cm - column X
  colY: number // cm - column Y
  d?: number // m - effective depth
  rebarX?: { count: number; diameter: number; spacing: number }
  rebarY?: { count: number; diameter: number; spacing: number }
  pressureType?: "uniform" | "trapezoidal" | "triangular" | "partial"
  sigmaMax?: number
  sigmaMin?: number
}

// Dimension line helper
function DimLine({
  x1, y1, x2, y2, label, offset = 15, side = "bottom",
}: {
  x1: number; y1: number; x2: number; y2: number
  label: string; offset?: number; side?: "bottom" | "top" | "left" | "right"
}) {
  const isHorizontal = side === "bottom" || side === "top"
  const sign = side === "bottom" || side === "right" ? 1 : -1

  if (isHorizontal) {
    const yOff = y1 + sign * offset
    return (
      <g className="text-muted-foreground">
        <line x1={x1} y1={y1} x2={x1} y2={yOff} stroke="currentColor" strokeWidth={0.5} strokeDasharray="2,2" />
        <line x1={x2} y1={y2} x2={x2} y2={yOff} stroke="currentColor" strokeWidth={0.5} strokeDasharray="2,2" />
        <line x1={x1} y1={yOff} x2={x2} y2={yOff} stroke="currentColor" strokeWidth={0.8} markerStart="url(#arrowL)" markerEnd="url(#arrowR)" />
        <text x={(x1 + x2) / 2} y={yOff + sign * 10} textAnchor="middle" fill="currentColor" fontSize={9} fontFamily="monospace">
          {label}
        </text>
      </g>
    )
  }

  const xOff = x1 + sign * offset
  return (
    <g className="text-muted-foreground">
      <line x1={x1} y1={y1} x2={xOff} y2={y1} stroke="currentColor" strokeWidth={0.5} strokeDasharray="2,2" />
      <line x1={x2} y1={y2} x2={xOff} y2={y2} stroke="currentColor" strokeWidth={0.5} strokeDasharray="2,2" />
      <line x1={xOff} y1={y1} x2={xOff} y2={y2} stroke="currentColor" strokeWidth={0.8} markerStart="url(#arrowU)" markerEnd="url(#arrowD)" />
      <text x={xOff + sign * 10} y={(y1 + y2) / 2} textAnchor="middle" fill="currentColor" fontSize={9} fontFamily="monospace" transform={`rotate(-90,${xOff + sign * 10},${(y1 + y2) / 2})`}>
        {label}
      </text>
    </g>
  )
}

function ArrowDefs() {
  return (
    <defs>
      <marker id="arrowR" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6" fill="none" stroke="currentColor" strokeWidth={0.8} className="text-muted-foreground" />
      </marker>
      <marker id="arrowL" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto">
        <path d="M6,0 L0,3 L6,6" fill="none" stroke="currentColor" strokeWidth={0.8} className="text-muted-foreground" />
      </marker>
      <marker id="arrowU" markerWidth="6" markerHeight="6" refX="3" refY="0" orient="auto">
        <path d="M0,6 L3,0 L6,6" fill="none" stroke="currentColor" strokeWidth={0.8} className="text-muted-foreground" />
      </marker>
      <marker id="arrowD" markerWidth="6" markerHeight="6" refX="3" refY="6" orient="auto">
        <path d="M0,0 L3,6 L6,0" fill="none" stroke="currentColor" strokeWidth={0.8} className="text-muted-foreground" />
      </marker>
      <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth={0.5} className="text-primary/20" />
      </pattern>
    </defs>
  )
}

export function FootingPlanView({
  B, L, colX, colY,
}: Pick<FootingDiagramProps, "B" | "L" | "colX" | "colY">) {
  const scale = 180 / Math.max(B, L)
  const w = B * scale
  const h = L * scale
  const cw = (colX / 100) * scale
  const ch = (colY / 100) * scale
  const pad = 50
  const svgW = w + pad * 2
  const svgH = h + pad * 2
  const ox = pad
  const oy = pad

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-xs" role="img" aria-label={`Planta de zapata ${B}m x ${L}m`}>
      <ArrowDefs />
      {/* Footing */}
      <rect x={ox} y={oy} width={w} height={h} fill="url(#hatch)" stroke="currentColor" strokeWidth={1.5} className="text-foreground" rx={2} />
      {/* Column */}
      <rect
        x={ox + (w - cw) / 2} y={oy + (h - ch) / 2}
        width={cw} height={ch}
        fill="oklch(0.72 0.12 180 / 0.3)"
        stroke="oklch(0.72 0.12 180)" strokeWidth={1.5}
      />
      {/* Center axes */}
      <line x1={ox + w / 2} y1={oy - 10} x2={ox + w / 2} y2={oy + h + 10} stroke="currentColor" strokeWidth={0.5} strokeDasharray="4,4" className="text-muted-foreground/40" />
      <line x1={ox - 10} y1={oy + h / 2} x2={ox + w + 10} y2={oy + h / 2} stroke="currentColor" strokeWidth={0.5} strokeDasharray="4,4" className="text-muted-foreground/40" />
      {/* Dimensions */}
      <DimLine x1={ox} y1={oy + h} x2={ox + w} y2={oy + h} label={`B=${B.toFixed(2)}m`} offset={20} side="bottom" />
      <DimLine x1={ox + w} y1={oy} x2={ox + w} y2={oy + h} label={`L=${L.toFixed(2)}m`} offset={20} side="right" />
      {/* Column dims */}
      <DimLine x1={ox + (w - cw) / 2} y1={oy} x2={ox + (w + cw) / 2} y2={oy} label={`${colX}cm`} offset={15} side="top" />
      {/* Labels */}
      <text x={ox + w / 2} y={oy - 20} textAnchor="middle" fill="currentColor" fontSize={10} fontWeight="bold" className="text-foreground">
        PLANTA
      </text>
    </svg>
  )
}

export function FootingSectionView({
  B, H, colX, d,
}: Pick<FootingDiagramProps, "B" | "H" | "colX" | "d">) {
  const scaleX = 200 / B
  const scaleY = 120 / Math.max(H, 0.4)
  const scale = Math.min(scaleX, scaleY)
  const w = B * scale
  const h = H * scale
  const cw = (colX / 100) * scale
  const colH = Math.min(h * 0.6, 40)
  const pad = 50
  const svgW = w + pad * 2
  const svgH = h + colH + pad * 2
  const ox = pad
  const oy = pad + colH

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-xs" role="img" aria-label={`Corte de zapata H=${H}m`}>
      <ArrowDefs />
      {/* Footing section */}
      <rect x={ox} y={oy} width={w} height={h} fill="url(#hatch)" stroke="currentColor" strokeWidth={1.5} className="text-foreground" rx={1} />
      {/* Column stub */}
      <rect
        x={ox + (w - cw) / 2} y={oy - colH}
        width={cw} height={colH}
        fill="oklch(0.72 0.12 180 / 0.3)"
        stroke="oklch(0.72 0.12 180)" strokeWidth={1.5}
      />
      {/* Effective depth line */}
      {d && d > 0 && (
        <>
          <line
            x1={ox + 5} y1={oy + h - d * scale}
            x2={ox + w - 5} y2={oy + h - d * scale}
            stroke="currentColor" strokeWidth={0.8} strokeDasharray="3,3" className="text-amber-400"
          />
          <text x={ox + w + 5} y={oy + h - d * scale + 3} fill="currentColor" fontSize={8} className="text-amber-400" fontFamily="monospace">
            d={((d || 0) * 100).toFixed(0)}cm
          </text>
        </>
      )}
      {/* Rebar dots at bottom */}
      {[0.15, 0.3, 0.5, 0.7, 0.85].map((p) => (
        <circle key={p} cx={ox + w * p} cy={oy + h - 8} r={3} fill="currentColor" className="text-primary" />
      ))}
      {/* Dimensions */}
      <DimLine x1={ox} y1={oy + h} x2={ox + w} y2={oy + h} label={`B=${B.toFixed(2)}m`} offset={20} side="bottom" />
      <DimLine x1={ox} y1={oy} x2={ox} y2={oy + h} label={`H=${(H * 100).toFixed(0)}cm`} offset={25} side="left" />
      {/* Label */}
      <text x={ox + w / 2} y={oy - colH - 10} textAnchor="middle" fill="currentColor" fontSize={10} fontWeight="bold" className="text-foreground">
        CORTE
      </text>
      {/* Ground line */}
      <line x1={ox - 15} y1={oy} x2={ox + w + 15} y2={oy} stroke="currentColor" strokeWidth={0.8} className="text-muted-foreground" />
      {/* Ground hatching */}
      {Array.from({ length: Math.ceil((w + 30) / 6) }).map((_, i) => (
        <line key={i} x1={ox - 15 + i * 6} y1={oy} x2={ox - 15 + i * 6 - 4} y2={oy - 5} stroke="currentColor" strokeWidth={0.5} className="text-muted-foreground" />
      ))}
    </svg>
  )
}

export function PressureDiagram({
  B, L, sigmaMax, sigmaMin, pressureType,
}: Pick<FootingDiagramProps, "B" | "L" | "sigmaMax" | "sigmaMin" | "pressureType">) {
  if (!sigmaMax) return null

  const w = 200
  const h = 60
  const pad = 40
  const svgW = w + pad * 2
  const svgH = h + pad * 2 + 20
  const ox = pad
  const oy = pad

  const maxH = h
  const minH = sigmaMin && sigmaMax > 0 ? (sigmaMin / sigmaMax) * h : 0
  const isNeg = (sigmaMin || 0) < 0

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-xs" role="img" aria-label="Distribucion de presiones">
      <ArrowDefs />
      {/* Footing base line */}
      <line x1={ox} y1={oy} x2={ox + w} y2={oy} stroke="currentColor" strokeWidth={1.5} className="text-foreground" />
      {/* Pressure trapezoid */}
      <path
        d={`M${ox},${oy} L${ox},${oy + maxH} L${ox + w},${oy + Math.max(minH, 0)} L${ox + w},${oy} Z`}
        fill="oklch(0.72 0.12 180 / 0.15)" stroke="oklch(0.72 0.12 180)" strokeWidth={1}
      />
      {/* Negative zone */}
      {isNeg && sigmaMin && (
        <path
          d={`M${ox + w},${oy} L${ox + w},${oy - Math.abs(minH)} L${ox + w * 0.7},${oy} Z`}
          fill="oklch(0.58 0.22 27 / 0.15)" stroke="oklch(0.58 0.22 27)" strokeWidth={1}
        />
      )}
      {/* Labels */}
      <text x={ox - 5} y={oy + maxH + 4} textAnchor="end" fill="currentColor" fontSize={8} fontFamily="monospace" className="text-primary">
        {sigmaMax?.toFixed(1)}
      </text>
      <text x={ox + w + 5} y={oy + Math.max(minH, 0) + 4} textAnchor="start" fill="currentColor" fontSize={8} fontFamily="monospace" className={isNeg ? "text-red-400" : "text-primary"}>
        {sigmaMin?.toFixed(1)}
      </text>
      <text x={ox - 5} y={oy + maxH + 15} textAnchor="end" fill="currentColor" fontSize={7} className="text-muted-foreground">
        kN/m²
      </text>
      {/* Type label */}
      <text x={ox + w / 2} y={oy + maxH + 25} textAnchor="middle" fill="currentColor" fontSize={9} fontWeight="500" className="text-foreground">
        {pressureType === "uniform" && "Uniforme"}
        {pressureType === "trapezoidal" && "Trapezoidal"}
        {pressureType === "triangular" && "Triangular"}
        {pressureType === "partial" && "Parcial (despegue)"}
      </text>
    </svg>
  )
}
