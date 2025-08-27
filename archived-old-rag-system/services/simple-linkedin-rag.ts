import { supabaseService } from './supabase'
import logger from '../lib/logger'
import { EmbeddingGenerator } from './embedding-generator'

interface LinkedInChunk {
  id: string
  content: string
  post_id: string
  chunk_index: number
  engagement_score: number
  similarity?: number
}

interface RAGResult {
  chunks: LinkedInChunk[]
  totalChunks: number
  avgSimilarity: number
  topEngagement: number
}

/**
 * Simple, clean LinkedIn RAG service that uses ONLY the 833 cleaned LinkedIn chunks
 * No contaminated patterns, no complex pipelines - just pure Andrew voice from real LinkedIn posts
 */
export class SimpleLinkedInRAG {
  private embeddingGenerator: EmbeddingGenerator

  constructor() {
    this.embeddingGenerator = new EmbeddingGenerator()
  }

  /**
   * Retrieve relevant LinkedIn content chunks for a topic
   * Uses semantic similarity to find Andrew's authentic voice patterns
   */
  async retrieveRelevantContent(topic: string, maxChunks: number = 15): Promise<RAGResult> {
    try {
      logger.info({ topic, maxChunks }, 'Retrieving relevant LinkedIn content chunks')

      // Generate embedding for the topic
      const topicEmbedding = await this.embeddingGenerator.generate(topic)

      // Query the 833 clean LinkedIn chunks using vector similarity
      const { data: chunks, error } = await supabaseService.client
        .rpc('match_linkedin_post_chunks', {
          query_embedding: topicEmbedding,
          match_threshold: 0.1, // Lower threshold to get more diverse content
          match_count: maxChunks
        })

      if (error) {
        logger.error({ error: error.message }, 'Failed to retrieve LinkedIn chunks')
        throw new Error(`RAG retrieval failed: ${error.message}`)
      }

      if (!chunks || chunks.length === 0) {
        logger.warn({ topic }, 'No LinkedIn chunks found for topic')
        return {
          chunks: [],
          totalChunks: 0,
          avgSimilarity: 0,
          topEngagement: 0
        }
      }

      const processedChunks: LinkedInChunk[] = chunks.map((chunk: any) => ({
        id: chunk.id,
        content: chunk.content,
        post_id: chunk.post_id,
        chunk_index: chunk.chunk_index,
        engagement_score: chunk.engagement_score || 0,
        similarity: chunk.similarity || 0
      }))

      const avgSimilarity = processedChunks.reduce((sum, c) => sum + (c.similarity || 0), 0) / processedChunks.length
      const topEngagement = Math.max(...processedChunks.map(c => c.engagement_score))

      logger.info({ 
        topic,
        chunksRetrieved: processedChunks.length,
        avgSimilarity: Math.round(avgSimilarity * 100),
        topEngagement
      }, 'Successfully retrieved LinkedIn RAG content')

      return {
        chunks: processedChunks,
        totalChunks: processedChunks.length,
        avgSimilarity,
        topEngagement
      }

    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        topic 
      }, 'LinkedIn RAG retrieval failed')
      
      // Return empty result instead of throwing
      return {
        chunks: [],
        totalChunks: 0,
        avgSimilarity: 0,
        topEngagement: 0
      }
    }
  }

  /**
   * Extract authentic Andrew voice patterns from retrieved chunks
   * Focuses on actual LinkedIn writing style, not generic business patterns
   */
  extractVoicePatterns(chunks: LinkedInChunk[]): {
    openingPatterns: string[]
    structuralElements: string[]
    toneElements: string[]
    researchCitations: string[]
  } {
    const openingPatterns: string[] = []
    const structuralElements: string[] = []
    const toneElements: string[] = []
    const researchCitations: string[] = []

    chunks.forEach(chunk => {
      const content = chunk.content
      
      if (!content || typeof content !== 'string') {
        return // Skip chunks with no content
      }

      // Extract authentic opening patterns (not "X is killing your Y")
      const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10)
      if (sentences.length > 0) {
        const opening = sentences[0]
        
        // Look for Andrew's actual LinkedIn patterns
        if (/^What if\s+.*\s+(isn't|is)\s+/i.test(opening)) {
          openingPatterns.push(opening)
        } else if (/^The best\s+(leaders|founders)\s+I\s+(know|work with)/i.test(opening)) {
          openingPatterns.push(opening)
        } else if (/^Most\s+leaders\s+think/i.test(opening)) {
          openingPatterns.push(opening)
        } else if (/^Here's something I've learned/i.test(opening)) {
          openingPatterns.push(opening)
        }
      }

      // Extract structural elements
      if (/…/.test(content)) structuralElements.push('ellipses_for_drama')
      if (/[1-3]️⃣/.test(content)) structuralElements.push('numbered_emojis')
      if (/💡|➡️|✅/.test(content)) structuralElements.push('strategic_emojis')

      // Extract tone elements
      if (/Here's the truth:/i.test(content)) toneElements.push('direct_truth_telling')
      if (/But here's the shift:/i.test(content)) toneElements.push('reframe_pattern')
      if (/Follow me if/i.test(content)) toneElements.push('community_building')

      // Extract research citations
      const citations = content.match(/(Yale Center|Harvard|Research shows|Studies show|Studies indicate)/gi)
      if (citations) {
        researchCitations.push(...citations)
      }
    })

    return {
      openingPatterns: [...new Set(openingPatterns)],
      structuralElements: [...new Set(structuralElements)],
      toneElements: [...new Set(toneElements)],
      researchCitations: [...new Set(researchCitations)]
    }
  }

  /**
   * Get voice guidelines based on retrieved LinkedIn content
   * Pure Andrew voice from actual posts, no generic templates
   */
  generateVoiceGuidelines(ragResult: RAGResult): string {
    if (ragResult.chunks.length === 0) {
      return `ANDREW TALLENTS AUTHENTIC LINKEDIN VOICE:
- Use thoughtful question-based openings like "What if your job as a leader isn't to..."
- Include specific research citations for credibility
- Apply dramatic structure with strategic line breaks and emojis
- Challenge conventional thinking with authentic edge
- End with community-building calls to action`
    }

    const patterns = this.extractVoicePatterns(ragResult.chunks)
    
    const guidelines = [
      'ANDREW TALLENTS AUTHENTIC LINKEDIN VOICE (From 833 Real Posts):',
      '',
      'AUTHENTIC OPENING PATTERNS:',
      ...patterns.openingPatterns.slice(0, 3).map(p => `- "${p}"`),
      '',
      'STRUCTURAL ELEMENTS:',
      ...patterns.structuralElements.map(e => `- ${e.replace('_', ' ')}`),
      '',
      'TONE ELEMENTS:',
      ...patterns.toneElements.map(t => `- ${t.replace('_', ' ')}`),
      '',
      'RESEARCH AUTHORITY:',
      ...patterns.researchCitations.slice(0, 3).map(r => `- Use citations like "${r}"`),
      '',
      'AUTHENTICITY REQUIREMENTS:',
      '- Write in Andrew\'s actual LinkedIn voice, not generic business speak',
      '- Use thought-provoking questions, not confrontational statements',
      '- Include research backing for credibility',
      '- Apply dramatic formatting for visual engagement',
      '- End with genuine community building'
    ]

    return guidelines.join('\n')
  }
}

export const simpleLinkedInRAG = new SimpleLinkedInRAG()