"use client"

import { Button } from "@/components/ui/button"
import type { UnitSystem } from "@/hooks/use-units"

interface UnitsToggleProps {
  system: UnitSystem
  onToggle: () => void
}

export function UnitsToggle({ system, onToggle }: UnitsToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
      <Button
        variant={system === "SI" ? "default" : "ghost"}
        size="sm"
        className="h-6 px-2 text-[10px] font-bold"
        onClick={system === "SI" ? undefined : onToggle}
      >
        SI (kN, m)
      </Button>
      <Button
        variant={system === "MKS" ? "default" : "ghost"}
        size="sm"
        className="h-6 px-2 text-[10px] font-bold"
        onClick={system === "MKS" ? undefined : onToggle}
      >
        MKS (kgf, cm)
      </Button>
    </div>
  )
}
