"use client"

import { cn } from "@/lib/utils"
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import type { VerificationStatus } from "@/lib/types/foundation"

interface VerificationIndicatorProps {
  status: VerificationStatus
  compact?: boolean
}

function getSeverityFromRatio(ratio: number, pass: boolean): "ok" | "warning" | "error" {
  if (!pass) return "error"
  if (ratio > 0.9) return "warning"
  return "ok"
}

export function VerificationIndicator({ status, compact = false }: VerificationIndicatorProps) {
  const severity = status.severity || getSeverityFromRatio(status.ratio, status.pass)

  const config = {
    ok: {
      icon: CheckCircle2,
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
      label: "OK",
    },
    warning: {
      icon: AlertTriangle,
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/20",
      label: "Ajustado",
    },
    error: {
      icon: XCircle,
      bg: "bg-red-500/10",
      text: "text-red-400",
      border: "border-red-500/20",
      label: "No verifica",
    },
  }[severity]

  const Icon = config.icon

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5", config.text)} title={status.label}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium font-mono">
          {(status.ratio * 100).toFixed(1)}%
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3",
        config.bg,
        config.border
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", config.text)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {status.label}
          </span>
          <span className={cn("text-xs font-bold font-mono shrink-0", config.text)}>
            {config.label}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-secondary">
            <div
              className={cn("h-full rounded-full transition-all", {
                "bg-emerald-500": severity === "ok",
                "bg-amber-500": severity === "warning",
                "bg-red-500": severity === "error",
              })}
              style={{ width: `${Math.min(status.ratio * 100, 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
            {status.value.toFixed(1)} / {status.limit.toFixed(1)}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{status.reference}</p>
      </div>
    </div>
  )
}

interface VerificationSummaryProps {
  items: VerificationStatus[]
}

export function VerificationSummary({ items }: VerificationSummaryProps) {
  const allPass = items.every((i) => i.pass)
  const hasWarning = items.some((i) => i.severity === "warning" || (i.pass && i.ratio > 0.9))

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold",
          allPass && !hasWarning && "bg-emerald-500/10 text-emerald-400",
          allPass && hasWarning && "bg-amber-500/10 text-amber-400",
          !allPass && "bg-red-500/10 text-red-400"
        )}
      >
        {allPass && !hasWarning && <CheckCircle2 className="h-4 w-4" />}
        {allPass && hasWarning && <AlertTriangle className="h-4 w-4" />}
        {!allPass && <XCircle className="h-4 w-4" />}
        {allPass && !hasWarning && "Todas las verificaciones cumplen"}
        {allPass && hasWarning && "Verificaciones cumplen con ajustes"}
        {!allPass && "Algunas verificaciones no cumplen"}
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <VerificationIndicator key={item.label} status={item} />
        ))}
      </div>
    </div>
  )
}
