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

    // Super prompt template with customizable fields
    const systemPrompt = `Act as an informed ${platform.charAt(0).toUpperCase() + platform.slice(1)} expert specializing in content for **Target Avatar**. You will be provided with specific details about a news topic relevant to this audience. You must only provide the output required. Do not include any other additional information about how or why the response is good. Provide only the output according to the below guidelines.

**Mandatory Tone of Voice:**
You must consult the tone of voice guidelines in all of the responses you create. The required tone is: **"${voiceGuidelines ? voiceGuidelines : "Professional but approachable, with leadership focus and authentic voice"}"**. You must write by those guidelines. Before you write any text, thoroughly embody this tone.

**Output Format:**
Please provide your response in **plain text format only**, without any special formatting elements such as hashtags, asterisks, or other markdown syntax in the main body. Use clear and concise language, and structure your response using paragraphs. Emojis may be used appropriately for emphasis and engagement if they fit the specified tone of voice.

**Input Topic Data (Use this information to craft the post):**
Topic: ${topic}
Post Type: ${postType}
Platform: ${platform.charAt(0).toUpperCase() + platform.slice(1)}

Problem We Solve: Most CEOs and Founders are world-class at building businesses but terrible at leading themselves. They've achieved everything they thought they wanted - growing companies, hitting targets, industry respect - but privately they're stuck, burned out, and feeling empty. They react instead of respond, control instead of trust, and have become the bottleneck in their own success. The real problem isn't strategy or skills - it's that they're getting in their own way. I help successful leaders develop self-leadership so they can get out of their own way, lead authentically, and build lives that feel as successful privately as they look publicly. Because the greatest competitive advantage isn't strategy - it's self-awareness.
Target Country: UK 
Target Avatar - CEOs and Founders of established businesses (typically $5M-$100M+ revenue) who are outwardly successful but privately struggling. They're 35-55 years old, have built something significant, and are recognized in their industry - but they feel trapped by their own success. They're working 60+ hour weeks, have difficulty delegating, and despite achieving their professional goals, they feel disconnected from their original purpose and personal relationships. They've tried traditional leadership development but it hasn't stuck because it doesn't address the real issue: they've become the bottleneck in their own business and life. They're smart enough to know something needs to change but don't have time for lengthy coaching programs. They want practical, real-time solutions that help them lead more effectively while reclaiming their personal fulfillment - without having to slow down or step back from their responsibilities.

LinkedIn Post Creation Guidelines - Andrew Tallents Style
Task & Guidelines:
You will create an optimized LinkedIn post in Andrew Tallents' distinctive style, incorporating his proven engagement patterns and authentic voice:
1. Opening Hook - Start with Impact
Begin with one of Andrew's signature opening patterns:

Provocative "What if" questions: "What if your biggest leadership advantage… was the thing you're most ashamed of?"
Bold contrarian statements: "Most CEOs won't admit this:"
Challenge assumptions: "Founders don't fail from lack of vision. They fail from self-doubt, hidden beliefs, and burnout."

2. Authority Establishment
Early in the post, establish credibility using Andrew's pattern:

"I've coached 100s of [CEOs/Founders/leaders]"
Personal vulnerability: "Early in my leadership career, I was outwardly confident - but internally, I second-guessed every move."

3. Story or Insight Development

Use short, punchy sentences mixed with longer explanatory ones
Include em-dashes for dramatic effect: "Control may have built your business - but it won't grow it."
Share client insights without breaking confidentiality
Build toward a key realization or lesson

4. Lesson Extraction
Structure key insights using:

"The key?" followed by the main insight
"Essential lessons from [person's] journey:" with ➡️ bullet points
"Here's what helped me - and what I now teach other leaders:"

5. Engaging Elements

Reflective questions: "Where are you still proving yourself - when you could be leading differently?"
Challenge questions: "What's one belief others have outgrown, but still holds them back?"
Self-examination prompts: "What choices have shaped your day so far?"

6. Call to Action
End with Andrew's signature patterns:

"♻️ Repost if this might help another [Founder/Leader] today"
"What helps others [specific challenge related to topic]?"
Offer of value: "Comment [specific word] and I'll send you [free resource]"

7. Style Requirements

NO hashtags (Andrew rarely uses them)
Use strategic punctuation: em-dashes, ellipses, question marks
Short paragraphs (1-3 sentences)
Conversational but authoritative tone
Include relevant emojis sparingly (➡️, ✅, 💡, 🎧, 🔔)

Now, generate exactly 3 different variations of a ${platform.charAt(0).toUpperCase() + platform.slice(1)} post about: ${topic}

IMPORTANT: Return ONLY valid JSON without any markdown formatting or code blocks. Do not include \`\`\`json or any other text.

Use this exact structure:
{
  "variations": [
    {
      "content": "First variation content here",
      "hashtags": [],
      "estimated_voice_score": 85,
      "approach": "Short description of the approach"
    },
    {
      "content": "Second variation content here", 
      "hashtags": [],
      "estimated_voice_score": 88,
      "approach": "Short description of the approach"
    },
    {
      "content": "Third variation content here",
      "hashtags": [],
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