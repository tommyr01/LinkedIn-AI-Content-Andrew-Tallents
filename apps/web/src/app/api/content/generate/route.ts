import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'
import { createAirtableClient } from '@linkedin-automation/airtable'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
    const airtableClient = createAirtableClient()
    
    const savePromises = parsedResponse.variations.map(async (variation: any) => {
      try {
        await airtableClient.createContentPost({
          'Content': variation.content,
          'Post Type': postType,
          'Status': 'Draft',
          'Hashtags': variation.hashtags || [],
          'Created By': 'AI Assistant',
          'Created': new Date().toISOString(),
        })
      } catch (error) {
        console.error('Error saving generated content to Airtable:', error)
      }
    })

    // Don't await these saves to avoid blocking the response
    Promise.all(savePromises)

    return NextResponse.json(parsedResponse)

  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}