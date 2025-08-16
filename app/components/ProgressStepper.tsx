"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Step {
  id: string
  label: string
  completed: boolean
  current: boolean
}

interface ProgressStepperProps {
  steps: Step[]
}

export function ProgressStepper({ steps }: ProgressStepperProps) {
  return (
    <div className="w-full py-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium",
                  step.completed
                    ? "border-green-500 bg-green-500 text-white"
                    : step.current
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-gray-300 bg-white text-gray-500",
                )}
              >
                {step.completed ? <Check className="h-5 w-5" /> : <span>{index + 1}</span>}
              </div>
              <span className={cn("mt-2 text-sm font-medium", step.current ? "text-blue-600" : "text-gray-500")}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn("mx-4 h-0.5 w-16 bg-gray-300", step.completed && "bg-green-500")} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
