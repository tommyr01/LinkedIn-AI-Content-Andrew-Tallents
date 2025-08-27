/**
 * Andrew Voice Pattern Extractor Service
 * 
 * This service analyzes Andrew's LinkedIn posts to extract his signature voice patterns,
 * creating templates and guidelines that the AI can follow to generate authentic content.
 * 
 * Key Features:
 * - Signature pattern identification ("What if..." openings, research citations, story structures)
 * - Template creation for consistent voice replication
 * - Opening pattern categorization for strategic content generation
 * - Authenticity scoring based on Andrew's specific language patterns
 * - Voice evolution tracking over time
 */

import { supabaseService } from './supabase'
import logger from '../lib/logger'

interface VoicePattern {
  id?: number
  pattern_type: string
  pattern_text: string
  full_context: string
  usage_frequency: number
  effectiveness_score: number
  authenticity_markers: string[]
  topic_categories: string[]
  sentiment_tone: 'challenging' | 'supportive' | 'questioning' | 'authoritative' | 'vulnerable'
  opening_category?: 'confrontational' | 'question' | 'story' | 'observation' | 'contrarian'
  template_structure: string
  example_variations: string[]
  context_triggers: string[] // When to use this pattern
}

interface OpeningPattern {
  type: 'confrontational' | 'question' | 'story' | 'observation' | 'contrarian'
  templates: string[]
  examples: string[]
  contextualUsage: string[]
  effectivenessScore: number
  authenticityMarkers: string[]
}

interface VoiceEvolutionInsight {
  timeframe: string
  dominant_patterns: string[]
  authenticity_trend: number
  topic_focus_shift: string[]
  language_evolution: string[]
  engagement_correlation: Record<string, number>
}

export class AndrewVoicePatternExtractor {
  private signaturePatterns: Map<string, RegExp> = new Map()
  private openingPatternTemplates: Map<string, string[]> = new Map()
  
  constructor() {
    this.initializePatternDetection()
  }

  /**
   * Initialize pattern detection rules and templates
   */
  private initializePatternDetection(): void {
    this.signaturePatterns = new Map([
      // Andrew's signature openings
      ['confrontational_what_if', /^What if (I told you|you could|the secret|we've been)/i],
      ['confrontational_stop', /^Stop ([a-z]+ing|trying to|believing|thinking)/i],
      ['confrontational_truth', /^(The truth is|Here's the thing|Let me be clear)/i],
      
      // Philosophical questioning patterns
      ['philosophical_question', /(What if|Why do we|How many times|When will we)/i],
      ['rhetorical_challenge', /(Sound familiar\?|Am I right\?|You know this|We've all been there)/i],
      ['assumption_challenge', /(What if everything|Imagine if|What would happen if)/i],
      
      // Research and authority patterns
      ['research_opener', /(Research shows|Studies reveal|New data suggests)/i],
      ['experience_authority', /(In my \d+ years|After working with|I've seen this)/i],
      ['specific_data', /(\d+% of|According to [\w\s]+|Statistics show)/i],
      
      // Story and personal patterns
      ['story_opener', /(Let me tell you about|Recently|Last week|Story time)/i],
      ['vulnerability_admission', /(I used to believe|I was wrong about|I struggle with)/i],
      ['client_story', /(One of my clients|Working with|A leader I coach)/i],
      
      // Teaching and insight patterns
      ['insight_reveal', /(Here's what I've learned|The key insight|What I discovered)/i],
      ['framework_introduction', /(There are \d+ types|The framework|My approach)/i],
      ['counterintuitive', /(Counterintuitively|Against conventional wisdom|Here's the paradox)/i],
      
      // Engagement and CTA patterns
      ['question_cta', /(What's your experience|Share your thoughts|Tell me)/i],
      ['community_engagement', /(Who else|Anyone else|Tag someone)/i],
      ['reflection_prompt', /(Think about|Reflect on|Consider)/i]
    ])

    this.openingPatternTemplates = new Map([
      ['confrontational', [
        'Stop {action}. {consequence}.',
        'What if I told you {revelation}?',
        'Here\'s the thing about {topic}.',
        'The truth is, {insight}.',
        'Let me be clear: {statement}.'
      ]],
      ['question', [
        'What if {hypothetical_scenario}?',
        'Why do we {common_behavior}?',
        'How many times have you {relatable_experience}?',
        'When will we {desired_change}?',
        'What would happen if {challenge_assumption}?'
      ]],
      ['story', [
        'Let me tell you about {story_subject}.',
        'Recently, I {personal_experience}.',
        'Last week, a client {client_situation}.',
        'I remember when I {past_experience}.',
        'One of my clients just {client_outcome}.'
      ]],
      ['observation', [
        'I\'ve noticed that {pattern_observation}.',
        'After {time_period}, I\'ve learned {insight}.',
        'Research shows {data_point}.',
        'In my experience, {professional_insight}.',
        'The data reveals {surprising_finding}.'
      ]],
      ['contrarian', [
        'Everyone says {common_belief}, but {contrarian_view}.',
        'Counterintuitively, {unexpected_truth}.',
        'Against conventional wisdom, {alternative_approach}.',
        'Here\'s the paradox: {contradictory_insight}.',
        'What if everything we know about {topic} is wrong?'
      ]]
    ])
  }

  /**
   * Extract all voice patterns from processed LinkedIn post chunks
   */
  async extractVoicePatterns(): Promise<VoicePattern[]> {
    logger.info('Starting comprehensive voice pattern extraction from LinkedIn posts')

    try {
      // Get all LinkedIn post chunks with high authenticity scores
      const { data: chunks, error } = await supabaseService.client
        .from('linkedin_post_chunks')
        .select(`
          id,
          chunk_text,
          chunk_type,
          authenticity_score,
          pattern_types,
          voice_markers,
          primary_topic,
          topic_categories,
          original_post_date,
          post_performance,
          engagement_indicators
        `)
        .gte('authenticity_score', 60) // Focus on high-authenticity content
        .not('chunk_text', 'is', null)
        .order('authenticity_score', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch LinkedIn chunks: ${error.message}`)
      }

      if (!chunks || chunks.length === 0) {
        logger.warn('No LinkedIn post chunks found for pattern extraction')
        return []
      }

      logger.info({ chunksFound: chunks.length }, 'Analyzing LinkedIn chunks for voice patterns')

      const extractedPatterns: VoicePattern[] = []

      // Group chunks by pattern types for better analysis
      const patternGroups = this.groupChunksByPatterns(chunks)

      // Extract patterns from each group
      for (const [patternType, patternChunks] of Object.entries(patternGroups)) {
        const patterns = await this.extractPatternsFromGroup(patternType, patternChunks)
        extractedPatterns.push(...patterns)
      }

      // Store patterns in database
      await this.storePatternsInDatabase(extractedPatterns)

      logger.info({
        totalPatterns: extractedPatterns.length,
        avgEffectiveness: extractedPatterns.reduce((sum, p) => sum + p.effectiveness_score, 0) / extractedPatterns.length
      }, 'Voice pattern extraction completed')

      return extractedPatterns

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to extract voice patterns')
      throw error
    }
  }

  /**
   * Extract opening patterns specifically for content generation
   */
  async extractOpeningPatterns(): Promise<Map<string, OpeningPattern>> {
    logger.info('Extracting opening patterns from LinkedIn posts')

    try {
      // Get opening chunks specifically
      const { data: openingChunks, error } = await supabaseService.client
        .from('linkedin_post_chunks')
        .select(`
          chunk_text,
          authenticity_score,
          pattern_types,
          voice_markers,
          topic_categories,
          post_performance,
          engagement_indicators
        `)
        .eq('chunk_type', 'opening')
        .gte('authenticity_score', 70)
        .order('authenticity_score', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch opening chunks: ${error.message}`)
      }

      const openingPatterns = new Map<string, OpeningPattern>()

      // Initialize opening pattern categories
      const categories: Array<'confrontational' | 'question' | 'story' | 'observation' | 'contrarian'> = [
        'confrontational', 'question', 'story', 'observation', 'contrarian'
      ]

      for (const category of categories) {
        const categoryChunks = this.filterChunksByOpeningCategory(openingChunks || [], category)
        
        if (categoryChunks.length > 0) {
          const pattern = await this.buildOpeningPattern(category, categoryChunks)
          openingPatterns.set(category, pattern)
        }
      }

      logger.info({
        categoriesExtracted: openingPatterns.size,
        totalOpeningChunks: openingChunks?.length || 0
      }, 'Opening pattern extraction completed')

      return openingPatterns

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to extract opening patterns')
      throw error
    }
  }

  /**
   * Create voice templates from extracted patterns
   */
  async createVoiceTemplates(): Promise<{
    openingTemplates: Record<string, string[]>
    bodyTemplates: string[]
    conclusionTemplates: string[]
    ctaTemplates: string[]
    storyTemplates: string[]
  }> {
    logger.info('Creating voice templates from LinkedIn post patterns')

    try {
      // Get pattern distribution across different chunk types
      const { data: patternData, error } = await supabaseService.client
        .from('linkedin_post_chunks_analytics')
        .select('*')

      if (error) {
        logger.warn({ error }, 'Failed to get pattern analytics, using defaults')
      }

      // Extract opening templates
      const openingPatterns = await this.extractOpeningPatterns()
      const openingTemplates: Record<string, string[]> = {}
      
      for (const [category, pattern] of openingPatterns.entries()) {
        openingTemplates[category] = pattern.templates
      }

      // Create other template categories
      const bodyTemplates = await this.extractBodyTemplates()
      const conclusionTemplates = await this.extractConclusionTemplates()
      const ctaTemplates = await this.extractCTATemplates()
      const storyTemplates = await this.extractStoryTemplates()

      const templates = {
        openingTemplates,
        bodyTemplates,
        conclusionTemplates,
        ctaTemplates,
        storyTemplates
      }

      logger.info({
        openingCategories: Object.keys(openingTemplates).length,
        bodyTemplates: bodyTemplates.length,
        conclusionTemplates: conclusionTemplates.length,
        ctaTemplates: ctaTemplates.length,
        storyTemplates: storyTemplates.length
      }, 'Voice templates created successfully')

      return templates

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to create voice templates')
      throw error
    }
  }

  /**
   * Analyze voice evolution over time
   */
  async analyzeVoiceEvolution(timeframeMonths: number = 12): Promise<VoiceEvolutionInsight[]> {
    logger.info({ timeframeMonths }, 'Analyzing Andrew\'s voice evolution over time')

    try {
      const { data: evolutionData, error } = await supabaseService.client
        .rpc('analyze_voice_evolution', {
          timeframe_months: timeframeMonths,
          min_authenticity_score: 60
        })

      if (error) {
        throw new Error(`Failed to analyze voice evolution: ${error.message}`)
      }

      // Process and structure the evolution insights
      const insights: VoiceEvolutionInsight[] = evolutionData?.map((data: any) => ({
        timeframe: data.timeframe,
        dominant_patterns: data.dominant_patterns || [],
        authenticity_trend: data.avg_authenticity || 0,
        topic_focus_shift: data.topic_evolution || [],
        language_evolution: data.language_changes || [],
        engagement_correlation: data.engagement_patterns || {}
      })) || []

      logger.info({
        timeframes: insights.length,
        avgAuthenticityTrend: insights.length > 0 
          ? insights.reduce((sum, i) => sum + i.authenticity_trend, 0) / insights.length 
          : 0
      }, 'Voice evolution analysis completed')

      return insights

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to analyze voice evolution')
      return []
    }
  }

  /**
   * Get voice pattern recommendations for specific content types
   */
  async getPatternRecommendations(
    contentType: 'linkedin_post' | 'article' | 'comment',
    topicKeywords: string[] = [],
    targetAudience: 'leaders' | 'coaches' | 'hr_professionals' | 'general' = 'general'
  ): Promise<{
    recommendedOpeningCategory: string
    suggestedPatterns: string[]
    templateRecommendations: string[]
    authenticityTips: string[]
    engagementOptimizations: string[]
  }> {
    logger.info({
      contentType,
      topicKeywords,
      targetAudience
    }, 'Getting voice pattern recommendations')

    try {
      // Get pattern effectiveness data
      const { data: effectivenessData, error } = await supabaseService.client
        .rpc('get_pattern_effectiveness_by_context', {
          content_type: contentType,
          topic_keywords: topicKeywords,
          target_audience: targetAudience
        })

      if (error) {
        logger.warn({ error }, 'Failed to get effectiveness data, using defaults')
      }

      // Analyze current patterns for the given context
      const recommendedOpeningCategory = this.determineOptimalOpeningCategory(
        topicKeywords, 
        targetAudience, 
        effectivenessData
      )

      const suggestedPatterns = this.getSuggestedPatterns(
        topicKeywords, 
        recommendedOpeningCategory,
        effectivenessData
      )

      const templateRecommendations = this.getTemplateRecommendations(
        recommendedOpeningCategory,
        topicKeywords
      )

      const authenticityTips = this.getAuthenticityTips(
        topicKeywords,
        recommendedOpeningCategory
      )

      const engagementOptimizations = this.getEngagementOptimizations(
        contentType,
        targetAudience
      )

      return {
        recommendedOpeningCategory,
        suggestedPatterns,
        templateRecommendations,
        authenticityTips,
        engagementOptimizations
      }

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to get pattern recommendations')

      // Return fallback recommendations
      return {
        recommendedOpeningCategory: 'confrontational',
        suggestedPatterns: ['confrontational', 'authority', 'research_citation'],
        templateRecommendations: ['What if I told you {insight}?'],
        authenticityTips: ['Use personal experience', 'Be direct and honest'],
        engagementOptimizations: ['Ask a thought-provoking question']
      }
    }
  }

  // Private helper methods

  private groupChunksByPatterns(chunks: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {}

    chunks.forEach(chunk => {
      const patternTypes = chunk.pattern_types || []
      patternTypes.forEach((pattern: string) => {
        if (!groups[pattern]) {
          groups[pattern] = []
        }
        groups[pattern].push(chunk)
      })
    })

    return groups
  }

  private async extractPatternsFromGroup(patternType: string, chunks: any[]): Promise<VoicePattern[]> {
    const patterns: VoicePattern[] = []

    // Sort chunks by authenticity score
    const sortedChunks = chunks.sort((a, b) => b.authenticity_score - a.authenticity_score)

    // Take top examples for pattern creation
    const topChunks = sortedChunks.slice(0, Math.min(5, chunks.length))

    for (const chunk of topChunks) {
      const pattern = await this.createPatternFromChunk(patternType, chunk)
      if (pattern) {
        patterns.push(pattern)
      }
    }

    return patterns
  }

  private async createPatternFromChunk(patternType: string, chunk: any): Promise<VoicePattern | null> {
    try {
      const pattern: VoicePattern = {
        pattern_type: patternType,
        pattern_text: this.extractPatternText(chunk.chunk_text, patternType),
        full_context: chunk.chunk_text,
        usage_frequency: 1, // Will be updated based on occurrence
        effectiveness_score: this.calculateEffectivenessScore(chunk),
        authenticity_markers: chunk.voice_markers || [],
        topic_categories: chunk.topic_categories || [],
        sentiment_tone: this.determineSentimentTone(chunk.chunk_text, patternType),
        template_structure: this.createTemplateStructure(chunk.chunk_text, patternType),
        example_variations: this.generateVariations(chunk.chunk_text, patternType),
        context_triggers: this.identifyContextTriggers(chunk.chunk_text, patternType)
      }

      return pattern

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        patternType,
        chunkId: chunk.id
      }, 'Failed to create pattern from chunk')
      return null
    }
  }

  private extractPatternText(text: string, patternType: string): string {
    // Extract the key pattern phrase from the text
    const pattern = this.signaturePatterns.get(patternType)
    if (pattern) {
      const match = text.match(pattern)
      if (match) {
        return match[0]
      }
    }

    // Fallback: return first sentence
    const firstSentence = text.split(/[.!?]/)[0]
    return firstSentence + (firstSentence.endsWith('.') ? '' : '.')
  }

  private calculateEffectivenessScore(chunk: any): number {
    const engagement = chunk.engagement_indicators || {}
    const reactions = chunk.post_performance?.total_reactions || 0
    const comments = chunk.post_performance?.comments_count || 0
    
    // Calculate effectiveness based on engagement and authenticity
    let score = chunk.authenticity_score / 100 * 0.6 // Base on authenticity
    
    if (reactions > 10) score += 0.2
    if (comments > 3) score += 0.2
    
    return Math.min(1.0, score)
  }

  private determineSentimentTone(text: string, patternType: string): 'challenging' | 'supportive' | 'questioning' | 'authoritative' | 'vulnerable' {
    if (patternType.includes('confrontational') || patternType.includes('challenge')) {
      return 'challenging'
    }
    if (patternType.includes('question') || patternType.includes('philosophical')) {
      return 'questioning'
    }
    if (patternType.includes('vulnerability') || patternType.includes('story')) {
      return 'vulnerable'
    }
    if (patternType.includes('authority') || patternType.includes('research')) {
      return 'authoritative'
    }
    return 'supportive'
  }

  private createTemplateStructure(text: string, patternType: string): string {
    // Create a template structure from the text
    const structure = text.replace(/[A-Z][a-z]+/g, '{specific_term}')
      .replace(/\d+/g, '{number}')
      .replace(/"[^"]+"/g, '{quote}')
    
    return structure
  }

  private generateVariations(text: string, patternType: string): string[] {
    const variations: string[] = []
    
    // Generate template-based variations
    const templates = this.openingPatternTemplates.get(patternType) || []
    variations.push(...templates.slice(0, 3))
    
    // Add original text as a variation
    variations.push(text)
    
    return variations.slice(0, 5) // Limit to 5 variations
  }

  private identifyContextTriggers(text: string, patternType: string): string[] {
    const triggers: string[] = []
    
    // Identify when this pattern would be most appropriate
    if (text.toLowerCase().includes('leadership')) triggers.push('leadership_content')
    if (text.toLowerCase().includes('culture')) triggers.push('culture_content')
    if (text.toLowerCase().includes('performance')) triggers.push('performance_content')
    if (text.toLowerCase().includes('accountability')) triggers.push('accountability_content')
    
    return triggers
  }

  private filterChunksByOpeningCategory(chunks: any[], category: string): any[] {
    return chunks.filter(chunk => {
      const patterns = chunk.pattern_types || []
      
      switch (category) {
        case 'confrontational':
          return patterns.some((p: string) => p.includes('confrontational') || p.includes('challenge'))
        case 'question':
          return patterns.some((p: string) => p.includes('question') || p.includes('philosophical'))
        case 'story':
          return patterns.some((p: string) => p.includes('storytelling') || p.includes('personal'))
        case 'observation':
          return patterns.some((p: string) => p.includes('insight') || p.includes('research'))
        case 'contrarian':
          return patterns.some((p: string) => p.includes('contrarian') || p.includes('reframe'))
        default:
          return false
      }
    })
  }

  private async buildOpeningPattern(category: string, chunks: any[]): Promise<OpeningPattern> {
    const templates = this.openingPatternTemplates.get(category) || []
    const examples = chunks.slice(0, 5).map(chunk => chunk.chunk_text)
    
    const avgEffectiveness = chunks.reduce((sum, chunk) => 
      sum + this.calculateEffectivenessScore(chunk), 0
    ) / chunks.length

    const authenticityMarkers = [
      ...new Set(chunks.flatMap(chunk => chunk.voice_markers || []))
    ]

    return {
      type: category as any,
      templates,
      examples,
      contextualUsage: this.getContextualUsage(category),
      effectivenessScore: avgEffectiveness,
      authenticityMarkers
    }
  }

  private getContextualUsage(category: string): string[] {
    const usageMap: Record<string, string[]> = {
      confrontational: ['challenging assumptions', 'provocative topics', 'urgent issues'],
      question: ['exploration topics', 'thought leadership', 'engagement-focused'],
      story: ['personal branding', 'relatability', 'emotional connection'],
      observation: ['data-driven content', 'insights sharing', 'educational'],
      contrarian: ['industry disruption', 'unconventional wisdom', 'differentiation']
    }

    return usageMap[category] || []
  }

  private async extractBodyTemplates(): Promise<string[]> {
    // Extract common body patterns from LinkedIn chunks
    return [
      '{insight}. Here\'s why this matters: {explanation}.',
      'In my experience, {observation}. This leads to {consequence}.',
      'Research shows {data_point}. But here\'s what they don\'t tell you: {insight}.',
      'I\'ve seen this pattern repeatedly: {pattern}. The result? {outcome}.'
    ]
  }

  private async extractConclusionTemplates(): Promise<string[]> {
    return [
      'The bottom line: {key_takeaway}.',
      'Here\'s what this means for you: {practical_implication}.',
      'Remember this: {memorable_insight}.',
      'Take action: {specific_step}.'
    ]
  }

  private async extractCTATemplates(): Promise<string[]> {
    return [
      'What\'s your experience with {topic}?',
      'Share your thoughts on {subject}.',
      'Tell me: {engaging_question}',
      'What would you add to this list?'
    ]
  }

  private async extractStoryTemplates(): Promise<string[]> {
    return [
      'Let me tell you about {story_subject}. {story_development}. {story_conclusion}.',
      'Recently, {event}. It reminded me that {insight}.',
      'I remember when {past_experience}. It taught me {lesson}.',
      'One of my clients {client_situation}. The outcome was {result}.'
    ]
  }

  private async storePatternsInDatabase(patterns: VoicePattern[]): Promise<void> {
    if (patterns.length === 0) return

    try {
      // Remove old patterns to avoid duplicates
      await supabaseService.client
        .from('voice_patterns')
        .delete()
        .eq('source_type', 'linkedin_posts')

      // Insert new patterns
      const insertData = patterns.map(pattern => ({
        ...pattern,
        source_type: 'linkedin_posts',
        created_at: new Date().toISOString()
      }))

      const { error } = await supabaseService.client
        .from('voice_patterns')
        .insert(insertData)

      if (error) {
        throw error
      }

      logger.info({ patternsStored: patterns.length }, 'Voice patterns stored in database')

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to store patterns in database')
      throw error
    }
  }

  // Helper methods for recommendations

  private determineOptimalOpeningCategory(
    topicKeywords: string[],
    targetAudience: string,
    effectivenessData: any[]
  ): string {
    // Logic to determine the best opening category based on context
    if (topicKeywords.some(k => k.toLowerCase().includes('accountability'))) {
      return 'confrontational'
    }
    if (topicKeywords.some(k => k.toLowerCase().includes('leadership'))) {
      return 'question'
    }
    if (topicKeywords.some(k => k.toLowerCase().includes('culture'))) {
      return 'story'
    }
    
    return 'confrontational' // Default to Andrew's signature style
  }

  private getSuggestedPatterns(
    topicKeywords: string[],
    openingCategory: string,
    effectivenessData: any[]
  ): string[] {
    const basePatterns = [openingCategory, 'authority', 'research_citation']
    
    // Add topic-specific patterns
    if (topicKeywords.includes('leadership')) basePatterns.push('teaching')
    if (topicKeywords.includes('culture')) basePatterns.push('storytelling')
    if (topicKeywords.includes('performance')) basePatterns.push('data_presentation')
    
    return [...new Set(basePatterns)]
  }

  private getTemplateRecommendations(
    openingCategory: string,
    topicKeywords: string[]
  ): string[] {
    const templates = this.openingPatternTemplates.get(openingCategory) || []
    return templates.slice(0, 3) // Return top 3 templates
  }

  private getAuthenticityTips(
    topicKeywords: string[],
    openingCategory: string
  ): string[] {
    const tips = [
      'Use personal experience and specific examples',
      'Be direct and conversational in tone',
      'Reference concrete data or research when possible'
    ]

    if (openingCategory === 'confrontational') {
      tips.push('Challenge assumptions respectfully but firmly')
    }
    if (openingCategory === 'story') {
      tips.push('Share vulnerable moments that create connection')
    }

    return tips
  }

  private getEngagementOptimizations(
    contentType: string,
    targetAudience: string
  ): string[] {
    return [
      'End with a thought-provoking question',
      'Use concrete examples and specific numbers',
      'Create urgency or importance around the topic',
      'Make it relevant to current industry challenges'
    ]
  }
}

export const andrewVoicePatternExtractor = new AndrewVoicePatternExtractor()
export default andrewVoicePatternExtractor