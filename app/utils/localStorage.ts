import type { FormValues } from "./types"

const STORAGE_KEYS = {
  FORM_DATA: "dress-studio-form-data",
  CURRENT_STEP: "dress-studio-current-step",
}

export const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error("Failed to save to localStorage:", error)
  }
}

export const loadFromStorage = (key: string) => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch (error) {
    console.error("Failed to load from localStorage:", error)
    return null
  }
}

export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export const createFileFromBase64 = (base64: string, filename: string): File => {
  const arr = base64.split(",")
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg"
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

export const saveFormData = async (data: FormValues) => {
  const serializedData = {
    ...data,
    frontDrawing: data.frontDrawing
      ? {
          ...data.frontDrawing,
          fileData: await convertFileToBase64(data.frontDrawing.file),
        }
      : null,
    backDrawing: data.backDrawing
      ? {
          ...data.backDrawing,
          fileData: await convertFileToBase64(data.backDrawing.file),
        }
      : null,
    personImage: data.personImage
      ? {
          ...data.personImage,
          fileData: await convertFileToBase64(data.personImage.file),
        }
      : null,
  }
  saveToStorage(STORAGE_KEYS.FORM_DATA, serializedData)
}

export const loadFormData = (): Partial<FormValues> => {
  const savedData = loadFromStorage(STORAGE_KEYS.FORM_DATA)
  if (!savedData) return {}

  const restoredData: Partial<FormValues> = { ...savedData }

  // Restore image files from base64
  if (savedData.frontDrawing?.fileData) {
    const file = createFileFromBase64(savedData.frontDrawing.fileData, "front-drawing.jpg")
    restoredData.frontDrawing = {
      file,
      preview: savedData.frontDrawing.preview,
      id: savedData.frontDrawing.id,
    }
  }

  if (savedData.backDrawing?.fileData) {
    const file = createFileFromBase64(savedData.backDrawing.fileData, "back-drawing.jpg")
    restoredData.backDrawing = {
      file,
      preview: savedData.backDrawing.preview,
      id: savedData.backDrawing.id,
    }
  }

  if (savedData.personImage?.fileData) {
    const file = createFileFromBase64(savedData.personImage.fileData, "person.jpg")
    restoredData.personImage = {
      file,
      preview: savedData.personImage.preview,
      id: savedData.personImage.id,
    }
  }

  return restoredData
}

export const saveCurrentStep = (step: number) => {
  saveToStorage(STORAGE_KEYS.CURRENT_STEP, step)
}

export const loadCurrentStep = (): number => {
  return loadFromStorage(STORAGE_KEYS.CURRENT_STEP) || 0
}

export const clearAllData = () => {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key)
  })
}
