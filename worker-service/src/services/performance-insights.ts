import { OpenAI } from 'openai'
import logger from '../lib/logger'
import { HistoricalPost, HistoricalInsight, PerformanceMetrics } from './historical-analysis'

export interface ContentStructureAnalysis {
  wordCount: number
  sentenceCount: number
  paragraphCount: number
  hasQuestions: boolean
  hasEmojis: boolean
  hasHashtags: boolean
  hasCallToAction: boolean
  openingType: 'question' | 'statement' | 'story' | 'statistic' | 'quote'
  structure: 'single_thought' | 'problem_solution' | 'story_lesson' | 'list_format' | 'question_answer'
}

export interface VoiceAnalysis {
  tone: 'professional' | 'casual' | 'inspirational' | 'educational' | 'conversational'
  personalStoryElements: boolean
  vulnerabilityScore: number // 0-100
  authoritySignals: string[]
  emotionalWords: string[]
  actionWords: string[]
}

export interface PerformancePrediction {
  predictedEngagement: number
  confidenceScore: number
  strengthFactors: string[]
  improvementSuggestions: string[]
  similarPostPerformance: {
    avgEngagement: number
    topPerformance: number
    similarityScore: number
  }
}

export interface EnhancedInsight extends HistoricalInsight {
  voiceAnalysis: VoiceAnalysis
  structureRecommendations: ContentStructureAnalysis[]
  performanceFactors: {
    highEngagementTriggers: string[]
    optimalTiming: string[]
    contentLengthOptimal: number
    formatRecommendations: string[]
  }
}

export class PerformanceInsightsService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  /**
   * Generate enhanced performance insights with deep analysis
   */
  async generateEnhancedInsights(baseInsight: HistoricalInsight): Promise<EnhancedInsight> {
    try {
      logger.info({ 
        relatedPostsCount: baseInsight.relatedPosts.length,
        topPerformersCount: baseInsight.topPerformers.length 
      }, 'Generating enhanced performance insights')

      // Analyze voice patterns from top performers
      const voiceAnalysis = await this.analyzeVoicePatterns(baseInsight.topPerformers)

      // Generate structure recommendations
      const structureRecommendations = await this.generateStructureRecommendations(baseInsight.topPerformers)

      // Identify performance factors
      const performanceFactors = await this.identifyPerformanceFactors(baseInsight.topPerformers)

      const enhancedInsight: EnhancedInsight = {
        ...baseInsight,
        voiceAnalysis,
        structureRecommendations,
        performanceFactors
      }

      logger.info({
        voiceTone: voiceAnalysis.tone,
        vulnerabilityScore: voiceAnalysis.vulnerabilityScore,
        optimalLength: performanceFactors.contentLengthOptimal
      }, 'Enhanced insights generated')

      return enhancedInsight
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to generate enhanced insights')
      throw error
    }
  }

  /**
   * Predict performance of new content based on historical patterns
   */
  async predictContentPerformance(
    newContent: string, 
    historicalInsight: HistoricalInsight
  ): Promise<PerformancePrediction> {
    try {
      logger.info({ contentLength: newContent.length }, 'Predicting content performance')

      // Analyze the new content structure
      const contentAnalysis = await this.analyzeContentStructure(newContent)

      // Compare with top performers
      const performanceAnalysis = await this.compareWithTopPerformers(
        newContent, 
        contentAnalysis, 
        historicalInsight.topPerformers
      )

      // Generate prediction using AI
      const aiPrediction = await this.generateAIPrediction(newContent, historicalInsight)

      // Calculate similarity to historical successful posts
      const similarityAnalysis = this.calculateSimilarityToSuccess(
        contentAnalysis, 
        historicalInsight.topPerformers
      )

      const prediction: PerformancePrediction = {
        predictedEngagement: Math.round((performanceAnalysis.score + aiPrediction.score) / 2),
        confidenceScore: Math.min(performanceAnalysis.confidence, aiPrediction.confidence),
        strengthFactors: [...performanceAnalysis.strengths, ...aiPrediction.strengths],
        improvementSuggestions: [...performanceAnalysis.improvements, ...aiPrediction.improvements],
        similarPostPerformance: {
          avgEngagement: historicalInsight.performanceContext.avgEngagement,
          topPerformance: historicalInsight.performanceContext.topPerformingScore,
          similarityScore: similarityAnalysis.score
        }
      }

      logger.info({
        predictedEngagement: prediction.predictedEngagement,
        confidenceScore: prediction.confidenceScore,
        strengthsCount: prediction.strengthFactors.length
      }, 'Performance prediction completed')

      return prediction
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to predict content performance')
      throw error
    }
  }

  /**
   * Generate content optimization suggestions
   */
  async generateOptimizationSuggestions(
    content: string,
    targetPerformance: number,
    historicalInsight: HistoricalInsight
  ): Promise<{
    suggestions: string[]
    rewriteExamples: string[]
    structureImprovements: string[]
    voiceAdjustments: string[]
  }> {
    try {
      const optimizationPrompt = `
As Andrew Tallents' content optimization expert, analyze this LinkedIn post and provide specific suggestions to reach ${targetPerformance} engagement points.

CURRENT POST:
"${content}"

TOP PERFORMING HISTORICAL POSTS FOR REFERENCE:
${historicalInsight.topPerformers.slice(0, 3).map((post, i) => 
  `${i + 1}. (${post.total_reactions} reactions, ${post.comments_count} comments)\n"${post.text.slice(0, 300)}..."`
).join('\n\n')}

SUCCESSFUL PATTERNS IDENTIFIED:
- Average word count: ${historicalInsight.patterns.avgWordCount}
- Common openings: ${historicalInsight.patterns.commonOpenings.join(', ')}
- Best formats: ${historicalInsight.patterns.bestPerformingFormats.join(', ')}
- Engagement triggers: ${historicalInsight.patterns.engagementTriggers.join(', ')}

Please provide optimization suggestions in JSON format:
{
  "suggestions": ["specific actionable suggestion 1", "suggestion 2", "suggestion 3"],
  "rewriteExamples": ["alternative opening 1", "alternative closing 1"],
  "structureImprovements": ["structure change 1", "structure change 2"],
  "voiceAdjustments": ["voice adjustment 1", "voice adjustment 2"]
}

Focus on Andrew's authentic voice: vulnerable leadership stories, CEO coaching insights, and practical wisdom.`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: optimizationPrompt }],
        temperature: 0.3,
        max_tokens: 800
      })

      const result = JSON.parse(response.choices[0]?.message?.content || '{}')
      
      return {
        suggestions: result.suggestions || [],
        rewriteExamples: result.rewriteExamples || [],
        structureImprovements: result.structureImprovements || [],
        voiceAdjustments: result.voiceAdjustments || []
      }
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to generate optimization suggestions')
      return {
        suggestions: ['Increase personal vulnerability', 'Add specific client example', 'Include clear call to action'],
        rewriteExamples: ['Try starting with a question', 'End with an actionable insight'],
        structureImprovements: ['Add paragraph breaks', 'Use bullet points for key insights'],
        voiceAdjustments: ['More conversational tone', 'Include personal reflection']
      }
    }
  }

  /**
   * Analyze voice patterns from top performing posts
   */
  private async analyzeVoicePatterns(topPosts: HistoricalPost[]): Promise<VoiceAnalysis> {
    if (topPosts.length === 0) {
      return {
        tone: 'professional',
        personalStoryElements: false,
        vulnerabilityScore: 0,
        authoritySignals: [],
        emotionalWords: [],
        actionWords: []
      }
    }

    try {
      const voicePrompt = `Analyze the voice and tone patterns in these high-performing LinkedIn posts by Andrew Tallents:

${topPosts.slice(0, 5).map((post, i) => `POST ${i + 1}:\n"${post.text}"\n`).join('\n')}

Identify:
1. Primary tone (professional/casual/inspirational/educational/conversational)
2. Personal story elements (true/false)
3. Vulnerability score (0-100, how much personal struggle/growth is shared)
4. Authority signals (phrases that establish expertise)
5. Emotional words (words that create emotional connection)
6. Action words (words that inspire action)

Return as JSON:
{
  "tone": "tone_category",
  "personalStoryElements": boolean,
  "vulnerabilityScore": number,
  "authoritySignals": ["signal1", "signal2", "signal3"],
  "emotionalWords": ["word1", "word2", "word3"],
  "actionWords": ["word1", "word2", "word3"]
}`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: voicePrompt }],
        temperature: 0.2,
        max_tokens: 600
      })

      const result = JSON.parse(response.choices[0]?.message?.content || '{}')
      
      return {
        tone: result.tone || 'professional',
        personalStoryElements: result.personalStoryElements || false,
        vulnerabilityScore: result.vulnerabilityScore || 0,
        authoritySignals: result.authoritySignals || [],
        emotionalWords: result.emotionalWords || [],
        actionWords: result.actionWords || []
      }
    } catch (error) {
      logger.warn({ error: error.message }, 'Failed to analyze voice patterns')
      return {
        tone: 'professional',
        personalStoryElements: true,
        vulnerabilityScore: 70,
        authoritySignals: ['CEO coach', 'worked with founders', 'leadership experience'],
        emotionalWords: ['struggle', 'growth', 'breakthrough', 'transformation'],
        actionWords: ['develop', 'build', 'create', 'transform', 'lead']
      }
    }
  }

  /**
   * Generate structure recommendations based on top performers
   */
  private async generateStructureRecommendations(topPosts: HistoricalPost[]): Promise<ContentStructureAnalysis[]> {
    const recommendations: ContentStructureAnalysis[] = []

    for (const post of topPosts.slice(0, 3)) {
      const analysis = await this.analyzeContentStructure(post.text)
      recommendations.push(analysis)
    }

    return recommendations
  }

  /**
   * Analyze content structure
   */
  private async analyzeContentStructure(content: string): Promise<ContentStructureAnalysis> {
    const wordCount = content.split(' ').length
    const sentenceCount = content.split(/[.!?]+/).length - 1
    const paragraphCount = content.split('\n\n').length
    const hasQuestions = /\?/.test(content)
    const hasEmojis = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(content)
    const hasHashtags = /#\w+/.test(content)
    const hasCallToAction = /follow|share|comment|thoughts|agree|disagree|experience/i.test(content)

    // Determine opening type
    let openingType: ContentStructureAnalysis['openingType'] = 'statement'
    const firstSentence = content.split(/[.!?]/)[0]
    if (firstSentence.includes('?')) openingType = 'question'
    else if (firstSentence.match(/\d+%|\d+ years|\d+ people/)) openingType = 'statistic'
    else if (firstSentence.includes('"')) openingType = 'quote'
    else if (firstSentence.match(/when i|early in|years ago|recently/i)) openingType = 'story'

    // Determine structure
    let structure: ContentStructureAnalysis['structure'] = 'single_thought'
    if (content.includes('problem') && content.includes('solution')) structure = 'problem_solution'
    else if (content.match(/1\.|2\.|3\.|-/)) structure = 'list_format'
    else if (hasQuestions && content.length > 200) structure = 'question_answer'
    else if (content.match(/when i|story|experience/i)) structure = 'story_lesson'

    return {
      wordCount,
      sentenceCount,
      paragraphCount,
      hasQuestions,
      hasEmojis,
      hasHashtags,
      hasCallToAction,
      openingType,
      structure
    }
  }

  /**
   * Identify performance factors from top posts
   */
  private async identifyPerformanceFactors(topPosts: HistoricalPost[]): Promise<{
    highEngagementTriggers: string[]
    optimalTiming: string[]
    contentLengthOptimal: number
    formatRecommendations: string[]
  }> {
    if (topPosts.length === 0) {
      return {
        highEngagementTriggers: [],
        optimalTiming: [],
        contentLengthOptimal: 150,
        formatRecommendations: []
      }
    }

    // Calculate optimal content length
    const avgLength = Math.round(
      topPosts.reduce((sum, post) => sum + post.text.split(' ').length, 0) / topPosts.length
    )

    // Analyze posting patterns (if available)
    const timingPatterns = topPosts
      .map(post => new Date(post.posted_at))
      .map(date => `${date.getDay()}_${date.getHours()}`)

    return {
      highEngagementTriggers: ['Personal vulnerability', 'Client success stories', 'Contrarian insights', 'Actionable advice'],
      optimalTiming: ['Tuesday-Thursday', 'Morning 8-10am', 'Lunch 12-1pm'],
      contentLengthOptimal: avgLength,
      formatRecommendations: ['Story + lesson structure', 'Bullet point insights', 'Question-based engagement']
    }
  }

  /**
   * Compare new content with top performers
   */
  private async compareWithTopPerformers(
    content: string, 
    analysis: ContentStructureAnalysis, 
    topPosts: HistoricalPost[]
  ): Promise<{
    score: number
    confidence: number
    strengths: string[]
    improvements: string[]
  }> {
    let score = 50 // Base score
    const strengths: string[] = []
    const improvements: string[] = []

    if (topPosts.length === 0) {
      return { score, confidence: 20, strengths, improvements }
    }

    // Analyze word count similarity
    const avgTopLength = topPosts.reduce((sum, post) => sum + post.text.split(' ').length, 0) / topPosts.length
    const lengthRatio = analysis.wordCount / avgTopLength

    if (lengthRatio >= 0.8 && lengthRatio <= 1.2) {
      score += 15
      strengths.push('Optimal content length')
    } else if (lengthRatio < 0.8) {
      improvements.push('Consider expanding content for better engagement')
    } else {
      improvements.push('Consider shortening for better readability')
    }

    // Check for engagement elements
    if (analysis.hasQuestions) {
      score += 10
      strengths.push('Includes questions for engagement')
    }

    if (analysis.hasCallToAction) {
      score += 10
      strengths.push('Has call to action')
    }

    // Structure bonus
    if (analysis.structure === 'story_lesson') {
      score += 15
      strengths.push('Uses story-lesson structure')
    }

    return {
      score: Math.min(100, score),
      confidence: 75,
      strengths,
      improvements
    }
  }

  /**
   * Generate AI-based performance prediction
   */
  private async generateAIPrediction(content: string, insight: HistoricalInsight): Promise<{
    score: number
    confidence: number
    strengths: string[]
    improvements: string[]
  }> {
    try {
      const predictionPrompt = `As a LinkedIn engagement expert, predict the performance of this post based on Andrew Tallents' historical data:

NEW POST:
"${content}"

HISTORICAL CONTEXT:
- Average engagement: ${insight.performanceContext.avgEngagement}
- Top performing score: ${insight.performanceContext.topPerformingScore}
- Successful patterns: ${insight.patterns.engagementTriggers.join(', ')}

TASK: Predict engagement score (0-100) and provide analysis.

Return JSON:
{
  "score": number,
  "confidence": number,
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"]
}`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: predictionPrompt }],
        temperature: 0.3,
        max_tokens: 400
      })

      const result = JSON.parse(response.choices[0]?.message?.content || '{}')
      
      return {
        score: result.score || 60,
        confidence: result.confidence || 70,
        strengths: result.strengths || [],
        improvements: result.improvements || []
      }
    } catch (error) {
      logger.warn({ error: error.message }, 'Failed to generate AI prediction')
      return {
        score: 60,
        confidence: 50,
        strengths: ['Professional tone'],
        improvements: ['Add more personal elements']
      }
    }
  }

  /**
   * Calculate similarity to successful posts
   */
  private calculateSimilarityToSuccess(
    analysis: ContentStructureAnalysis, 
    topPosts: HistoricalPost[]
  ): { score: number } {
    if (topPosts.length === 0) return { score: 0 }

    let similarityScore = 0
    let factors = 0

    // Compare structural elements
    for (const post of topPosts) {
      const postLength = post.text.split(' ').length
      const lengthSimilarity = 1 - Math.abs(analysis.wordCount - postLength) / Math.max(analysis.wordCount, postLength)
      
      similarityScore += lengthSimilarity
      factors++

      // Check for similar structure patterns
      if (post.text.includes('?') === analysis.hasQuestions) {
        similarityScore += 0.2
      }
      
      if ((/story|when|experience/i.test(post.text)) === (analysis.structure === 'story_lesson')) {
        similarityScore += 0.3
      }
    }

    return {
      score: Math.round((similarityScore / factors) * 100)
    }
  }
}

export const performanceInsightsService = new PerformanceInsightsService()