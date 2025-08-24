"use server";
import { openai } from "@/lib/openAi";
import { Buffer } from "buffer";
import sharp from "sharp";

/**
 * Compresses an image from a base64 data URL by reducing dimensions by 4x
 * @param dataUrl The data URL string (e.g., "data:image/jpeg;base64,...")
 * @returns Compressed data URL
 */
export async function compressImageDataUrl(dataUrl: string): Promise<string> {
  // Parse the data URL
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid data URL format");
  }

  const _contentType = match[1]; // Not used but kept for reference
  const base64Data = match[2];
  const inputBuffer = Buffer.from(base64Data, "base64");

  console.log(
    `Original image size: ${Math.round(inputBuffer.length / 1024)} KB`
  );

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

  console.log(
    `Compressed size: ${Math.round(
      outputBuffer.length / 1024
    )} KB (${newWidth}x${newHeight})`
  );

  // Convert back to data URL
  const compressedBase64 = outputBuffer.toString("base64");
  return `data:image/jpeg;base64,${compressedBase64}`;
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY not configured");
}

// Generate try-on image using OpenAI image.edit() with multiple images
export async function generateTryOnWithOpenAI(
  personImageFiles: File[],
  clothingImageFiles: File[]
) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  try {
    console.log("Starting OpenAI try-on generation...");

    // Take only the first image from each array for simplicity
    const personImage = personImageFiles[0];
    const clothingImage = clothingImageFiles[0];

    if (!personImage || !clothingImage) {
      throw new Error("Both person and clothing images are required");
    }

    const prompt = `Create a virtual try-on image by combining the person in the first image with the clothing item in the second image. Ensure the clothing fits naturally on the person, maintaining realistic proportions, lighting, and shadows. The final image should look like the person is wearing the clothing item in a natural pose with proper fit and draping.`;

    console.log("Calling OpenAI images.edit with prompt:", prompt);

    const editResponse = await openai.images.edit({
      model: "gpt-image-1",
      image: [personImage, clothingImage],
      prompt: prompt,
      n: 1,
      size: "1024x1536",
    });

    console.log("OpenAI edit response received");

    if (!editResponse.data || editResponse.data.length === 0) {
      throw new Error("No images returned from OpenAI edit");
    }

    const generatedImage = editResponse.data[0];

    if (!generatedImage) {
      throw new Error("No image URL in OpenAI response");
    }

    console.log("OpenAI try-on generation successful");

    const generatedImageUrl = generatedImage.b64_json;
    const outputFormat = editResponse.output_format;
    const originalDataUrl = `data:image/${outputFormat};base64,${generatedImageUrl}`;
    const compressedDataUrl = await compressImageDataUrl(originalDataUrl);

    return {
      imageUrl: compressedDataUrl,
      modelUsed: "gpt-image-1",
      provider: "OpenAI",
      prompt: prompt,
      method: "image-edit",
    };
  } catch (error) {
    console.error("OpenAI try-on generation failed:", error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("billing")) {
        throw new Error(
          "OpenAI API billing issue. Please check your OpenAI account."
        );
      } else if (error.message.includes("rate limit")) {
        throw new Error(
          "OpenAI API rate limit exceeded. Please try again later."
        );
      } else if (error.message.includes("invalid")) {
        throw new Error("Invalid image format. Please use JPG or PNG images.");
      }
    }

    throw new Error(
      `OpenAI generation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Main server action for generating try-on images
export async function generateTryOnImage(formData: FormData) {
  try {
    // Extract uploaded files
    const personImages: File[] = [];
    const clothingImages: File[] = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("personImage_") && value instanceof File) {
        personImages.push(value);
      } else if (key.startsWith("clothingImage_") && value instanceof File) {
        clothingImages.push(value);
      }
    }

    // Validate required images
    if (personImages.length === 0 || clothingImages.length === 0) {
      throw new Error("Both person and clothing images are required");
    }

    // Validate file sizes (max 1MB per file)
    const maxSize = 1 * 1024 * 1024; // 1MB
    for (const img of [...personImages, ...clothingImages]) {
      console.log(`Validating file size: ${img.name} (${img.size} bytes)`);
      if (img.size > maxSize) {
        throw new Error(
          `File "${img.name}" is too large. Maximum size is 1MB.`
        );
      }
    }

    const startTime = Date.now();

    // Analyze images and generate try-on in parallel
    const generationResult = await generateTryOnWithOpenAI(
      personImages,
      clothingImages
    );

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1) + "s";

    return {
      success: true,
      imageUrl: generationResult.imageUrl,
      processingTime,
      modelUsed: generationResult.modelUsed,
      provider: generationResult.provider,
      prompt: generationResult.prompt || undefined,
      method: generationResult.method,
    };
  } catch (error) {
    console.error("Try-on generation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
