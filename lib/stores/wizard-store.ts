"use client"

import { create } from "zustand"
import type { M1Input, M2Input, M1Results, M2Results } from "@/lib/types/foundation"

interface WizardState {
  // Current module
  activeModule: string | null
  currentStep: number
  totalSteps: number

  // M1 state
  m1Input: Partial<M1Input>
  m1Results: M1Results | null

  // M2 state
  m2Input: Partial<M2Input>
  m2Results: M2Results | null

  // Actions
  setActiveModule: (moduleId: string, steps: number) => void
  setCurrentStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  resetWizard: () => void

  // M1 actions
  updateM1Input: (data: Partial<M1Input>) => void
  setM1Results: (results: M1Results) => void

  // M2 actions
  updateM2Input: (data: Partial<M2Input>) => void
  setM2Results: (results: M2Results) => void
}

export const useWizardStore = create<WizardState>((set) => ({
  activeModule: null,
  currentStep: 0,
  totalSteps: 0,

  m1Input: {
    projectName: "",
    column: { width: 30, depth: 30, shape: "rectangular" },
    loads: { N: 500 },
    soil: { sigmaAdm: 150, gamma_s: 18, Df: 1.2 },
    materials: { concreteGrade: "H25", steelGrade: "ADN420", cover: 70 },
  },
  m1Results: null,

  m2Input: {
    projectName: "",
    column: { width: 30, depth: 30, shape: "rectangular" },
    loads: { N: 500, Mx: 80 },
    loadComponents: { D: 300, L: 200, MD: 50, ML: 30 },
    soil: { sigmaAdm: 150, gamma_s: 18, Df: 1.2 },
    materials: { concreteGrade: "H25", steelGrade: "ADN420", cover: 70 },
    momentDirection: "x",
  },
  m2Results: null,

  setActiveModule: (moduleId, steps) =>
    set({ activeModule: moduleId, currentStep: 0, totalSteps: steps }),
  setCurrentStep: (step) => set({ currentStep: step }),
  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, state.totalSteps - 1),
    })),
  prevStep: () =>
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 0),
    })),
  resetWizard: () =>
    set({ activeModule: null, currentStep: 0, m1Results: null, m2Results: null }),

  updateM1Input: (data) =>
    set((state) => ({
      m1Input: { ...state.m1Input, ...data },
    })),
  setM1Results: (results) => set({ m1Results: results }),

  updateM2Input: (data) =>
    set((state) => ({
      m2Input: { ...state.m2Input, ...data },
    })),
  setM2Results: (results) => set({ m2Results: results }),
}))
