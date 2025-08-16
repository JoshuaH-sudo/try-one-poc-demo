"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
  completed: boolean;
  current: boolean;
}

interface ProgressStepperProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (stepIndex: number) => void;
}

export function ProgressStepper({
  steps,
  currentStep,
  onStepChange,
}: ProgressStepperProps) {
  return (
    <div className="py-8 mx-auto">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center",

              index < steps.length - 1 && "w-full grow"
            )}
          >
            <div
              className={cn(
                "flex flex-col items-center grow-0",
                index < currentStep && "cursor-pointer hover:bg-gray-200 rounded-2xl p-2"
              )}
              onClick={() => index < currentStep && onStepChange(index)}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium",
                  step.completed
                    ? "border-green-500 bg-green-500 text-white"
                    : step.current
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-gray-300 bg-white text-gray-500"
                )}
              >
                {step.completed ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-sm font-medium",
                  step.current ? "text-blue-600" : "text-gray-500"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "mx-4 h-0.5 grow bg-gray-300",
                  step.completed && "bg-green-500"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
