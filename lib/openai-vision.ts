import OpenAI from 'openai'

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

export async function generateWithVisionAnalysis(personImageDataURL: string, clothingImageDataURL: string) {
  // First, analyze the images with GPT-4 Vision
  const analysis = await analyzeImagesWithVision(personImageDataURL, clothingImageDataURL)
  
  if (!analysis.success) {
    throw new Error(`Vision analysis failed: ${analysis.error}`)
  }

  // Then generate the image with DALL-E using the detailed prompt
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: analysis.prompt,
    n: 1,
    size: "1024x1792",
    quality: "hd",
    style: "natural"
  })

  const generatedImageUrl = response.data[0]?.url

  if (!generatedImageUrl) {
    throw new Error('No image generated from OpenAI')
  }

  return {
    imageUrl: generatedImageUrl,
    modelUsed: 'gpt-4o-vision + dall-e-3',
    provider: 'OpenAI',
    prompt: analysis.prompt,
    analysisModel: analysis.model
  }
}
