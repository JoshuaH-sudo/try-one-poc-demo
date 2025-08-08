'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { User, Shirt, Check, Loader2 } from 'lucide-react'

export interface GeneratedResult {
  imageUrl: string
  personDetails: {
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
  clothingDetails: {
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
  processingTime?: string
  modelUsed?: string
  provider?: string
  prompt?: string
  method?: string
}

export default function TryOnPreview({
  generatedResult,
  isApproving,
  onApprove,
}: {
  generatedResult: GeneratedResult
  isApproving: boolean
  onApprove: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Image
          src={generatedResult.imageUrl || '/placeholder.svg'}
          alt="Virtual Try-On Result"
          width={400}
          height={500}
          className="w-full rounded-lg shadow-lg"
        />
      </div>

      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4" />
                Person Analysis
              </h4>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                {generatedResult.personDetails.analysisConfidence}
              </span>
            </div>
            <div className="space-y-2 text-gray-600">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Gender:</span> {generatedResult.personDetails.gender}
                </div>
                <div>
                  <span className="font-medium">Age:</span> {generatedResult.personDetails.ageRange}
                </div>
                <div>
                  <span className="font-medium">Body Type:</span> {generatedResult.personDetails.bodyType}
                </div>
                <div>
                  <span className="font-medium">Height:</span> {generatedResult.personDetails.height}
                </div>
                <div>
                  <span className="font-medium">Skin Tone:</span> {generatedResult.personDetails.skinTone}
                </div>
                <div>
                  <span className="font-medium">Pose:</span> {generatedResult.personDetails.pose}
                </div>
              </div>
              <div className="mt-3">
                <span className="font-medium">Measurements:</span>
                <div className="grid grid-cols-2 gap-1 mt-1 text-xs">
                  <div>Chest: {generatedResult.personDetails.measurements.chest}</div>
                  <div>Waist: {generatedResult.personDetails.measurements.waist}</div>
                  <div>Hips: {generatedResult.personDetails.measurements.hips}</div>
                  <div>Shoulders: {generatedResult.personDetails.measurements.shoulders}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Shirt className="w-4 h-4" />
                Clothing Analysis
              </h4>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {generatedResult.clothingDetails.analysisConfidence}
              </span>
            </div>
            <div className="space-y-2 text-gray-600">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Type:</span> {generatedResult.clothingDetails.type}
                </div>
                <div>
                  <span className="font-medium">Style:</span> {generatedResult.clothingDetails.style}
                </div>
                <div>
                  <span className="font-medium">Color:</span> {generatedResult.clothingDetails.primaryColor}
                  {generatedResult.clothingDetails.secondaryColor && `, ${generatedResult.clothingDetails.secondaryColor}`}
                </div>
                <div>
                  <span className="font-medium">Pattern:</span> {generatedResult.clothingDetails.pattern}
                </div>
                <div>
                  <span className="font-medium">Material:</span> {generatedResult.clothingDetails.material}
                </div>
                <div>
                  <span className="font-medium">Fit:</span> {generatedResult.clothingDetails.fit}
                </div>
                <div>
                  <span className="font-medium">Sleeves:</span> {generatedResult.clothingDetails.sleeves}
                </div>
                <div>
                  <span className="font-medium">Neckline:</span> {generatedResult.clothingDetails.neckline}
                </div>
              </div>
            </div>
          </div>
        </div>

        {generatedResult.processingTime && (
          <div className="space-y-2 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Processing Time: {generatedResult.processingTime}
              </span>
              <span className="text-xs text-purple-600">
                {generatedResult.provider} • {generatedResult.modelUsed}
              </span>
            </div>
            {generatedResult.method && (
              <div className="text-xs text-gray-500">Method: {generatedResult.method}</div>
            )}
            {generatedResult.prompt && (
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                  View Generation Prompt
                </summary>
                <div className="mt-2 p-2 bg-gray-50 rounded text-gray-600">
                  {generatedResult.prompt}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      <Button onClick={onApprove} disabled={isApproving} className="w-full bg-green-600 hover:bg-green-700" size="lg">
        {isApproving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Check className="w-4 h-4 mr-2" />
            Approve & Order
          </>
        )}
      </Button>
    </div>
  )
}
