import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'
import { createAirtableClient } from '@/lib/airtable'

// Initialize OpenAI client only when needed to avoid build-time errors
const createOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required')
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }

    const { topic, postType = 'Thought Leadership', tone = 'professional' } = body

    // Andrew's voice prompt - customize this based on his writing style
    const systemPrompt = `You are Andrew Tallents, an experienced CEO coach. Write LinkedIn posts in Andrew's authentic voice using these characteristics:

    - Professional but approachable tone
    - Focuses on leadership insights and CEO coaching
    - Uses personal anecdotes and client stories (anonymized)
    - Practical, actionable advice
    - Engaging questions to drive discussion
    - Appropriate use of relevant hashtags
    - Posts are typically 100-200 words
    - Uses first person perspective
    - Includes lessons learned and strategic insights

    Post Type: ${postType}
    Tone: ${tone}
    
    Generate 3 different variations of a LinkedIn post about: ${topic}
    
    Return the response as a JSON object with this structure:
    {
      "variations": [
        {
          "content": "Full post content here",
          "hashtags": ["#leadership", "#coaching"],
          "estimated_voice_score": 85
        }
      ]
    }`

    const openai = createOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Write LinkedIn posts about: ${topic}` }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    const response = completion.choices[0]?.message?.content

    if (!response) {
      throw new Error('No response from OpenAI')
    }

    let parsedResponse
    try {
      parsedResponse = JSON.parse(response)
    } catch (parseError) {
      // If JSON parsing fails, create a fallback response
      parsedResponse = {
        variations: [{
          content: response,
          hashtags: ['#leadership', '#coaching'],
          estimated_voice_score: 75
        }]
      }
    }

    // Save generated content to Airtable for tracking
    let airtableClient
    try {
      airtableClient = createAirtableClient()
    } catch (error) {
      console.warn('Airtable client not available:', error)
      // Continue without Airtable integration
    }
    
    // Skip Airtable saving - just return the generated content
    console.log('Generated content variations:', parsedResponse.variations.length)

    return NextResponse.json(parsedResponse)

  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}