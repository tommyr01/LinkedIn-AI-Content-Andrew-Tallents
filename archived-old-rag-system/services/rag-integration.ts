import { appConfig } from '../config'
import logger from '../lib/logger'
import { supabaseService } from './supabase'

export interface VoicePattern {
  id: string
  type: string
  text: string
  confidence: number
  source: string
  authenticity_score: number
  performance_score: number
  metadata?: Record<string, any>
}

export interface RAGSearchOptions {
  patternTypes?: string[]
  minConfidence?: number
  limit?: number
  contextFilters?: {
    audience?: string
    situation?: string
    performanceThreshold?: number
  }
}

export interface RAGContentResult {
  content: string
  authenticity_score: number
  patterns_used: VoicePattern[]
  retrieval_quality: number
  generation_metadata: Record<string, any>
}

export interface RAGInsights {
  patterns_retrieved: number
  average_confidence: number
  authenticity_prediction: number
  top_patterns: Array<{
    type: string
    confidence: number
    source: string
  }>
  source_episodes: string[]
}

/**
 * RAG Integration Service - Connects with the Python RAG system
 * and manages voice pattern retrieval for authentic content generation
 */
export class RAGIntegrationService {
  private ragApiUrl: string
  private ragApiKey: string
  private fallbackToLocal: boolean

  constructor() {
    this.ragApiUrl = process.env.RAG_API_URL || 'http://localhost:8000'
    this.ragApiKey = process.env.RAG_API_KEY || ''
    this.fallbackToLocal = process.env.RAG_FALLBACK_LOCAL === 'true'
  }

  /**
   * Search for relevant voice patterns using hybrid vector + keyword search
   */
  async searchVoicePatterns(query: string, options: RAGSearchOptions = {}): Promise<VoicePattern[]> {
    const startTime = Date.now()
    
    try {
      logger.info({ query, options }, 'Starting RAG voice pattern search')

      // First try the Python RAG system
      const patterns = await this.searchFromRAGSystem(query, options)
      
      if (patterns.length > 0) {
        const searchTime = Date.now() - startTime
        logger.info({ 
          patternCount: patterns.length, 
          searchTimeMs: searchTime,
          avgConfidence: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length 
        }, 'RAG pattern search completed successfully')
        
        return patterns
      }

      // Fallback to local database search if RAG system fails
      if (this.fallbackToLocal) {
        logger.warn('RAG system returned no patterns, falling back to local search')
        return await this.searchFromLocalDatabase(query, options)
      }

      return []

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error), query }, 'RAG pattern search failed')
      
      if (this.fallbackToLocal) {
        logger.info('Falling back to local database search due to RAG system error')
        return await this.searchFromLocalDatabase(query, options)
      }
      
      return []
    }
  }

  /**
   * Search patterns from the Python RAG system via HTTP API
   */
  private async searchFromRAGSystem(query: string, options: RAGSearchOptions): Promise<VoicePattern[]> {
    const searchPayload = {
      query,
      search_type: 'hybrid',
      limit: options.limit || 8,
      filters: {
        pattern_types: options.patternTypes || ['opening', 'storytelling', 'conclusion'],
        min_confidence: options.minConfidence || 0.7,
        performance_threshold: options.contextFilters?.performanceThreshold || 0.5
      }
    }

    const response = await fetch(`${this.ragApiUrl}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.ragApiKey ? `Bearer ${this.ragApiKey}` : '',
      },
      body: JSON.stringify(searchPayload),
      timeout: 10000 // 10 second timeout
    })

    if (!response.ok) {
      throw new Error(`RAG API returned ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    
    if (!result.success || !result.results) {
      throw new Error('Invalid response format from RAG system')
    }

    // Transform RAG system results to our VoicePattern format
    return result.results.map((item: any) => ({
      id: item.chunk_id || item.id,
      type: item.pattern_type || item.metadata?.pattern_type || 'general',
      text: item.content,
      confidence: item.score || item.similarity || 0.8,
      source: item.document_source || item.source || 'unknown',
      authenticity_score: item.authenticity_score || 0.8,
      performance_score: item.performance_score || 0.5,
      metadata: {
        document_title: item.document_title,
        chunk_index: item.chunk_index,
        token_count: item.token_count,
        rag_system_score: item.score
      }
    }))
  }

  /**
   * Fallback search using local Supabase database
   */
  private async searchFromLocalDatabase(query: string, options: RAGSearchOptions): Promise<VoicePattern[]> {
    try {
      // Generate embedding for the query (simplified - in real implementation, use OpenAI API)
      const queryHash = this.generateQueryHash(query)
      
      // Search existing voice patterns in database
      const { data: patterns, error } = await supabaseService.client
        .from('voice_patterns')
        .select('*')
        .ilike('pattern_text', `%${query}%`)
        .gte('confidence_score', options.minConfidence || 0.7)
        .order('performance_score', { ascending: false })
        .limit(options.limit || 8)

      if (error) {
        logger.error({ error }, 'Local database pattern search failed')
        return []
      }

      // Transform database results to VoicePattern format
      return (patterns || []).map(pattern => ({
        id: pattern.id,
        type: pattern.pattern_type,
        text: pattern.pattern_text,
        confidence: pattern.confidence_score,
        source: pattern.source_episode || 'local_db',
        authenticity_score: 0.75, // Default for local patterns
        performance_score: pattern.performance_score,
        metadata: {
          source: 'local_database',
          usage_count: pattern.usage_count,
          ...pattern.metadata
        }
      }))

    } catch (error) {
      logger.error({ error }, 'Local database search failed')
      return []
    }
  }

  /**
   * Generate RAG-enhanced content using retrieved voice patterns
   */
  async generateRAGEnhancedContent(
    topic: string,
    voicePatterns: VoicePattern[],
    baseVoiceGuidelines: string,
    strategicVariant: string = 'performance'
  ): Promise<RAGContentResult> {
    logger.info({ 
      topic, 
      patternCount: voicePatterns.length, 
      strategicVariant 
    }, 'Starting RAG-enhanced content generation')

    try {
      // Build RAG context from voice patterns
      const ragContext = this.buildRAGContext(voicePatterns, strategicVariant)
      
      // Enhanced prompt with RAG context
      const enhancedPrompt = this.constructRAGEnhancedPrompt(
        topic,
        baseVoiceGuidelines,
        ragContext,
        strategicVariant
      )

      // Calculate expected authenticity based on pattern quality
      const expectedAuthenticity = this.calculateExpectedAuthenticity(voicePatterns)

      // For now, return a structured result - in real implementation, call AI service
      return {
        content: `RAG-Enhanced ${strategicVariant} content for: ${topic}`,
        authenticity_score: expectedAuthenticity,
        patterns_used: voicePatterns,
        retrieval_quality: this.calculateRetrievalQuality(voicePatterns),
        generation_metadata: {
          enhanced_prompt_length: enhancedPrompt.length,
          rag_context_tokens: this.estimateTokenCount(ragContext),
          strategic_variant: strategicVariant,
          pattern_diversity: this.calculatePatternDiversity(voicePatterns),
          generation_timestamp: new Date().toISOString()
        }
      }

    } catch (error) {
      logger.error({ error, topic }, 'RAG-enhanced content generation failed')
      throw error
    }
  }

  /**
   * Build RAG context from voice patterns
   */
  private buildRAGContext(patterns: VoicePattern[], variant: string): string {
    const contextSections: string[] = []

    // Group patterns by type
    const patternsByType = patterns.reduce((acc, pattern) => {
      if (!acc[pattern.type]) acc[pattern.type] = []
      acc[pattern.type].push(pattern)
      return acc
    }, {} as Record<string, VoicePattern[]>)

    // Build context sections
    contextSections.push(`ANDREW TALLENTS AUTHENTIC VOICE PATTERNS (${variant.toUpperCase()} VARIANT):`)
    contextSections.push('')

    Object.entries(patternsByType).forEach(([type, typePatterns]) => {
      contextSections.push(`${type.toUpperCase()} PATTERNS:`)
      typePatterns
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3) // Top 3 patterns per type
        .forEach((pattern, index) => {
          contextSections.push(`${index + 1}. ${pattern.text} (Confidence: ${(pattern.confidence * 100).toFixed(0)}%)`)
        })
      contextSections.push('')
    })

    // Add performance insights
    contextSections.push('PERFORMANCE INSIGHTS:')
    contextSections.push(`- Average Pattern Performance: ${(patterns.reduce((sum, p) => sum + p.performance_score, 0) / patterns.length * 100).toFixed(0)}%`)
    contextSections.push(`- Authenticity Range: ${Math.min(...patterns.map(p => p.authenticity_score)) * 100}-${Math.max(...patterns.map(p => p.authenticity_score)) * 100}%`)
    contextSections.push('')

    return contextSections.join('\n')
  }

  /**
   * Construct RAG-enhanced prompt for content generation
   */
  private constructRAGEnhancedPrompt(
    topic: string,
    baseGuidelines: string,
    ragContext: string,
    variant: string
  ): string {
    const variantInstructions = this.getVariantInstructions(variant)

    return `
${baseGuidelines}

${ragContext}

STRATEGIC VARIANT: ${variant.toUpperCase()}
${variantInstructions}

CONTENT TOPIC: ${topic}

INSTRUCTIONS:
1. Use the provided voice patterns as inspiration for authentic Andrew Tallents content
2. Maintain the specific strategic focus for the ${variant} variant
3. Incorporate high-confidence patterns naturally into the content structure
4. Ensure the content feels authentic to Andrew's voice while optimizing for ${variant} goals
5. Generate engaging, professional LinkedIn content that drives meaningful engagement

Generate content that authentically captures Andrew's voice while optimizing for ${variant} performance.
    `.trim()
  }

  /**
   * Get variant-specific instructions
   */
  private getVariantInstructions(variant: string): string {
    const instructions = {
      performance: `
FOCUS: Proven patterns and high-engagement structures
- Use patterns with highest performance scores
- Incorporate research-backed authority signals
- Apply dramatic formatting for visual engagement
- Include clear call-to-action elements
EXPECTED OUTCOME: High reach and professional engagement`,

      engagement: `
FOCUS: Conversation starters and meaningful interactions
- Use question-based opening patterns
- Incorporate vulnerability and personal elements
- Create discussion-worthy insights
- Include engagement-driving elements
EXPECTED OUTCOME: Comments, discussions, and meaningful connections`,

      experimental: `
FOCUS: Innovation and pattern discovery
- Blend multiple pattern types creatively
- Test new content structures
- Incorporate emerging voice elements
- Push authenticity boundaries while maintaining Andrew's core voice
EXPECTED OUTCOME: New insights and pattern discovery`
    }

    return instructions[variant as keyof typeof instructions] || instructions.performance
  }

  /**
   * Calculate expected authenticity based on pattern quality
   */
  private calculateExpectedAuthenticity(patterns: VoicePattern[]): number {
    if (patterns.length === 0) return 0.7

    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
    const avgAuthenticity = patterns.reduce((sum, p) => sum + p.authenticity_score, 0) / patterns.length
    const patternQuality = patterns.length >= 5 ? 1.0 : patterns.length / 5

    return Math.min(0.95, (avgConfidence * 0.4) + (avgAuthenticity * 0.4) + (patternQuality * 0.2))
  }

  /**
   * Calculate retrieval quality score
   */
  private calculateRetrievalQuality(patterns: VoicePattern[]): number {
    if (patterns.length === 0) return 0

    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
    const diversity = this.calculatePatternDiversity(patterns)
    const completeness = Math.min(1.0, patterns.length / 8)

    return (avgConfidence * 0.5) + (diversity * 0.3) + (completeness * 0.2)
  }

  /**
   * Calculate pattern diversity score
   */
  private calculatePatternDiversity(patterns: VoicePattern[]): number {
    const types = new Set(patterns.map(p => p.type))
    const maxTypes = 5 // Maximum expected pattern types
    return Math.min(1.0, types.size / maxTypes)
  }

  /**
   * Track RAG usage for analytics
   */
  async trackRAGUsage(
    jobId: string,
    patterns: VoicePattern[],
    retrievalQuery: string,
    result: RAGContentResult
  ): Promise<void> {
    try {
      // Track each pattern used
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i]
        
        await supabaseService.client
          .from('rag_retrieval_analytics')
          .insert({
            job_id: jobId,
            chunk_id: pattern.id,
            retrieval_query: retrievalQuery,
            similarity_score: pattern.confidence,
            rank_position: i + 1,
            used_in_generation: true,
            contribution_score: pattern.performance_score,
            rag_system_version: '1.0.0'
          })
      }

      logger.info({ 
        jobId, 
        patternsTracked: patterns.length,
        avgConfidence: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
      }, 'RAG usage tracking completed')

    } catch (error) {
      logger.error({ error, jobId }, 'Failed to track RAG usage')
    }
  }

  /**
   * Generate RAG insights for UI display
   */
  generateRAGInsights(patterns: VoicePattern[], result: RAGContentResult): RAGInsights {
    const topPatterns = patterns
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map(p => ({
        type: p.type,
        confidence: p.confidence,
        source: p.source
      }))

    const sourceEpisodes = [...new Set(patterns.map(p => p.source).filter(s => s && s !== 'unknown'))]
      .slice(0, 5)

    return {
      patterns_retrieved: patterns.length,
      average_confidence: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length,
      authenticity_prediction: result.authenticity_score,
      top_patterns: topPatterns,
      source_episodes: sourceEpisodes
    }
  }

  /**
   * Analyze content for voice authenticity using RAG patterns
   */
  async analyzeVoiceAuthenticity(content: string, comparePatterns?: VoicePattern[]): Promise<{
    authenticity_score: number
    matching_patterns: string[]
    voice_characteristics: {
      tone: string
      structure: string
      vocabulary: string
      authenticity: string
    }
    recommendations: string[]
  }> {
    try {
      // If we have compare patterns, use them for analysis
      if (comparePatterns && comparePatterns.length > 0) {
        const matches = comparePatterns.filter(pattern => 
          content.toLowerCase().includes(pattern.text.toLowerCase().substring(0, 20))
        )

        const authenticityScore = matches.length > 0 
          ? matches.reduce((sum, p) => sum + p.authenticity_score, 0) / matches.length 
          : 0.7

        return {
          authenticity_score: authenticityScore,
          matching_patterns: matches.map(p => p.id),
          voice_characteristics: {
            tone: this.analyzeContentTone(content),
            structure: this.analyzeContentStructure(content),
            vocabulary: 'Professional with personal touches',
            authenticity: authenticityScore > 0.8 ? 'High' : authenticityScore > 0.6 ? 'Medium' : 'Low'
          },
          recommendations: this.generateAuthenticityRecommendations(authenticityScore, matches)
        }
      }

      // Fallback analysis without patterns
      return {
        authenticity_score: 0.75,
        matching_patterns: [],
        voice_characteristics: {
          tone: this.analyzeContentTone(content),
          structure: this.analyzeContentStructure(content),
          vocabulary: 'Professional',
          authenticity: 'Medium'
        },
        recommendations: ['Consider using more specific voice patterns for higher authenticity']
      }

    } catch (error) {
      logger.error({ error }, 'Voice authenticity analysis failed')
      throw error
    }
  }

  /**
   * Helper method to analyze content tone
   */
  private analyzeContentTone(content: string): string {
    const lowerContent = content.toLowerCase()
    
    if (lowerContent.includes('what if') || lowerContent.includes('?')) {
      return 'Questioning/Curious'
    }
    if (lowerContent.includes('here\'s the truth') || lowerContent.includes('research shows')) {
      return 'Authoritative'
    }
    if (lowerContent.includes('i\'ve learned') || lowerContent.includes('my experience')) {
      return 'Personal/Reflective'
    }
    return 'Professional'
  }

  /**
   * Helper method to analyze content structure
   */
  private analyzeContentStructure(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const avgSentenceLength = content.length / sentences.length
    
    if (avgSentenceLength < 80) {
      return 'Punchy/Direct'
    }
    if (content.includes('1️⃣') || content.includes('2️⃣') || content.includes('3️⃣')) {
      return 'Structured/Numbered'
    }
    if (content.includes('...') || content.includes('—')) {
      return 'Dramatic/Engaging'
    }
    return 'Standard'
  }

  /**
   * Generate authenticity recommendations
   */
  private generateAuthenticityRecommendations(score: number, matches: VoicePattern[]): string[] {
    const recommendations: string[] = []

    if (score < 0.8) {
      recommendations.push('Consider using more of Andrew\'s question-based opening patterns')
    }
    if (matches.length === 0) {
      recommendations.push('Incorporate specific voice patterns from Andrew\'s content library')
    }
    if (score < 0.6) {
      recommendations.push('Add research citations or authority signals')
      recommendations.push('Use more dramatic formatting elements (emojis, ellipses)')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Content authenticity looks good! Consider minor refinements.')
    }

    return recommendations
  }

  /**
   * Utility methods
   */
  private generateQueryHash(query: string): string {
    // Simple hash function for query identification
    return Buffer.from(query).toString('base64').substring(0, 16)
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: 4 characters per token
    return Math.ceil(text.length / 4)
  }
}

export const ragIntegrationService = new RAGIntegrationService()
export default ragIntegrationService