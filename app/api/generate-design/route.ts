import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import sharp from "sharp";

export const runtime = "nodejs";

/**
 * Compresses an image from a base64 data URL by reducing dimensions by 4x
 * @param dataUrl The data URL string (e.g., "data:image/jpeg;base64,...")
 * @returns Compressed data URL
 */
async function compressImageDataUrl(dataUrl: string): Promise<string> {
  // Parse the data URL
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid data URL format");
  }

  const _contentType = match[1]; // Not used but kept for reference
  const base64Data = match[2];
  const inputBuffer = Buffer.from(base64Data, "base64");
  
  console.log(`Original image size: ${Math.round(inputBuffer.length / 1024)} KB`);
  
  // Get the metadata to calculate new dimensions
  const metadata = await sharp(inputBuffer).metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1536;
  
  // Simple approach: divide dimensions by 4
  const newWidth = Math.round(width / 4);
  const newHeight = Math.round(height / 4);
  
  // Resize the image
  const outputBuffer = await sharp(inputBuffer)
    .resize(newWidth, newHeight)
    .jpeg({ quality: 80 })
    .toBuffer();
  
  console.log(`Compressed size: ${Math.round(outputBuffer.length / 1024)} KB (${newWidth}x${newHeight})`);
  
  // Convert back to data URL
  const compressedBase64 = outputBuffer.toString("base64");
  return `data:image/jpeg;base64,${compressedBase64}`;
}

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

    const basePrompt = `Transform this dress design sketch into a professional fashion rendering. Apply the following specifications: ${description}. Use primary color: ${color} in the dress. The background should be a plain white. Create a high-quality fashion illustration with detailed fabric textures, construction details, and professional styling. Maintain the original design structure while enhancing with realistic details and the specified color scheme.`;

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

      // Process all images returned in the response - using for loop instead of forEach for async
      for (let index = 0; index < frontResponse.data.length; index++) {
        const image = frontResponse.data[index];
        const generatedImageUrl = image.b64_json;
        const outputFormat = frontResponse.output_format;

        if (!generatedImageUrl) {
          console.warn(`No image data for front variation ${index + 1}`);
          continue;
        }

        console.log(`Front variation ${index + 1} generated successfully`);
        try {
          // Compress the image data URL before adding to variations
          const originalDataUrl = `data:image/${outputFormat};base64,${generatedImageUrl}`;
          const compressedDataUrl = await compressImageDataUrl(originalDataUrl);
          
          variations.push({
            id: `front_${index + 1}`,
            imageUrl: compressedDataUrl,
            type: "front" as const,
            description: `Front design variation ${index + 1}`,
          });
        } catch (compressionError) {
          console.error(`Failed to compress front variation ${index + 1}:`, compressionError);
          // Fall back to original image if compression fails
          variations.push({
            id: `front_${index + 1}`,
            imageUrl: `data:image/${outputFormat};base64,${generatedImageUrl}`,
            type: "front" as const,
            description: `Front design variation ${index + 1}`,
          });
        }
      }
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
      const backBasePrompt = `Transform this back view of a dress design sketch into a professional fashion rendering. Apply the following specifications: ${description}. Use primary color: ${color} in the dress. The background colour should be plain white. Create a high-quality back view fashion illustration with detailed construction, closure details, and professional styling. Maintain the original back design structure while enhancing with realistic details.`;

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

        // Process all images returned in the response - using for loop instead of forEach for async
        for (let index = 0; index < backResponse.data.length; index++) {
          const image = backResponse.data[index];
          const generatedImageUrl = image.b64_json;
          const outputFormat = backResponse.output_format;

          if (!generatedImageUrl) {
            console.warn(`No image data for back variation ${index + 1}`);
            continue;
          }

          console.log(`Back variation ${index + 1} generated successfully`);
          try {
            // Compress the image data URL before adding to variations
            const originalDataUrl = `data:image/${outputFormat};base64,${generatedImageUrl}`;
            const compressedDataUrl = await compressImageDataUrl(originalDataUrl);
            
            variations.push({
              id: `back_${index + 1}`,
              imageUrl: compressedDataUrl,
              type: "back" as const,
              description: `Back design variation ${index + 1}`,
            });
          } catch (compressionError) {
            console.error(`Failed to compress back variation ${index + 1}:`, compressionError);
            // Fall back to original image if compression fails
            variations.push({
              id: `back_${index + 1}`,
              imageUrl: `data:image/${outputFormat};base64,${generatedImageUrl}`,
              type: "back" as const,
              description: `Back design variation ${index + 1}`,
            });
          }
        }
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
