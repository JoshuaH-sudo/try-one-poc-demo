import { type NextRequest, NextResponse } from "next/server"
import { generateTryOnWithOpenAI } from "@/app/lib/tryon-actions"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const personImages: File[] = []
    const clothingImages: File[] = []

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        if (key.startsWith("personImage")) personImages.push(value)
        if (key.startsWith("clothingImage")) clothingImages.push(value)
      }
    }

    if (personImages.length === 0 || clothingImages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Both person and clothing images are required" },
        { status: 400 },
      )
    }

    // Per-file size validation (keep generous 1MB per file)
    const maxSize = 1 * 1024 * 1024 // 1MB
    for (const img of [...personImages, ...clothingImages]) {
      console.log(`Validating file size: ${img.name} (${img.size} bytes)`)
      if (img.size > maxSize) {
        return NextResponse.json(
          { success: false, error: `File "${img.name}" is too large. Maximum size is 1MB.` },
          { status: 400 },
        )
      }
    }

    const startTime = Date.now()

    const finalPersonImages = personImages.slice(0, 1) // Only 1 person image supported
    const finalClothingImages = clothingImages.slice(0, 1) // Only 1 clothing image for simplicity

    // Parallel: analyses + generation
    const generationResult = await generateTryOnWithOpenAI(finalPersonImages, finalClothingImages)

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1) + "s"

    return NextResponse.json({
      success: true,
      imageUrl: generationResult.imageUrl,
      processingTime,
      modelUsed: generationResult.modelUsed,
      provider: generationResult.provider,
      prompt: generationResult.prompt || undefined,
      method: generationResult.method,
    })
  } catch (err) {
    console.error("Error in /api/try-on:", err)
    const message = err instanceof Error ? err.message : "Unknown error occurred"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
