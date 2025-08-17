"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { UseFormReturn } from "react-hook-form";
import type { FormValues } from "../utils/types";
import Image from "next/image";

interface OrderStepProps {
  form: UseFormReturn<FormValues>;
}

export function OrderStep({ form }: OrderStepProps) {
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const { toast } = useToast();

  const {
    watch,
    setValue,
    register,
    formState: { errors },
  } = form;
  const tailorForm = watch("tailorForm");
  const selectedFront = watch("selectedFront");
  const selectedBack = watch("selectedBack");
  const tryOnResult = watch("tryOnResult");

  const submitToTailor = async () => {
    if (!tailorForm.fullName || !tailorForm.contact) {
      toast({
        title: "Missing information",
        description: "Please fill in your name and contact information.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingOrder(true);

    try {
      const orderData = {
        ...tailorForm,
        designImages: {
          front: selectedFront,
          back: selectedBack,
        },
        tryOnImage: tryOnResult?.imageUrl,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch("/api/submit-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Order submission failed");
      }

      toast({
        title: "Order submitted!",
        description: "Your custom dress order has been sent to the tailor.",
      });
    } catch (error) {
      console.error("Error submitting order:", error);
      toast({
        title: "Submission failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  console.log("try on result", tryOnResult);

  return (
    <div className="space-y-6 flex flex-row justify-between gap-2">
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Try-On Result
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 h-full">
          {tryOnResult ? (
            <div className="relative w-full rounded-lg overflow-hidden">
              <Image
                src={tryOnResult.imageUrl}
                alt="Try-On Result"
                // 1024x1536
                width={1024 / 4}
                height={1536 / 4}
                className="rounded-lg object-cover w-full"
              />
            </div>
          ) : (
            <p className="text-sm text-gray-500">No try-on result available</p>
          )}
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Submit Order to Tailor
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                {...register("tailorForm.fullName", {
                  required: "Full name is required",
                })}
                placeholder="Enter your full name"
              />
              {errors.tailorForm?.fullName && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.tailorForm.fullName.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="contact">Contact (WhatsApp/Telegram) *</Label>
              <Input
                id="contact"
                {...register("tailorForm.contact", {
                  required: "Contact is required",
                })}
                placeholder="+1234567890"
              />
              {errors.tailorForm?.contact && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.tailorForm.contact.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="bust">Bust (inches)</Label>
              <Input
                id="bust"
                {...register("tailorForm.bust")}
                placeholder="34"
              />
            </div>

            <div>
              <Label htmlFor="waist">Waist (inches)</Label>
              <Input
                id="waist"
                {...register("tailorForm.waist")}
                placeholder="28"
              />
            </div>

            <div>
              <Label htmlFor="hips">Hips (inches)</Label>
              <Input
                id="hips"
                {...register("tailorForm.hips")}
                placeholder="36"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="height">Height (feet)</Label>
              <Input
                id="height"
                {...register("tailorForm.height")}
                placeholder="5'6&quot;"
              />
            </div>

            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                {...register("tailorForm.weight")}
                placeholder="60"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="additionalNotes">Additional Notes</Label>
            <Textarea
              id="additionalNotes"
              {...register("tailorForm.additionalNotes")}
              placeholder="Any special requirements, fabric preferences, or additional details..."
              className="min-h-[100px]"
            />
          </div>

          <Button
            onClick={submitToTailor}
            disabled={isSubmittingOrder}
            className="w-full"
            size="lg"
          >
            {isSubmittingOrder ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Order...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Order to Tailor
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
