import logger from '../lib/logger'
// import { openingPatternCategorizer, OpeningPatternCategory } from './opening-pattern-categorizer' // ARCHIVED - old RAG system
type OpeningPatternCategory = 'confrontational' | 'question' | 'story' | 'observation' | 'contrarian'

export interface VariantOpeningStrategy {
  variantNumber: 1 | 2 | 3
  variantName: string
  primaryCategory: 'confrontational' | 'question' | 'story' | 'observation' | 'contrarian'
  secondaryCategories: ('confrontational' | 'question' | 'story' | 'observation' | 'contrarian')[]
  description: string
  targetAudience: string
}

export interface VariantRoutingResult {
  variant: VariantOpeningStrategy
  selectedPatterns: OpeningPatternCategory[]
  patternSelectionReason: string
  fallbackUsed: boolean
}

/**
 * Strategic Variant Router - Routes content variants to different opening pattern categories
 * Solves the "Stop killing" repetition by ensuring each variant gets different patterns
 */
export class StrategicVariantRouter {
  private readonly VARIANT_STRATEGIES: Record<number, VariantOpeningStrategy> = {
    1: {
      variantNumber: 1,
      variantName: 'Performance-Focused',
      primaryCategory: 'confrontational',
      secondaryCategories: ['observation'],
      description: 'Direct, challenging content that confronts performance barriers',
      targetAudience: 'High-performing leaders who need direct feedback'
    },
    2: {
      variantNumber: 2,
      variantName: 'Engagement-Driven',
      primaryCategory: 'question',
      secondaryCategories: ['story'],
      description: 'Engaging, curiosity-driven content with personal narratives',
      targetAudience: 'Leaders seeking inspiration and connection'
    },
    3: {
      variantNumber: 3,
      variantName: 'Experimental-Insight',
      primaryCategory: 'observation',
      secondaryCategories: ['contrarian'],
      description: 'Thoughtful observations with contrarian perspectives',
      targetAudience: 'Strategic thinkers who value unconventional insights'
    }
  }

  /**
   * Route variant to appropriate opening patterns
   */
  async routeVariantToPatterns(
    variantNumber: 1 | 2 | 3,
    topicKeywords: string[] = [],
    maxPatterns: number = 3
  ): Promise<VariantRoutingResult> {
    const startTime = Date.now()
    
    logger.info({
      variantNumber,
      topicKeywords,
      maxPatterns
    }, 'Starting variant routing to opening patterns')

    try {
      const strategy = this.VARIANT_STRATEGIES[variantNumber]
      
      if (!strategy) {
        throw new Error(`Invalid variant number: ${variantNumber}`)
      }

      // Step 1: Get patterns for primary category
      const primaryPatterns = await openingPatternCategorizer.getPatternsByCategory(
        strategy.primaryCategory,
        topicKeywords,
        Math.ceil(maxPatterns * 0.7) // 70% from primary category
      )

      // Step 2: Get patterns from secondary categories to fill remaining slots
      const remainingSlots = maxPatterns - primaryPatterns.length
      const secondaryPatterns: OpeningPatternCategory[] = []

      if (remainingSlots > 0) {
        for (const secondaryCategory of strategy.secondaryCategories) {
          const patterns = await openingPatternCategorizer.getPatternsByCategory(
            secondaryCategory,
            topicKeywords,
            remainingSlots
          )
          secondaryPatterns.push(...patterns.slice(0, remainingSlots - secondaryPatterns.length))
          
          if (secondaryPatterns.length >= remainingSlots) break
        }
      }

      // Step 3: Combine and optimize pattern selection
      const allSelectedPatterns = [...primaryPatterns, ...secondaryPatterns].slice(0, maxPatterns)

      // Step 4: Determine if fallback was used
      const fallbackUsed = allSelectedPatterns.length === 0 || 
        allSelectedPatterns.some(p => p.source_episode === undefined)

      // Step 5: Generate selection reason
      const patternSelectionReason = this.generateSelectionReason(
        strategy,
        allSelectedPatterns,
        topicKeywords,
        fallbackUsed
      )

      const result: VariantRoutingResult = {
        variant: strategy,
        selectedPatterns: allSelectedPatterns,
        patternSelectionReason,
        fallbackUsed
      }

      const processingTime = Date.now() - startTime
      logger.info({
        variantNumber,
        variantName: strategy.variantName,
        selectedPatterns: allSelectedPatterns.length,
        primaryCategory: strategy.primaryCategory,
        secondaryCategories: strategy.secondaryCategories,
        fallbackUsed,
        processingTime
      }, 'Variant routing completed successfully')

      return result

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        variantNumber,
        topicKeywords
      }, 'Failed to route variant to patterns')

      // Return fallback routing
      return this.getFallbackRouting(variantNumber, topicKeywords)
    }
  }

  /**
   * Route all three variants simultaneously to ensure no pattern overlap
   */
  async routeAllVariants(
    topicKeywords: string[] = [],
    patternsPerVariant: number = 3
  ): Promise<Record<number, VariantRoutingResult>> {
    const startTime = Date.now()
    
    logger.info({
      topicKeywords,
      patternsPerVariant
    }, 'Starting routing for all variants with overlap prevention')

    try {
      // Get comprehensive pattern set from all categories
      const allPatterns = await openingPatternCategorizer.extractAndCategorizePatterns(
        topicKeywords,
        patternsPerVariant * 5 // Get plenty of patterns to avoid overlap
      )

      // Distribute patterns to variants based on their strategies
      const variantResults: Record<number, VariantRoutingResult> = {}

      for (const variantNumber of [1, 2, 3] as const) {
        const strategy = this.VARIANT_STRATEGIES[variantNumber]
        
        // Filter available patterns (excluding already assigned ones)
        const alreadyAssigned = Object.values(variantResults)
          .flatMap(result => result.selectedPatterns.map(p => p.pattern))
        
        const availablePatterns = allPatterns.patterns.filter(
          pattern => !alreadyAssigned.includes(pattern.pattern)
        )

        // Select patterns for this variant
        const selectedPatterns = this.selectPatternsForStrategy(
          strategy,
          availablePatterns,
          patternsPerVariant
        )

        variantResults[variantNumber] = {
          variant: strategy,
          selectedPatterns,
          patternSelectionReason: this.generateSelectionReason(
            strategy,
            selectedPatterns,
            topicKeywords,
            selectedPatterns.length === 0
          ),
          fallbackUsed: selectedPatterns.length === 0 || 
            selectedPatterns.some(p => p.source_episode === undefined)
        }
      }

      const processingTime = Date.now() - startTime
      logger.info({
        variant1Patterns: variantResults[1].selectedPatterns.length,
        variant2Patterns: variantResults[2].selectedPatterns.length,
        variant3Patterns: variantResults[3].selectedPatterns.length,
        totalUniquePatterns: Object.values(variantResults)
          .flatMap(r => r.selectedPatterns).length,
        processingTime
      }, 'All variants routed successfully with no overlap')

      return variantResults

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        topicKeywords
      }, 'Failed to route all variants')

      // Return fallback for all variants
      return {
        1: this.getFallbackRouting(1, topicKeywords),
        2: this.getFallbackRouting(2, topicKeywords),
        3: this.getFallbackRouting(3, topicKeywords)
      }
    }
  }

  /**
   * Select patterns for a specific strategy from available patterns
   */
  private selectPatternsForStrategy(
    strategy: VariantOpeningStrategy,
    availablePatterns: OpeningPatternCategory[],
    maxPatterns: number
  ): OpeningPatternCategory[] {
    const selectedPatterns: OpeningPatternCategory[] = []

    // Step 1: Get primary category patterns
    const primaryPatterns = availablePatterns
      .filter(p => p.category === strategy.primaryCategory)
      .sort((a, b) => b.authenticity_score - a.authenticity_score)
      .slice(0, Math.ceil(maxPatterns * 0.7))

    selectedPatterns.push(...primaryPatterns)

    // Step 2: Fill remaining slots with secondary category patterns
    const remainingSlots = maxPatterns - selectedPatterns.length
    if (remainingSlots > 0) {
      for (const secondaryCategory of strategy.secondaryCategories) {
        const secondaryPatterns = availablePatterns
          .filter(p => p.category === secondaryCategory)
          .filter(p => !selectedPatterns.some(sp => sp.pattern === p.pattern))
          .sort((a, b) => b.authenticity_score - a.authenticity_score)
          .slice(0, remainingSlots - (selectedPatterns.length - primaryPatterns.length))

        selectedPatterns.push(...secondaryPatterns)

        if (selectedPatterns.length >= maxPatterns) break
      }
    }

    return selectedPatterns.slice(0, maxPatterns)
  }

  /**
   * Generate selection reason for transparency
   */
  private generateSelectionReason(
    strategy: VariantOpeningStrategy,
    selectedPatterns: OpeningPatternCategory[],
    topicKeywords: string[],
    fallbackUsed: boolean
  ): string {
    if (fallbackUsed) {
      return `Fallback patterns used for ${strategy.variantName} variant due to insufficient RAG data`
    }

    const categoryBreakdown = selectedPatterns.reduce((acc, pattern) => {
      acc[pattern.category] = (acc[pattern.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topicContext = topicKeywords.length > 0 
      ? ` for topic "${topicKeywords.join(', ')}"`
      : ''

    const categoryString = Object.entries(categoryBreakdown)
      .map(([category, count]) => `${count} ${category}`)
      .join(', ')

    return `Selected ${selectedPatterns.length} patterns (${categoryString}) for ${strategy.variantName} variant${topicContext} based on authenticity scores`
  }

  /**
   * Get fallback routing when RAG fails
   */
  private getFallbackRouting(
    variantNumber: 1 | 2 | 3,
    topicKeywords: string[]
  ): VariantRoutingResult {
    const strategy = this.VARIANT_STRATEGIES[variantNumber]
    
    const fallbackPatterns: Record<number, OpeningPatternCategory[]> = {
      1: [
        {
          category: 'confrontational',
          pattern: 'This leadership mistake is killing your team\'s potential',
          context: 'Fallback confrontational pattern for Performance variant',
          authenticity_score: 85,
          usage_frequency: 1
        }
      ],
      2: [
        {
          category: 'question',
          pattern: 'What if the key to better leadership isn\'t what you think?',
          context: 'Fallback question pattern for Engagement variant',
          authenticity_score: 80,
          usage_frequency: 1
        }
      ],
      3: [
        {
          category: 'observation',
          pattern: 'The best leaders I work with do something most others avoid',
          context: 'Fallback observation pattern for Experimental variant',
          authenticity_score: 88,
          usage_frequency: 1
        }
      ]
    }

    return {
      variant: strategy,
      selectedPatterns: fallbackPatterns[variantNumber] || [],
      patternSelectionReason: `Fallback patterns used for ${strategy.variantName} - RAG system unavailable`,
      fallbackUsed: true
    }
  }

  /**
   * Validate variant routing doesn't have overlapping patterns
   */
  async validateVariantUniqueness(
    variantResults: Record<number, VariantRoutingResult>
  ): Promise<{
    isUnique: boolean
    duplicatePatterns: string[]
    uniquenessScore: number
  }> {
    const allPatterns = Object.values(variantResults)
      .flatMap(result => result.selectedPatterns.map(p => p.pattern))

    const patternCounts = new Map<string, number>()
    allPatterns.forEach(pattern => {
      patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1)
    })

    const duplicatePatterns = Array.from(patternCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([pattern]) => pattern)

    const uniquenessScore = (allPatterns.length - duplicatePatterns.length) / allPatterns.length

    return {
      isUnique: duplicatePatterns.length === 0,
      duplicatePatterns,
      uniquenessScore: Math.round(uniquenessScore * 100) / 100
    }
  }

  /**
   * Get variant strategy information
   */
  getVariantStrategy(variantNumber: 1 | 2 | 3): VariantOpeningStrategy | null {
    return this.VARIANT_STRATEGIES[variantNumber] || null
  }

  /**
   * Get all variant strategies
   */
  getAllVariantStrategies(): Record<number, VariantOpeningStrategy> {
    return { ...this.VARIANT_STRATEGIES }
  }

  /**
   * Get routing statistics for monitoring
   */
  async getRoutingStatistics(topicKeywords: string[] = []): Promise<{
    totalVariants: number
    strategiesUsed: string[]
    categoryDistribution: Record<string, number>
    averageUniquenessScore: number
    recommendedVariant: number
  }> {
    try {
      const allVariantResults = await this.routeAllVariants(topicKeywords, 3)
      const uniquenessValidation = await this.validateVariantUniqueness(allVariantResults)

      const strategiesUsed = Object.values(allVariantResults)
        .map(result => result.variant.variantName)

      const categoryDistribution = Object.values(allVariantResults)
        .flatMap(result => result.selectedPatterns)
        .reduce((acc, pattern) => {
          acc[pattern.category] = (acc[pattern.category] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      // Recommend variant based on pattern availability and authenticity
      const variantScores = Object.entries(allVariantResults).map(([num, result]) => ({
        variant: parseInt(num),
        score: result.selectedPatterns.reduce((sum, p) => sum + p.authenticity_score, 0) / result.selectedPatterns.length || 0
      }))

      const recommendedVariant = variantScores
        .sort((a, b) => b.score - a.score)[0]?.variant || 1

      return {
        totalVariants: Object.keys(allVariantResults).length,
        strategiesUsed,
        categoryDistribution,
        averageUniquenessScore: uniquenessValidation.uniquenessScore,
        recommendedVariant
      }

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to get routing statistics')

      return {
        totalVariants: 3,
        strategiesUsed: ['Performance-Focused', 'Engagement-Driven', 'Experimental-Insight'],
        categoryDistribution: {},
        averageUniquenessScore: 0,
        recommendedVariant: 1
      }
    }
  }
}

export const strategicVariantRouter = new StrategicVariantRouter()