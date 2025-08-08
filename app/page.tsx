'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, User, Shirt, Sparkles, Check, Loader2, Zap, Brain, AlertCircle } from 'lucide-react'
import TryOnPreview from '@/components/TryOnPreview'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'
import { generateTryOnImage } from './lib/tryon-actions'
import { useRouter } from 'next/navigation'

interface UploadedImage {
  file: File
  preview: string
  id: string
}

interface GeneratedResult {
  imageUrl: string
  personDetails: {
    bodyType: string
    gender: string
    ageRange: string
    height: string
    measurements: {
      chest: string
      waist: string
      hips: string
      shoulders: string
    }
    skinTone: string
    pose: string
    analysisConfidence: string
  }
  clothingDetails: {
    type: string
    primaryColor: string
    secondaryColor?: string
    pattern: string
    material: string
    style: string
    fit: string
    sleeves: string
    neckline: string
    analysisConfidence: string
  }
  processingTime?: string
  modelUsed?: string
  provider?: string
  prompt?: string
  method?: string
}

export default function VirtualTryOnPage() {
  const router = useRouter()
  const [personImages, setPersonImages] = useState<UploadedImage[]>([])
  const [clothingImages, setClothingImages] = useState<UploadedImage[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('fal-ai')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedResult, setGeneratedResult] = useState<GeneratedResult | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const [orderSuccess, setOrderSuccess] = useState<{
    orderId: string
    estimatedDelivery: string
    trackingInfo: any
  } | null>(null)

  const handleImageUpload = (
    files: FileList | null,
    type: 'person' | 'clothing'
  ) => {
    if (!files) return

    const newImages: UploadedImage[] = []
    
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file)
        const id = Math.random().toString(36).substr(2, 9)
        newImages.push({ file, preview, id })
      }
    })

    if (type === 'person') {
      setPersonImages(prev => [...prev, ...newImages])
    } else {
      setClothingImages(prev => [...prev, ...newImages])
    }

    toast({
      title: "Images uploaded",
      description: `${newImages.length} image(s) added successfully.`,
    })
  }

  const removeImage = (id: string, type: 'person' | 'clothing') => {
    if (type === 'person') {
      setPersonImages(prev => {
        const updated = prev.filter(img => img.id !== id)
        const toRemove = prev.find(img => img.id === id)
        if (toRemove) URL.revokeObjectURL(toRemove.preview)
        return updated
      })
    } else {
      setClothingImages(prev => {
        const updated = prev.filter(img => img.id !== id)
        const toRemove = prev.find(img => img.id === id)
        if (toRemove) URL.revokeObjectURL(toRemove.preview)
        return updated
      })
    }
  }

  const handleGenerateTryOn = async () => {
    if (personImages.length === 0 || clothingImages.length === 0) {
      toast({
        title: "Missing images",
        description: "Please upload both person and clothing images.",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    setError(null)
    
    try {
      console.log('Starting generation with model:', selectedModel)
      
      const formData = new FormData()
      
      // Add model selection
      formData.append('selectedModel', selectedModel)
      
      // Add person images
      personImages.forEach((img, index) => {
        formData.append(`personImage_${index}`, img.file)
      })
      
      // Add clothing images
      clothingImages.forEach((img, index) => {
        formData.append(`clothingImage_${index}`, img.file)
      })

      console.log('Calling server action...')
      
      const result = await generateTryOnImage(formData)
      
      console.log('Server action result:', result)
      
      if (!result.success) {
        throw new Error(result.error || 'Generation failed')
      }
      
      setGeneratedResult(result as GeneratedResult)
      
      toast({
        title: "Try-on generated!",
        description: `Generated using ${result.provider}. Ready for review!`,
      })
      
    } catch (error) {
      console.error('Error generating try-on:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      setError(errorMessage)
      toast({
        title: "Generation failed",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const approveDesign = async () => {
    if (!generatedResult) return

    setIsApproving(true)
    
    try {
      const response = await fetch('/api/approve-design', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl: generatedResult.imageUrl,
          personDetails: generatedResult.personDetails,
          clothingDetails: generatedResult.clothingDetails,
          modelUsed: generatedResult.modelUsed,
          provider: generatedResult.provider,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to approve design')
      }

  const result = await response.json()
  // Navigate to success page with minimal state in URL (orderId)
  router.push(`/success?orderId=${encodeURIComponent(result.orderId)}`)
      
    } catch (error) {
      console.error('Error approving design:', error)
      toast({
        title: "Approval failed",
        description: "Failed to approve design. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsApproving(false)
    }
  }

  const startNewTryOn = () => {
    setOrderSuccess(null)
    setGeneratedResult(null)
    setPersonImages([])
    setClothingImages([])
    setError(null)
    toast({
      title: "New session started",
      description: "Ready for your next virtual try-on!",
    })
  }

  const getModelInfo = (model: string) => {
    switch (model) {
      case 'fal-ai':
        return {
          name: 'Fal AI FASHN',
          description: 'Specialized virtual try-on model with realistic garment fitting',
          icon: <Zap className="w-4 h-4" />,
          badge: 'Recommended',
          badgeColor: 'bg-green-100 text-green-800'
        }
      case 'openai':
        return {
          name: 'OpenAI ChatGPT gpt-image-1',
          description: 'Advanced image editing with precise clothing application',
          icon: <Brain className="w-4 h-4" />,
          badge: 'Creative',
          badgeColor: 'bg-blue-100 text-blue-800'
        }
      default:
        return {
          name: 'Unknown',
          description: '',
          icon: null,
          badge: '',
          badgeColor: ''
        }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-6xl mx-auto">
        {orderSuccess ? (
          // Success Page (keeping existing success page code)
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Order Successfully Placed!
              </h1>
              <p className="text-lg text-gray-600">
                Thank you for your order. We'll start processing it right away.
              </p>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Order Confirmation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Order ID</Label>
                    <p className="text-lg font-mono bg-gray-100 p-2 rounded">{orderSuccess.orderId}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Estimated Delivery</Label>
                    <p className="text-lg text-green-600 font-semibold">{orderSuccess.estimatedDelivery}</p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium text-gray-700">Order Status</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-blue-600 font-medium">{orderSuccess.trackingInfo.status}</span>
                    <span className="text-gray-500 text-sm">• Next update in {orderSuccess.trackingInfo.nextUpdate}</span>
                  </div>
                </div>

                {generatedResult && (
                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">Your Custom Item</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <Image
                          src={generatedResult.imageUrl || "/placeholder.svg"}
                          alt="Your Custom Try-On"
                          width={200}
                          height={250}
                          className="w-full rounded-lg shadow-md"
                        />
                      </div>
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="font-medium">Item Type:</span> {generatedResult.clothingDetails.type}
                        </div>
                        <div>
                          <span className="font-medium">Color:</span> {generatedResult.clothingDetails.primaryColor}
                        </div>
                        <div>
                          <span className="font-medium">Style:</span> {generatedResult.clothingDetails.style}
                        </div>
                        <div>
                          <span className="font-medium">Material:</span> {generatedResult.clothingDetails.material}
                        </div>
                        <div>
                          <span className="font-medium">Fit:</span> {generatedResult.clothingDetails.fit}
                        </div>
                        <div className="pt-2 border-t">
                          <span className="text-xs text-gray-500">
                            Generated with {generatedResult.provider} • Custom-fitted based on your photos
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>What's Next?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Order Processing</h4>
                      <p className="text-sm text-gray-600">We'll review your custom design and begin production within 24 hours.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Email Confirmation</h4>
                      <p className="text-sm text-gray-600">You'll receive a detailed confirmation email with tracking information.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Production & Shipping</h4>
                      <p className="text-sm text-gray-600">Your custom item will be produced and shipped to arrive by {orderSuccess.estimatedDelivery}.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={startNewTryOn}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                size="lg"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Try On More Items
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                size="lg"
                onClick={() => window.open(`mailto:support@virtualtryon.com?subject=Order ${orderSuccess.orderId}`, '_blank')}
              >
                Contact Support
              </Button>
            </div>
          </div>
        ) : (
          // Main Try-On Interface
          <>
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Virtual Try-On Studio
              </h1>
              <p className="text-lg text-gray-600">
                Upload your photos and clothing items to see how they look together with AI
              </p>
              <p className="text-sm text-purple-600 mt-1">
                Real AI-powered virtual try-on using Fal AI FASHN and OpenAI gpt-image-1
              </p>
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setError(null)}
                      >
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
                {/* AI Model Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      AI Model Selection
                    </CardTitle>
                    <CardDescription>
                      Choose which AI model to use for generating your try-on image
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select AI Model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fal-ai">Fal AI FASHN v1.6</SelectItem>
                        <SelectItem value="openai">OpenAI gpt-image-1</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {getModelInfo(selectedModel).icon}
                        <span className="font-medium text-sm">{getModelInfo(selectedModel).name}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getModelInfo(selectedModel).badgeColor}`}>
                          {getModelInfo(selectedModel).badge}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {getModelInfo(selectedModel).description}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Tabs defaultValue="person" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="person" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Your Photos
                    </TabsTrigger>
                    <TabsTrigger value="clothing" className="flex items-center gap-2">
                      <Shirt className="w-4 h-4" />
                      Clothing Items
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="person" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="w-5 h-5" />
                          Upload Your Photos
                        </CardTitle>
                        <CardDescription>
                          Upload clear, full-body photos with good lighting for the best try-on results. 
                          The person should be standing straight and facing forward.
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
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(e.target.files, 'person')}
                            />
                          </div>
                          
                          {personImages.length > 0 && (
                            <div className="grid grid-cols-2 gap-4">
                              {personImages.map((img) => (
                                <div key={img.id} className="relative group">
                                  <Image
                                    src={img.preview || "/placeholder.svg"}
                                    alt="Person"
                                    width={200}
                                    height={200}
                                    className="w-full h-32 object-cover rounded-lg"
                                  />
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removeImage(img.id, 'person')}
                                  >
                                    ×
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="clothing" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shirt className="w-5 h-5" />
                          Upload Clothing Items
                        </CardTitle>
                        <CardDescription>
                          Upload clear photos of clothing items on a plain background. 
                          {selectedModel === 'fal-ai' 
                            ? 'Flat lay or mannequin photos work best for accurate try-on results.'
                            : 'Clear product photos help gpt-image-1 understand the garment details better.'
                          }
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <Label htmlFor="clothing-upload" className="cursor-pointer">
                              <span className="text-sm font-medium text-purple-600 hover:text-purple-500">
                                Click to upload
                              </span>
                              <span className="text-sm text-gray-500"> or drag and drop</span>
                            </Label>
                            <Input
                              id="clothing-upload"
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(e.target.files, 'clothing')}
                            />
                          </div>
                          
                          {clothingImages.length > 0 && (
                            <div className="grid grid-cols-2 gap-4">
                              {clothingImages.map((img) => (
                                <div key={img.id} className="relative group">
                                  <Image
                                    src={img.preview || "/placeholder.svg"}
                                    alt="Clothing"
                                    width={200}
                                    height={200}
                                    className="w-full h-32 object-cover rounded-lg"
                                  />
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removeImage(img.id, 'clothing')}
                                  >
                                    ×
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                <Button
                  onClick={handleGenerateTryOn}
                  disabled={isGenerating || personImages.length === 0 || clothingImages.length === 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating with {getModelInfo(selectedModel).name}...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate with {getModelInfo(selectedModel).name}
                    </>
                  )}
                </Button>
              </div>

              {/* Preview Section */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Try-On Preview</CardTitle>
                    <CardDescription>
                      Your AI-generated virtual try-on will appear here
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {generatedResult ? (
                      <TryOnPreview generatedResult={generatedResult} isApproving={isApproving} onApprove={approveDesign} />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Sparkles className="w-12 h-12 mb-4" />
                        <p className="text-center">
                          Upload your photos and clothing items, then click "Generate" to see the magic happen!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
