// Image analysis utilities and configurations

export interface PersonAnalysis {
  bodyType: string
  gender: string
  ageRange: string
  height: string
  measurements: {
    chest: string
    waist: string
    hips: string
    shoulders: string
  }
  skinTone: string
  pose: string
  analysisConfidence: string
}

export interface ClothingAnalysis {
  type: string
  primaryColor: string
  secondaryColor?: string
  pattern: string
  material: string
  style: string
  fit: string
  sleeves: string
  neckline: string
  analysisConfidence: string
}

// Configuration for different body types and their typical measurements
export const BODY_TYPE_MEASUREMENTS = {
  'Slim': {
    chest: { min: 80, max: 90 },
    waist: { min: 65, max: 75 },
    hips: { min: 85, max: 95 }
  },
  'Athletic': {
    chest: { min: 90, max: 105 },
    waist: { min: 75, max: 85 },
    hips: { min: 90, max: 100 }
  },
  'Average': {
    chest: { min: 85, max: 100 },
    waist: { min: 70, max: 85 },
    hips: { min: 90, max: 105 }
  },
  'Curvy': {
    chest: { min: 95, max: 115 },
    waist: { min: 75, max: 90 },
    hips: { min: 100, max: 120 }
  },
  'Plus Size': {
    chest: { min: 110, max: 130 },
    waist: { min: 90, max: 110 },
    hips: { min: 115, max: 135 }
  }
}

// Clothing detection patterns for better analysis
export const CLOTHING_PATTERNS = {
  colors: ['Black', 'White', 'Blue', 'Red', 'Green', 'Pink', 'Purple', 'Gray', 'Brown', 'Yellow', 'Orange', 'Beige', 'Navy', 'Maroon'],
  types: ['T-Shirt', 'Dress', 'Jacket', 'Sweater', 'Blouse', 'Pants', 'Skirt', 'Hoodie', 'Cardigan', 'Tank Top', 'Shirt', 'Coat'],
  patterns: ['Solid', 'Striped', 'Floral', 'Geometric', 'Abstract', 'Polka Dot', 'Plaid', 'Animal Print', 'Tie-Dye'],
  materials: ['Cotton', 'Polyester', 'Silk', 'Wool', 'Denim', 'Linen', 'Blend', 'Cashmere', 'Leather', 'Velvet'],
  styles: ['Casual', 'Formal', 'Vintage', 'Modern', 'Bohemian', 'Sporty', 'Elegant', 'Minimalist', 'Trendy', 'Classic']
}

// Helper function to generate realistic measurements based on body type
export function generateMeasurements(bodyType: string, gender: string): PersonAnalysis['measurements'] {
  const baseRanges = BODY_TYPE_MEASUREMENTS[bodyType as keyof typeof BODY_TYPE_MEASUREMENTS] || BODY_TYPE_MEASUREMENTS['Average']
  
  // Adjust for gender differences
  const genderMultiplier = gender === 'Male' ? 1.1 : 1.0
  
  return {
    chest: `${Math.floor((Math.random() * (baseRanges.chest.max - baseRanges.chest.min) + baseRanges.chest.min) * genderMultiplier)}cm`,
    waist: `${Math.floor((Math.random() * (baseRanges.waist.max - baseRanges.waist.min) + baseRanges.waist.min) * genderMultiplier)}cm`,
    hips: `${Math.floor((Math.random() * (baseRanges.hips.max - baseRanges.hips.min) + baseRanges.hips.min) * genderMultiplier)}cm`,
    shoulders: `${Math.floor(Math.random() * 15 + 35)}cm`
  }
}
