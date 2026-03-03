"use client"

import { useState, useCallback, useMemo } from "react"

export type UnitSystem = "SI" | "MKS"

// Conversion factors FROM SI TO target system
const conversions: Record<string, Record<UnitSystem, { factor: number; label: string }>> = {
  force: {
    SI: { factor: 1, label: "kN" },
    MKS: { factor: 101.97, label: "kgf" },
  },
  moment: {
    SI: { factor: 1, label: "kN.m" },
    MKS: { factor: 101.97, label: "kgf.m" },
  },
  stress: {
    SI: { factor: 1, label: "MPa" },
    MKS: { factor: 10.197, label: "kgf/cm2" },
  },
  pressure: {
    SI: { factor: 1, label: "kN/m2" },
    MKS: { factor: 101.97, label: "kgf/m2" },
  },
  length: {
    SI: { factor: 1, label: "m" },
    MKS: { factor: 100, label: "cm" },
  },
  area: {
    SI: { factor: 1, label: "cm2" },
    MKS: { factor: 1, label: "cm2" },
  },
  linearForce: {
    SI: { factor: 1, label: "kN/m" },
    MKS: { factor: 101.97, label: "kgf/m" },
  },
}

export function useUnits(initialSystem: UnitSystem = "SI") {
  const [system, setSystem] = useState<UnitSystem>(initialSystem)

  const convert = useCallback(
    (value: number, dimension: keyof typeof conversions): number => {
      const conv = conversions[dimension]
      if (!conv) return value
      return value * conv[system].factor
    },
    [system]
  )

  const label = useCallback(
    (dimension: keyof typeof conversions): string => {
      const conv = conversions[dimension]
      if (!conv) return ""
      return conv[system].label
    },
    [system]
  )

  const format = useCallback(
    (value: number, dimension: keyof typeof conversions, decimals = 2): string => {
      const converted = convert(value, dimension)
      return `${converted.toFixed(decimals)} ${label(dimension)}`
    },
    [convert, label]
  )

  const toggle = useCallback(() => {
    setSystem((prev) => (prev === "SI" ? "MKS" : "SI"))
  }, [])

  return useMemo(
    () => ({ system, setSystem, convert, label, format, toggle }),
    [system, setSystem, convert, label, format, toggle]
  )
}
