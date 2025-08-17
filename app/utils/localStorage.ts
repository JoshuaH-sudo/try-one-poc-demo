import type { FormValues } from "./types"

const STORAGE_KEYS = {
  FORM_DATA: "dress-studio-form-data",
  CURRENT_STEP: "dress-studio-current-step",
}

export const saveToStorage = (key: string, data: any) => {
  try {
    const serializedData = JSON.stringify(data)
    localStorage.setItem(key, serializedData)
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.warn("localStorage quota exceeded, attempting to clear old data...")

      // Try to clear other app data first
      try {
        clearOldData()
        localStorage.setItem(key, JSON.stringify(data))
        return true
      } catch (retryError) {
        console.error("Failed to save even after clearing old data:", retryError)
        // Fallback: try to save without images
        if (key === STORAGE_KEYS.FORM_DATA) {
          return saveEssentialDataOnly(data)
        }
      }
    } else {
      console.error("Failed to save to localStorage:", error)
    }
    return false
  }
}

const saveEssentialDataOnly = (data: any) => {
  try {
    const essentialData = {
      designDescription: data.designDescription,
      selectedColor: data.selectedColor,
      designVariations: data.designVariations,
      selectedFront: data.selectedFront,
      selectedBack: data.selectedBack,
      tryOnResult: data.tryOnResult,
      // Keep form fields but remove file data
      fullName: data.fullName,
      contact: data.contact,
      measurements: data.measurements,
    }
    localStorage.setItem(STORAGE_KEYS.FORM_DATA, JSON.stringify(essentialData))
    console.warn("Saved essential data only (images excluded due to storage limits)")
    return true
  } catch (error) {
    console.error("Failed to save even essential data:", error)
    return false
  }
}

const clearOldData = () => {
  // Clear any old keys that might exist
  const keysToCheck = ["dress-studio-old-data", "dress-studio-temp", "dress-studio-backup"]

  keysToCheck.forEach((key) => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key)
    }
  })

  // If still having issues, clear the current form data to make space
  localStorage.removeItem(STORAGE_KEYS.FORM_DATA)
}

const estimateStorageSize = (data: any): number => {
  try {
    return new Blob([JSON.stringify(data)]).size
  } catch {
    return 0
  }
}

export const loadFromStorage = (key: string) => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch (error) {
    console.error("Failed to load from localStorage:", error)
    try {
      localStorage.removeItem(key)
    } catch (clearError) {
      console.error("Failed to clear corrupted data:", clearError)
    }
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
  try {
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

    // Check estimated size before saving
    const estimatedSize = estimateStorageSize(serializedData)
    if (estimatedSize > 4 * 1024 * 1024) {
      // 4MB threshold
      console.warn(`Data size (${Math.round(estimatedSize / 1024 / 1024)}MB) may exceed storage limits`)
    }

    const success = saveToStorage(STORAGE_KEYS.FORM_DATA, serializedData)
    if (!success) {
      console.warn("Form data could not be saved to localStorage")
    }
    return success
  } catch (error) {
    console.error("Error preparing form data for storage:", error)
    return false
  }
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
  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.error(`Failed to clear ${key}:`, error)
      }
    })
    console.log("All app data cleared successfully")
  } catch (error) {
    console.error("Error clearing app data:", error)
  }
}

export const getStorageInfo = () => {
  try {
    const test = "test"
    localStorage.setItem(test, test)
    localStorage.removeItem(test)

    let used = 0
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length
      }
    }

    return {
      available: true,
      used: Math.round(used / 1024), // KB
      estimated: Math.round((used / 1024 / 1024) * 100) / 100, // MB
    }
  } catch {
    return {
      available: false,
      used: 0,
      estimated: 0,
    }
  }
}
