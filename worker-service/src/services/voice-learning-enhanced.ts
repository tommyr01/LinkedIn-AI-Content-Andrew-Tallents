import { OpenAI } from 'openai'
import { appConfig } from '../config'
import logger from '../lib/logger'
import { supabaseService } from './supabase'

export interface VoiceAnalysisResult {
  tone_analysis: {
    primary_tone: string
    secondary_tone: string
    confidence: number
    tone_markers: string[]
  }
  writing_style: {
    sentence_length: 'short' | 'medium' | 'long' | 'mixed'
    paragraph_structure: 'single' | 'short' | 'medium' | 'long'
    punctuation_style: string[]
    formatting_patterns: string[]
  }
  vocabulary_patterns: {
    authority_signals: string[]
    emotional_words: string[]
    action_words: string[]
    industry_terms: string[]
    personal_markers: string[]
  }
  structural_patterns: {
    opening_type: string
    closing_type: string
    story_elements: boolean
    question_patterns: string[]
    call_to_action_style: string
  }
  authenticity_score: number
  authority_score: number
  vulnerability_score: number
  engagement_potential: number
  confidence_score: number
}

export interface VoiceLearningContext {
  content_type: 'post' | 'comment' | 'article'
  context: string
  performance_data?: {
    engagement_score: number
    viral_score: number
    performance_tier: string
  }
}

export class VoiceLearningEnhancedService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: appConfig.openai.apiKey
    })
  }

  /**
   * Analyze voice patterns from Andrew's content with performance correlation
   */
  async analyzeVoicePatterns(
    content: string,
    context: VoiceLearningContext
  ): Promise<VoiceAnalysisResult> {
    try {
      logger.info({ 
        contentLength: content.length, 
        contentType: context.content_type,
        hasPerformanceData: !!context.performance_data
      }, 'Starting enhanced voice pattern analysis')

      // Generate comprehensive voice analysis using AI
      const voiceAnalysis = await this.generateVoiceAnalysis(content, context)

      // Calculate engagement potential based on patterns and performance data
      const engagementPotential = this.calculateEngagementPotential(
        voiceAnalysis, 
        context.performance_data
      )

      const result: VoiceAnalysisResult = {
        ...voiceAnalysis,
        engagement_potential: engagementPotential,
        confidence_score: this.calculateConfidenceScore(voiceAnalysis, context)
      }

      logger.info({
        authenticity: result.authenticity_score,
        authority: result.authority_score,
        vulnerability: result.vulnerability_score,
        engagement: result.engagement_potential,
        confidence: result.confidence_score
      }, 'Voice pattern analysis completed')

      return result
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to analyze voice patterns')
      throw error
    }
  }

  /**
   * Batch analyze historical posts and comments for voice learning
   */
  async batchAnalyzeHistoricalContent(
    contentItems: Array<{
      id: string
      content: string
      type: 'post' | 'comment' | 'article'
      context?: string
      posted_at?: string
      performance_data?: any
    }>
  ): Promise<{
    successful: number
    failed: number
    insights: {
      avgAuthenticity: number
      avgAuthority: number
      avgVulnerability: number
      dominantTone: string
      keyPatterns: string[]
    }
  }> {
    logger.info({ itemCount: contentItems.length }, 'Starting batch voice analysis')

    let successful = 0
    let failed = 0
    const analysisResults: VoiceAnalysisResult[] = []

    // Process in smaller batches to avoid rate limits
    const batchSize = 5
    for (let i = 0; i < contentItems.length; i += batchSize) {
      const batch = contentItems.slice(i, i + batchSize)
      
      logger.info({ 
        batchStart: i + 1, 
        batchEnd: Math.min(i + batchSize, contentItems.length),
        totalItems: contentItems.length
      }, 'Processing voice analysis batch')

      for (const item of batch) {
        try {
          const context: VoiceLearningContext = {
            content_type: item.type,
            context: item.context || `${item.type} content analysis`,
            performance_data: item.performance_data
          }

          const analysis = await this.analyzeVoicePatterns(item.content, context)
          analysisResults.push(analysis)

          // Save to database
          await supabaseService.saveVoiceLearningData({
            content_id: item.id,
            content_type: item.type,
            content_text: item.content,
            content_context: context.context,
            tone_analysis: analysis.tone_analysis,
            writing_style: analysis.writing_style,
            vocabulary_patterns: analysis.vocabulary_patterns,
            structural_patterns: analysis.structural_patterns,
            authenticity_score: analysis.authenticity_score,
            authority_score: analysis.authority_score,
            vulnerability_score: analysis.vulnerability_score,
            engagement_potential: analysis.engagement_potential,
            confidence_score: analysis.confidence_score,
            content_date: item.posted_at ? new Date(item.posted_at) : undefined
          })

          successful++
          
          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
          logger.error({ 
            error: error instanceof Error ? error.message : String(error),
            itemId: item.id
          }, 'Failed to analyze voice for content item')
          failed++
        }
      }

      // Longer delay between batches
      if (i + batchSize < contentItems.length) {
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }

    // Calculate aggregate insights
    const insights = this.calculateAggregateInsights(analysisResults)

    logger.info({
      successful,
      failed,
      totalProcessed: successful + failed,
      insights
    }, 'Batch voice analysis completed')

    return {
      successful,
      failed,
      insights
    }
  }

  /**
   * Generate enhanced voice model for content generation
   */
  async generateEnhancedVoiceModel(): Promise<{
    voiceProfile: any
    generationGuidelines: string[]
    strengthFactors: string[]
    improvementAreas: string[]
  }> {
    try {
      logger.info('Generating enhanced voice model from historical data')

      // Get voice learning data from database
      const voiceData = await supabaseService.getVoiceLearningData('post', 50)
      
      if (voiceData.length === 0) {
        throw new Error('No voice learning data available')
      }

      // Analyze patterns across all data
      const voiceProfile = this.buildVoiceProfile(voiceData)
      const generationGuidelines = await this.generateVoiceGuidelines(voiceProfile, voiceData)

      return {
        voiceProfile,
        generationGuidelines,
        strengthFactors: voiceProfile.strengthFactors || [],
        improvementAreas: voiceProfile.improvementAreas || []
      }
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to generate enhanced voice model')
      throw error
    }
  }

  /**
   * Generate comprehensive voice analysis using AI
   */
  private async generateVoiceAnalysis(
    content: string,
    context: VoiceLearningContext
  ): Promise<Omit<VoiceAnalysisResult, 'engagement_potential' | 'confidence_score'>> {
    const analysisPrompt = `Analyze this ${context.content_type} by Andrew Tallents for comprehensive voice patterns:

CONTENT:
"${content}"

CONTEXT: ${context.context}

${context.performance_data ? `PERFORMANCE DATA:
- Engagement Score: ${context.performance_data.engagement_score}
- Viral Score: ${context.performance_data.viral_score}
- Performance Tier: ${context.performance_data.performance_tier}
` : ''}

Analyze and return JSON with the following structure:
{
  "tone_analysis": {
    "primary_tone": "conversational|professional|inspirational|vulnerable|authoritative",
    "secondary_tone": "secondary tone if applicable",
    "confidence": 0.85,
    "tone_markers": ["specific phrases that indicate tone"]
  },
  "writing_style": {
    "sentence_length": "short|medium|long|mixed",
    "paragraph_structure": "single|short|medium|long",
    "punctuation_style": ["em-dashes", "ellipses", "question marks"],
    "formatting_patterns": ["bullet points", "numbered lists", "line breaks"]
  },
  "vocabulary_patterns": {
    "authority_signals": ["CEO coach", "worked with founders", "leadership experience"],
    "emotional_words": ["struggle", "breakthrough", "transformation"],
    "action_words": ["develop", "build", "create", "transform"],
    "industry_terms": ["self-leadership", "authentic leadership", "founders"],
    "personal_markers": ["I", "my experience", "what I've learned"]
  },
  "structural_patterns": {
    "opening_type": "question|statement|story|statistic|quote",
    "closing_type": "question|call_to_action|reflection|offer",
    "story_elements": true|false,
    "question_patterns": ["what if", "how many", "why do"],
    "call_to_action_style": "direct|subtle|community-building"
  },
  "authenticity_score": 0-100,
  "authority_score": 0-100,
  "vulnerability_score": 0-100
}

Focus on Andrew's distinctive voice: vulnerable leadership insights, CEO coaching expertise, conversational authority, and authentic storytelling.`

    const response = await this.openai.chat.completions.create({
      model: appConfig.openai.model,
      messages: [{ role: 'user', content: analysisPrompt }],
      temperature: 0.3,
      max_tokens: 1000
    })

    const result = JSON.parse(response.choices[0]?.message?.content || '{}')
    
    return {
      tone_analysis: result.tone_analysis || {
        primary_tone: 'conversational',
        secondary_tone: 'authoritative',
        confidence: 0.7,
        tone_markers: []
      },
      writing_style: result.writing_style || {
        sentence_length: 'mixed',
        paragraph_structure: 'short',
        punctuation_style: ['em-dashes'],
        formatting_patterns: []
      },
      vocabulary_patterns: result.vocabulary_patterns || {
        authority_signals: [],
        emotional_words: [],
        action_words: [],
        industry_terms: [],
        personal_markers: []
      },
      structural_patterns: result.structural_patterns || {
        opening_type: 'statement',
        closing_type: 'call_to_action',
        story_elements: false,
        question_patterns: [],
        call_to_action_style: 'community-building'
      },
      authenticity_score: result.authenticity_score || 70,
      authority_score: result.authority_score || 80,
      vulnerability_score: result.vulnerability_score || 75
    }
  }

  /**
   * Calculate engagement potential based on voice patterns and performance data
   */
  private calculateEngagementPotential(
    analysis: Omit<VoiceAnalysisResult, 'engagement_potential' | 'confidence_score'>,
    performanceData?: { engagement_score: number; viral_score: number; performance_tier: string }
  ): number {
    let baseScore = 60 // Base engagement potential

    // Boost based on voice scores
    if (analysis.authenticity_score > 80) baseScore += 10
    if (analysis.authority_score > 75) baseScore += 10
    if (analysis.vulnerability_score > 70) baseScore += 15 // Vulnerability drives engagement

    // Boost based on structural patterns
    if (analysis.structural_patterns.story_elements) baseScore += 10
    if (analysis.structural_patterns.question_patterns.length > 0) baseScore += 5

    // Boost based on vocabulary patterns
    if (analysis.vocabulary_patterns.emotional_words.length > 2) baseScore += 8
    if (analysis.vocabulary_patterns.action_words.length > 1) baseScore += 5

    // Factor in actual performance data if available
    if (performanceData) {
      if (performanceData.performance_tier === 'top_10_percent') baseScore += 20
      else if (performanceData.performance_tier === 'top_25_percent') baseScore += 10
      else if (performanceData.performance_tier === 'average') baseScore += 5
    }

    return Math.min(100, Math.max(0, baseScore))
  }

  /**
   * Calculate confidence score for the analysis
   */
  private calculateConfidenceScore(
    analysis: Omit<VoiceAnalysisResult, 'engagement_potential' | 'confidence_score'>,
    context: VoiceLearningContext
  ): number {
    let confidence = 0.7 // Base confidence

    // Higher confidence for posts vs comments
    if (context.content_type === 'post') confidence += 0.1

    // Higher confidence if we have performance data
    if (context.performance_data) confidence += 0.15

    // Higher confidence for longer content
    if (context.content_type === 'post' && analysis.tone_analysis.confidence > 0.8) {
      confidence += 0.05
    }

    return Math.min(1.0, Math.max(0.0, confidence))
  }

  /**
   * Calculate aggregate insights from multiple analyses
   */
  private calculateAggregateInsights(analyses: VoiceAnalysisResult[]): {
    avgAuthenticity: number
    avgAuthority: number
    avgVulnerability: number
    dominantTone: string
    keyPatterns: string[]
  } {
    if (analyses.length === 0) {
      return {
        avgAuthenticity: 0,
        avgAuthority: 0,
        avgVulnerability: 0,
        dominantTone: 'conversational',
        keyPatterns: []
      }
    }

    const avgAuthenticity = Math.round(
      analyses.reduce((sum, a) => sum + a.authenticity_score, 0) / analyses.length
    )
    const avgAuthority = Math.round(
      analyses.reduce((sum, a) => sum + a.authority_score, 0) / analyses.length
    )
    const avgVulnerability = Math.round(
      analyses.reduce((sum, a) => sum + a.vulnerability_score, 0) / analyses.length
    )

    // Find most common primary tone
    const tones = analyses.map(a => a.tone_analysis.primary_tone)
    const dominantTone = tones.sort((a, b) =>
      tones.filter(t => t === a).length - tones.filter(t => t === b).length
    ).pop() || 'conversational'

    // Extract key patterns (most common authority signals and emotional words)
    const allPatterns: string[] = []
    analyses.forEach(a => {
      allPatterns.push(...a.vocabulary_patterns.authority_signals)
      allPatterns.push(...a.vocabulary_patterns.emotional_words)
    })

    const keyPatterns = [...new Set(allPatterns)].slice(0, 5)

    return {
      avgAuthenticity,
      avgAuthority,
      avgVulnerability,
      dominantTone,
      keyPatterns
    }
  }

  /**
   * Build comprehensive voice profile from historical data
   */
  private buildVoiceProfile(voiceData: any[]): any {
    const profile = {
      dominantTone: 'conversational',
      avgScores: {
        authenticity: 0,
        authority: 0,
        vulnerability: 0
      },
      commonPatterns: {
        openings: [],
        structures: [],
        vocabulary: []
      },
      strengthFactors: [] as string[],
      improvementAreas: [] as string[]
    }

    if (voiceData.length === 0) return profile

    // Calculate averages
    profile.avgScores.authenticity = Math.round(
      voiceData.reduce((sum, d) => sum + (d.authenticity_score || 0), 0) / voiceData.length
    )
    profile.avgScores.authority = Math.round(
      voiceData.reduce((sum, d) => sum + (d.authority_score || 0), 0) / voiceData.length
    )
    profile.avgScores.vulnerability = Math.round(
      voiceData.reduce((sum, d) => sum + (d.vulnerability_score || 0), 0) / voiceData.length
    )

    // Extract common patterns
    const allToneAnalyses = voiceData.map(d => d.tone_analysis).filter(Boolean)
    if (allToneAnalyses.length > 0) {
      const tones = allToneAnalyses.map(t => t.primary_tone).filter(Boolean)
      profile.dominantTone = tones.sort((a, b) =>
        tones.filter(t => t === a).length - tones.filter(t => t === b).length
      ).pop() || 'conversational'
    }

    // Identify strengths and improvement areas
    if (profile.avgScores.vulnerability > 75) {
      profile.strengthFactors.push('High vulnerability and authenticity')
    }
    if (profile.avgScores.authority > 80) {
      profile.strengthFactors.push('Strong authority signals')
    }
    if (profile.avgScores.authenticity < 70) {
      profile.improvementAreas.push('Increase personal authenticity')
    }

    return profile
  }

  /**
   * Generate voice guidelines using AI
   */
  private async generateVoiceGuidelines(voiceProfile: any, voiceData: any[]): Promise<string[]> {
    try {
      const guidelinesPrompt = `Based on this voice analysis data for Andrew Tallents, generate 5-7 specific guidelines for content generation:

VOICE PROFILE:
- Dominant Tone: ${voiceProfile.dominantTone}
- Authenticity Score: ${voiceProfile.avgScores.authenticity}
- Authority Score: ${voiceProfile.avgScores.authority} 
- Vulnerability Score: ${voiceProfile.avgScores.vulnerability}
- Strength Factors: ${voiceProfile.strengthFactors.join(', ')}

SAMPLE HIGH-PERFORMING PATTERNS:
${voiceData.slice(0, 3).map((d, i) => 
  `${i + 1}. Tone: ${d.tone_analysis?.primary_tone || 'N/A'}, Structure: ${d.structural_patterns?.opening_type || 'N/A'}`
).join('\n')}

Generate specific, actionable guidelines in this format:
["Use conversational tone with authority signals", "Include vulnerability through personal examples", "Start with questions or contrarian statements", ...]

Return as JSON array of strings.`

      const response = await this.openai.chat.completions.create({
        model: appConfig.openai.model,
        messages: [{ role: 'user', content: guidelinesPrompt }],
        temperature: 0.3,
        max_tokens: 400
      })

      const result = JSON.parse(response.choices[0]?.message?.content || '[]')
      
      return Array.isArray(result) ? result : [
        'Use conversational tone with authoritative insights',
        'Include vulnerability through leadership struggles', 
        'Start with provocative questions or contrarian takes',
        'End with community-building call to actions',
        'Balance personal stories with practical advice'
      ]
    } catch (error) {
      logger.warn({ error: error instanceof Error ? error.message : String(error) }, 'Failed to generate voice guidelines')
      return [
        'Maintain conversational yet authoritative tone',
        'Include authentic vulnerability in leadership stories',
        'Use engaging openings (questions, bold statements)',
        'Provide actionable insights for CEO/founder challenges',
        'End with community engagement calls to action'
      ]
    }
  }
}

export const voiceLearningEnhancedService = new VoiceLearningEnhancedService()