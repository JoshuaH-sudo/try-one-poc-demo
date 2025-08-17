"use server"
import { openai } from "@/lib/openAi"
import { Buffer } from "buffer"

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY not configured")
}

// Generate try-on image using OpenAI image.edit() with multiple images
export async function generateTryOnWithOpenAI(personImageFiles: File[], clothingImageFiles: File[]) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured")
  }

  try {
    console.log("Starting OpenAI try-on generation...")

    // Take only the first image from each array for simplicity
    const personImage = personImageFiles[0]
    const clothingImage = clothingImageFiles[0]

    if (!personImage || !clothingImage) {
      throw new Error("Both person and clothing images are required")
    }

    const prompt = `Create a virtual try-on image by combining the person in the first image with the clothing item in the second image. Ensure the clothing fits naturally on the person, maintaining realistic proportions, lighting, and shadows. The final image should look like the person is wearing the clothing item in a natural pose with proper fit and draping.`

    console.log("Calling OpenAI images.edit with prompt:", prompt)

    const editResponse = await openai.images.edit({
      model: "dall-e-2", // Use dall-e-2 for image editing
      image: personImage,
      mask: undefined, // No mask needed for this use case
      prompt: prompt,
      n: 1,
      size: "1024x1024", // Use supported size for dall-e-2
    })

    console.log("OpenAI edit response received")

    if (!editResponse.data || editResponse.data.length === 0) {
      throw new Error("No images returned from OpenAI edit")
    }

    const generatedImage = editResponse.data[0]

    if (!generatedImage.url) {
      throw new Error("No image URL in OpenAI response")
    }

    console.log("OpenAI try-on generation successful")

    // Convert the URL to base64 for consistent handling
    const imageResponse = await fetch(generatedImage.url)
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString("base64")

    return {
      imageUrl: `data:image/png;base64,${base64Image}`,
      modelUsed: "dall-e-2",
      provider: "OpenAI",
      prompt: prompt,
      method: "image-edit",
    }
  } catch (error) {
    console.error("OpenAI try-on generation failed:", error)

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("billing")) {
        throw new Error("OpenAI API billing issue. Please check your OpenAI account.")
      } else if (error.message.includes("rate limit")) {
        throw new Error("OpenAI API rate limit exceeded. Please try again later.")
      } else if (error.message.includes("invalid")) {
        throw new Error("Invalid image format. Please use JPG or PNG images.")
      }
    }

    throw new Error(`OpenAI generation failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Main server action for generating try-on images
export async function generateTryOnImage(formData: FormData) {
  try {
    const selectedModel = (formData.get("selectedModel") as string) || "fal-ai"

    // Extract uploaded files
    const personImages: File[] = []
    const clothingImages: File[] = []

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("personImage_") && value instanceof File) {
        personImages.push(value)
      } else if (key.startsWith("clothingImage_") && value instanceof File) {
        clothingImages.push(value)
      }
    }

    // Validate required images
    if (personImages.length === 0 || clothingImages.length === 0) {
      throw new Error("Both person and clothing images are required")
    }

    // Validate file sizes (max 1MB per file)
    const maxSize = 1 * 1024 * 1024 // 1MB
    for (const img of [...personImages, ...clothingImages]) {
      console.log(`Validating file size: ${img.name} (${img.size} bytes)`)
      if (img.size > maxSize) {
        throw new Error(`File "${img.name}" is too large. Maximum size is 1MB.`)
      }
    }

    const startTime = Date.now()

    // For Fal AI, only 1 person image and 1 clothing image are supported
    const finalPersonImages = selectedModel === "fal-ai" ? personImages.slice(0, 1) : personImages
    const finalClothingImages = selectedModel === "fal-ai" ? clothingImages.slice(0, 1) : clothingImages

    // Total size restriction removed (handled via client compression and API route constraints)

    // Analyze images and generate try-on in parallel
    const generationResult = await generateTryOnWithOpenAI(finalPersonImages, finalClothingImages)

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1) + "s"

    return {
      success: true,
      imageUrl: generationResult.imageUrl,
      processingTime,
      modelUsed: generationResult.modelUsed,
      provider: generationResult.provider,
      prompt: generationResult.prompt || undefined,
      method: generationResult.method,
    }
  } catch (error) {
    console.error("Try-on generation failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
