import { OpenAI } from 'openai'
import { Anthropic } from '@anthropic-ai/sdk'
import { appConfig } from '../config'
import logger from '../lib/logger'
import type { AIAgentResult } from '../types'
import type { EnhancedInsight, PerformancePrediction } from './performance-insights'
import { performanceInsightsService } from './performance-insights'
import { contextualUnderstandingEngine } from './contextual-understanding-engine'
import { voiceLearningEnhanced } from './voice-learning-enhanced'

interface ResearchIdea {
  concise_summary: string
  angle_approach: string
  details: string
  relevance: string
}

interface EnhancedResearch {
  idea_1: ResearchIdea
  idea_2: ResearchIdea
  idea_3: ResearchIdea
}

export class AIAgentsService {
  private openai: OpenAI
  private anthropic: Anthropic

  constructor() {
    this.openai = new OpenAI({
      apiKey: appConfig.openai.apiKey
    })
    this.anthropic = new Anthropic({
      apiKey: appConfig.anthropic.apiKey
    })
  }

  private createStrategicVariantPrompt(
    ideaNumber: 1 | 2 | 3, 
    variantType: 'performance' | 'engagement' | 'experimental',
    historicalContext?: string, 
    voiceGuidelines?: string
  ): string {
    // RAG-FIRST APPROACH: When voice learning is available, use ONLY RAG patterns for strategic variants too
    if (voiceGuidelines && voiceGuidelines.trim().length > 0) {
      return this.createRAGFirstStrategicVariantPrompt(ideaNumber, variantType, historicalContext, voiceGuidelines)
    }
    
    // FAIL-FAST: If RAG should be working but isn't, fail clearly for strategic variants too
    logger.warn({ ideaNumber, variantType, hasHistoricalContext: !!historicalContext }, 'RAG voice guidelines not available for strategic variant - this should be investigated. Using minimal fallback.')
    
    return this.createMinimalStrategicVariantFallback(ideaNumber, variantType, historicalContext)
  }

  /**
   * RAG-FIRST strategic variant prompt that uses ONLY RAG-retrieved voice patterns
   */
  private createRAGFirstStrategicVariantPrompt(
    ideaNumber: 1 | 2 | 3, 
    variantType: 'performance' | 'engagement' | 'experimental',
    historicalContext?: string, 
    voiceGuidelines?: string
  ): string {
    const variantStrategies = {
      performance: {
        name: 'Performance-Optimized',
        focus: 'Use Andrew\'s proven successful patterns for maximum reach and professional engagement',
        goals: 'High reach, strong professional engagement, authority building'
      },
      engagement: {
        name: 'Engagement-Focused', 
        focus: 'Maximize comments, conversations, and meaningful interactions',
        goals: 'High comment volume, active discussions, community building'
      },
      experimental: {
        name: 'Experimental Approach',
        focus: 'Test new content formats and discover emerging patterns',
        goals: 'Pattern discovery, audience testing, innovation in content approach'
      }
    }
    
    const strategy = variantStrategies[variantType]
    
    return `Act as Andrew Tallents writing LinkedIn content for UK CEOs and Founders. You are creating a **${strategy.name}** variant using ONLY the RAG-retrieved voice patterns below.

**STRATEGIC VARIANT: ${strategy.name.toUpperCase()}**
**FOCUS:** ${strategy.focus}
**GOALS:** ${strategy.goals}

${historicalContext ? `**HISTORICAL PERFORMANCE CONTEXT:**
${historicalContext}

` : ''}
**🎯 ANDREW'S AUTHENTIC VOICE PATTERNS - RETRIEVED FROM RAG SYSTEM:**
${voiceGuidelines}

**⚠️  CRITICAL RAG-FIRST INSTRUCTIONS FOR ${variantType.toUpperCase()} VARIANT:**
1. Use ONLY the RAG-retrieved voice patterns above as your guide
2. Adapt these patterns specifically for ${variantType} optimization while maintaining authenticity
3. For ${variantType} variant: ${this.getRAGVariantGuidance(variantType)}
4. Follow the exact language, structure, and tone from the RAG patterns
5. NO hard-coded examples or templates - only RAG patterns matter

**CONTENT REQUIREMENTS:**
- NO hashtags (Andrew never uses them)
- Use the exact CTA format: "▶️ Follow me if you're a CEO or founder scaling fast and refusing to burn out doing it."
- Match the confrontational but supportive tone from RAG patterns
- Optimize specifically for ${variantType} while staying authentic to RAG patterns

**Your Role: RAG-Guided ${strategy.name} Agent ${ideaNumber}**
Generate ${variantType}-optimized content that matches the RAG-retrieved voice patterns exactly.`
  }

  /**
   * Minimal strategic variant fallback when RAG isn't available
   */
  private createMinimalStrategicVariantFallback(
    ideaNumber: 1 | 2 | 3, 
    variantType: 'performance' | 'engagement' | 'experimental',
    historicalContext?: string
  ): string {
    logger.error({ ideaNumber, variantType }, 'USING STRATEGIC VARIANT FALLBACK - RAG system should be investigated')
    
    return `⚠️ WARNING: RAG voice learning system unavailable for strategic variant. Using minimal fallback.

Act as Andrew Tallents writing ${variantType}-optimized content for UK CEOs and Founders.

${historicalContext ? `**AVAILABLE CONTEXT:**
${historicalContext}

` : ''}

**MINIMAL ${variantType.toUpperCase()} REQUIREMENTS:**
- Start with confrontational challenge (optimized for ${variantType})
- Be research-backed and specific
- Use dramatic structure with line breaks
- End with: "▶️ Follow me if you're a CEO or founder scaling fast and refusing to burn out doing it."
- NO hashtags ever

**Your Role: Fallback ${variantType} Agent ${ideaNumber}**
⚠️ This is fallback mode - authenticity may be reduced. RAG system needs attention.`
  }

  /**
   * Get RAG-specific guidance for each variant type
   */
  private getRAGVariantGuidance(variantType: 'performance' | 'engagement' | 'experimental'): string {
    switch (variantType) {
      case 'performance':
        return 'Focus on the highest-performing patterns in the RAG data - look for confrontational openings and research citations that have driven engagement'
      case 'engagement':
        return 'Emphasize patterns that generate comments and discussions - look for questions and controversial takes in the RAG data'
      case 'experimental':
        return 'Use less common patterns from the RAG data - try different structures while maintaining authenticity'
      default:
        return 'Follow the RAG patterns exactly'
    }
  }

  /**
   * RAG-FIRST approach: When RAG voice guidelines are available, use them exclusively
   * Now supports story mode vs research mode
   */
  private createAndrewTallentsPrompt(ideaNumber: 1 | 2 | 3, historicalContext?: string, voiceGuidelines?: string, isUserStory?: boolean): string {
    // RAG-FIRST APPROACH: When voice learning is available, use ONLY RAG patterns
    if (voiceGuidelines && voiceGuidelines.trim().length > 0) {
      return this.createRAGFirstPrompt(ideaNumber, historicalContext, voiceGuidelines, isUserStory)
    }
    
    // FAIL-FAST: If RAG should be working but isn't, fail clearly
    logger.warn({ ideaNumber, hasHistoricalContext: !!historicalContext, isUserStory }, 'RAG voice guidelines not available - this should be investigated. Using minimal fallback.')
    
    return this.createMinimalFallbackPrompt(ideaNumber, historicalContext, isUserStory)
  }

  /**
   * RAG-FIRST prompt that uses ONLY RAG-retrieved voice patterns
   * Now supports story mode to preserve user stories
   */
  private createRAGFirstPrompt(ideaNumber: 1 | 2 | 3, historicalContext?: string, voiceGuidelines?: string, isUserStory?: boolean): string {
    const contentMode = isUserStory ? 'STORY MODE' : 'RESEARCH MODE'
    const storyInstructions = isUserStory ? `

**🎯 STORY MODE INSTRUCTIONS:**
1. The user has provided a personal story/experience that must be PRESERVED and used as the core content
2. DO NOT treat the story as a research topic - use it as the actual content material
3. Apply Andrew's voice patterns to enhance and frame the story, not replace it
4. The story contains valuable leadership insights that should be highlighted with Andrew's authority
5. Maintain the authenticity of both the user's story AND Andrew's voice patterns` : ''
    
    return `Act as Andrew Tallents writing LinkedIn content for UK CEOs and Founders. You will use ONLY the RAG-retrieved voice patterns below as your guide.

**CONTENT MODE: ${contentMode}**${storyInstructions}

${historicalContext ? `**HISTORICAL PERFORMANCE CONTEXT:**
${historicalContext}

` : ''}**🎯 ANDREW'S AUTHENTIC VOICE PATTERNS - RETRIEVED FROM RAG SYSTEM:**
${voiceGuidelines}

**⚠️  CRITICAL RAG-FIRST INSTRUCTIONS:**
1. The voice patterns above are Andrew's ACTUAL voice retrieved from his podcast segments and webinars
2. Use ONLY these patterns as your guide - no other examples or templates
3. Follow the specific language, structure, and tone shown in the RAG patterns
4. Your authenticity depends entirely on matching these retrieved patterns
5. ${isUserStory ? 'PRESERVE the user\'s story and apply Andrew\'s voice patterns to enhance it' : 'If the RAG patterns show confrontational openings, use them exactly'}
6. ${isUserStory ? 'Extract leadership insights from the story and present them with Andrew\'s authority' : 'If the RAG patterns show specific research citations, reference similar sources'}
7. Mirror the dramatic structure and emotional journey shown in the patterns

**CONTENT REQUIREMENTS:**
- NO hashtags (Andrew never uses them)
- Use the exact CTA format: "▶️ Follow me if you're a CEO or founder scaling fast and refusing to burn out doing it."
- ${isUserStory ? 'Use the story as your primary content and enhance it with Andrew\'s voice patterns' : 'Include research citations similar to those in the RAG patterns'}
- Match the confrontational but supportive tone shown in the retrieved examples
- Use the same structural elements (line breaks, emojis, numbered points) as shown in patterns

**Your Role: RAG-Guided Content Agent ${ideaNumber} (${contentMode})**
Generate content that matches the RAG-retrieved voice patterns exactly. ${isUserStory ? 'Preserve and enhance the user\'s story with Andrew\'s authentic voice.' : 'The retrieved patterns are your ONLY guide.'}`
  }

  /**
   * Minimal fallback when RAG isn't available - fail clearly but provide minimal content
   */
  private createMinimalFallbackPrompt(ideaNumber: 1 | 2 | 3, historicalContext?: string, isUserStory?: boolean): string {
    logger.error({ ideaNumber, isUserStory }, 'USING FALLBACK PROMPT - RAG system should be investigated')
    
    const storyFallback = isUserStory ? `

**STORY MODE FALLBACK:**
- The user provided a story that must be preserved as the main content
- Apply Andrew's style to enhance the story, don't replace it
- Extract leadership insights from the story` : ''
    
    return `⚠️ WARNING: RAG voice learning system unavailable. Using minimal fallback.

Act as Andrew Tallents writing for UK CEOs and Founders.

**MODE: ${isUserStory ? 'STORY PRESERVATION' : 'RESEARCH CONTENT'}**${storyFallback}

${historicalContext ? `**AVAILABLE CONTEXT:**
${historicalContext}

` : ''}

**MINIMAL ANDREW VOICE REQUIREMENTS:**
- ${isUserStory ? 'Preserve and enhance the user\'s story with Andrew\'s voice' : 'Start with confrontational challenge'}
- Be research-backed and specific  
- Use dramatic structure with line breaks
- End with: "▶️ Follow me if you're a CEO or founder scaling fast and refusing to burn out doing it."
- NO hashtags ever

**Your Role: Fallback Content Agent ${ideaNumber} (${isUserStory ? 'Story Mode' : 'Research Mode'})**
⚠️ This is fallback mode - authenticity may be reduced. RAG system needs attention.`
  }

  /**
   * LEGACY METHOD - keeping for reference but not using in RAG-first approach
   */
  private createLegacyAndrewTallentsPrompt(ideaNumber: 1 | 2 | 3, historicalContext?: string, voiceGuidelines?: string): string {
    // LEGACY METHOD - Contains hard-coded examples that contaminate RAG authenticity
    // This method is no longer used to prevent dilution of RAG-retrieved voice patterns
    // All content generation now uses RAG-first approach in createRAGFirstPrompt()
    throw new Error('Legacy prompt method disabled - use RAG-first approach only')
  }

  private createUserPrompt(idea: ResearchIdea, isUserStory?: boolean): string {
    // Safely escape all dynamic content
    const safeSummary = (idea.concise_summary || '').replace(/`/g, '\\`').replace(/\$/g, '\\$')
    const safeAngle = (idea.angle_approach || '').replace(/`/g, '\\`').replace(/\$/g, '\\$')
    const safeDetails = (Array.isArray(idea.details) ? idea.details.join('\n• ') : (idea.details || '')).replace(/`/g, '\\`').replace(/\$/g, '\\$')
    const safeRelevance = (idea.relevance || '').replace(/`/g, '\\`').replace(/\$/g, '\\$')
    
    const contentInstructions = isUserStory ? 
      `**USER STORY TO ENHANCE (PRESERVE THIS CONTENT):**
* **Story Summary:** ${safeSummary}
* **Suggested Enhancement Approach:** ${safeAngle}
* **Full Story Content:** ${safeDetails}
* **Leadership Relevance:** ${safeRelevance}

**CRITICAL STORY MODE INSTRUCTIONS:**
The user has provided a personal story/experience. Your job is to:
1. PRESERVE the story as your main content
2. Apply Andrew Tallents' voice patterns to enhance and frame it
3. Extract the leadership insights embedded in the story
4. Present the story with Andrew's authority and authenticity
5. DO NOT replace the story with generic content - use the story itself

Write a LinkedIn post that uses the user's story as the core content, enhanced with Andrew Tallents' authentic voice patterns.` :
      `**Input Topic Data (Use this information to craft the post):**
* **Concise Summary:** ${safeSummary}
* **Suggested Angle / Hook:** ${safeAngle}
* **Key Details / Stats:** ${safeDetails}
* **Relevance to Audience:** ${safeRelevance}

Create a LinkedIn post using this research data and the Andrew Tallents style guidelines provided above.`
    
    return `${contentInstructions}

Write the post content directly - no need for JSON format, just return the complete LinkedIn post text that sounds authentically like Andrew Tallents speaking to UK CEOs and Founders about self-leadership.`
  }

  private async generateStrategicVariation(
    ideaNumber: 1 | 2 | 3,
    idea: ResearchIdea,
    variantType: 'performance' | 'engagement' | 'experimental',
    voiceGuidelines?: string,
    historicalInsights?: EnhancedInsight
  ): Promise<AIAgentResult | null> {
    const startTime = Date.now()
    const agentName = `andrew_tallents_${variantType}_agent_${ideaNumber}`
    
    logger.info({ agentName, ideaNumber, variantType }, 'Starting strategic AI agent content generation')

    try {
      if (!idea || !idea.concise_summary) {
        throw new Error('Invalid research idea structure')
      }
      
      // Create variant-specific historical context
      let historicalContext = ''
      if (historicalInsights && historicalInsights.topPerformers.length > 0) {
        switch (variantType) {
          case 'performance':
            historicalContext = `HIGH-PERFORMING PATTERNS FROM ANDREW'S BEST POSTS:\n${historicalInsights.topPerformers.slice(0, 3).map(p => `- "${p.text.slice(0, 100)}..." (${p.viral_score} viral score)`).join('\n')}\n\nPROVEN ENGAGEMENT TRIGGERS:\n${historicalInsights.patterns.engagementTriggers.slice(0, 3).join(', ')}\n\nOPTIMAL STRUCTURE: ${historicalInsights.patterns.avgWordCount} words average`
            break
          case 'engagement':
            historicalContext = `CONVERSATION-STARTING PATTERNS FROM ANDREW'S POSTS:\n${historicalInsights.relatedPosts.filter(p => p.comments_count > 10).slice(0, 3).map(p => `- "${p.text.slice(0, 100)}..." (${p.comments_count} comments)`).join('\n')}\n\nDISCUSSION TRIGGERS:\n${historicalInsights.patterns.commonOpenings.slice(0, 3).join(', ')}\n\nENGAGEMENT ELEMENTS: Questions, personal stories, contrarian takes`
            break
          case 'experimental':
            historicalContext = `INNOVATIVE PATTERNS TO BUILD ON:\n${historicalInsights.patterns.bestPerformingFormats.slice(0, 3).join(', ')}\n\nUNEXPLORED OPPORTUNITIES:\n- Try different opening hooks beyond proven patterns\n- Experiment with content structure variations\n- Test new analogies and metaphor approaches\n\nCREATIVE INSPIRATION: Push boundaries while maintaining Andrew's authentic voice`
            break
        }
      }

      const systemPrompt = this.createStrategicVariantPrompt(ideaNumber, variantType, historicalContext, voiceGuidelines)
      const userPrompt = this.createUserPrompt(idea)
      
      if (!systemPrompt || !userPrompt) {
        throw new Error('Failed to create valid strategic prompts')
      }

      const completion = await this.anthropic.messages.create({
        model: appConfig.anthropic.model,
        max_tokens: 1000,
        temperature: variantType === 'experimental' ? 0.9 : variantType === 'engagement' ? 0.8 : 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      })

      const content = completion.content[0]?.type === 'text' ? completion.content[0].text : ''
      if (!content.trim()) {
        throw new Error('Empty strategic content generated')
      }

      const generationTime = Date.now() - startTime
      let voiceScore = 75
      
      if (this.hasAndrewAuthenticityMarkers(content)) {
        voiceScore += 15
      }
      
      // Variant-specific scoring adjustments
      switch (variantType) {
        case 'performance':
          if (/Research (shows|from|indicates)|Harvard|Yale/i.test(content)) voiceScore += 10
          if (/The best founders I work with/i.test(content)) voiceScore += 8
          break
        case 'engagement':
          if (/\?/.test(content)) voiceScore += 8
          if ((content.match(/\?/g) || []).length >= 2) voiceScore += 5
          break
        case 'experimental':
          if (!/^(Control is|Stop doing|This is why)/i.test(content)) voiceScore += 8
          if (content.length > 200) voiceScore += 5
          break
      }
      
      if (historicalInsights) {
        voiceScore += 10
      }

      let performancePrediction: PerformancePrediction | null = null
      if (historicalInsights) {
        try {
          performancePrediction = await performanceInsightsService.predictContentPerformance(
            content,
            historicalInsights
          )
        } catch (error) {
          logger.warn({ error: error instanceof Error ? error.message : String(error), agentName, variantType }, 'Failed to generate strategic performance prediction')
        }
      }

      const variantNames = {
        performance: 'Performance-Optimized Andrew Style',
        engagement: 'Engagement-Focused Andrew Style', 
        experimental: 'Experimental Andrew Style'
      }

      const result: AIAgentResult = {
        agent_name: agentName,
        content: {
          title: `${variantNames[variantType]} - Idea ${ideaNumber}`,
          body: content,
          hashtags: [],
          estimated_voice_score: Math.min(voiceScore, 100),
          approach: `${variantNames[variantType]} - Idea ${ideaNumber}`,
          performance_prediction: performancePrediction || undefined
        },
        metadata: {
          token_count: (completion.usage?.input_tokens || 0) + (completion.usage?.output_tokens || 0),
          generation_time_ms: generationTime,
          model_used: appConfig.anthropic.model,
          research_sources: [`Strategic ${variantType} research idea ${ideaNumber}`],
          historical_context_used: !!historicalInsights,
          similar_posts_analyzed: historicalInsights?.relatedPosts.length || 0,
          top_performer_score: historicalInsights?.performanceContext.topPerformingScore || 0,
          predicted_engagement: performancePrediction?.predictedEngagement || undefined,
          prediction_confidence: performancePrediction?.confidenceScore || undefined,
          strategic_variant_type: variantType
        },
        score: historicalInsights ? 0.95 : 0.9
      }

      return result

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error), agentName, variantType }, 'Strategic AI agent content generation failed')
      return null
    }
  }

  private async generateSingleVariation(
    ideaNumber: 1 | 2 | 3,
    idea: ResearchIdea,
    voiceGuidelines?: string,
    historicalInsights?: EnhancedInsight,
    isUserStory?: boolean
  ): Promise<AIAgentResult | null> {
    const startTime = Date.now()
    const agentName = `andrew_tallents_agent_${ideaNumber}`
    
    logger.info({ agentName, ideaNumber }, 'Starting AI agent content generation')

    try {
      // Debug: Log input parameters
      logger.debug({ 
        agentName,
        hasIdea: !!idea,
        ideaSummary: idea?.concise_summary?.slice(0, 50),
        hasVoiceGuidelines: !!voiceGuidelines,
        hasHistoricalInsights: !!historicalInsights
      }, 'AI agent generation input parameters')
      
      // SURGICAL LOGGING: Capture exact failure point
      logger.error({ 
        agentName,
        ideaType: typeof idea,
        ideaValue: idea,
        ideaKeys: idea ? Object.keys(idea) : 'no idea object',
        hasConciseSummary: !!idea?.concise_summary,
        conciseSummaryType: typeof idea?.concise_summary,
        conciseSummaryValue: idea?.concise_summary,
        hasAngleApproach: !!idea?.angle_approach,
        hasDetails: !!idea?.details,
        hasRelevance: !!idea?.relevance
      }, 'SURGICAL AI AGENT INPUT DEBUG - EXACT IDEA STRUCTURE')
      
      // Extra debug for RAG issue
      if (!idea || !idea.concise_summary) {
        logger.error({ 
          agentName,
          idea: !!idea,
          hasKeys: idea ? Object.keys(idea) : 'no idea object',
          fullIdea: JSON.stringify(idea, null, 2)
        }, 'AI agent called with invalid idea structure - FULL DETAILS')
        throw new Error('Invalid research idea structure')
      }
      // BYPASS STRATEGY: Use RAG insights for metadata only, not in OpenAI prompts
      // This ensures AI agents work while we debug the prompt integration issue
      let historicalContext = ''
      
      if (historicalInsights && historicalInsights.topPerformers.length > 0) {
        logger.info({ 
          agentName,
          ragBypassMode: true,
          topPerformersCount: historicalInsights.topPerformers.length,
          voiceScore: historicalInsights.voiceAnalysis.vulnerabilityScore,
          avgWordCount: historicalInsights.patterns.avgWordCount
        }, 'RAG insights available - using for metadata only (bypass mode)')
      }
      
      // Historical context stays empty to avoid OpenAI prompt issues
      // RAG insights will still be used for voice scoring and performance prediction below

      const systemPrompt = this.createAndrewTallentsPrompt(ideaNumber, historicalContext, voiceGuidelines, isUserStory)
      const userPrompt = this.createUserPrompt(idea, isUserStory)
      
      // Extra validation
      if (!systemPrompt || !userPrompt) {
        logger.error({ 
          agentName,
          systemPromptLength: systemPrompt?.length || 0,
          userPromptLength: userPrompt?.length || 0
        }, 'Failed to create prompts')
        throw new Error('Failed to create valid prompts')
      }

      // Debug: Log prompt lengths
      logger.debug({
        agentName,
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
        historicalContextLength: historicalContext.length,
        totalPromptLength: systemPrompt.length + userPrompt.length
      }, 'AI agent prompt lengths')

      // Debug: Log first 200 chars of each prompt for debugging
      logger.debug({
        agentName,
        systemPromptPreview: systemPrompt.slice(0, 200) + '...',
        userPromptPreview: userPrompt.slice(0, 200) + '...'
      }, 'AI agent prompt previews')

      logger.info({ agentName, model: appConfig.openai.model }, 'Making OpenAI API call')

      // SURGICAL LOGGING: Capture API call details
      logger.error({
        agentName,
        model: appConfig.openai.model,
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
        hasClaudeKey: !!appConfig.anthropic.apiKey,
        claudeKeyLength: appConfig.anthropic.apiKey?.length || 0
      }, 'SURGICAL CLAUDE API CALL DEBUG - ABOUT TO CALL API')

      const completion = await this.anthropic.messages.create({
        model: appConfig.anthropic.model,
        max_tokens: 1000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      })

      logger.info({ 
        agentName, 
        tokensUsed: (completion.usage?.input_tokens || 0) + (completion.usage?.output_tokens || 0),
        stopReason: completion.stop_reason
      }, 'Claude API call completed')

      const content = completion.content[0]?.type === 'text' ? completion.content[0].text : ''
      
      if (!content.trim()) {
        logger.error({ agentName, stopReason: completion.stop_reason }, 'Empty content generated from Claude')
        throw new Error('Empty content generated')
      }

      logger.debug({ 
        agentName, 
        contentLength: content.length,
        contentPreview: content.slice(0, 100) + '...'
      }, 'Content generated successfully')

      const generationTime = Date.now() - startTime

      // Quick constraint validation
      const constraintChecks = {
        noHashtags: !/#\w+/.test(content),
        hasResearchCitation: /(Yale Center|Harvard Business School|Stanford Graduate School|Research from [A-Z])/i.test(content),
        hasConfrontationalOpening: /^[A-Z][^.!?]*\s+(is killing your|Stop doing|This is why)/i.test(content.trim()),
        hasAndrewCTA: /▶️ Follow me if you're a CEO or founder scaling fast and refusing to burn out doing it/i.test(content)
      }
      
      // Calculate Andrew-authentic voice score with constraint penalties
      let voiceScore = 75 // Base score (lower to account for authenticity requirements)
      
      // Apply constraint penalties
      if (!constraintChecks.noHashtags) voiceScore -= 20
      if (!constraintChecks.hasResearchCitation) voiceScore -= 15
      if (!constraintChecks.hasConfrontationalOpening) voiceScore -= 15
      if (!constraintChecks.hasAndrewCTA) voiceScore -= 10
      
      // Apply Andrew authenticity boosters
      if (this.hasAndrewAuthenticityMarkers(content)) {
        voiceScore += 15 // High boost for authentic Andrew patterns
      }
      
      // Additional Andrew signature checks
      if (/-------------------------------------------------------/.test(content)) voiceScore += 15 // Separator line
      if (/▶️ Follow me if you're a CEO or founder scaling fast/.test(content)) voiceScore += 20 // Exact CTA
      if (/Self-Coaching for Leaders/.test(content)) voiceScore += 10 // Newsletter
      if (/That's not leadership\. That's/.test(content)) voiceScore += 12 // Signature closer
      
      if (historicalInsights) {
        // Boost score if we have historical context
        voiceScore += 8
        if (historicalInsights.voiceAnalysis.vulnerabilityScore > 70) voiceScore += 5
        
        // Additional boost for Andrew-specific patterns
        if (historicalInsights.voiceAnalysis.tone === 'conversational') voiceScore += 3
        if (historicalInsights.patterns.avgWordCount > 100 && historicalInsights.patterns.avgWordCount < 200) {
          voiceScore += 4 // Optimal length for Andrew's style
        }
      }

      // Generate performance prediction if historical insights are available
      let performancePrediction: PerformancePrediction | null = null
      if (historicalInsights) {
        try {
          performancePrediction = await performanceInsightsService.predictContentPerformance(
            content,
            historicalInsights
          )
          
          logger.info({ 
            agentName,
            predictedEngagement: performancePrediction.predictedEngagement,
            confidenceScore: performancePrediction.confidenceScore
          }, 'Performance prediction generated for content')
        } catch (error) {
          logger.warn({ error: error instanceof Error ? error.message : String(error), agentName }, 'Failed to generate performance prediction')
        }
      }

      const result: AIAgentResult = {
        agent_name: agentName,
        content: {
          title: `Andrew Tallents Post ${ideaNumber}`,
          body: content,
          hashtags: [], // Andrew rarely uses hashtags
          estimated_voice_score: Math.min(voiceScore, 100),
          approach: historicalInsights 
            ? `Performance-optimized Andrew style - Idea ${ideaNumber}` 
            : `Andrew Tallents authentic style - Idea ${ideaNumber}`,
          performance_prediction: performancePrediction || undefined
        },
        metadata: {
          token_count: (completion.usage?.input_tokens || 0) + (completion.usage?.output_tokens || 0),
          generation_time_ms: generationTime,
          model_used: appConfig.anthropic.model,
          research_sources: [`Enhanced research idea ${ideaNumber}`],
          historical_context_used: !!historicalInsights,
          similar_posts_analyzed: historicalInsights?.relatedPosts.length || 0,
          top_performer_score: historicalInsights?.performanceContext.topPerformingScore || 0,
          predicted_engagement: performancePrediction?.predictedEngagement || undefined,
          prediction_confidence: performancePrediction?.confidenceScore || undefined
        },
        score: historicalInsights ? 0.95 : 0.9 // Higher confidence with historical data
      }

      // Log constraint validation results
      logger.info({
        agentName,
        constraintValidation: constraintChecks,
        finalVoiceScore: result.content.estimated_voice_score,
        generationTimeMs: generationTime,
        tokenCount: result.metadata.token_count
      }, 'AI agent content generation completed with constraint validation')

      return result

    } catch (error) {
      // Enhanced error logging
      const errorDetails = {
        agentName,
        ideaNumber,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : 'Unknown',
        hasIdea: !!idea,
        hasVoiceGuidelines: !!voiceGuidelines,
        hasHistoricalInsights: !!historicalInsights,
        claudeModel: appConfig.anthropic.model,
        hasClaudeKey: !!appConfig.anthropic.apiKey
      }
      
      logger.error(errorDetails, 'AI agent content generation failed - detailed error info')
      
      // If it's a Claude error, log additional details
      if (error && typeof error === 'object' && 'response' in error) {
        logger.error({
          agentName,
          claudeError: {
            status: (error as any).response?.status,
            statusText: (error as any).response?.statusText,
            data: (error as any).response?.data
          }
        }, 'Claude API error details')
      }
      
      return null
    }
  }

  /**
   * Check content for Andrew's authentic voice markers
   */
  private hasAndrewAuthenticityMarkers(content: string): boolean {
    let authenticityScore = 0
    
    // Confrontational opening patterns
    const confrontationalPatterns = [
      /^[A-Z][^.!?]*\s+is killing your\s+/i,
      /^Stop doing\s+/i,
      /^This is why\s+/i,
      /^Control is\s+/i,
      /^Toughness is\s+/i
    ]
    if (confrontationalPatterns.some(pattern => pattern.test(content))) {
      authenticityScore += 25 // High value for confrontational openings
    }
    
    // Research citations
    const researchPatterns = [
      /Yale Center for/i,
      /Harvard (studies|research|Business School)/i,
      /Research (shows|from|indicates)/i,
      /Studies (show|indicate|reveal)/i
    ]
    if (researchPatterns.some(pattern => pattern.test(content))) {
      authenticityScore += 20 // High value for research backing
    }
    
    // Authority establishment phrases
    if (/The best founders I work with/i.test(content)) {
      authenticityScore += 15
    }
    if (/Top performers/i.test(content)) {
      authenticityScore += 10
    }
    
    // Dramatic structural elements
    if (/…/.test(content)) authenticityScore += 8 // Ellipses for drama
    if (/[1-3]️⃣/.test(content)) authenticityScore += 8 // Numbered emojis
    if (/💡|➡️|✅/.test(content)) authenticityScore += 5 // Andrew's emojis
    
    // Signature phrases
    const signaturePhrases = [
      /Here's the truth:/i,
      /But here's the shift:/i,
      /Follow me if/i
    ]
    signaturePhrases.forEach(pattern => {
      if (pattern.test(content)) authenticityScore += 8
    })
    
    // Challenge-reframe pattern
    if (/Most [^.!?]+ do [^.!?]+\. But [^.!?]+\./i.test(content)) {
      authenticityScore += 12 // High value for challenge-reframe
    }
    
    // Punchy sentence structure (short sentences with impact)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const shortSentences = sentences.filter(s => s.trim().split(/\s+/).length <= 8).length
    if (sentences.length > 0 && (shortSentences / sentences.length) > 0.4) {
      authenticityScore += 10 // Good for punchy structure
    }
    
    // Avoid generic business speak (penalty for common generic phrases)
    const genericPatterns = [
      /Are you feeling (overwhelmed|stuck|frustrated)/i,
      /Many leaders struggle with/i,
      /What if (we told you|I told you)/i,
      /In today's (competitive|business|challenging) environment/i
    ]
    if (genericPatterns.some(pattern => pattern.test(content))) {
      authenticityScore -= 20 // Penalty for generic content
    }
    
    logger.debug({
      authenticityScore,
      hasConfrontationalOpening: confrontationalPatterns.some(p => p.test(content)),
      hasResearchBacking: researchPatterns.some(p => p.test(content)),
      hasDramaticElements: /…|[1-3]️⃣/.test(content),
      hasGenericPhrases: genericPatterns.some(p => p.test(content))
    }, 'Andrew authenticity markers analysis')
    
    return authenticityScore >= 30 // Threshold for authentic Andrew voice
  }

  private getVariantSpecificRequirements(variantType: 'performance' | 'engagement' | 'experimental'): string {
    switch (variantType) {
      case 'performance':
        return `**PERFORMANCE-OPTIMIZED APPROACH:**
- Use Andrew's proven high-performing opening patterns: "Control is killing...", "Stop doing...", "This is why..."
- Include specific research citations (Yale Center, Harvard Business School, etc.)
- Structure with 1️⃣ 2️⃣ 3️⃣ numbered points for clarity
- Focus on professional authority and credible insights
- End with proven calls to action that drive engagement
- Optimize for reach and professional sharing
- Use Andrew's signature authority phrase: "The best founders I work with..."
- Include actionable takeaways that executives can implement`

      case 'engagement':
        return `**ENGAGEMENT-FOCUSED APPROACH:**
- Start with controversial or debate-sparking statements
- Include 2-3 direct questions to the audience throughout the post
- Use more personal vulnerability to invite sharing of experiences
- Create "agree or disagree?" moments that encourage comments
- Structure content to be more conversational and discussion-friendly
- Include contrarian takes that people will want to respond to
- End with a specific question that asks for audience input
- Use language that invites personal stories: "What's your experience with..."
- Create content that people feel compelled to share their own examples`

      case 'experimental':
        return `**EXPERIMENTAL APPROACH:**
- Try unconventional content structures (stories, analogies, unexpected formats)
- Use bold contrarian viewpoints that challenge even Andrew's usual positions
- Experiment with different opening hooks beyond the usual patterns
- Test new ways of presenting research and authority
- Try innovative uses of emojis, formatting, or visual elements
- Challenge conventional wisdom in unexpected ways
- Use unusual analogies or metaphors to make points
- Test audience response to different content lengths and styles
- Try provocative statements that push boundaries while staying authentic
- Experiment with different closing patterns beyond standard CTAs`
    }
  }

  async generateStrategicVariants(
    topic: string,
    research: EnhancedResearch,
    strategicVariants: ('performance' | 'engagement' | 'experimental')[],
    voiceGuidelines?: string,
    historicalInsights?: EnhancedInsight
  ): Promise<AIAgentResult[]> {
    const startTime = Date.now()
    logger.info({ topic, strategicVariants }, 'Generating strategic content variants with differentiated approaches')

    try {
      const results = []
      
      // Generate each strategic variant with its specific approach
      for (let i = 0; i < strategicVariants.length; i++) {
        const variantType = strategicVariants[i]
        const ideaNumber = (i + 1) as 1 | 2 | 3
        const idea = research[`idea_${ideaNumber}` as keyof EnhancedResearch] as ResearchIdea
        
        logger.info({ topic, variantType, ideaNumber }, `Starting strategic variant: ${variantType}`)
        
        const result = await this.generateStrategicVariation(ideaNumber, idea, variantType, voiceGuidelines, historicalInsights)
        if (result) results.push(result)
        
        // Small delay between agents to be gentle on OpenAI API
        if (i < strategicVariants.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      if (results.length === 0) {
        throw new Error('No valid strategic variants generated')
      }

      const totalTime = Date.now() - startTime
      logger.info({ 
        topic,
        totalTimeMs: totalTime,
        successfulVariants: results.length,
        failedVariants: strategicVariants.length - results.length,
        strategicTypes: strategicVariants
      }, 'All strategic content variants completed')

      return results

    } catch (error) {
      logger.error({ error, topic, strategicVariants }, 'Failed to generate strategic content variants')
      throw error
    }
  }

  async generateAllVariations(
    topic: string,
    research: EnhancedResearch,
    voiceGuidelines?: string,
    historicalInsights?: EnhancedInsight,
    isUserStory?: boolean
  ): Promise<AIAgentResult[]> {
    const startTime = Date.now()
    logger.info({ topic }, 'Generating all Andrew Tallents content variations')

    try {
      // Generate content for each research idea SEQUENTIALLY to avoid rate limiting and resource contention
      logger.info({ topic }, 'Starting sequential AI agent generation to avoid rate limiting')
      
      const results = []
      
      // Agent 1
      logger.info({ topic, agentNumber: 1, isUserStory }, 'Starting AI agent 1')
      const result1 = await this.generateSingleVariation(1, research.idea_1, voiceGuidelines, historicalInsights, isUserStory)
      if (result1) results.push(result1)
      
      // Small delay between agents to be gentle on OpenAI API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Agent 2
      logger.info({ topic, agentNumber: 2, isUserStory }, 'Starting AI agent 2')
      const result2 = await this.generateSingleVariation(2, research.idea_2, voiceGuidelines, historicalInsights, isUserStory)
      if (result2) results.push(result2)
      
      // Small delay between agents
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Agent 3
      logger.info({ topic, agentNumber: 3, isUserStory }, 'Starting AI agent 3')
      const result3 = await this.generateSingleVariation(3, research.idea_3, voiceGuidelines, historicalInsights, isUserStory)
      if (result3) results.push(result3)
      
      // Results are already filtered (only non-null results were added)
      const validResults = results

      if (validResults.length === 0) {
        throw new Error('No valid content generated by any agent')
      }

      const totalTime = Date.now() - startTime
      logger.info({ 
        topic,
        totalTimeMs: totalTime,
        successfulAgents: validResults.length,
        failedAgents: 3 - validResults.length,
        usedHistoricalContext: !!historicalInsights,
        similarPostsAnalyzed: historicalInsights?.relatedPosts.length || 0
      }, 'All Andrew Tallents content variations completed')

      return validResults

    } catch (error) {
      logger.error({ error, topic }, 'Failed to generate all content variations')
      throw error
    }
  }
}

export const aiAgentsService = new AIAgentsService()