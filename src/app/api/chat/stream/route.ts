import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with proper error handling
const getSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    console.warn('Supabase credentials not configured')
    return null
  }
  
  return createClient(url, key)
}

interface VoiceChunk {
  content: string
  similarity_score?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, newMessage, user_id } = body

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Search for relevant voice chunks using Supabase vector search
          const relevantChunks = await searchVoiceChunks(newMessage, 5)

          // Create context from relevant chunks
          const voiceContext = relevantChunks
            .map(chunk => chunk.content)
            .join('\n\n')

          // Generate response using the voice context
          const response = await generateRAGResponse(newMessage, voiceContext, messages)

          // Stream the response
          const words = response.split(' ')
          for (let i = 0; i < words.length; i++) {
            const chunk = i === 0 ? words[i] : ' ' + words[i]
            
            const sseData = `data: ${JSON.stringify({
              type: 'text',
              content: chunk
            })}\n\n`
            
            controller.enqueue(new TextEncoder().encode(sseData))
            
            // Add small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 50))
          }

          // Send completion message
          const doneData = `data: [DONE]\n\n`
          controller.enqueue(new TextEncoder().encode(doneData))
          controller.close()

        } catch (error) {
          console.error('RAG streaming error:', error)
          
          const errorData = `data: ${JSON.stringify({
            type: 'error',
            content: 'Failed to generate response'
          })}\n\n`
          
          controller.enqueue(new TextEncoder().encode(errorData))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Chat stream API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}

async function generateRAGResponse(query: string, voiceContext: string, conversationHistory: any[]): Promise<string> {
  try {
    // Check if we have OpenAI or Anthropic API key
    const openaiKey = process.env.OPENAI_API_KEY
    const anthropicKey = process.env.ANTHROPIC_API_KEY

    if (!openaiKey && !anthropicKey) {
      return "I apologize, but the AI service is not properly configured. Please check that the API keys are set in the environment variables."
    }

    // Build conversation context
    const conversationContext = conversationHistory
      .slice(-5) // Last 5 messages for context
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n')

    const systemPrompt = `You are Andrew's Strategic Intelligence AI assistant. You help create executive LinkedIn content and provide strategic business insights.

Voice Context (Andrew's authentic voice patterns):
${voiceContext}

Conversation History:
${conversationContext}

Instructions:
- Respond in Andrew's authentic voice and style based on the voice context provided
- Focus on executive-level strategic insights
- Keep responses practical and actionable for LinkedIn professionals
- Use business terminology and strategic thinking patterns
- Be concise but comprehensive in your analysis`

    if (anthropicKey) {
      // Use Anthropic Claude
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `${systemPrompt}\n\nUser Query: ${query}`
            }
          ]
        })
      })

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`)
      }

      const data = await response.json()
      return data.content[0].text

    } else if (openaiKey) {
      // Use OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: query
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      return data.choices[0].message.content
    }

    return "I apologize, but I'm unable to generate a response at this time. Please try again later."

  } catch (error) {
    console.error('RAG response generation error:', error)
    return "I encountered an issue generating a response. Please try rephrasing your question or try again later."
  }
}

async function searchVoiceChunks(query: string, limit: number = 5): Promise<VoiceChunk[]> {
  try {
    const supabase = getSupabaseClient()
    
    if (!supabase) {
      console.warn('Supabase not configured, returning fallback content')
      return getFallbackContent(query)
    }

    // First try to get voice chunks from the voice_chunks table
    const { data, error } = await supabase
      .from('voice_chunks')
      .select('chunk_text')
      .textSearch('chunk_text', query)
      .limit(limit)

    if (error) {
      console.error('Voice chunks search error:', error)
      
      // Fallback to recent posts if voice_chunks table doesn't exist
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('andrew_posts')
        .select('content')
        .not('content', 'is', null)
        .limit(limit)

      if (fallbackError) {
        console.error('Fallback search error:', fallbackError)
        return []
      }

      return fallbackData?.map(post => ({ 
        content: post.content,
        similarity_score: 0.7 
      })) || []
    }

    return data?.map(chunk => ({ 
      content: chunk.chunk_text,
      similarity_score: 0.8 
    })) || []

  } catch (error) {
    console.error('Voice chunk search failed:', error)
    return getFallbackContent(query)
  }
}

function getFallbackContent(query: string): VoiceChunk[] {
  // Fallback content for when database is not available
  const strategicContent = [
    {
      content: "As a strategic leader, I've learned that authentic executive presence comes from sharing genuine insights rather than generic advice. The best LinkedIn content combines personal experience with actionable business intelligence.",
      similarity_score: 0.8
    },
    {
      content: "Strategic thinking isn't about having all the answers—it's about asking the right questions and being transparent about the learning journey. I've found that vulnerability, when paired with expertise, creates the most compelling executive narrative.",
      similarity_score: 0.7
    },
    {
      content: "In today's business landscape, executive intelligence means understanding that disruption is constant. The leaders who thrive are those who can synthesize complex information into clear strategic direction while maintaining authentic human connection.",
      similarity_score: 0.6
    },
    {
      content: "The most powerful LinkedIn strategy for executives is consistent value creation through strategic insights. Every post should either educate, inspire, or provoke thoughtful discussion about the future of business.",
      similarity_score: 0.5
    },
    {
      content: "Executive leadership today requires balancing analytical rigor with emotional intelligence. The best strategic decisions emerge from data-driven insights combined with deep understanding of human dynamics and market psychology.",
      similarity_score: 0.4
    }
  ]
  
  // Return content that might be relevant to the query
  return strategicContent.slice(0, 3)
}