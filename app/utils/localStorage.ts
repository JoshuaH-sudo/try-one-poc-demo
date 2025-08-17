import type { FormValues } from "./types"

const FORM_DATA_KEY = "dressStudio_formData"
const CURRENT_STEP_KEY = "dressStudio_currentStep"

// Helper function to safely access localStorage
function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

// Helper function to safely set localStorage with error handling
function setLocalStorageItem(key: string, value: string): boolean {
  const storage = getLocalStorage()
  if (!storage) return false

  try {
    storage.setItem(key, value)
    return true
  } catch (error) {
    console.warn(`Failed to save to localStorage (${key}):`, error)

    // If quota exceeded, try to clear some space
    if (error instanceof Error && error.name === "QuotaExceededError") {
      try {
        // Clear old data and try again
        storage.clear()
        storage.setItem(key, value)
        return true
      } catch {
        return false
      }
    }
    return false
  }
}

// Helper function to safely get localStorage item
function getLocalStorageItem(key: string): string | null {
  const storage = getLocalStorage()
  if (!storage) return null

  try {
    return storage.getItem(key)
  } catch (error) {
    console.warn(`Failed to read from localStorage (${key}):`, error)
    return null
  }
}

// Helper function to safely remove localStorage item
function removeLocalStorageItem(key: string): boolean {
  const storage = getLocalStorage()
  if (!storage) return false

  try {
    storage.removeItem(key)
    return true
  } catch (error) {
    console.warn(`Failed to remove from localStorage (${key}):`, error)
    return false
  }
}

export function saveFormData(data: Partial<FormValues>): boolean {
  try {
    // Filter out File objects and other non-serializable data
    const serializableData = {
      designDescription: data.designDescription,
      selectedColor: data.selectedColor,
      tailorForm: data.tailorForm,
      // Note: We don't save File objects (images) as they can't be serialized
      // and would be too large for localStorage anyway
    }

    const jsonString = JSON.stringify(serializableData)
    return setLocalStorageItem(FORM_DATA_KEY, jsonString)
  } catch (error) {
    console.warn("Failed to serialize form data:", error)
    return false
  }
}

export function loadFormData(): Partial<FormValues> {
  try {
    const stored = getLocalStorageItem(FORM_DATA_KEY)
    if (!stored) return {}

    const parsed = JSON.parse(stored)
    return parsed || {}
  } catch (error) {
    console.warn("Failed to parse stored form data:", error)
    return {}
  }
}

export function saveCurrentStep(step: number): boolean {
  return setLocalStorageItem(CURRENT_STEP_KEY, step.toString())
}

export function loadCurrentStep(): number {
  try {
    const stored = getLocalStorageItem(CURRENT_STEP_KEY)
    if (!stored) return 0

    const step = Number.parseInt(stored, 10)
    return isNaN(step) ? 0 : Math.max(0, Math.min(step, 2)) // Clamp between 0-2
  } catch (error) {
    console.warn("Failed to parse stored step:", error)
    return 0
  }
}

export function clearAllData(): boolean {
  const storage = getLocalStorage()
  if (!storage) return false

  try {
    // Remove specific keys instead of clearing everything to avoid affecting other apps
    removeLocalStorageItem(FORM_DATA_KEY)
    removeLocalStorageItem(CURRENT_STEP_KEY)
    return true
  } catch (error) {
    console.warn("Failed to clear data:", error)
    return false
  }
}

// Utility to check localStorage availability and quota
export function getLocalStorageInfo(): {
  available: boolean
  quotaExceeded: boolean
  estimatedSize: number
} {
  const storage = getLocalStorage()
  if (!storage) {
    return { available: false, quotaExceeded: false, estimatedSize: 0 }
  }

  try {
    // Test write to check for quota issues
    const testKey = "_test_quota_" + Date.now()
    const testValue = "test"
    storage.setItem(testKey, testValue)
    storage.removeItem(testKey)

    // Estimate current usage
    let estimatedSize = 0
    for (const key in storage) {
      if (storage.hasOwnProperty(key)) {
        estimatedSize += storage[key].length + key.length
      }
    }

    return {
      available: true,
      quotaExceeded: false,
      estimatedSize,
    }
  } catch (error) {
    const quotaExceeded = error instanceof Error && error.name === "QuotaExceededError"
    return {
      available: true,
      quotaExceeded,
      estimatedSize: 0,
    }
  }
}
