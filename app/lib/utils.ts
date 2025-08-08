// Client-only helpers

export async function compressImage(
  file: File,
  options: { maxWidth: number; maxHeight: number; quality: number } = {
    maxWidth: 1024,
    maxHeight: 1536,
    quality: 0.8,
  }
): Promise<File> {
  const arrayBuffer = await file.arrayBuffer()
  const blob = new Blob([arrayBuffer])

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(blob)
  } catch {
    bitmap = null
  }

  // Fallback to HTMLImageElement if createImageBitmap fails
  const loadImageEl = () =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(blob)
      const img: HTMLImageElement = document.createElement('img')
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img)
      }
      img.onerror = (e: unknown) => {
        URL.revokeObjectURL(url)
        reject(e)
      }
      img.src = url
    })

  const source = bitmap || (await loadImageEl())
  const srcWidth = 'width' in source ? source.width : (source as any).videoWidth || 0
  const srcHeight = 'height' in source ? source.height : (source as any).videoHeight || 0

  const aspect = srcWidth / srcHeight
  let targetWidth = options.maxWidth
  let targetHeight = Math.round(targetWidth / aspect)
  if (targetHeight > options.maxHeight) {
    targetHeight = options.maxHeight
    targetWidth = Math.round(targetHeight * aspect)
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, targetWidth)
  canvas.height = Math.max(1, targetHeight)
  const ctx = canvas.getContext('2d')!
  if (bitmap) {
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
  } else {
    const imgEl = source as HTMLImageElement
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height)
  }

  const outType = 'image/jpeg'
  const outBlob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Compression failed'))),
      outType,
      options.quality
    )
  })

  return new File([outBlob], file.name.replace(/\.[^.]+$/, '.jpg'), {
    type: outType,
    lastModified: Date.now(),
  })
}
