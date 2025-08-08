// Client-only helpers

export async function compressImage(
  file: File,
  options: {
    maxWidth: number
    maxHeight: number
    quality: number
    maxBytes?: number
    minQuality?: number
    qualityStep?: number
    scaleStep?: number
    minWidth?: number
    minHeight?: number
  } = {
    maxWidth: 1024,
    maxHeight: 1536,
    quality: 0.8,
  }
): Promise<File> {
  const arrayBuffer = await file.arrayBuffer()
  const inputBlob = new Blob([arrayBuffer])

  let bitmap: ImageBitmap | null = null
  try {
  bitmap = await createImageBitmap(inputBlob)
  } catch {
    bitmap = null
  }

  // Fallback to HTMLImageElement if createImageBitmap fails
  const loadImageEl = () =>
    new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(inputBlob)
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
  const intrinsic = (() => {
    if (bitmap) return { w: bitmap.width, h: bitmap.height }
    const img = source as HTMLImageElement
    return { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height }
  })()

  const outType = 'image/jpeg'
  const maxBytes = options.maxBytes ?? 1 * 1024 * 1024 // 1MB default
  const minQuality = Math.max(0.2, options.minQuality ?? 0.5)
  const qualityStep = options.qualityStep ?? 0.1
  const scaleStep = options.scaleStep ?? 0.85
  const minWidth = options.minWidth ?? 256
  const minHeight = options.minHeight ?? 256

  const aspect = intrinsic.w / Math.max(1, intrinsic.h)
  let targetWidth = Math.min(options.maxWidth, intrinsic.w)
  let targetHeight = Math.round(targetWidth / aspect)
  if (targetHeight > options.maxHeight) {
    targetHeight = Math.min(options.maxHeight, intrinsic.h)
    targetWidth = Math.round(targetHeight * aspect)
  }
  targetWidth = Math.max(1, targetWidth)
  targetHeight = Math.max(1, targetHeight)

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  let quality = Math.min(0.95, Math.max(0.1, options.quality))
  let bestBlob: Blob | null = null

  async function renderAndCompress(w: number, h: number, q: number): Promise<Blob> {
    canvas.width = Math.max(1, Math.round(w))
    canvas.height = Math.max(1, Math.round(h))
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (bitmap) {
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    } else {
      const imgEl = source as HTMLImageElement
      ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height)
    }
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Compression failed'))),
        outType,
        q
      )
    })
  }

  // Try iterative compression: reduce quality first, then scale down
  let attempts = 0
  let outputBlob = await renderAndCompress(targetWidth, targetHeight, quality)
  bestBlob = outputBlob
  const maxAttempts = 15

  while (outputBlob.size > maxBytes && attempts < maxAttempts) {
    attempts += 1
    if (quality - qualityStep >= minQuality) {
      quality = Math.max(minQuality, quality - qualityStep)
    } else if (targetWidth > minWidth && targetHeight > minHeight) {
      targetWidth = Math.max(minWidth, Math.round(targetWidth * scaleStep))
      targetHeight = Math.max(minHeight, Math.round(targetHeight * scaleStep))
      // after scaling down, try bumping quality a bit to keep fidelity if possible
      quality = Math.min(0.9, Math.max(minQuality, quality + qualityStep / 2))
    } else {
      // Hard stop: cannot go lower in quality or dimensions
      break
    }
  outputBlob = await renderAndCompress(targetWidth, targetHeight, quality)
  if (!bestBlob || outputBlob.size < bestBlob.size) bestBlob = outputBlob
  }

  if (bitmap) bitmap.close()

  const finalBlob = outputBlob.size <= maxBytes ? outputBlob : (bestBlob as Blob)
  return new File([finalBlob], file.name.replace(/\.[^.]+$/, '.jpg'), {
    type: outType,
    lastModified: Date.now(),
  })
}
