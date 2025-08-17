"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, User, Shirt, Sparkles, Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { compressImage } from "@/app/utils/imageUtils"

interface UploadedImage {
  file: File
  preview: string
  id: string
}

interface TryOnResult {
  imageUrl: string
  processingTime?: string
  modelUsed?: string
  provider?: string
  prompt?: string
  method?: string
}

export default function TryOnPage() {
  const [personImage, setPersonImage] = useState<UploadedImage | null>(null)
  const [dressImage, setDressImage] = useState<UploadedImage | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [tryOnResult, setTryOnResult] = useState<TryOnResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleImageUpload = (files: FileList | null, type: "person" | "dress") => {
    if (!files || files.length === 0) return

    const file = files[0]
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file.",
        variant: "destructive",
      })
      return
    }

    const preview = URL.createObjectURL(file)
    const id = Math.random().toString(36).substr(2, 9)
    const uploadedImage = { file, preview, id }

    if (type === "person") {
      if (personImage) {
        URL.revokeObjectURL(personImage.preview)
      }
      setPersonImage(uploadedImage)
    } else {
      if (dressImage) {
        URL.revokeObjectURL(dressImage.preview)
      }
      setDressImage(uploadedImage)
    }

    toast({
      title: "Image uploaded",
      description: `${type === "person" ? "Person" : "Dress"} image uploaded successfully.`,
    })
  }

  const removeImage = (type: "person" | "dress") => {
    if (type === "person" && personImage) {
      URL.revokeObjectURL(personImage.preview)
      setPersonImage(null)
    } else if (type === "dress" && dressImage) {
      URL.revokeObjectURL(dressImage.preview)
      setDressImage(null)
    }
  }

  const handleTryOn = async () => {
    if (!personImage || !dressImage) {
      toast({
        title: "Missing images",
        description: "Please upload both person and dress images.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      console.log("Starting try-on generation...")

      const formData = new FormData()

      // Compress and append images
      const compressedPersonImage = await compressImage(personImage.file, {
        maxWidth: 1024,
        maxHeight: 1536,
        quality: 0.8,
      })

      const compressedDressImage = await compressImage(dressImage.file, {
        maxWidth: 1024,
        maxHeight: 1536,
        quality: 0.8,
      })

      formData.append("personImage_0", compressedPersonImage)
      formData.append("clothingImage_0", compressedDressImage)

      console.log("Calling API route...")

      const response = await fetch("/api/try-on", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      console.log("API route result:", result)

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Try-on generation failed")
      }

      setTryOnResult(result as TryOnResult)

      toast({
        title: "Try-on generated!",
        description: `Generated using ${result.provider}. Ready for review!`,
      })
    } catch (error) {
      console.error("Error generating try-on:", error)

      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

      setError(errorMessage)
      toast({
        title: "Generation failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStartOver = () => {
    if (personImage) {
      URL.revokeObjectURL(personImage.preview)
      setPersonImage(null)
    }
    if (dressImage) {
      URL.revokeObjectURL(dressImage.preview)
      setDressImage(null)
    }
    setTryOnResult(null)
    setError(null)
    toast({
      title: "Reset complete",
      description: "All images cleared. Ready for new try-on!",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Try-On Studio</h1>
          <p className="text-lg text-gray-600">Upload a dress and your photo to see how it looks on you</p>
          <p className="text-sm text-purple-600 mt-1">Powered by OpenAI's advanced image generation</p>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">Generation Error</h4>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <Button variant="outline" size="sm" className="mt-2 bg-transparent" onClick={() => setError(null)}>
                    Dismiss
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
            {/* Person Image Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Upload Your Photo
                </CardTitle>
                <CardDescription>
                  Upload a clear, full-body photo with good lighting. Standing straight and facing forward works best.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <Label htmlFor="person-upload" className="cursor-pointer">
                      <span className="text-sm font-medium text-purple-600 hover:text-purple-500">Click to upload</span>
                      <span className="text-sm text-gray-500"> or drag and drop</span>
                    </Label>
                    <Input
                      id="person-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files, "person")}
                    />
                  </div>

                  {personImage && (
                    <div className="relative group">
                      <Image
                        src={personImage.preview || "/placeholder.svg"}
                        alt="Person"
                        width={200}
                        height={300}
                        className="w-full aspect-[2/3] object-cover rounded-lg"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage("person")}
                      >
                        ×
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dress Image Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shirt className="w-5 h-5" />
                  Upload Dress Image
                </CardTitle>
                <CardDescription>
                  Upload a clear photo of the dress you want to try on. Images with plain backgrounds work best.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <Label htmlFor="dress-upload" className="cursor-pointer">
                      <span className="text-sm font-medium text-purple-600 hover:text-purple-500">Click to upload</span>
                      <span className="text-sm text-gray-500"> or drag and drop</span>
                    </Label>
                    <Input
                      id="dress-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files, "dress")}
                    />
                  </div>

                  {dressImage && (
                    <div className="relative group">
                      <Image
                        src={dressImage.preview || "/placeholder.svg"}
                        alt="Dress"
                        width={200}
                        height={300}
                        className="w-full aspect-[2/3] object-cover rounded-lg"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage("dress")}
                      >
                        ×
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleTryOn}
                disabled={isGenerating || !personImage || !dressImage}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Try-On...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Try-On
                  </>
                )}
              </Button>

              <Button
                onClick={handleStartOver}
                variant="outline"
                className="w-full bg-transparent"
                disabled={isGenerating}
              >
                Start Over
              </Button>
            </div>
          </div>

          {/* Result Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Try-On Result</CardTitle>
                <CardDescription>Your AI-generated try-on will appear here</CardDescription>
              </CardHeader>
              <CardContent>
                {tryOnResult ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <Image
                        src={tryOnResult.imageUrl || "/placeholder.svg"}
                        alt="Try-On Result"
                        width={400}
                        height={600}
                        className="w-full rounded-lg shadow-lg"
                      />
                    </div>

                    {tryOnResult.processingTime && (
                      <div className="space-y-2 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Processing Time: {tryOnResult.processingTime}</span>
                          <span className="text-xs text-purple-600">
                            {tryOnResult.provider} • {tryOnResult.modelUsed}
                          </span>
                        </div>
                        {tryOnResult.method && (
                          <div className="text-xs text-gray-500">Method: {tryOnResult.method}</div>
                        )}
                        {tryOnResult.prompt && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                              View Generation Prompt
                            </summary>
                            <div className="mt-2 p-2 bg-gray-50 rounded text-gray-600">{tryOnResult.prompt}</div>
                          </details>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={() => {
                        // Create download link
                        const link = document.createElement("a")
                        link.href = tryOnResult.imageUrl
                        link.download = "try-on-result.png"
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                      }}
                      className="w-full bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      Download Result
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Sparkles className="w-12 h-12 mb-4" />
                    <p className="text-center">
                      Upload your photo and a dress image, then click "Generate Try-On" to see the magic happen!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
