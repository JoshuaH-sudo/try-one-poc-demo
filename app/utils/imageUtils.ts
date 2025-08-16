import imageCompression from "browser-image-compression"
import type { UploadedImage } from "./types"

export const handleImageUpload = (files: FileList | null, setter: (img: UploadedImage | null) => void) => {
  if (!files || files.length === 0) return

  const file = files[0]
  if (file.type.startsWith("image/")) {
    const preview = URL.createObjectURL(file)
    const id = Math.random().toString(36).substr(2, 9)
    setter({ file, preview, id })
  }
}

export const removeImage = (image: UploadedImage | null) => {
  if (image) {
    URL.revokeObjectURL(image.preview)
  }
}

export const compressImage = async (
  file: File,
  options: { maxWidth: number; maxHeight: number; quality: number } = {
    maxWidth: 1024,
    maxHeight: 1536,
    quality: 0.8,
  },
): Promise<File> => {
  const compressionOptions = {
    maxSizeMB: 0.25, // Maximum file size in MB
    maxWidthOrHeight: Math.max(options.maxWidth, options.maxHeight),
    useWebWorker: true,
    initialQuality: options.quality,
  }

  try {
    const compressedFile = await imageCompression(file, compressionOptions)
    return compressedFile
  } catch (error) {
    console.error("Error compressing image:", error)
    // Return original file if compression fails
    return file
  }
}
