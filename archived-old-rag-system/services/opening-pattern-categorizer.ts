import logger from '../lib/logger'
import { supabaseService } from './supabase'
import { voiceRAGSystem } from './voice-rag-system'

export interface OpeningPatternCategory {
  category: 'confrontational' | 'question' | 'story' | 'observation' | 'contrarian'
  pattern: string
  context: string
  authenticity_score: number
  usage_frequency: number
  source_episode?: string
}

export interface OpeningPatternResult {
  patterns: OpeningPatternCategory[]
  categoryDistribution: Record<string, number>
  totalPatterns: number
  averageAuthenticityScore: number
}

/**
 * Categorizes Andrew's opening patterns from RAG voice chunks
 * Extracts authentic patterns and assigns them to 5 distinct categories
 */
export class OpeningPatternCategorizer {
  // Map database pattern types to strategic variant categories
  private readonly DB_PATTERN_MAPPING = {
    confrontational: ['challenge', 'authority', 'reframe'],
    question: ['question'],
    story: ['storytelling', 'vulnerability', 'empathy'],
    observation: ['data_presentation', 'analogy', 'teaching'],
    contrarian: ['reframe', 'challenge']
  }
  
  private readonly PATTERN_CATEGORIES = {
    confrontational: {
      keywords: ['killing', 'stop doing', 'stuck', 'destroying', 'ruining', 'wrong about'],
      patterns: [
        /^[A-Z][^.!?]*\s+(is|are) killing your\s+/i,
        /^Stop doing\s+/i,
        /^This is why you're stuck/i,
        /^[A-Z][^.!?]*\s+(is|are) destroying/i,
        /^Control is/i,
        /^Toughness is not/i,
        /^[A-Z][^.!?]*\s+is the reason you're/i
      ],
      description: 'Direct, challenging statements that confront assumptions',
      dbPatterns: ['challenge', 'authority', 'reframe']
    },
    question: {
      keywords: ['what if', 'why do', 'have you ever', 'do you know', 'what happens when'],
      patterns: [
        /^What if\s+/i,
        /^Why do most\s+/i,
        /^Have you ever wondered/i,
        /^Do you know what happens when/i,
        /^What happens when\s+/i,
        /^Why is it that/i,
        /^Ever notice how/i
      ],
      description: 'Thought-provoking questions that engage curiosity',
      dbPatterns: ['question']
    },
    story: {
      keywords: ['last week', 'i once worked', 'recently', 'a founder', 'client of mine'],
      patterns: [
        /^Last week,?\s+a\s+(founder|client|leader)/i,
        /^I once worked with/i,
        /^Recently,?\s+I\s+(met|talked to|worked with)/i,
        /^A founder I work with/i,
        /^One of my clients/i,
        /^I remember when/i,
        /^Just yesterday/i
      ],
      description: 'Personal narratives and client stories',
      dbPatterns: ['storytelling', 'vulnerability', 'empathy']
    },
    observation: {
      keywords: ['most leaders', 'the best founders', 'successful people', 'top performers'],
      patterns: [
        /^Most leaders\s+/i,
        /^The best founders I work with/i,
        /^Successful (leaders|founders|people)\s+/i,
        /^Top performers\s+/i,
        /^Every great leader/i,
        /^The highest performing/i,
        /^Great founders/i
      ],
      description: 'Observations about leadership and performance patterns',
      dbPatterns: ['data_presentation', 'analogy', 'teaching']
    },
    contrarian: {
      keywords: ['everyone says', 'forget what', 'conventional wisdom', 'most people think'],
      patterns: [
        /^Everyone says\s+.+,?\s+but\s+/i,
        /^Forget what you've heard about/i,
        /^Conventional wisdom says\s+.+,?\s+but\s+/i,
        /^Most people think\s+.+,?\s+but\s+/i,
        /^The popular advice is\s+.+,?\s+but\s+/i,
        /^You've been told\s+.+,?\s+but\s+/i
      ],
      description: 'Contrarian takes that challenge popular beliefs',
      dbPatterns: ['reframe', 'challenge']
    }
  }

  /**
   * Extract and categorize opening patterns from Andrew's voice chunks
   */
  async extractAndCategorizePatterns(
    topicKeywords: string[] = [],
    maxPatterns: number = 20
  ): Promise<OpeningPatternResult> {
    const startTime = Date.now()
    
    logger.info({
      topicKeywords,
      maxPatterns
    }, 'Starting opening pattern extraction and categorization')

    try {
      // Step 1: Get voice chunks with opening patterns
      const chunks = await this.getVoiceChunksWithOpenings(topicKeywords, maxPatterns)
      
      if (chunks.length === 0) {
        logger.warn('No voice chunks found with opening patterns')
        return this.getEmptyResult()
      }

      // Step 2: Extract and categorize patterns from chunks
      const categorizedPatterns = await this.categorizeChunkOpenings(chunks)

      // Step 3: Calculate distribution and statistics
      const categoryDistribution = this.calculateCategoryDistribution(categorizedPatterns)
      const avgAuthenticityScore = this.calculateAverageAuthenticityScore(categorizedPatterns)

      const result: OpeningPatternResult = {
        patterns: categorizedPatterns,
        categoryDistribution,
        totalPatterns: categorizedPatterns.length,
        averageAuthenticityScore: avgAuthenticityScore
      }

      const processingTime = Date.now() - startTime
      logger.info({
        totalPatterns: result.totalPatterns,
        categoryDistribution: result.categoryDistribution,
        avgAuthenticity: result.averageAuthenticityScore,
        processingTime
      }, 'Opening pattern categorization completed')

      return result

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        topicKeywords
      }, 'Failed to extract and categorize opening patterns')

      // Return fallback patterns
      return this.getFallbackPatterns()
    }
  }

  /**
   * Get patterns by specific category for variant routing
   */
  async getPatternsByCategory(
    category: 'confrontational' | 'question' | 'story' | 'observation' | 'contrarian',
    topicKeywords: string[] = [],
    maxPatterns: number = 5
  ): Promise<OpeningPatternCategory[]> {
    try {
      const allPatterns = await this.extractAndCategorizePatterns(topicKeywords, maxPatterns * 3)
      
      return allPatterns.patterns
        .filter(pattern => pattern.category === category)
        .slice(0, maxPatterns)
        
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        category,
        topicKeywords
      }, 'Failed to get patterns by category')

      return this.getFallbackPatternsForCategory(category)
    }
  }

  /**
   * Get voice chunks that contain opening patterns using enhanced RAG system
   */
  private async getVoiceChunksWithOpenings(
    topicKeywords: string[],
    maxChunks: number
  ): Promise<any[]> {
    try {
      // Get chunks from all categories to build comprehensive opening pattern database
      const allChunks: any[] = []
      const categories: ('confrontational' | 'question' | 'story' | 'observation' | 'contrarian')[] = 
        ['confrontational', 'question', 'story', 'observation', 'contrarian']

      for (const category of categories) {
        const categoryChunks = await voiceRAGSystem.getChunksByPatternCategory(
          category,
          topicKeywords,
          Math.ceil(maxChunks / categories.length) + 2 // Distribute chunks across categories
        )
        allChunks.push(...categoryChunks)
      }

      // Also get general opening-tagged chunks as fallback
      let query = supabaseService.client
        .from('voice_content_chunks')
        .select(`
          id,
          chunk_text,
          authenticity_score,
          quality_score,
          episode_title,
          primary_topic,
          pattern_types,
          speaker
        `)
        .eq('speaker', 'andrew')
        .gte('authenticity_score', 60)
        .gte('quality_score', 0.5)
        .contains('pattern_types', ['opening'])
        .limit(Math.ceil(maxChunks / 2))

      // Add topic filter if specified
      if (topicKeywords.length > 0) {
        query = query.or(
          topicKeywords
            .map(keyword => `chunk_text.ilike.%${keyword}%,primary_topic.ilike.%${keyword}%`)
            .join(',')
        )
      }

      const { data, error } = await query.order('authenticity_score', { ascending: false })

      if (!error && data) {
        // Map id to chunk_id for consistency
        const mappedData = data.map(chunk => ({
          ...chunk,
          chunk_id: chunk.id
        }))
        allChunks.push(...mappedData)
      }

      // Remove duplicates by chunk_id and sort by authenticity
      const uniqueChunks = Array.from(
        new Map(allChunks.map(chunk => [chunk.chunk_id, chunk])).values()
      ).sort((a, b) => b.authenticity_score - a.authenticity_score)

      logger.debug({
        totalChunks: uniqueChunks.length,
        avgAuthenticity: uniqueChunks.length > 0 
          ? uniqueChunks.reduce((sum, c) => sum + c.authenticity_score, 0) / uniqueChunks.length 
          : 0
      }, 'Retrieved voice chunks with opening patterns from all categories')

      return uniqueChunks.slice(0, maxChunks)

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Error fetching voice chunks with openings')
      return []
    }
  }

  /**
   * Categorize opening patterns from chunks using database pattern types
   */
  private async categorizeChunkOpenings(chunks: any[]): Promise<OpeningPatternCategory[]> {
    const patterns: OpeningPatternCategory[] = []

    for (const chunk of chunks) {
      try {
        // Use database pattern types to determine strategic category
        const dbPatterns = chunk.pattern_types || []
        const strategicCategory = this.mapDbPatternsToStrategicCategory(dbPatterns)
        
        if (!strategicCategory) continue

        // Extract opening sentence(s) for display
        const openingText = this.extractOpeningText(chunk.chunk_text)
        if (!openingText) continue

        patterns.push({
          category: strategicCategory,
          pattern: openingText,
          context: chunk.chunk_text.substring(0, 300) + '...',
          authenticity_score: chunk.authenticity_score || 0,
          usage_frequency: 1, // Will be calculated later
          source_episode: chunk.episode_title
        })

      } catch (error) {
        logger.debug({
          error: error instanceof Error ? error.message : String(error),
          chunkId: chunk.chunk_id || chunk.id
        }, 'Failed to categorize chunk opening')
        continue
      }
    }

    // Remove duplicates and calculate usage frequency
    return this.deduplicateAndCalculateFrequency(patterns)
  }

  /**
   * Map database pattern types to strategic categories
   */
  private mapDbPatternsToStrategicCategory(
    dbPatterns: string[]
  ): 'confrontational' | 'question' | 'story' | 'observation' | 'contrarian' | null {
    if (!dbPatterns || dbPatterns.length === 0) return null

    // Priority-based mapping - check most specific patterns first
    const patternSet = new Set(dbPatterns)
    
    // Confrontational: challenge, authority, reframe
    if (patternSet.has('challenge') || patternSet.has('authority') || patternSet.has('reframe')) {
      return 'confrontational'
    }
    
    // Question: question patterns
    if (patternSet.has('question')) {
      return 'question'
    }
    
    // Story: storytelling, vulnerability, empathy
    if (patternSet.has('storytelling') || patternSet.has('vulnerability') || patternSet.has('empathy')) {
      return 'story'
    }
    
    // Observation: data_presentation, analogy, teaching
    if (patternSet.has('data_presentation') || patternSet.has('analogy') || patternSet.has('teaching')) {
      return 'observation'
    }
    
    // Contrarian: overlaps with confrontational but prefer specific reframe
    if (patternSet.has('reframe') && !patternSet.has('challenge')) {
      return 'contrarian'
    }
    
    return null
  }

  /**
   * Extract opening text from chunk (first sentence or two)
   */
  private extractOpeningText(chunkText: string): string | null {
    if (!chunkText || chunkText.trim().length === 0) return null

    // Clean up the text
    const cleaned = chunkText.trim()
    
    // Get first sentence or two sentences if first is very short
    const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    if (sentences.length === 0) return null
    
    let opening = sentences[0].trim()
    
    // If first sentence is very short (under 30 chars) and we have more, include second
    if (opening.length < 30 && sentences.length > 1) {
      opening += '. ' + sentences[1].trim()
    }
    
    // Limit length
    if (opening.length > 200) {
      opening = opening.substring(0, 200).trim()
    }

    return opening
  }

  /**
   * Categorize an opening text into one of the 5 categories
   */
  private categorizeOpening(openingText: string): 'confrontational' | 'question' | 'story' | 'observation' | 'contrarian' | null {
    // Check each category in order of specificity
    for (const [categoryName, categoryConfig] of Object.entries(this.PATTERN_CATEGORIES)) {
      // First check explicit patterns
      for (const pattern of categoryConfig.patterns) {
        if (pattern.test(openingText)) {
          return categoryName as any
        }
      }

      // Then check keywords
      const hasKeywords = categoryConfig.keywords.some(keyword => 
        openingText.toLowerCase().includes(keyword.toLowerCase())
      )
      
      if (hasKeywords) {
        return categoryName as any
      }
    }

    return null
  }

  /**
   * Remove duplicate patterns and calculate usage frequency
   */
  private deduplicateAndCalculateFrequency(patterns: OpeningPatternCategory[]): OpeningPatternCategory[] {
    const patternMap = new Map<string, OpeningPatternCategory>()

    for (const pattern of patterns) {
      // Create a normalized key for deduplication
      const key = pattern.pattern.toLowerCase().trim()
      
      if (patternMap.has(key)) {
        // Update frequency and authenticity score (weighted average)
        const existing = patternMap.get(key)!
        existing.usage_frequency += 1
        existing.authenticity_score = Math.round(
          (existing.authenticity_score + pattern.authenticity_score) / 2
        )
      } else {
        patternMap.set(key, { ...pattern })
      }
    }

    return Array.from(patternMap.values())
      .sort((a, b) => b.authenticity_score - a.authenticity_score) // Sort by authenticity
  }

  /**
   * Calculate category distribution
   */
  private calculateCategoryDistribution(patterns: OpeningPatternCategory[]): Record<string, number> {
    const distribution: Record<string, number> = {
      confrontational: 0,
      question: 0,
      story: 0,
      observation: 0,
      contrarian: 0
    }

    patterns.forEach(pattern => {
      distribution[pattern.category] = (distribution[pattern.category] || 0) + 1
    })

    return distribution
  }

  /**
   * Calculate average authenticity score
   */
  private calculateAverageAuthenticityScore(patterns: OpeningPatternCategory[]): number {
    if (patterns.length === 0) return 0

    const total = patterns.reduce((sum, pattern) => sum + pattern.authenticity_score, 0)
    return Math.round(total / patterns.length)
  }

  /**
   * Get empty result structure
   */
  private getEmptyResult(): OpeningPatternResult {
    return {
      patterns: [],
      categoryDistribution: {
        confrontational: 0,
        question: 0,
        story: 0,
        observation: 0,
        contrarian: 0
      },
      totalPatterns: 0,
      averageAuthenticityScore: 0
    }
  }

  /**
   * Get fallback patterns when RAG fails
   */
  private getFallbackPatterns(): OpeningPatternResult {
    const fallbackPatterns: OpeningPatternCategory[] = [
      {
        category: 'confrontational',
        pattern: 'Control is killing your growth potential',
        context: 'Fallback pattern for confrontational openings',
        authenticity_score: 85,
        usage_frequency: 1
      },
      {
        category: 'question',
        pattern: 'What if the reason you\'re stuck isn\'t what you think?',
        context: 'Fallback pattern for question openings',
        authenticity_score: 80,
        usage_frequency: 1
      },
      {
        category: 'story',
        pattern: 'Last week, a founder told me something that changed everything',
        context: 'Fallback pattern for story openings',
        authenticity_score: 90,
        usage_frequency: 1
      },
      {
        category: 'observation',
        pattern: 'The best founders I work with have one thing in common',
        context: 'Fallback pattern for observation openings',
        authenticity_score: 88,
        usage_frequency: 1
      },
      {
        category: 'contrarian',
        pattern: 'Everyone says work-life balance matters, but the data shows something different',
        context: 'Fallback pattern for contrarian openings',
        authenticity_score: 87,
        usage_frequency: 1
      }
    ]

    return {
      patterns: fallbackPatterns,
      categoryDistribution: {
        confrontational: 1,
        question: 1,
        story: 1,
        observation: 1,
        contrarian: 1
      },
      totalPatterns: 5,
      averageAuthenticityScore: 86
    }
  }

  /**
   * Get fallback patterns for specific category
   */
  private getFallbackPatternsForCategory(category: string): OpeningPatternCategory[] {
    const fallbackMap: Record<string, OpeningPatternCategory> = {
      confrontational: {
        category: 'confrontational',
        pattern: 'This mindset is killing your leadership potential',
        context: 'Fallback confrontational pattern',
        authenticity_score: 85,
        usage_frequency: 1
      },
      question: {
        category: 'question',
        pattern: 'Why do most leaders struggle with the same thing?',
        context: 'Fallback question pattern',
        authenticity_score: 80,
        usage_frequency: 1
      },
      story: {
        category: 'story',
        pattern: 'A client recently asked me something that stopped me in my tracks',
        context: 'Fallback story pattern',
        authenticity_score: 90,
        usage_frequency: 1
      },
      observation: {
        category: 'observation',
        pattern: 'Most leaders I work with share one common challenge',
        context: 'Fallback observation pattern',
        authenticity_score: 88,
        usage_frequency: 1
      },
      contrarian: {
        category: 'contrarian',
        pattern: 'Conventional wisdom says one thing, but my experience shows another',
        context: 'Fallback contrarian pattern',
        authenticity_score: 87,
        usage_frequency: 1
      }
    }

    return [fallbackMap[category] || fallbackMap.confrontational]
  }

  /**
   * Get pattern statistics for monitoring
   */
  async getPatternStatistics(): Promise<{
    totalPatterns: number
    categoryBreakdown: Record<string, number>
    averageAuthenticity: number
    topCategories: string[]
  }> {
    try {
      const result = await this.extractAndCategorizePatterns([], 50)
      
      const topCategories = Object.entries(result.categoryDistribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([category]) => category)

      return {
        totalPatterns: result.totalPatterns,
        categoryBreakdown: result.categoryDistribution,
        averageAuthenticity: result.averageAuthenticityScore,
        topCategories
      }
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to get pattern statistics')

      return {
        totalPatterns: 0,
        categoryBreakdown: {},
        averageAuthenticity: 0,
        topCategories: []
      }
    }
  }
}

export const openingPatternCategorizer = new OpeningPatternCategorizer()