"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Upload, User, Shirt, Palette, Loader2, Sparkles, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { compressImage } from "./lib/utils"

interface UploadedImage {
  file: File
  preview: string
  id: string
}

interface DesignVariation {
  id: string
  imageUrl: string
  type: "front" | "back"
}

interface TryOnResult {
  imageUrl: string
  timestamp: string
}

export default function VirtualTryOnPage() {
  // Design Dress Journey State
  const [frontDrawing, setFrontDrawing] = useState<UploadedImage | null>(null)
  const [backDrawing, setBackDrawing] = useState<UploadedImage | null>(null)
  const [designDescription, setDesignDescription] = useState("")
  const [selectedColor, setSelectedColor] = useState("#000000")
  const [designVariations, setDesignVariations] = useState<DesignVariation[]>([])
  const [selectedFront, setSelectedFront] = useState<string | null>(null)
  const [selectedBack, setSelectedBack] = useState<string | null>(null)
  const [isGeneratingDesign, setIsGeneratingDesign] = useState(false)

  // Try On Journey State
  const [personImage, setPersonImage] = useState<UploadedImage | null>(null)
  const [clothingImage, setClothingImage] = useState<UploadedImage | null>(null)
  const [tryOnResult, setTryOnResult] = useState<TryOnResult | null>(null)
  const [isGeneratingTryOn, setIsGeneratingTryOn] = useState(false)

  // Tailor Form State
  const [showTailorForm, setShowTailorForm] = useState(false)
  const [tailorForm, setTailorForm] = useState({
    fullName: "",
    contact: "",
    bust: "",
    waist: "",
    hips: "",
    height: "",
    weight: "",
    additionalNotes: "",
  })
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)

  const { toast } = useToast()

  const handleImageUpload = (files: FileList | null, setter: (img: UploadedImage | null) => void) => {
    if (!files || files.length === 0) return

    const file = files[0]
    if (file.type.startsWith("image/")) {
      const preview = URL.createObjectURL(file)
      const id = Math.random().toString(36).substr(2, 9)
      setter({ file, preview, id })

      toast({
        title: "Image uploaded",
        description: "Image uploaded successfully.",
      })
    }
  }

  const removeImage = (setter: (img: UploadedImage | null) => void, image: UploadedImage | null) => {
    if (image) {
      URL.revokeObjectURL(image.preview)
      setter(null)
    }
  }

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

      // Compress and append front drawing
      const compressedFront = await compressImage(frontDrawing.file, {
        maxWidth: 1024,
        maxHeight: 1536,
        quality: 0.8,
      })
      formData.append("frontDrawing", compressedFront)

      // Add back drawing if available
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

      setDesignVariations(result.variations)

      toast({
        title: "Design variations generated!",
        description: "Choose your favorite front and back designs.",
      })
    } catch (error) {
      console.error("Error generating design:", error)
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingDesign(false)
    }
  }

  const generateTryOn = async () => {
    if (!personImage || !clothingImage) {
      toast({
        title: "Missing images",
        description: "Please upload both person and clothing images.",
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

      const compressedClothing = await compressImage(clothingImage.file, {
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

      setTryOnResult({
        imageUrl: result.imageUrl,
        timestamp: new Date().toISOString(),
      })

      toast({
        title: "Try-on generated!",
        description: "Your virtual try-on is ready!",
      })
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

  const submitToTailor = async () => {
    if (!tailorForm.fullName || !tailorForm.contact) {
      toast({
        title: "Missing information",
        description: "Please fill in your name and contact information.",
        variant: "destructive",
      })
      return
    }

    setIsSubmittingOrder(true)

    try {
      const orderData = {
        ...tailorForm,
        designImages: {
          front: selectedFront,
          back: selectedBack,
        },
        tryOnImage: tryOnResult?.imageUrl,
        timestamp: new Date().toISOString(),
      }

      const response = await fetch("/api/submit-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Order submission failed")
      }

      toast({
        title: "Order submitted!",
        description: `Your order #${result.orderId} has been sent to the tailor.`,
      })

      // Reset form
      setShowTailorForm(false)
      setTailorForm({
        fullName: "",
        contact: "",
        bust: "",
        waist: "",
        hips: "",
        height: "",
        weight: "",
        additionalNotes: "",
      })
    } catch (error) {
      console.error("Error submitting order:", error)
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingOrder(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Custom Dress Studio</h1>
          <p className="text-lg text-gray-600">Design your dream dress or try on existing designs with AI</p>
        </div>

        <Tabs defaultValue="design" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="design" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Design Dress
            </TabsTrigger>
            <TabsTrigger value="tryon" className="flex items-center gap-2">
              <Shirt className="w-4 h-4" />
              Try On Dress
            </TabsTrigger>
          </TabsList>

          {/* Design Dress Journey */}
          <TabsContent value="design" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Design Input Section */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Your Drawings</CardTitle>
                    <CardDescription>
                      Upload your dress design drawings. Front view is required, back view is optional.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Front Drawing Upload */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Front Drawing *</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                        <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                        <Label htmlFor="front-upload" className="cursor-pointer">
                          <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                            Click to upload front drawing
                          </span>
                        </Label>
                        <Input
                          id="front-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e.target.files, setFrontDrawing)}
                        />
                      </div>
                      {frontDrawing && (
                        <div className="mt-2 relative">
                          <Image
                            src={frontDrawing.preview || "/placeholder.svg"}
                            alt="Front drawing"
                            width={200}
                            height={300}
                            className="w-full max-w-xs aspect-[2/3] object-cover rounded-lg mx-auto"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-2 right-2"
                            onClick={() => removeImage(setFrontDrawing, frontDrawing)}
                          >
                            ×
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Back Drawing Upload */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Back Drawing (Optional)</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                        <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                        <Label htmlFor="back-upload" className="cursor-pointer">
                          <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                            Click to upload back drawing
                          </span>
                        </Label>
                        <Input
                          id="back-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e.target.files, setBackDrawing)}
                        />
                      </div>
                      {backDrawing && (
                        <div className="mt-2 relative">
                          <Image
                            src={backDrawing.preview || "/placeholder.svg"}
                            alt="Back drawing"
                            width={200}
                            height={300}
                            className="w-full max-w-xs aspect-[2/3] object-cover rounded-lg mx-auto"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-2 right-2"
                            onClick={() => removeImage(setBackDrawing, backDrawing)}
                          >
                            ×
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Design Details</CardTitle>
                    <CardDescription>Add additional information about your dress design</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your dress design, materials, style, etc."
                        value={designDescription}
                        onChange={(e) => setDesignDescription(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="color">Primary Color</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          id="color"
                          type="color"
                          value={selectedColor}
                          onChange={(e) => setSelectedColor(e.target.value)}
                          className="w-16 h-10 p-1 border rounded"
                        />
                        <Input
                          type="text"
                          value={selectedColor}
                          onChange={(e) => setSelectedColor(e.target.value)}
                          className="flex-1"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={generateDesignVariations}
                  disabled={isGeneratingDesign || !frontDrawing}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  size="lg"
                >
                  {isGeneratingDesign ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Variations...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Design Variations
                    </>
                  )}
                </Button>
              </div>

              {/* Design Variations Section */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Design Variations</CardTitle>
                    <CardDescription>AI-generated variations of your dress design</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {designVariations.length > 0 ? (
                      <div className="space-y-6">
                        {/* Front Variations */}
                        <div>
                          <h4 className="font-medium mb-3">Front Designs</h4>
                          <div className="grid grid-cols-2 gap-4">
                            {designVariations
                              .filter((v) => v.type === "front")
                              .map((variation) => (
                                <div
                                  key={variation.id}
                                  className={`relative cursor-pointer rounded-lg border-2 transition-colors ${
                                    selectedFront === variation.id ? "border-blue-500" : "border-gray-200"
                                  }`}
                                  onClick={() => setSelectedFront(variation.id)}
                                >
                                  <Image
                                    src={variation.imageUrl || "/placeholder.svg"}
                                    alt="Front design variation"
                                    width={200}
                                    height={300}
                                    className="w-full aspect-[2/3] object-cover rounded-lg"
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

                        {/* Back Variations */}
                        {designVariations.some((v) => v.type === "back") && (
                          <div>
                            <h4 className="font-medium mb-3">Back Designs</h4>
                            <div className="grid grid-cols-2 gap-4">
                              {designVariations
                                .filter((v) => v.type === "back")
                                .map((variation) => (
                                  <div
                                    key={variation.id}
                                    className={`relative cursor-pointer rounded-lg border-2 transition-colors ${
                                      selectedBack === variation.id ? "border-blue-500" : "border-gray-200"
                                    }`}
                                    onClick={() => setSelectedBack(variation.id)}
                                  >
                                    <Image
                                      src={variation.imageUrl || "/placeholder.svg"}
                                      alt="Back design variation"
                                      width={200}
                                      height={300}
                                      className="w-full aspect-[2/3] object-cover rounded-lg"
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

                        {/* Try On Section for Design */}
                        {selectedFront && (
                          <div className="border-t pt-6">
                            <h4 className="font-medium mb-3">Try On Your Design</h4>
                            <div className="space-y-4">
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                                <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                                <Label htmlFor="person-design-upload" className="cursor-pointer">
                                  <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                                    Upload your photo for try-on
                                  </span>
                                </Label>
                                <Input
                                  id="person-design-upload"
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleImageUpload(e.target.files, setPersonImage)}
                                />
                              </div>

                              {personImage && (
                                <div className="relative">
                                  <Image
                                    src={personImage.preview || "/placeholder.svg"}
                                    alt="Person"
                                    width={200}
                                    height={300}
                                    className="w-full max-w-xs aspect-[2/3] object-cover rounded-lg mx-auto"
                                  />
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="absolute top-2 right-2"
                                    onClick={() => removeImage(setPersonImage, personImage)}
                                  >
                                    ×
                                  </Button>
                                </div>
                              )}

                              {personImage && (
                                <Button
                                  onClick={() => {
                                    // Set clothing image to selected front design for try-on
                                    const selectedDesign = designVariations.find((v) => v.id === selectedFront)
                                    if (selectedDesign) {
                                      // Create a mock clothing image from the selected design
                                      setClothingImage({
                                        file: new File([], "design.jpg"),
                                        preview: selectedDesign.imageUrl,
                                        id: selectedDesign.id,
                                      })
                                      generateTryOn()
                                    }
                                  }}
                                  disabled={isGeneratingTryOn}
                                  className="w-full"
                                >
                                  {isGeneratingTryOn ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Generating Try-On...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-4 h-4 mr-2" />
                                      Try On Design
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Palette className="w-12 h-12 mb-4" />
                        <p className="text-center">
                          Upload your drawings and click "Generate Design Variations" to see AI-created versions of your
                          dress!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Try On Dress Journey */}
          <TabsContent value="tryon" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Upload Section */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Upload Your Photo
                    </CardTitle>
                    <CardDescription>
                      Upload a clear, full-body photo with good lighting for the best try-on results.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <Label htmlFor="person-tryon-upload" className="cursor-pointer">
                        <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                          Click to upload your photo
                        </span>
                      </Label>
                      <Input
                        id="person-tryon-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e.target.files, setPersonImage)}
                      />
                    </div>

                    {personImage && (
                      <div className="mt-4 relative">
                        <Image
                          src={personImage.preview || "/placeholder.svg"}
                          alt="Person"
                          width={200}
                          height={300}
                          className="w-full max-w-xs aspect-[2/3] object-cover rounded-lg mx-auto"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={() => removeImage(setPersonImage, personImage)}
                        >
                          ×
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shirt className="w-5 h-5" />
                      Upload Dress Image
                    </CardTitle>
                    <CardDescription>Upload a clear photo of the dress you want to try on.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <Label htmlFor="clothing-tryon-upload" className="cursor-pointer">
                        <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                          Click to upload dress image
                        </span>
                      </Label>
                      <Input
                        id="clothing-tryon-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e.target.files, setClothingImage)}
                      />
                    </div>

                    {clothingImage && (
                      <div className="mt-4 relative">
                        <Image
                          src={clothingImage.preview || "/placeholder.svg"}
                          alt="Dress"
                          width={200}
                          height={300}
                          className="w-full max-w-xs aspect-[2/3] object-cover rounded-lg mx-auto"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={() => removeImage(setClothingImage, clothingImage)}
                        >
                          ×
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Button
                  onClick={generateTryOn}
                  disabled={isGeneratingTryOn || !personImage || !clothingImage}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  size="lg"
                >
                  {isGeneratingTryOn ? (
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
              </div>

              {/* Try-On Result Section */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Try-On Result</CardTitle>
                    <CardDescription>Your AI-generated virtual try-on will appear here</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {tryOnResult ? (
                      <div className="space-y-4">
                        <Image
                          src={tryOnResult.imageUrl || "/placeholder.svg"}
                          alt="Try-on result"
                          width={400}
                          height={600}
                          className="w-full aspect-[2/3] object-cover rounded-lg"
                        />
                        <Button onClick={() => setShowTailorForm(true)} className="w-full" size="lg">
                          <Send className="w-4 h-4 mr-2" />
                          Submit to Tailor
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Sparkles className="w-12 h-12 mb-4" />
                        <p className="text-center">
                          Upload your photo and a dress image, then click "Generate Try-On" to see the result!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Tailor Submission Form Modal */}
        {showTailorForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Submit Order to Tailor</CardTitle>
                <CardDescription>
                  Please provide your details and measurements for the custom dress order.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={tailorForm.fullName}
                      onChange={(e) => setTailorForm((prev) => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact">Contact (WhatsApp/Telegram) *</Label>
                    <Input
                      id="contact"
                      value={tailorForm.contact}
                      onChange={(e) => setTailorForm((prev) => ({ ...prev, contact: e.target.value }))}
                      placeholder="Phone number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="bust">Bust (cm)</Label>
                    <Input
                      id="bust"
                      value={tailorForm.bust}
                      onChange={(e) => setTailorForm((prev) => ({ ...prev, bust: e.target.value }))}
                      placeholder="e.g. 90"
                    />
                  </div>
                  <div>
                    <Label htmlFor="waist">Waist (cm)</Label>
                    <Input
                      id="waist"
                      value={tailorForm.waist}
                      onChange={(e) => setTailorForm((prev) => ({ ...prev, waist: e.target.value }))}
                      placeholder="e.g. 70"
                    />
                  </div>
                  <div>
                    <Label htmlFor="hips">Hips (cm)</Label>
                    <Input
                      id="hips"
                      value={tailorForm.hips}
                      onChange={(e) => setTailorForm((prev) => ({ ...prev, hips: e.target.value }))}
                      placeholder="e.g. 95"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      id="height"
                      value={tailorForm.height}
                      onChange={(e) => setTailorForm((prev) => ({ ...prev, height: e.target.value }))}
                      placeholder="e.g. 165"
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      value={tailorForm.weight}
                      onChange={(e) => setTailorForm((prev) => ({ ...prev, weight: e.target.value }))}
                      placeholder="e.g. 60"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="additionalNotes">Additional Notes</Label>
                  <Textarea
                    id="additionalNotes"
                    value={tailorForm.additionalNotes}
                    onChange={(e) => setTailorForm((prev) => ({ ...prev, additionalNotes: e.target.value }))}
                    placeholder="Any special requirements, preferences, or additional measurements..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button variant="outline" onClick={() => setShowTailorForm(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={submitToTailor} disabled={isSubmittingOrder} className="flex-1">
                    {isSubmittingOrder ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Order
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
