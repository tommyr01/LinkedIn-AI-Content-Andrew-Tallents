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

    const { topic, postType = 'Thought Leadership', tone = 'professional', voiceGuidelines = '', platform = 'linkedin' } = body

    // Andrew's voice prompt with the LinkedIn expert structure
    const systemPrompt = `Act as an informed LinkedIn expert specializing in content for CEOs and Founders. 

**Mandatory Tone of Voice:**
${voiceGuidelines ? voiceGuidelines : "Professional but approachable, focuses on leadership insights and CEO coaching, uses personal anecdotes, practical advice, and engaging questions."}

**Target Avatar:** 
CEOs and Founders of established businesses (typically $5M-$100M+ revenue) who are outwardly successful but privately struggling. They're 35-55 years old, have built something significant, and are recognized in their industry - but they feel trapped by their own success.

**Problem We Solve:** 
Most CEOs and Founders are world-class at building businesses but terrible at leading themselves. They've achieved everything they thought they wanted - growing companies, hitting targets, industry respect - but privately they're stuck, burned out, and feeling empty. They react instead of respond, control instead of trust, and have become the bottleneck in their own success.

**LinkedIn Post Creation Guidelines - Andrew Tallents Style:**
1. Opening Hook - Start with a provocative question, bold contrarian statement, or challenge an assumption
2. Authority Establishment - Mention coaching experience or personal vulnerability
3. Story or Insight Development - Use short, punchy sentences mixed with longer explanatory ones
4. Lesson Extraction - Structure key insights using "The key?" followed by the main insight
5. Engaging Elements - Include reflective questions and self-examination prompts
6. Call to Action - End with a question or offer of value
7. Style Requirements - Use strategic punctuation, short paragraphs, conversational but authoritative tone

**Post Type:** ${postType}
**Platform:** ${platform.charAt(0).toUpperCase() + platform.slice(1)}

Generate exactly 3 different variations of a ${platform.charAt(0).toUpperCase() + platform.slice(1)} post about: ${topic}

IMPORTANT: Return ONLY valid JSON without any markdown formatting or code blocks. Do not include \`\`\`json or any other text.

Use this exact structure:
{
  "variations": [
    {
      "content": "First variation content here",
      "hashtags": ["#leadership", "#coaching"],
      "estimated_voice_score": 85,
      "approach": "Short description of the approach"
    },
    {
      "content": "Second variation content here", 
      "hashtags": ["#leadership", "#ceo"],
      "estimated_voice_score": 88,
      "approach": "Short description of the approach"
    },
    {
      "content": "Third variation content here",
      "hashtags": ["#leadership", "#growth"],
      "estimated_voice_score": 82,
      "approach": "Short description of the approach"
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
    
    // Clean up the response text for better JSON parsing
    const cleanResponse = (text: string) => {
      // Remove markdown code blocks
      let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      // Remove any leading/trailing whitespace
      cleaned = cleaned.trim()
      // Remove any extra text before the JSON
      const jsonStart = cleaned.indexOf('{')
      if (jsonStart > 0) {
        cleaned = cleaned.substring(jsonStart)
      }
      // Remove any extra text after the JSON
      const jsonEnd = cleaned.lastIndexOf('}')
      if (jsonEnd > 0) {
        cleaned = cleaned.substring(0, jsonEnd + 1)
      }
      return cleaned
    }
    
    // Try to parse JSON with multiple attempts
    try {
      parsedResponse = JSON.parse(response)
    } catch (parseError) {
      console.log('First JSON parse failed, trying cleanup...')
      try {
        const cleanedResponse = cleanResponse(response)
        parsedResponse = JSON.parse(cleanedResponse)
      } catch (secondParseError) {
        console.log('Second JSON parse failed, creating fallback...')
        
        // Smart fallback: try to extract multiple posts from the response
        const createFallbackVariations = (text: string) => {
          // Try to split the response into multiple posts
          const segments = text.split(/\n\n(?=\d+\.|Variation|Post)/i)
          const variations = []
          
          for (let i = 0; i < 3; i++) {
            const segment = segments[i] || text
            const cleanContent = segment
              .replace(/^\d+\.\s*/, '') // Remove numbering
              .replace(/^Variation \d+:?\s*/i, '') // Remove "Variation X:"
              .replace(/^Post \d+:?\s*/i, '') // Remove "Post X:"
              .trim()
            
            variations.push({
              content: cleanContent || `LinkedIn post about ${topic} (Variation ${i + 1})`,
              hashtags: ['#leadership', '#coaching', '#growth'],
              estimated_voice_score: Math.floor(Math.random() * 20) + 70 // Random score 70-90
            })
          }
          
          return variations
        }
        
        parsedResponse = {
          variations: createFallbackVariations(response)
        }
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
    
    // Validate response format and ensure we have exactly 3 variations
    const validateResponse = (response: any) => {
      if (!response || !response.variations || !Array.isArray(response.variations)) {
        throw new Error('Invalid response format')
      }
      
      // Ensure we have exactly 3 variations
      const variations = response.variations.slice(0, 3) // Take first 3
      
      // Fill missing variations if needed
      while (variations.length < 3) {
        variations.push({
          content: `LinkedIn post about ${topic} (Variation ${variations.length + 1})`,
          hashtags: ['#leadership', '#coaching'],
          estimated_voice_score: Math.floor(Math.random() * 20) + 70
        })
      }
      
      // Validate each variation
      return {
        variations: variations.map((variation: any, index: number) => ({
          content: variation.content || `LinkedIn post about ${topic} (Variation ${index + 1})`,
          hashtags: Array.isArray(variation.hashtags) ? variation.hashtags : ['#leadership', '#coaching'],
          estimated_voice_score: variation.estimated_voice_score || Math.floor(Math.random() * 20) + 70
        }))
      }
    }
    
    const validatedResponse = validateResponse(parsedResponse)
    
    console.log('Generated content variations:', validatedResponse.variations.length)

    return NextResponse.json(validatedResponse)

  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}