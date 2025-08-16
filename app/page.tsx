"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProgressStepper } from "./components/ProgressStepper";
import { DesignStep } from "./components/DesignStep";
import { TryOnStep } from "./components/TryOnStep";
import { OrderStep } from "./components/OrderStep";
import type { FormValues } from "./utils/types";
import {
  saveFormData,
  loadFormData,
  saveCurrentStep,
  loadCurrentStep,
  clearAllData,
} from "./utils/localStorage";

const defaultValues: FormValues = {
  frontDrawing: null,
  backDrawing: null,
  designDescription: "",
  selectedColor: "#000000",
  designVariations: [],
  selectedFront: null,
  selectedBack: null,
  personImage: null,
  tryOnResult: null,
  tailorForm: {
    fullName: "",
    contact: "",
    bust: "",
    waist: "",
    hips: "",
    height: "",
    weight: "",
    additionalNotes: "",
  },
};

export default function VirtualTryOnPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    defaultValues,
  });

  const { watch, reset } = form;
  const formData = watch();

  useEffect(() => {
    const savedData = loadFormData();
    const savedStep = loadCurrentStep();

    if (Object.keys(savedData).length > 0) {
      reset({ ...defaultValues, ...savedData });
    }
    setCurrentStep(savedStep);
  }, [reset]);

  useEffect(() => {
    if (formData.frontDrawing || formData.designVariations.length > 0) {
      saveFormData(formData);
    }
  }, [formData]);

  useEffect(() => {
    saveCurrentStep(currentStep);
  }, [currentStep]);

  const steps = [
    {
      id: "design",
      label: "Design",
      completed: currentStep > 0,
      current: currentStep === 0,
    },
    {
      id: "tryon",
      label: "Try On",
      completed: currentStep > 1,
      current: currentStep === 1,
    },
    {
      id: "order",
      label: "Order",
      completed: false,
      current: currentStep === 2,
    },
  ];

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const onStepChange = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleStartOver = () => {
    clearAllData();
    reset(defaultValues);
    setCurrentStep(0);
    toast({
      title: "Reset complete",
      description: "All data has been cleared. Starting fresh!",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Virtual Dress Studio
          </h1>
          <p className="text-lg text-gray-600">
            Design, try on, and order your custom dress
          </p>
        </div>

        {/* Progress Stepper */}
        <ProgressStepper
          steps={steps}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
        />

        {/* Start Over Button */}
        <div className="flex justify-end mb-6">
          <Button
            variant="outline"
            onClick={handleStartOver}
            className="flex items-center gap-2 bg-transparent"
          >
            <RotateCcw className="h-4 w-4" />
            Start Over
          </Button>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {currentStep === 0 && <DesignStep form={form} onNext={handleNext} />}
          {currentStep === 1 && <TryOnStep form={form} onNext={handleNext} />}
          {currentStep === 2 && <OrderStep form={form} />}
        </div>
      </div>
    </div>
  );
}
