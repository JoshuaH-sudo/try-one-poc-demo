"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, User, Shirt, Sparkles, Loader2, AlertCircle, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface UploadedImage {
  file: File
  preview: string
  id: string
}

interface TryOnResult {
  imageUrl: string
  processingTime?: string
  provider?: string
  confidence?: string
}

export default function TryOnPage() {
  const [personImages, setPersonImages] = useState<UploadedImage[]>([])
  const [dressImages, setDressImages] = useState<UploadedImage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [tryOnResult, setTryOnResult] = useState<TryOnResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleImageUpload = (files: FileList | null, type: "person" | "dress") => {
    if (!files) return

    const newImages: UploadedImage[] = []

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const preview = URL.createObjectURL(file)
        const id = Math.random().toString(36).substr(2, 9)
        newImages.push({ file, preview, id })
      }
    })

    if (type === "person") {
      // Only allow one person image
      setPersonImages((prev) => {
        // Clean up old previews
        prev.forEach((img) => URL.revokeObjectURL(img.preview))
        return newImages.slice(0, 1)
      })
    } else {
      // Only allow one dress image
      setDressImages((prev) => {
        // Clean up old previews
        prev.forEach((img) => URL.revokeObjectURL(img.preview))
        return newImages.slice(0, 1)
      })
    }

    toast({
      title: "Image uploaded",
      description: `${type === "person" ? "Person" : "Dress"} image uploaded successfully.`,
    })
  }

  const removeImage = (id: string, type: "person" | "dress") => {
    if (type === "person") {
      setPersonImages((prev) => {
        const toRemove = prev.find((img) => img.id === id)
        if (toRemove) URL.revokeObjectURL(toRemove.preview)
        return prev.filter((img) => img.id !== id)
      })
    } else {
      setDressImages((prev) => {
        const toRemove = prev.find((img) => img.id === id)
        if (toRemove) URL.revokeObjectURL(toRemove.preview)
        return prev.filter((img) => img.id !== id)
      })
    }
  }

  const handleTryOn = async () => {
    if (personImages.length === 0 || dressImages.length === 0) {
      toast({
        title: "Missing images",
        description: "Please upload both a person image and a dress image.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("personImage_0", personImages[0].file)
      formData.append("clothingImage_0", dressImages[0].file)
      formData.append("selectedModel", "fal-ai")

      const response = await fetch("/api/try-on", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Try-on generation failed")
      }

      setTryOnResult({
        imageUrl: result.imageUrl,
        processingTime: result.processingTime,
        provider: result.provider,
        confidence: result.confidence || "High",
      })

      toast({
        title: "Try-on complete!",
        description: `Generated using ${result.provider}`,
      })
    } catch (error) {
      console.error("Error generating try-on:", error)

      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

      setError(errorMessage)
      toast({
        title: "Try-on failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    // Clean up object URLs
    personImages.forEach((img) => URL.revokeObjectURL(img.preview))
    dressImages.forEach((img) => URL.revokeObjectURL(img.preview))

    setPersonImages([])
    setDressImages([])
    setTryOnResult(null)
    setError(null)

    toast({
      title: "Reset complete",
      description: "Ready for a new try-on session!",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Virtual Try-On</h1>
          <p className="text-lg text-gray-600">Upload a dress and your photo to see how it looks on you</p>
          <p className="text-sm text-purple-600 mt-1">AI-powered virtual try-on using Fal AI FASHN</p>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">Try-On Error</h4>
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
            <Tabs defaultValue="person" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="person" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Your Photo
                </TabsTrigger>
                <TabsTrigger value="dress" className="flex items-center gap-2">
                  <Shirt className="w-4 h-4" />
                  Dress Image
                </TabsTrigger>
              </TabsList>

              <TabsContent value="person" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Upload Your Photo
                    </CardTitle>
                    <CardDescription>
                      Upload a clear, full-body photo with good lighting. Stand straight and face forward for the best
                      results.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <Label htmlFor="person-upload" className="cursor-pointer">
                          <span className="text-sm font-medium text-purple-600 hover:text-purple-500">
                            Click to upload
                          </span>
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

                      {personImages.length > 0 && (
                        <div className="relative group">
                          <Image
                            src={personImages[0].preview || "/placeholder.svg"}
                            alt="Person"
                            width={300}
                            height={400}
                            className="w-full aspect-[3/4] object-cover rounded-lg"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(personImages[0].id, "person")}
                          >
                            ×
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dress" className="space-y-4">
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
                          <span className="text-sm font-medium text-purple-600 hover:text-purple-500">
                            Click to upload
                          </span>
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

                      {dressImages.length > 0 && (
                        <div className="relative group">
                          <Image
                            src={dressImages[0].preview || "/placeholder.svg"}
                            alt="Dress"
                            width={300}
                            height={400}
                            className="w-full aspect-[3/4] object-cover rounded-lg"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(dressImages[0].id, "dress")}
                          >
                            ×
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex gap-4">
              <Button
                onClick={handleTryOn}
                disabled={isGenerating || personImages.length === 0 || dressImages.length === 0}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
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
                    Try On Dress
                  </>
                )}
              </Button>

              <Button onClick={handleReset} variant="outline" size="lg" disabled={isGenerating}>
                Reset
              </Button>
            </div>
          </div>

          {/* Result Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Try-On Result</CardTitle>
                <CardDescription>Your AI-generated virtual try-on will appear here</CardDescription>
              </CardHeader>
              <CardContent>
                {tryOnResult ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <Image
                        src={tryOnResult.imageUrl || "/placeholder.svg"}
                        alt="Virtual Try-On Result"
                        width={400}
                        height={500}
                        className="w-full rounded-lg shadow-lg"
                      />
                    </div>

                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">Try-on complete!</span>
                    </div>

                    {tryOnResult.processingTime && (
                      <div className="text-center space-y-1">
                        <div className="text-xs text-gray-500">Processing Time: {tryOnResult.processingTime}</div>
                        <div className="text-xs text-purple-600">Generated with {tryOnResult.provider}</div>
                        <div className="text-xs text-gray-500">Confidence: {tryOnResult.confidence}</div>
                      </div>
                    )}

                    <Button
                      onClick={() => {
                        const link = document.createElement("a")
                        link.href = tryOnResult.imageUrl
                        link.download = "virtual-tryon-result.png"
                        link.click()
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      Download Result
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Sparkles className="w-12 h-12 mb-4" />
                    <p className="text-center">
                      Upload your photo and a dress image, then click "Try On Dress" to see the result!
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
