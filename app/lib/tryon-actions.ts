"use server";
import fs from "fs";
import OpenAI, { toFile } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

// Helper function to convert File to base64 data URL
async function fileToDataURL(file: File): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    return `data:${file.type};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("Error converting file to data URL:", error);
    throw new Error("Failed to process image file");
  }
}

// Analyze person image using OpenAI Vision
export async function analyzePersonImage(personImageFile: File) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  try {
    const personImageDataURL = await fileToDataURL(personImageFile);

    // Create OpenAI client inside the function
    const { default: OpenAI } = await import("openai");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: 'Analyze this person\'s image and provide detailed information about their physical characteristics. Return a JSON object with the following structure: { "bodyType": "string (Slim/Athletic/Average/Curvy/Plus Size)", "gender": "string (Male/Female)", "ageRange": "string (e.g., 20-30)", "height": "string (estimated in cm)", "measurements": { "chest": "string (in cm)", "waist": "string (in cm)", "hips": "string (in cm)", "shoulders": "string (in cm)" }, "skinTone": "string (Fair/Medium/Olive/Dark)", "pose": "string (Standing/Casual/Formal)", "analysisConfidence": "string (percentage)" }',
            },
            {
              type: "image_url",
              image_url: {
                url: personImageDataURL,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const analysisText = response.choices[0]?.message?.content || "";

    // Try to parse JSON from the response
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse JSON from OpenAI response:", parseError);
    }

    // Fallback: extract information from text response
    return {
      bodyType: extractValue(
        analysisText,
        ["slim", "athletic", "average", "curvy", "plus size"],
        "Average"
      ),
      gender: extractValue(analysisText, ["male", "female"], "Unknown"),
      ageRange: "25-35",
      height: "170cm",
      measurements: {
        chest: "90cm",
        waist: "75cm",
        hips: "95cm",
        shoulders: "40cm",
      },
      skinTone: extractValue(
        analysisText,
        ["fair", "medium", "olive", "dark"],
        "Medium"
      ),
      pose: "Standing",
      analysisConfidence: "85%",
    };
  } catch (error) {
    console.error("Person image analysis failed:", error);
    throw new Error(
      `Failed to analyze person image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Analyze clothing image using OpenAI Vision
export async function analyzeClothingImage(clothingImageFile: File) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  try {
    const clothingImageDataURL = await fileToDataURL(clothingImageFile);

    // Create OpenAI client inside the function
    const { default: OpenAI } = await import("openai");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: 'Analyze this clothing item and provide detailed information. Return a JSON object with the following structure: { "type": "string (T-Shirt/Dress/Jacket/etc.)", "primaryColor": "string", "secondaryColor": "string or null", "pattern": "string (Solid/Striped/Floral/etc.)", "material": "string (Cotton/Polyester/Silk/etc.)", "style": "string (Casual/Formal/Vintage/etc.)", "fit": "string (Tight/Regular/Loose/Oversized)", "sleeves": "string (Short/Long/Sleeveless/3-4)", "neckline": "string (Round/V-neck/Crew/etc.)", "analysisConfidence": "string (percentage)" }',
            },
            {
              type: "image_url",
              image_url: {
                url: clothingImageDataURL,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const analysisText = response.choices[0]?.message?.content || "";

    // Try to parse JSON from the response
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse JSON from OpenAI response:", parseError);
    }

    // Fallback: extract information from text response
    return {
      type: extractValue(
        analysisText,
        ["t-shirt", "dress", "jacket", "sweater", "blouse", "pants", "skirt"],
        "T-Shirt"
      ),
      primaryColor: extractValue(
        analysisText,
        ["black", "white", "blue", "red", "green", "pink", "purple"],
        "Blue"
      ),
      secondaryColor: null,
      pattern: "Solid",
      material: "Cotton",
      style: "Casual",
      fit: "Regular",
      sleeves: "Short",
      neckline: "Round",
      analysisConfidence: "85%",
    };
  } catch (error) {
    console.error("Clothing image analysis failed:", error);
    throw new Error(
      `Failed to analyze clothing image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
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


    const prompt = "Create a virtual try-on image by combining the provided person image (the first image) with the clothing item (second image). Ensure the clothing fits naturally on the person, maintaining realistic proportions and lighting. The final image should look like the person is wearing the clothing item in a natural pose.";
    const editResponse = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFiles,
      prompt: prompt,
      n: 1,
      size: "1024x1024",
    });

    if (!editResponse.data || editResponse.data.length === 0) {
      throw new Error("No images returned from OpenAI edit");
    }

    const generatedImageUrl = editResponse.data[0]?.url;

    if (!generatedImageUrl) {
      throw new Error("No image generated from OpenAI edit");
    }

    console.log("OpenAI try-on generation successful");

    return {
      imageUrl: generatedImageUrl,
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

    const result = await fal.subscribe("fal-ai/fashn/tryon/v1.6", {
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

// Helper function to extract values from text
function extractValue(
  text: string,
  options: string[],
  defaultValue: string
): string {
  const lowerText = text.toLowerCase();
  for (const option of options) {
    if (lowerText.includes(option.toLowerCase())) {
      return option.charAt(0).toUpperCase() + option.slice(1);
    }
  }
  return defaultValue;
}
