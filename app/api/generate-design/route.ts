import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import OpenAI from "openai"

export const runtime = "nodejs"

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
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: "OpenAI API key not configured" }, { status: 500 })
    }

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

    const basePrompt = `Transform this dress design sketch into a professional fashion rendering. Apply the following specifications: ${description}. Use primary color: ${color}. Create a high-quality fashion illustration with detailed fabric textures, construction details, and professional styling. Maintain the original design structure while enhancing with realistic details and the specified color scheme.`

    const variations = []

    // Generate 2 front variations using the uploaded front drawing
    for (let i = 1; i <= 2; i++) {
      const frontPrompt = `${basePrompt} Style variation ${i}: ${i === 1 ? "elegant and refined styling with classic details" : "modern contemporary interpretation with updated elements"}.`

      try {
        const frontResponse = await openai.images.edit({
          model: "gpt-image-1",
          image: frontDrawing,
          prompt: frontPrompt,
          size: "1024x1024",
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
      const backBasePrompt = `Transform this dress back design sketch into a professional fashion rendering. Apply the following specifications: ${description}. Use primary color: ${color}. Create a high-quality back view fashion illustration with detailed construction, closure details, and professional styling. Maintain the original back design structure while enhancing with realistic details.`

      for (let i = 1; i <= 2; i++) {
        const backPrompt = `${backBasePrompt} Style variation ${i}: ${i === 1 ? "elegant back design with refined closure and detail work" : "modern back design with contemporary construction elements"}.`

        try {
          const backResponse = await openai.images.edit({
            model: "gpt-image-1",
            image: backDrawing,
            prompt: backPrompt,
            size: "1024x1024",
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
