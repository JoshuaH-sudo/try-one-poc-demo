import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";

export const runtime = "nodejs";

const DesignVariationsSchema = z.object({
  variations: z.array(
    z.object({
      id: z.string(),
      imageUrl: z.string(),
      type: z.enum(["front", "back"]),
      description: z.string(),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    console.log("Form data received");

    const formData = await request.formData();
    const frontDrawing = formData.get("frontDrawing") as File;
    const backDrawing = formData.get("backDrawing") as File | null;
    const description = formData.get("description") as string;
    const color = formData.get("color") as string;

    if (!frontDrawing) {
      return NextResponse.json(
        { success: false, error: "Front drawing is required" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const basePrompt = `Transform this dress design sketch into a professional fashion rendering. Apply the following specifications: ${description}. Use primary color: ${color}. Create a high-quality fashion illustration with detailed fabric textures, construction details, and professional styling. Maintain the original design structure while enhancing with realistic details and the specified color scheme.`;

    const variations = [];

    // Generate front variations using the uploaded front drawing in a single request
    console.log("Generating front variations");
    try {
      const frontResponse = await openai.images.edit({
        model: "gpt-image-1",
        image: frontDrawing,
        prompt: basePrompt,
        size: "1024x1536",
        n: 2, // Generate 2 variations in a single request
      });

      console.log("OpenAI front response:", { frontResponse });

      if (!frontResponse.data || frontResponse.data.length === 0) {
        throw new Error("No response from OpenAI");
      }

      // Process all images returned in the response
      frontResponse.data.forEach((image, index) => {
        const generatedImageUrl = image.b64_json;
        const outputFormat = frontResponse.output_format;

        if (!generatedImageUrl) {
          console.warn(`No image data for front variation ${index + 1}`);
          return;
        }

        console.log(`Front variation ${index + 1} generated successfully`);
        variations.push({
          id: `front_${index + 1}`,
          imageUrl: `data:image/${outputFormat};base64,${generatedImageUrl}`,
          type: "front" as const,
          description: `Front design variation ${index + 1}`,
        });
      });
    } catch (error) {
      console.error("Error generating front variations:", error);
      // Add fallback placeholders for both expected variations
      for (let i = 1; i <= 2; i++) {
        variations.push({
          id: `front_${i}`,
          imageUrl: `/placeholder.svg?height=600&width=400&query=dress_design_variation_${i}_${color.replace(
            "#",
            ""
          )}`,
          type: "front" as const,
          description: `Front design variation ${i}`,
        });
      }
    }

    // Generate back variations if back drawing provided
    if (backDrawing) {
      console.log("Generating back variations");
      const backBasePrompt = `Transform this back view of a dress design sketch into a professional fashion rendering. Apply the following specifications: ${description}. Use primary color: ${color}. Create a high-quality back view fashion illustration with detailed construction, closure details, and professional styling. Maintain the original back design structure while enhancing with realistic details.`;

      try {
        const backResponse = await openai.images.edit({
          model: "gpt-image-1",
          image: backDrawing,
          prompt: backBasePrompt,
          size: "1024x1536",
          n: 2, // Generate 2 variations in a single request
        });

        console.log("OpenAI back response:", { backResponse });

        if (!backResponse.data || backResponse.data.length === 0) {
          throw new Error("No response from OpenAI");
        }

        // Process all images returned in the response
        backResponse.data.forEach((image, index) => {
          const generatedImageUrl = image.b64_json;
          const outputFormat = backResponse.output_format;

          if (!generatedImageUrl) {
            console.warn(`No image data for back variation ${index + 1}`);
            return;
          }

          console.log(`Back variation ${index + 1} generated successfully`);
          variations.push({
            id: `back_${index + 1}`,
            imageUrl: `data:image/${outputFormat};base64,${generatedImageUrl}`,
            type: "back" as const,
            description: `Back design variation ${index + 1}`,
          });
        });
      } catch (error) {
        console.error("Error generating back variations:", error);
        // Add fallback placeholders for both expected variations
        for (let i = 1; i <= 2; i++) {
          variations.push({
            id: `back_${i}`,
            imageUrl: `/placeholder.svg?height=600&width=400&query=back_design_variation_${i}_${color.replace(
              "#",
              ""
            )}`,
            type: "back" as const,
            description: `Back design variation ${i}`,
          });
        }
      }
    }

    console.log("Design variations generated successfully");
    console.log("Generated variations:", variations);

    return NextResponse.json({
      success: true,
      variations,
    });
  } catch (error) {
    console.error("Error generating design variations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate design variations" },
      { status: 500 }
    );
  }
}
