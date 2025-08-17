"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Palette, Loader2, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import type { UseFormReturn } from "react-hook-form"
import type { FormValues } from "../utils/types"
import { handleImageUpload, removeImage, compressImage, type UploadedImage } from "../utils/imageUtils"

interface DesignStepProps {
  form: UseFormReturn<FormValues>
  onNext: () => void
}

export function DesignStep({ form, onNext }: DesignStepProps) {
  const [isGeneratingDesign, setIsGeneratingDesign] = useState(false)
  const { toast } = useToast()

  const { watch, setValue } = form
  const frontDrawing: UploadedImage | null = watch("frontDrawing")
  const backDrawing: UploadedImage | null = watch("backDrawing")
  const designDescription = watch("designDescription")
  const selectedColor = watch("selectedColor")
  const designVariations = watch("designVariations")

  const generateDesignVariations = async () => {
    if (!frontDrawing) {
      toast({
        title: "Missing drawing",
        description: "Please upload a front drawing to generate variations.",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingDesign(true)

    try {
      const formData = new FormData()

      const compressedFront = await compressImage(frontDrawing.file, {
        maxWidth: 1024,
        maxHeight: 1536,
        quality: 0.8,
      })
      formData.append("frontDrawing", compressedFront)

      if (backDrawing) {
        const compressedBack = await compressImage(backDrawing.file, {
          maxWidth: 1024,
          maxHeight: 1536,
          quality: 0.8,
        })
        formData.append("backDrawing", compressedBack)
      }

      formData.append("description", designDescription)
      formData.append("color", selectedColor)

      const response = await fetch("/api/generate-design", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Design generation failed")
      }

      setValue("designVariations", result.variations)

      toast({
        title: "Design variations generated!",
        description: "Choose your favorite front and back designs.",
      })

      setTimeout(() => {
        onNext()
      }, 1500)
    } catch (error) {
      console.error("Error generating design variations:", error)
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingDesign(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Drawings Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Drawings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Front Drawing Upload */}
            <div>
              <Label htmlFor="front-drawing">Front Drawing *</Label>
              <div className="mt-2">
                {frontDrawing ? (
                  <div className="relative">
                    <Image
                      src={frontDrawing.preview || "/placeholder.svg"}
                      alt="Front drawing"
                      width={200}
                      height={300}
                      className="rounded-lg object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        removeImage(frontDrawing)
                        setValue("frontDrawing", null)
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <Label htmlFor="front-drawing" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">Upload front drawing</span>
                      </Label>
                      <Input
                        id="front-drawing"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e.target.files, (img) => setValue("frontDrawing", img))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Back Drawing Upload */}
            <div>
              <Label htmlFor="back-drawing">Back Drawing (Optional)</Label>
              <div className="mt-2">
                {backDrawing ? (
                  <div className="relative">
                    <Image
                      src={backDrawing.preview || "/placeholder.svg"}
                      alt="Back drawing"
                      width={200}
                      height={300}
                      className="rounded-lg object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        removeImage(backDrawing)
                        setValue("backDrawing", null)
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <Label htmlFor="back-drawing" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">Upload back drawing</span>
                      </Label>
                      <Input
                        id="back-drawing"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e.target.files, (img) => setValue("backDrawing", img))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Design Details Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Design Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="description">Design Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your dress design, style, fabric, details..."
                value={designDescription}
                onChange={(e) => setValue("designDescription", e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div>
              <Label htmlFor="color">Primary Color</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  id="color"
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setValue("selectedColor", e.target.value)}
                  className="w-16 h-10 p-1 border rounded"
                />
                <span className="text-sm text-gray-600">{selectedColor}</span>
              </div>
            </div>

            <Button
              onClick={generateDesignVariations}
              disabled={!frontDrawing || isGeneratingDesign}
              className="w-full"
            >
              {isGeneratingDesign ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Variations...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Design Variations
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Design Variations Display */}
      {designVariations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Design Variations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Front Variations</h4>
                <div className="grid gap-2 grid-cols-2">
                  {designVariations
                    .filter((v) => v.type === "front")
                    .map((variation) => (
                      <div key={variation.id} className="relative">
                        <Image
                          src={variation.imageUrl || "/placeholder.svg"}
                          alt="Front variation"
                          width={150}
                          height={200}
                          className="rounded-lg object-cover w-full"
                        />
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
                        <div key={variation.id} className="relative">
                          <Image
                            src={variation.imageUrl || "/placeholder.svg"}
                            alt="Back variation"
                            width={150}
                            height={200}
                            className="rounded-lg object-cover w-full"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
