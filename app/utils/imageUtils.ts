export async function compressImage(
  file: File,
  options: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
  } = {},
): Promise<File> {
  const { maxWidth = 1024, maxHeight = 1024, quality = 0.8 } = options

  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          } else {
            reject(new Error("Canvas toBlob failed"))
          }
        },
        file.type,
        quality,
      )
    }

    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = URL.createObjectURL(file)
  })
}

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = URL.createObjectURL(file)
  })
}

export interface UploadedImage {
  file: File
  preview: string
  id: string
}

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

// Utility function to download images
export const downloadImage = async (imageUrl: string, filename: string) => {
  try {
    // If it's a data URL, download directly
    if (imageUrl.startsWith("data:")) {
      const link = document.createElement("a")
      link.href = imageUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    }

    // If it's a regular URL, fetch and download
    const response = await fetch(imageUrl)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Error downloading image:", error)
    throw new Error("Failed to download image")
  }
}

// Utility to download multiple images as a zip (simplified version)
export const downloadAllVariations = async (variations: Array<{ id: string; imageUrl: string; type: string }>) => {
  try {
    // Download each variation individually with descriptive names
    for (const variation of variations) {
      const filename = `design-${variation.type}-${variation.id}.png`
      await downloadImage(variation.imageUrl, filename)
      // Add small delay between downloads to avoid overwhelming the browser
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  } catch (error) {
    console.error("Error downloading variations:", error)
    throw new Error("Failed to download variations")
  }
}
