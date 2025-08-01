import { OpenAI } from 'openai'
import { appConfig } from '../config'
import logger from '../lib/logger'
import { vectorSimilarityService, type PerformanceInsight, type SimilarPost } from './vector-similarity'

// Lightweight interfaces for RAG-based historical analysis
export interface RAGHistoricalInsight {
  topic: string
  similar_posts: SimilarPost[]
  performance_context: {
    avg_engagement: number
    top_performing_score: number
    prediction_confidence: number
  }
  patterns: {
    avg_word_count: number
    common_openings: string[]
    success_factors: string[]
    engagement_triggers: string[]
  }
  voice_analysis: {
    tone: string
    vulnerability_score: number
    authority_signals: string[]
    emotional_words: string[]
    action_words: string[]
  }
  structure_recommendations: Array<{
    structure: string
    openingType: string
    wordCount: number
    confidence: number
  }>
  performance_factors: {
    high_engagement_triggers: string[]
    optimal_timing: string[]
    content_length_optimal: number
    format_recommendations: string[]
  }
}

export class RAGHistoricalAnalysisService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: appConfig.openai.apiKey
    })
  }

  /**
   * Generate historical insights using RAG approach
   * This replaces the old method that loaded 858KB of context
   */
  async generateHistoricalInsights(topic: string): Promise<RAGHistoricalInsight> {
    try {
      logger.info({ topic }, 'Generating RAG-based historical insights')

      // Get performance insights from vector similarity service
      const performanceInsight = await vectorSimilarityService.generatePerformanceInsights(topic)

      if (performanceInsight.similar_posts.length === 0) {
        logger.warn({ topic }, 'No similar posts found, returning baseline insights')
        return this.createBaselineInsight(topic)
      }

      // Analyze patterns from similar posts
      const patterns = await this.analyzeContentPatterns(performanceInsight.similar_posts)
      const voiceAnalysis = this.analyzeVoicePatterns(performanceInsight.similar_posts)
      const structureRecommendations = this.generateStructureRecommendations(performanceInsight.similar_posts)

      const insight: RAGHistoricalInsight = {
        topic,
        similar_posts: performanceInsight.similar_posts,
        performance_context: {
          avg_engagement: performanceInsight.performance_summary.avg_engagement,
          top_performing_score: performanceInsight.performance_summary.top_engagement,
          prediction_confidence: performanceInsight.predicted_performance.confidence_score
        },
        patterns: {
          avg_word_count: patterns.avg_word_count,
          common_openings: patterns.common_openings,
          success_factors: performanceInsight.performance_summary.success_patterns,
          engagement_triggers: performanceInsight.performance_summary.common_elements
        },
        voice_analysis: voiceAnalysis,
        structure_recommendations: structureRecommendations,
        performance_factors: {
          high_engagement_triggers: performanceInsight.performance_summary.common_elements,
          optimal_timing: ['Based on successful similar posts'],
          content_length_optimal: patterns.avg_word_count,
          format_recommendations: performanceInsight.optimization_suggestions
        }
      }

      logger.info({ 
        topic,
        similar_posts_analyzed: performanceInsight.similar_posts.length,
        avg_engagement: insight.performance_context.avg_engagement,
        confidence: insight.performance_context.prediction_confidence
      }, 'Generated RAG-based historical insights')

      return insight
    } catch (error) {
      logger.error({ topic, error: error instanceof Error ? error.message : String(error) }, 'Failed to generate RAG historical insights')
      throw error
    }
  }

  /**
   * Analyze content patterns from similar high-performing posts
   */
  private async analyzeContentPatterns(posts: SimilarPost[]) {
    try {
      const word_counts = posts.map(p => p.content.split(' ').length)
      const avg_word_count = Math.round(word_counts.reduce((a, b) => a + b, 0) / word_counts.length)

      // Extract common opening patterns
      const openings = posts.map(p => {
        const sentences = p.content.split('.').filter(s => s.trim().length > 10)
        return sentences[0]?.trim().slice(0, 50) || ''
      }).filter(o => o.length > 0)

      // Find common opening patterns using AI analysis
      const common_openings = await this.extractCommonPatterns(openings, 'opening patterns')

      return {
        avg_word_count,
        common_openings: common_openings.slice(0, 5) // Top 5 patterns
      }
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to analyze content patterns')
      return {
        avg_word_count: 150, // Default
        common_openings: ['Provocative questions', 'Bold statements', 'Personal insights']
      }
    }
  }

  /**
   * Analyze voice patterns from high-performing posts
   */
  private analyzeVoicePatterns(posts: SimilarPost[]) {
    // Analyze tone from content
    const vulnerability_indicators = ['admit', 'struggle', 'challenge', 'difficult', 'failed', 'learned']
    const authority_indicators = ['coached', 'helped', 'experience', 'years', 'clients', 'taught']
    const emotional_words = ['frustrated', 'excited', 'disappointed', 'proud', 'concerned', 'hopeful']
    const action_words = ['build', 'create', 'develop', 'transform', 'change', 'improve']

    let vulnerability_score = 0
    const found_authority_signals: string[] = []
    const found_emotional_words: string[] = []
    const found_action_words: string[] = []

    posts.forEach(post => {
      const content_lower = post.content.toLowerCase()
      
      // Count vulnerability indicators
      vulnerability_indicators.forEach(word => {
        if (content_lower.includes(word)) vulnerability_score += 10
      })

      // Find authority signals
      authority_indicators.forEach(word => {
        if (content_lower.includes(word) && !found_authority_signals.includes(word)) {
          found_authority_signals.push(word)
        }
      })

      // Find emotional words
      emotional_words.forEach(word => {
        if (content_lower.includes(word) && !found_emotional_words.includes(word)) {
          found_emotional_words.push(word)
        }
      })

      // Find action words
      action_words.forEach(word => {
        if (content_lower.includes(word) && !found_action_words.includes(word)) {
          found_action_words.push(word)
        }
      })
    })

    return {
      tone: vulnerability_score > 30 ? 'conversational' : 'professional',
      vulnerability_score: Math.min(100, vulnerability_score),
      authority_signals: found_authority_signals.slice(0, 5),
      emotional_words: found_emotional_words.slice(0, 5),
      action_words: found_action_words.slice(0, 5)
    }
  }

  /**
   * Generate structure recommendations based on successful posts
   */
  private generateStructureRecommendations(posts: SimilarPost[]) {
    const recommendations = []

    // Analyze post structures
    posts.forEach(post => {
      const has_question = post.content.includes('?')
      const has_story = post.content.toLowerCase().includes('story') || post.content.toLowerCase().includes('client')
      const word_count = post.content.split(' ').length

      if (has_question && post.engagement_score > 80) {
        recommendations.push({
          structure: 'question_based',
          openingType: 'provocative question',
          wordCount: word_count,
          confidence: 85
        })
      }

      if (has_story && post.engagement_score > 70) {
        recommendations.push({
          structure: 'story_lesson',
          openingType: 'personal story',
          wordCount: word_count,
          confidence: 80
        })
      }
    })

    // Add default recommendations if none found
    if (recommendations.length === 0) {
      recommendations.push(
        {
          structure: 'problem_solution',
          openingType: 'bold statement',
          wordCount: 150,
          confidence: 70
        },
        {
          structure: 'question_answer',
          openingType: 'thought-provoking question',
          wordCount: 180,
          confidence: 75
        }
      )
    }

    return recommendations.slice(0, 3) // Top 3 recommendations
  }

  /**
   * Extract common patterns using AI analysis
   */
  private async extractCommonPatterns(examples: string[], pattern_type: string): Promise<string[]> {
    try {
      if (examples.length === 0) return []

      const prompt = `Analyze these ${pattern_type} from high-performing LinkedIn posts and identify the top 3 most common patterns:

Examples:
${examples.slice(0, 10).map((ex, i) => `${i + 1}. ${ex}`).join('\n')}

Return only the top 3 most common patterns as a simple list, one per line.`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.3
      })

      const patterns = response.choices[0]?.message?.content
        ?.split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .slice(0, 3) || []

      return patterns
    } catch (error) {
      logger.warn({ error: error instanceof Error ? error.message : String(error) }, 'Failed to extract patterns with AI, using defaults')
      return ['Provocative questions', 'Personal insights', 'Bold statements']
    }
  }

  /**
   * Create baseline insight when no similar posts are found
   */
  private createBaselineInsight(topic: string): RAGHistoricalInsight {
    return {
      topic,
      similar_posts: [],
      performance_context: {
        avg_engagement: 50,
        top_performing_score: 0,
        prediction_confidence: 30
      },
      patterns: {
        avg_word_count: 150,
        common_openings: ['What if...', 'Most CEOs won\'t admit this:', 'Here\'s the truth about...'],
        success_factors: ['Authentic voice', 'Clear value proposition', 'Engaging opening'],
        engagement_triggers: ['Questions', 'Personal stories', 'Vulnerability']
      },
      voice_analysis: {
        tone: 'conversational',
        vulnerability_score: 60,
        authority_signals: ['experience', 'coached', 'helped'],
        emotional_words: ['challenge', 'growth', 'success'],
        action_words: ['build', 'develop', 'create']
      },
      structure_recommendations: [
        {
          structure: 'question_based',
          openingType: 'provocative question',
          wordCount: 150,
          confidence: 70
        },
        {
          structure: 'story_lesson',
          openingType: 'personal insight',
          wordCount: 180,
          confidence: 65
        }
      ],
      performance_factors: {
        high_engagement_triggers: ['Questions', 'Stories', 'Data points'],
        optimal_timing: ['Based on general best practices'],
        content_length_optimal: 150,
        format_recommendations: [
          'Include thought-provoking questions',
          'Share personal insights or experiences',
          'Use clear, conversational language',
          'End with a call to action'
        ]
      }
    }
  }
}

export const ragHistoricalAnalysisService = new RAGHistoricalAnalysisService()