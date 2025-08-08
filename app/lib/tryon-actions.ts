"use server";
import { fileToDataURL } from "@/lib/utils";
import { analyzeClothingImage, analyzePersonImage } from "./analyze-actions";
import { openai } from "@/lib/openAi";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY not configured");
}

// Generate try-on image using OpenAI image.edit()
export async function generateTryOnWithOpenAI(
  personImageFile: File,
  clothingImageFile: File
) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  try {
    console.log("Starting OpenAI try-on generation...");

    const imageFiles = [personImageFile, clothingImageFile];

    const prompt =
      "Create a virtual try-on image by combining the provided person image (the first image) with the clothing item (second image). Ensure the clothing fits naturally on the person, maintaining realistic proportions and lighting. The final image should look like the person is wearing the clothing item in a natural pose.";
    const editResponse = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFiles,
      prompt: prompt,
      n: 1,
      size: "1024x1536",
    });

    if (!editResponse.data || editResponse.data.length === 0) {
      throw new Error("No images returned from OpenAI edit");
    }

    const generatedImageUrl = editResponse.data[0]?.b64_json;
    const outputFormat = editResponse.output_format;

    if (!generatedImageUrl) {
      throw new Error("No image generated from OpenAI edit");
    }

    console.log("OpenAI try-on generation successful");

    return {
      imageUrl: `data:image/${outputFormat};base64,${generatedImageUrl}`,
      modelUsed: "gpt-image-1",
      provider: "OpenAI",
      prompt: prompt,
      method: "image-edit",
    };
  } catch (error) {
    console.error("OpenAI try-on generation failed:", error);
    throw new Error(
      `OpenAI generation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Generate try-on image using Fal AI
export async function generateTryOnWithFalAI(
  personImageFile: File,
  clothingImageFile: File
) {
  if (!process.env.FAL_KEY) {
    throw new Error("FAL_KEY not configured");
  }

  try {
    console.log("Starting Fal AI try-on generation...");

    // Convert images to data URLs
    const [personImageDataURL, clothingImageDataURL] = await Promise.all([
      fileToDataURL(personImageFile),
      fileToDataURL(clothingImageFile),
    ]);

    // Import Fal AI dynamically
    const fal = await import("@fal-ai/serverless-client");

    fal.config({
      credentials: process.env.FAL_KEY,
    });

    const result: any = await fal.subscribe("fal-ai/fashn/tryon/v1.6", {
      input: {
        model_image: personImageDataURL,
        garment_image: clothingImageDataURL,
        num_inference_steps: 20,
        guidance_scale: 2.0,
        seed: Math.floor(Math.random() * 1000000),
      },
    });

    const generatedImageUrl = result.image?.url || result.images?.[0]?.url;

    if (!generatedImageUrl) {
      throw new Error("No image generated from Fal AI");
    }

    console.log("Fal AI try-on generation successful");

    return {
      imageUrl: generatedImageUrl,
      modelUsed: "fal-ai/fashn/tryon/v1.6",
      provider: "Fal AI",
      prompt: undefined,
      method: "virtual-tryon",
    };
  } catch (error) {
    console.error("Fal AI try-on generation failed:", error);
    throw new Error(
      `Fal AI generation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Main server action for generating try-on images
export async function generateTryOnImage(formData: FormData) {
  try {
    const selectedModel = (formData.get("selectedModel") as string) || "fal-ai";

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

    // Validate file sizes (max 10MB per file)
    const maxSize = 10 * 1024 * 1024; // 10MB
    for (const img of [...personImages, ...clothingImages]) {
      if (img.size > maxSize) {
        throw new Error(
          `File "${img.name}" is too large. Maximum size is 10MB.`
        );
      }
    }

    const startTime = Date.now();

    // Analyze images and generate try-on in parallel
    const [personDetails, clothingDetails, generationResult] =
      await Promise.all([
        analyzePersonImage(personImages[0]),
        analyzeClothingImage(clothingImages[0]),
        selectedModel === "fal-ai"
          ? generateTryOnWithFalAI(personImages[0], clothingImages[0])
          : generateTryOnWithOpenAI(personImages[0], clothingImages[0]),
      ]);

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1) + "s";

    return {
      success: true,
      imageUrl: generationResult.imageUrl,
      personDetails,
      clothingDetails,
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
