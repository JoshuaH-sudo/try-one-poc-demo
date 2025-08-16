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

export const compressImage = (
  file: File,
  options: { maxWidth: number; maxHeight: number; quality: number },
): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!
    const img = new Image()

    img.onload = () => {
      const { maxWidth, maxHeight, quality } = options
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

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          const compressedFile = new File([blob!], file.name, {
            type: file.type,
            lastModified: Date.now(),
          })
          resolve(compressedFile)
        },
        file.type,
        quality,
      )
    }

    img.src = URL.createObjectURL(file)
  })
}
