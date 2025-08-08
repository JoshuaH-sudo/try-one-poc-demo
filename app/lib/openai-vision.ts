import OpenAI from 'openai'
import { Buffer } from 'buffer'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function analyzeImagesWithVision(personImageDataURL: string, clothingImageDataURL: string) {
  try {
    console.log('Analyzing images with GPT-4 Vision...')
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze these two images for a virtual try-on application. The first image shows a person, and the second shows a clothing item. Provide detailed descriptions that would help generate a realistic virtual try-on image. Focus on: 1) Person's body type, pose, lighting, and background 2) Clothing item's style, color, fit, and details 3) How the clothing would look when worn by this person. Format your response as a detailed prompt for image generation."
            },
            {
              type: "image_url",
              image_url: {
                url: personImageDataURL,
                detail: "high"
              }
            },
            {
              type: "image_url",
              image_url: {
                url: clothingImageDataURL,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 500
    })

    const analysisPrompt = response.choices[0]?.message?.content || ''
    
    return {
      success: true,
      prompt: analysisPrompt,
      model: 'gpt-4o-vision'
    }
  } catch (error) {
    console.error('GPT-4 Vision analysis failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      model: 'gpt-4o-vision'
    }
  }
}

export async function analyzeClothingForEdit(personImageDataURL: string, clothingImageDataURL: string) {
  try {
    console.log('Analyzing clothing for image editing...')
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Look at these two images: a person and a clothing item. Create a prompt for DALL-E image editing that will add the clothing item to the person. The prompt should describe what clothing to add/change on the person, maintaining their pose, background, and appearance. Focus on the specific clothing item and how it should fit and look on this person. Keep the prompt concise and focused on the clothing addition/change."
            },
            {
              type: "image_url",
              image_url: {
                url: personImageDataURL,
                detail: "high"
              }
            },
            {
              type: "image_url",
              image_url: {
                url: clothingImageDataURL,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 200
    })

    const editPrompt = response.choices[0]?.message?.content || ''
    
    return {
      success: true,
      prompt: editPrompt,
      model: 'gpt-4o-vision'
    }
  } catch (error) {
    console.error('GPT-4 Vision analysis for editing failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      model: 'gpt-4o-vision'
    }
  }
}

export async function generateWithVisionAnalysis(personImageDataURL: string, clothingImageDataURL: string) {
  // First, analyze the clothing image with GPT-4 Vision to understand what to add
  const analysis = await analyzeClothingForEdit(personImageDataURL, clothingImageDataURL)
  
  if (!analysis.success) {
    throw new Error(`Vision analysis failed: ${analysis.error}`)
  }

  // Convert base64 data URL to buffer for OpenAI
  const personImageBuffer = Buffer.from(personImageDataURL.split(',')[1], 'base64')
  
  // Use images.edit to modify the person image with the clothing
  const response = await openai.images.edit({
    model: "dall-e-2", // Note: dall-e-3 doesn't support edit, only dall-e-2
    image: personImageBuffer,
    prompt: analysis.prompt,
    n: 1,
    size: "1024x1024"
  })

  const generatedImageUrl = response.data[0]?.url

  if (!generatedImageUrl) {
    throw new Error('No image generated from OpenAI edit')
  }

  return {
    imageUrl: generatedImageUrl,
    modelUsed: 'gpt-4o-vision + dall-e-2-edit',
    provider: 'OpenAI',
    prompt: analysis.prompt,
    analysisModel: analysis.model,
    method: 'image-edit'
  }
}
