import { openai } from "@/lib/openAi";
import { fileToDataURL } from "@/lib/utils";

// Analyze person image using OpenAI Vision
export async function analyzePersonImage(personImageFile: File) {
  try {
    const personImageDataURL = await fileToDataURL(personImageFile);
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a vision assistant that MUST return only a single JSON object matching the specified schema. Never include extra text. If any value cannot be determined, set it to 'Unknown'.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: 'Analyze this person\'s image and produce ONLY a JSON object with this exact structure: { "bodyType": "Slim | Athletic | Average | Curvy | Plus Size | Unknown", "gender": "Male | Female | Non-binary | Unknown", "ageRange": "string (e.g., 20-30 or Unknown)", "height": "string (estimated in cm or Unknown)", "measurements": { "chest": "string (in cm or Unknown)", "waist": "string (in cm or Unknown)", "hips": "string (in cm or Unknown)", "shoulders": "string (in cm or Unknown)" }, "skinTone": "Fair | Medium | Olive | Dark | Tan | Light | Deep | Unknown", "pose": "Standing | Casual | Formal | Sitting | Walking | Running | Unknown", "analysisConfidence": "string (percentage or Unknown)" }. Do not add explanations. If unsure, use "Unknown".',
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

    // Try to parse JSON from the response (JSON-only enforced)
    try {
      const parsed = JSON.parse(analysisText);
      return normalizePersonAnalysis(parsed, analysisText);
    } catch {
      console.warn("Person analysis not JSON, normalizing from text.");
      return normalizePersonAnalysis(null, analysisText);
    }
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
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a vision assistant that MUST return only a single JSON object matching the specified schema. Never include extra text. If any value cannot be determined, set it to 'Unknown' (or null for secondaryColor).",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: 'Analyze this clothing item and produce ONLY a JSON object with this exact structure: { "type": "string | Unknown", "primaryColor": "string | Unknown", "secondaryColor": "string or null", "pattern": "string | Unknown", "material": "string | Unknown", "style": "string | Unknown", "fit": "string | Unknown", "sleeves": "string | Unknown", "neckline": "string | Unknown", "analysisConfidence": "string (percentage or Unknown)" }. Do not add explanations. If unsure, use "Unknown" and set secondaryColor to null when absent.',
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

    // Try to parse JSON from the response (JSON-only enforced)
    try {
      const parsed = JSON.parse(analysisText);
      return normalizeClothingAnalysis(parsed, analysisText);
    } catch {
      console.warn("Clothing analysis not JSON, normalizing from text.");
      return normalizeClothingAnalysis(null, analysisText);
    }
  } catch (error) {
    console.error("Clothing image analysis failed:", error);
    throw new Error(
      `Failed to analyze clothing image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
// Normalize person analysis to our expected schema, using parsed JSON when available
function normalizePersonAnalysis(parsed: any | null, fallbackText: string) {
  if (parsed && typeof parsed === "object") {
    return {
      bodyType: parsed.bodyType ?? "Unknown",
      gender: parsed.gender ?? "Unknown",
      ageRange: parsed.ageRange ?? "Unknown",
      height: parsed.height ?? "Unknown",
      measurements: {
        chest: parsed.measurements?.chest ?? "Unknown",
        waist: parsed.measurements?.waist ?? "Unknown",
        hips: parsed.measurements?.hips ?? "Unknown",
        shoulders: parsed.measurements?.shoulders ?? "Unknown",
      },
      skinTone: parsed.skinTone ?? "Unknown",
      pose: parsed.pose ?? "Unknown",
      analysisConfidence: parsed.analysisConfidence ?? "Unknown",
    };
  }
  // Fallback: extract from text
  return {
    bodyType: extractValue(fallbackText, [
      "slim",
      "athletic",
      "average",
      "curvy",
      "plus size",
    ]),
    gender: extractValue(fallbackText, ["male", "female", "non-binary"]),
    ageRange: extractAgeRange(fallbackText),
    height: extractHeight(fallbackText),
    measurements: {
      chest: extractMeasurement(fallbackText, "chest"),
      waist: extractMeasurement(fallbackText, "waist"),
      hips: extractMeasurement(fallbackText, "hips"),
      shoulders: extractMeasurement(fallbackText, "shoulders"),
    },
    skinTone: extractValue(fallbackText, [
      "fair",
      "medium",
      "olive",
      "dark",
      "tan",
      "light",
      "deep",
    ]),
    pose: extractValue(fallbackText, [
      "standing",
      "casual",
      "formal",
      "sitting",
      "walking",
      "running",
    ]),
    analysisConfidence: extractConfidence(fallbackText),
  };
}

// Normalize clothing analysis to our expected schema
function normalizeClothingAnalysis(parsed: any | null, fallbackText: string) {
  if (parsed && typeof parsed === "object") {
    return {
      type: parsed.type ?? "Unknown",
      primaryColor: parsed.primaryColor ?? "Unknown",
      secondaryColor: parsed.secondaryColor ?? null,
      pattern: parsed.pattern ?? "Unknown",
      material: parsed.material ?? "Unknown",
      style: parsed.style ?? "Unknown",
      fit: parsed.fit ?? "Unknown",
      sleeves: parsed.sleeves ?? "Unknown",
      neckline: parsed.neckline ?? "Unknown",
      analysisConfidence: parsed.analysisConfidence ?? "Unknown",
    };
  }
  const colors = extractColors(fallbackText);
  return {
    type: extractValue(fallbackText, [
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
    ]),
    primaryColor: colors[0] ?? "Unknown",
    secondaryColor: colors[1] ?? null,
    pattern: extractValue(fallbackText, [
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
    ]),
    material: extractValue(fallbackText, [
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
    ]),
    style: extractValue(fallbackText, [
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
    ]),
    fit: extractValue(fallbackText, [
      "tight",
      "slim fit",
      "regular",
      "relaxed",
      "loose",
      "oversized",
      "boxy",
    ]),
    sleeves: extractValue(fallbackText, [
      "short",
      "long",
      "sleeveless",
      "3/4",
      "three-quarter",
      "cap",
    ]),
    neckline: extractValue(fallbackText, [
      "round",
      "crew",
      "v-neck",
      "scoop",
      "turtleneck",
      "collared",
      "button-down",
      "henley",
    ]),
    analysisConfidence: extractConfidence(fallbackText),
  };
}

// Helper function to extract values from text
function extractValue(text: string, options: string[]): string {
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
  const re = new RegExp(
    `${escapedKey}[^\\n\\r:]*?:?\\s*(\\d{2,3})\\s*(?:cm|centimeters|centimetres)`,
    "i"
  );
  const m = t.match(re);
  if (m) return `${m[1]}cm`;
  return "Unknown";
}

// Extract up to two color words
function extractColors(text: string): string[] {
  const colorList = [
    "black",
    "white",
    "gray",
    "grey",
    "red",
    "blue",
    "green",
    "yellow",
    "orange",
    "purple",
    "pink",
    "brown",
    "beige",
    "tan",
    "navy",
    "teal",
    "maroon",
    "olive",
    "gold",
    "silver",
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
  if (percent)
    return `${Math.min(100, Math.max(0, parseInt(percent[1], 10)))}%`;
  const decimal = text.match(
    /confidence[^\d]*(0?\.\d{1,2}|1(?:\.0+)?)|confidence[^\d]*(\d{1,3})/i
  );
  if (decimal) {
    const val = decimal[1]
      ? parseFloat(decimal[1]) * 100
      : parseFloat(decimal[2]);
    if (!isNaN(val)) return `${Math.min(100, Math.max(0, Math.round(val)))}%`;
  }
  return "Unknown";
}
