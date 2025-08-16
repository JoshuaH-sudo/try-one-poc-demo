export interface UploadedImage {
  file: File
  preview: string
  id: string
}

export interface DesignVariation {
  id: string
  imageUrl: string
  type: "front" | "back"
}

export interface TryOnResult {
  imageUrl: string
  timestamp: string
}

export interface TailorForm {
  fullName: string
  contact: string
  bust: string
  waist: string
  hips: string
  height: string
  weight: string
  additionalNotes: string
}

export interface FormValues {
  // Design step
  frontDrawing: UploadedImage | null
  backDrawing: UploadedImage | null
  designDescription: string
  selectedColor: string
  designVariations: DesignVariation[]

  // Try-on step
  selectedFront: string | null
  selectedBack: string | null
  personImage: UploadedImage | null
  tryOnResult: TryOnResult | null

  // Order step
  tailorForm: TailorForm
}
