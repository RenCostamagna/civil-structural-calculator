"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface WizardStepperProps {
  steps: string[]
  currentStep: number
  onStepClick?: (step: number) => void
}

export function WizardStepper({ steps, currentStep, onStepClick }: WizardStepperProps) {
  return (
    <nav aria-label="Progreso del calculo" className="w-full overflow-x-auto">
      <ol className="flex items-center gap-1 sm:gap-2">
        {steps.map((label, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isClickable = onStepClick && index <= currentStep

          return (
            <li key={label} className="flex flex-1 items-center gap-1 sm:gap-2 min-w-0">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick?.(index)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-xs font-medium transition-colors w-full sm:gap-2 sm:px-2",
                  isCompleted && "text-primary",
                  isCurrent && "text-foreground",
                  !isCompleted && !isCurrent && "text-muted-foreground",
                  isClickable && "hover:bg-secondary cursor-pointer",
                  !isClickable && "cursor-default"
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors sm:h-6 sm:w-6",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "border-2 border-primary text-primary",
                    !isCompleted && !isCurrent && "border border-border text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
                </div>
                <span className="hidden truncate md:inline">{label}</span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "hidden h-px flex-1 sm:block",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
