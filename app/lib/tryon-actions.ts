"use server";
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY not configured");
}

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
  try {
    const personImageDataURL = await fileToDataURL(personImageFile);
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
        ["slim", "athletic", "average", "curvy", "plus size"]
      ),
      gender: extractValue(analysisText, ["male", "female", "non-binary"]),
      ageRange: extractAgeRange(analysisText),
      height: extractHeight(analysisText),
      measurements: {
        chest: extractMeasurement(analysisText, "chest"),
        waist: extractMeasurement(analysisText, "waist"),
        hips: extractMeasurement(analysisText, "hips"),
        shoulders: extractMeasurement(analysisText, "shoulders"),
      },
      skinTone: extractValue(
        analysisText,
        ["fair", "medium", "olive", "dark", "tan", "light", "deep"]
      ),
      pose: extractValue(
        analysisText,
        ["standing", "casual", "formal", "sitting", "walking", "running"]
      ),
      analysisConfidence: extractConfidence(analysisText),
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

    console.log('analyzed clothing image:', analysisText);

    // Fallback: extract information from text response
    const colors = extractColors(analysisText);
    return {
      type: extractValue(
        analysisText,
        [
          "t-shirt",
          "tee",
          "shirt",
          "dress",
          "jacket",
          "sweater",
          "hoodie",
          "blouse",
          "pants",
          "jeans",
          "trousers",
          "shorts",
          "skirt",
          "coat",
          "cardigan",
        ]
      ),
      primaryColor: colors[0] ?? "Unknown",
      secondaryColor: colors[1] ?? null,
      pattern: extractValue(
        analysisText,
        [
          "solid",
          "striped",
          "floral",
          "plaid",
          "checked",
          "polka dot",
          "graphic",
          "printed",
          "paisley",
          "animal print",
        ]
      ),
      material: extractValue(
        analysisText,
        [
          "cotton",
          "polyester",
          "silk",
          "linen",
          "wool",
          "denim",
          "leather",
          "rayon",
          "spandex",
          "nylon",
          "satin",
        ]
      ),
      style: extractValue(
        analysisText,
        [
          "casual",
          "formal",
          "streetwear",
          "sporty",
          "business casual",
          "vintage",
          "boho",
          "elegant",
          "minimalist",
          "smart",
        ]
      ),
      fit: extractValue(
        analysisText,
        [
          "tight",
          "slim fit",
          "regular",
          "relaxed",
          "loose",
          "oversized",
          "boxy",
        ]
      ),
      sleeves: extractValue(
        analysisText,
        ["short", "long", "sleeveless", "3/4", "three-quarter", "cap"]
      ),
      neckline: extractValue(
        analysisText,
        [
          "round",
          "crew",
          "v-neck",
          "scoop",
          "turtleneck",
          "collared",
          "button-down",
          "henley",
        ]
      ),
      analysisConfidence: extractConfidence(analysisText),
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

    const prompt =
      "Create a virtual try-on image by combining the provided person image (the first image) with the clothing item (second image). Ensure the clothing fits naturally on the person, maintaining realistic proportions and lighting. The final image should look like the person is wearing the clothing item in a natural pose.";
    const editResponse = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFiles,
      prompt: prompt,
      n: 1,
      size: "1024x1024",
    });

    console.log("OpenAI edit response:", editResponse);

    if (!editResponse.data || editResponse.data.length === 0) {
      throw new Error("No images returned from OpenAI edit");
    }

    const generatedImageUrl = editResponse.data[0]?.b64_json;

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

// Helper function to extract values from text
function extractValue(
  text: string,
  options: string[]
): string {
  const lowerText = text.toLowerCase();
  for (const option of options) {
    if (lowerText.includes(option.toLowerCase())) {
      return option.charAt(0).toUpperCase() + option.slice(1);
    }
  }
  return "Unknown";
}

// Extract age range patterns like "25-34", "20 to 30", or phrases like "mid 20s"
function extractAgeRange(text: string): string {
  const t = text.toLowerCase();
  const range = t.match(/(\d{2})\s*(?:-|to)\s*(\d{2})/);
  if (range) return `${range[1]}-${range[2]}`;
  const approx = t.match(/(?:early|mid|late)\s*(\d{2})s/);
  if (approx) {
    const base = parseInt(approx[1], 10);
    if (t.includes("early")) return `${base}-${base + 3}`;
    if (t.includes("mid")) return `${base + 2}-${base + 7}`;
    if (t.includes("late")) return `${base + 6}-${base + 9}`;
  }
  const single = t.match(/age\s*(\d{2})/);
  if (single) {
    const a = parseInt(single[1], 10);
    return `${a - 2}-${a + 2}`;
  }
  return "Unknown";
}

// Extract height like "170 cm", "1.75 m", "5'9\""
function extractHeight(text: string): string {
  const t = text.toLowerCase();
  const cm = t.match(/(\d{2,3})\s*cm/);
  if (cm) return `${cm[1]}cm`;
  const m = t.match(/(\d(?:\.\d{1,2})?)\s*m/);
  if (m) return `${Math.round(parseFloat(m[1]) * 100)}cm`;
  const ftIn = t.match(/(\d)'\s*(\d{1,2})(?:"|”)?/);
  if (ftIn) {
    const ft = parseInt(ftIn[1], 10);
    const inch = parseInt(ftIn[2], 10);
    const total = Math.round((ft * 12 + inch) * 2.54);
    return `${total}cm`;
  }
  return "Unknown";
}

// Extract measurement for a named body part like chest/waist/hips/shoulders
function extractMeasurement(text: string, key: string): string {
  const t = text.toLowerCase();
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escapedKey}[^\\n\\r:]*?:?\\s*(\\d{2,3})\\s*(?:cm|centimeters|centimetres)`, "i");
  const m = t.match(re);
  if (m) return `${m[1]}cm`;
  return "Unknown";
}

// Extract up to two color words
function extractColors(text: string): string[] {
  const colorList = [
    "black", "white", "gray", "grey", "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "beige", "tan", "navy", "teal", "maroon", "olive", "gold", "silver"
  ];
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const c of colorList) {
    if (lower.includes(c)) found.push(c.charAt(0).toUpperCase() + c.slice(1));
    if (found.length === 2) break;
  }
  return found;
}

// Extract confidence percentage like "85%" or statements like "confidence: 0.82"
function extractConfidence(text: string): string {
  const percent = text.match(/(\d{2,3})%/);
  if (percent) return `${Math.min(100, Math.max(0, parseInt(percent[1], 10)))}%`;
  const decimal = text.match(/confidence[^\d]*(0?\.\d{1,2}|1(?:\.0+)?)|confidence[^\d]*(\d{1,3})/i);
  if (decimal) {
    const val = decimal[1] ? parseFloat(decimal[1]) * 100 : parseFloat(decimal[2]);
    if (!isNaN(val)) return `${Math.min(100, Math.max(0, Math.round(val)))}%`;
  }
  return "Unknown";
}
