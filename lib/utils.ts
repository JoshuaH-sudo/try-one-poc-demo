import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to convert File to base64 data URL
export async function fileToDataURL(file: File): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    return `data:${file.type};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("Error converting file to data URL:", error);
    throw new Error("Failed to process image file");
  }
}
