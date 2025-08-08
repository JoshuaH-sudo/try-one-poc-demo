import { NextRequest, NextResponse } from 'next/server'
import { analyzeClothingImage, analyzePersonImage } from '@/app/lib/analyze-actions'
import { generateTryOnWithFalAI, generateTryOnWithOpenAI } from '@/app/lib/tryon-actions'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const selectedModel = (formData.get('selectedModel') as string) || 'fal-ai'

    const personImages: File[] = []
    const clothingImages: File[] = []

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        if (key.startsWith('personImage_')) personImages.push(value)
        if (key.startsWith('clothingImage_')) clothingImages.push(value)
      }
    }

    if (personImages.length === 0 || clothingImages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Both person and clothing images are required' },
        { status: 400 }
      )
    }

    // Per-file size validation (keep generous 10MB per file)
    const maxSize = 10 * 1024 * 1024 // 10MB
    for (const img of [...personImages, ...clothingImages]) {
      if (img.size > maxSize) {
        return NextResponse.json(
          { success: false, error: `File "${img.name}" is too large. Maximum size is 10MB.` },
          { status: 400 }
        )
      }
    }

    const startTime = Date.now()

    // Model-specific constraints
    const finalPersonImages = personImages.slice(0, 1) // UI enforces 1 person; hard limit here too
    const finalClothingImages = selectedModel === 'fal-ai' ? clothingImages.slice(0, 1) : clothingImages

    // Parallel: analyses + generation
    const [personDetails, clothingDetails, generationResult] = await Promise.all([
      analyzePersonImage(finalPersonImages[0]),
      analyzeClothingImage(finalClothingImages[0]),
      selectedModel === 'fal-ai'
        ? generateTryOnWithFalAI(finalPersonImages, finalClothingImages)
        : generateTryOnWithOpenAI(finalPersonImages, finalClothingImages),
    ])

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1) + 's'

    return NextResponse.json({
      success: true,
      imageUrl: generationResult.imageUrl,
      personDetails,
      clothingDetails,
      processingTime,
      modelUsed: generationResult.modelUsed,
      provider: generationResult.provider,
      prompt: generationResult.prompt || undefined,
      method: generationResult.method,
    })
  } catch (err) {
    console.error('Error in /api/try-on:', err)
    const message = err instanceof Error ? err.message : 'Unknown error occurred'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
