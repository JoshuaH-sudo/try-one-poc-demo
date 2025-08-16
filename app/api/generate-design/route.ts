import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import OpenAI from "openai"

const DesignVariationsSchema = z.object({
  variations: z.array(
    z.object({
      id: z.string(),
      imageUrl: z.string(),
      type: z.enum(["front", "back"]),
      description: z.string(),
    }),
  ),
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const frontDrawing = formData.get("frontDrawing") as File
    const backDrawing = formData.get("backDrawing") as File | null
    const description = formData.get("description") as string
    const color = formData.get("color") as string

    if (!frontDrawing) {
      return NextResponse.json({ success: false, error: "Front drawing is required" }, { status: 400 })
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Convert images to base64
    const frontBuffer = await frontDrawing.arrayBuffer()
    const frontBase64 = Buffer.from(frontBuffer).toString("base64")

    let backBase64 = null
    if (backDrawing) {
      const backBuffer = await backDrawing.arrayBuffer()
      backBase64 = Buffer.from(backBuffer).toString("base64")
    }

    const basePrompt = `Professional fashion design rendering of a dress. ${description}. Primary color: ${color}. High-quality fashion illustration style, suitable for tailoring reference. Clean white background, front view, detailed fabric textures and construction details visible.`

    const variations = []

    // Generate 2 front variations
    for (let i = 1; i <= 2; i++) {
      const frontPrompt = `${basePrompt} Variation ${i}: ${i === 1 ? "elegant and refined styling" : "modern contemporary interpretation"}.`

      try {
        const frontResponse = await openai.images.generate({
          model: "dall-e-3",
          prompt: frontPrompt,
          size: "1024x1024",
          quality: "standard",
          n: 1,
        })

        if (frontResponse.data[0]?.url) {
          variations.push({
            id: `front_${i}`,
            imageUrl: frontResponse.data[0].url,
            type: "front" as const,
            description:
              i === 1 ? "Elegant variation with refined details" : "Modern interpretation with contemporary styling",
          })
        }
      } catch (error) {
        console.error(`Error generating front variation ${i}:`, error)
        // Fallback to placeholder
        variations.push({
          id: `front_${i}`,
          imageUrl: `/placeholder.svg?height=600&width=400&query=dress_design_variation_${i}_${color.replace("#", "")}`,
          type: "front" as const,
          description:
            i === 1 ? "Elegant variation with refined details" : "Modern interpretation with contemporary styling",
        })
      }
    }

    // Generate back variations if back drawing provided
    if (backDrawing) {
      const backBasePrompt = `Professional fashion design rendering of a dress back view. ${description}. Primary color: ${color}. High-quality fashion illustration style, back view, detailed construction and closure details visible. Clean white background.`

      for (let i = 1; i <= 2; i++) {
        const backPrompt = `${backBasePrompt} Variation ${i}: ${i === 1 ? "elegant back design with refined details" : "modern back design with contemporary elements"}.`

        try {
          const backResponse = await openai.images.generate({
            model: "dall-e-3",
            prompt: backPrompt,
            size: "1024x1024",
            quality: "standard",
            n: 1,
          })

          if (backResponse.data[0]?.url) {
            variations.push({
              id: `back_${i}`,
              imageUrl: backResponse.data[0].url,
              type: "back" as const,
              description: i === 1 ? "Elegant back design variation" : "Modern back design variation",
            })
          }
        } catch (error) {
          console.error(`Error generating back variation ${i}:`, error)
          // Fallback to placeholder
          variations.push({
            id: `back_${i}`,
            imageUrl: `/placeholder.svg?height=600&width=400&query=back_design_variation_${i}_${color.replace("#", "")}`,
            type: "back" as const,
            description: i === 1 ? "Elegant back design variation" : "Modern back design variation",
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      variations,
    })
  } catch (error) {
    console.error("Error generating design variations:", error)
    return NextResponse.json({ success: false, error: "Failed to generate design variations" }, { status: 500 })
  }
}
