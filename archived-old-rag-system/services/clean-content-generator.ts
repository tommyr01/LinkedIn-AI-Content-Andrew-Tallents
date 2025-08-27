import Anthropic from '@anthropic-ai/sdk'
import { simpleLinkedInRAG } from './simple-linkedin-rag'
import logger from '../lib/logger'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

interface ContentGenerationRequest {
  topic: string
  researchContext?: any
  voiceGuidelines?: string
}

interface GeneratedContent {
  content: string
  voiceScore: number
  authenticityMarkers: {
    hasQuestionOpening: boolean
    hasResearchCitation: boolean
    hasDramaticStructure: boolean
    hasAuthenticTone: boolean
  }
}

/**
 * Clean content generator using ONLY LinkedIn RAG data and direct Claude API calls
 * No complex pipelines, no contaminated templates - just authentic Andrew voice
 */
export class CleanContentGenerator {

  /**
   * Generate content using clean RAG approach
   */
  async generateContent(request: ContentGenerationRequest): Promise<GeneratedContent> {
    try {
      logger.info({ topic: request.topic }, 'Starting clean content generation')

      // Step 1: Get relevant LinkedIn content from our clean RAG system
      const ragResult = await simpleLinkedInRAG.retrieveRelevantContent(request.topic, 10)
      
      // Step 2: Generate voice guidelines from actual LinkedIn posts
      const ragVoiceGuidelines = simpleLinkedInRAG.generateVoiceGuidelines(ragResult)
      
      // Step 3: Combine all context
      const linkedinExamples = ragResult.chunks
        .slice(0, 5)
        .map(chunk => `"${chunk.content}"`)
        .join('\n\n')

      // Step 4: Create clean prompt using real LinkedIn voice
      const prompt = this.buildCleanPrompt(request.topic, linkedinExamples, ragVoiceGuidelines, request.researchContext)
      
      logger.info({ 
        topic: request.topic,
        ragChunks: ragResult.chunks.length,
        promptLength: prompt.length
      }, 'Generating content with clean LinkedIn RAG context')

      // Step 5: Single Claude API call - no complex pipeline
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })

      const generatedContent = response.content[0].type === 'text' ? response.content[0].text : ''
      
      // Step 6: Simple authenticity check using actual LinkedIn patterns
      const authenticityMarkers = this.checkAuthenticityMarkers(generatedContent)
      const voiceScore = this.calculateVoiceScore(authenticityMarkers, ragResult.avgSimilarity)

      logger.info({ 
        topic: request.topic,
        voiceScore,
        hasQuestionOpening: authenticityMarkers.hasQuestionOpening,
        hasResearchCitation: authenticityMarkers.hasResearchCitation,
        contentLength: generatedContent.length
      }, 'Clean content generation completed')

      return {
        content: generatedContent,
        voiceScore,
        authenticityMarkers
      }

    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        topic: request.topic 
      }, 'Clean content generation failed')
      throw error
    }
  }

  /**
   * Build clean prompt using only real LinkedIn voice patterns
   */
  private buildCleanPrompt(topic: string, linkedinExamples: string, voiceGuidelines: string, researchContext?: any): string {
    const researchSection = researchContext ? `
CURRENT RESEARCH CONTEXT:
${JSON.stringify(researchContext, null, 2)}
` : ''

    return `You are Andrew Tallents, writing an authentic LinkedIn post about "${topic}".

AUTHENTIC LINKEDIN VOICE EXAMPLES:
${linkedinExamples}

${voiceGuidelines}

${researchSection}

Write a LinkedIn post that captures Andrew's authentic voice using the patterns from his real posts above. Focus on:

1. AUTHENTIC OPENING: Use Andrew's actual question-based patterns, not generic "X is killing your Y" formulas
2. RESEARCH BACKING: Include specific research citations naturally 
3. DRAMATIC STRUCTURE: Use line breaks, emojis, and formatting like Andrew's real posts
4. THOUGHTFUL CHALLENGE: Challenge thinking in Andrew's authentic style
5. COMMUNITY BUILDING: End with genuine connection, not generic CTAs

Write the LinkedIn post now:`
  }

  /**
   * Check for authentic Andrew voice markers (not generic patterns)
   */
  private checkAuthenticityMarkers(content: string): {
    hasQuestionOpening: boolean
    hasResearchCitation: boolean
    hasDramaticStructure: boolean
    hasAuthenticTone: boolean
  } {
    return {
      hasQuestionOpening: /^What if\s+.*\s+(isn't|is)\s+|^The best\s+(leaders|founders)|^Most leaders think|^Here's something I've learned/i.test(content),
      hasResearchCitation: /(Yale Center|Harvard|Research shows|Studies show)/i.test(content),
      hasDramaticStructure: /…|[1-3]️⃣|💡|➡️|✅/.test(content),
      hasAuthenticTone: /Here's the truth:|But here's the shift:|Follow me if/i.test(content)
    }
  }

  /**
   * Calculate voice score based on authentic markers
   */
  private calculateVoiceScore(markers: any, ragSimilarity: number): number {
    let score = 0
    
    if (markers.hasQuestionOpening) score += 30
    if (markers.hasResearchCitation) score += 25
    if (markers.hasDramaticStructure) score += 20
    if (markers.hasAuthenticTone) score += 15
    
    // Boost score based on RAG similarity to authentic LinkedIn posts
    score += Math.round(ragSimilarity * 10)
    
    return Math.min(100, score)
  }
}

export const cleanContentGenerator = new CleanContentGenerator()