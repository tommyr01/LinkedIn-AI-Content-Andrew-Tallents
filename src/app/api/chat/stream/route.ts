import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Initialize Supabase client with proper error handling
const getSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    console.warn('Supabase credentials not configured')
    return null
  }
  
  return createClient(url, key)
}

// Initialize OpenAI client for embeddings
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    console.warn('OpenAI API key not configured')
    return null
  }
  
  return new OpenAI({ apiKey })
}

interface VoiceChunk {
  content: string
  similarity_score?: number
  document_title?: string
  document_source?: string
}

interface MatchedChunk {
  chunk_id: string
  content: string
  similarity: number
  metadata: any
  document_title: string
  document_source: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, newMessage, user_id } = body

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Search for relevant voice chunks using vector similarity search
          console.log(`🔍 Searching for chunks relevant to: "${newMessage}"`)
          const relevantChunks = await searchVoiceChunks(newMessage, 10)
          
          console.log(`📊 Found ${relevantChunks.length} relevant chunks`)

          // Create context from relevant chunks with metadata
          const voiceContext = relevantChunks
            .map((chunk, index) => {
              const similarity = chunk.similarity_score ? `(${(chunk.similarity_score * 100).toFixed(1)}% match)` : ''
              const source = chunk.document_title ? `[${chunk.document_title}]` : ''
              return `${source} ${similarity}\n${chunk.content}`
            })
            .join('\n\n---\n\n')

          // Send tools used information first
          if (relevantChunks.length > 0) {
            const toolsData = `data: ${JSON.stringify({
              type: 'tools',
              tools: [{
                tool_name: 'vector_search',
                args: {
                  query: newMessage,
                  limit: 10,
                  results_found: relevantChunks.length,
                  avg_similarity: relevantChunks.length > 0 
                    ? (relevantChunks.reduce((sum, chunk) => sum + (chunk.similarity_score || 0), 0) / relevantChunks.length * 100).toFixed(1) + '%'
                    : '0%'
                }
              }]
            })}\n\n`
            controller.enqueue(new TextEncoder().encode(toolsData))
          }

          // Generate response using the voice context
          const response = await generateRAGResponse(newMessage, voiceContext, messages)

          // Stream the response word by word
          const words = response.split(' ')
          for (let i = 0; i < words.length; i++) {
            const chunk = i === 0 ? words[i] : ' ' + words[i]
            
            const sseData = `data: ${JSON.stringify({
              type: 'text',
              content: chunk
            })}\n\n`
            
            controller.enqueue(new TextEncoder().encode(sseData))
            
            // Reduced delay for better user experience
            await new Promise(resolve => setTimeout(resolve, 30))
          }

          // Send completion message
          const endData = `data: ${JSON.stringify({
            type: 'end'
          })}\n\n`
          controller.enqueue(new TextEncoder().encode(endData))
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

    const systemPrompt = `You are Andrew Tallents' Strategic Intelligence AI assistant. You help provide executive LinkedIn content insights and strategic business analysis.

VOICE CONTEXT - Andrew's Authentic Patterns:
${voiceContext}

CONVERSATION HISTORY:
${conversationContext}

INSTRUCTIONS:
- Respond EXACTLY in Andrew's authentic voice and style based on the voice context provided above
- Mirror his communication patterns, terminology, and perspective from the examples
- Focus on executive-level strategic insights and LinkedIn content strategy
- Keep responses practical, actionable, and authentically Andrew's perspective
- Use his specific business terminology and strategic thinking patterns
- Be insightful but conversational, matching his professional yet approachable tone
- Reference specific examples or frameworks from the voice context when relevant
- If the voice context doesn't contain relevant information, acknowledge this and provide general strategic guidance while maintaining his voice`

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
          model: 'claude-3-5-sonnet-20241022',
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

async function generateQueryEmbedding(query: string): Promise<number[] | null> {
  try {
    const openai = getOpenAIClient()
    
    if (!openai) {
      console.warn('OpenAI client not available for embedding generation')
      return null
    }

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    })

    return response.data[0].embedding
  } catch (error) {
    console.error('Failed to generate query embedding:', error)
    return null
  }
}

async function searchVoiceChunks(query: string, limit: number = 10): Promise<VoiceChunk[]> {
  try {
    const supabase = getSupabaseClient()
    
    if (!supabase) {
      console.warn('Supabase not configured, returning fallback content')
      return getFallbackContent(query)
    }

    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query)
    
    if (!queryEmbedding) {
      console.warn('Could not generate embedding, falling back to text search')
      return await fallbackTextSearch(supabase, query, limit)
    }

    // Use the match_chunks function for vector similarity search
    const { data, error } = await supabase.rpc('match_chunks', {
      query_embedding: queryEmbedding,
      match_count: limit
    })

    if (error) {
      console.error('Vector search error:', error)
      // Fallback to text search if vector search fails
      return await fallbackTextSearch(supabase, query, limit)
    }

    if (!data || data.length === 0) {
      console.warn('No matching chunks found, trying fallback search')
      return await fallbackTextSearch(supabase, query, limit)
    }

    // Convert matched chunks to VoiceChunk format
    return data.map((chunk: MatchedChunk) => ({
      content: chunk.content,
      similarity_score: chunk.similarity,
      document_title: chunk.document_title,
      document_source: chunk.document_source
    }))

  } catch (error) {
    console.error('Voice chunk search failed:', error)
    return getFallbackContent(query)
  }
}

async function fallbackTextSearch(supabase: any, query: string, limit: number): Promise<VoiceChunk[]> {
  try {
    // Try searching the chunks table with basic text search
    const { data, error } = await supabase
      .from('chunks')
      .select(`
        content,
        documents!inner(title, source)
      `)
      .textSearch('content', query, { type: 'websearch' })
      .limit(limit)

    if (error) {
      console.error('Text search error:', error)
      
      // Final fallback to recent posts
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('andrew_posts')
        .select('content')
        .not('content', 'is', null)
        .limit(limit)

      if (fallbackError) {
        console.error('Final fallback search error:', fallbackError)
        return getFallbackContent(query)
      }

      return fallbackData?.map((post: any) => ({ 
        content: post.content,
        similarity_score: 0.6 
      })) || []
    }

    return data?.map((chunk: any) => ({ 
      content: chunk.content,
      similarity_score: 0.7,
      document_title: chunk.documents?.title,
      document_source: chunk.documents?.source
    })) || []

  } catch (error) {
    console.error('Fallback text search failed:', error)
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