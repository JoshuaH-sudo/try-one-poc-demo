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
