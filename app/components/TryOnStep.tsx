"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, User, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import type { UseFormReturn } from "react-hook-form"
import { FormData } from "../utils/types"
import { handleImageUpload, removeImage, compressImage } from "../utils/imageUtils"

interface TryOnStepProps {
  form: UseFormReturn<FormData>
  onNext: () => void
}

export function TryOnStep({ form, onNext }: TryOnStepProps) {
  const [isGeneratingTryOn, setIsGeneratingTryOn] = useState(false)
  const { toast } = useToast()

  const { watch, setValue } = form
  const designVariations = watch("designVariations")
  const selectedFront = watch("selectedFront")
  const selectedBack = watch("selectedBack")
  const personImage = watch("personImage")
  const tryOnResult = watch("tryOnResult")

  const generateTryOn = async () => {
    if (!personImage || !selectedFront) {
      toast({
        title: "Missing images",
        description: "Please upload your photo and select a design.",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingTryOn(true)

    try {
      const formData = new FormData()

      const compressedPerson = await compressImage(personImage.file, {
        maxWidth: 1024,
        maxHeight: 1536,
        quality: 0.8,
      })
      formData.append("personImage", compressedPerson)

      const selectedDesign = designVariations.find((design) => design.id === selectedFront)!
      const imageResponse = await fetch(selectedDesign.imageUrl)
      const blob = await imageResponse.blob()
      const designFile = new File([blob], `design-${selectedFront}.jpg`, {
        type: "image/jpeg",
      })

      const compressedClothing = await compressImage(designFile, {
        maxWidth: 1024,
        maxHeight: 1536,
        quality: 0.8,
      })
      formData.append("clothingImage", compressedClothing)

      const response = await fetch("/api/try-on", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Try-on generation failed")
      }

      setValue("tryOnResult", {
        imageUrl: result.imageUrl,
        timestamp: new Date().toISOString(),
      })

      toast({
        title: "Try-on generated!",
        description: "Your virtual try-on is ready!",
      })

      setTimeout(() => {
        onNext()
      }, 1500)
    } catch (error) {
      console.error("Error generating try-on:", error)
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingTryOn(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Design Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Your Design</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Front Variations</h4>
              <div className="grid gap-2 grid-cols-2">
                {designVariations
                  .filter((v) => v.type === "front")
                  .map((variation) => (
                    <div
                      key={variation.id}
                      className={`relative cursor-pointer rounded-lg border-2 ${
                        selectedFront === variation.id ? "border-blue-500" : "border-gray-200"
                      }`}
                      onClick={() => setValue("selectedFront", variation.id)}
                    >
                      <Image
                        src={variation.imageUrl || "/placeholder.svg"}
                        alt="Front variation"
                        width={150}
                        height={200}
                        className="rounded-lg object-cover w-full"
                      />
                      {selectedFront === variation.id && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                          ✓
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
            {designVariations.some((v) => v.type === "back") && (
              <div>
                <h4 className="font-medium mb-2">Back Variations</h4>
                <div className="grid gap-2 grid-cols-2">
                  {designVariations
                    .filter((v) => v.type === "back")
                    .map((variation) => (
                      <div
                        key={variation.id}
                        className={`relative cursor-pointer rounded-lg border-2 ${
                          selectedBack === variation.id ? "border-blue-500" : "border-gray-200"
                        }`}
                        onClick={() => setValue("selectedBack", variation.id)}
                      >
                        <Image
                          src={variation.imageUrl || "/placeholder.svg"}
                          alt="Back variation"
                          width={150}
                          height={200}
                          className="rounded-lg object-cover w-full"
                        />
                        {selectedBack === variation.id && (
                          <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                            ✓
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Person Image Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Upload Your Photo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {personImage ? (
            <div className="relative inline-block">
              <Image
                src={personImage.preview || "/placeholder.svg"}
                alt="Person"
                width={200}
                height={300}
                className="rounded-lg object-cover"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  removeImage(personImage)
                  setValue("personImage", null)
                }}
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <Label htmlFor="person-image" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">Upload your photo</span>
                </Label>
                <Input
                  id="person-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files, (img) => setValue("personImage", img))}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Try On Button */}
      <div className="flex justify-center">
        <Button
          onClick={generateTryOn}
          disabled={!personImage || !selectedFront || isGeneratingTryOn}
          size="lg"
          className="px-8"
        >
          {isGeneratingTryOn ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Try-On...
            </>
          ) : (
            "Try On Design"
          )}
        </Button>
      </div>

      {/* Try On Result */}
      {tryOnResult && (
        <Card>
          <CardHeader>
            <CardTitle>Your Virtual Try-On</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Image
              src={tryOnResult.imageUrl || "/placeholder.svg"}
              alt="Try-on result"
              width={300}
              height={400}
              className="rounded-lg object-cover mx-auto"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
