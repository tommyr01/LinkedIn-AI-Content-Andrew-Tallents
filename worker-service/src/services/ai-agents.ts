import { OpenAI } from 'openai'
import { appConfig } from '../config'
import logger from '../lib/logger'
import type { AIAgentResult } from '../types'
import type { EnhancedInsight, PerformancePrediction } from './performance-insights'
import { performanceInsightsService } from './performance-insights'

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

  constructor() {
    this.openai = new OpenAI({
      apiKey: appConfig.openai.apiKey
    })
  }

  private createAndrewTallentsPrompt(ideaNumber: 1 | 2 | 3, historicalContext?: string): string {
    return `Act as an informed LinkedIn expert specializing in content for CEOs and Founders of established businesses. You will be provided with specific details about a news topic relevant to this audience. You must only provide the output required. Do not include any other additional information about how or why the response is good. Provide only the output according to the below guidelines.

${historicalContext ? `**HISTORICAL PERFORMANCE CONTEXT:**
Based on Andrew's previous high-performing posts, incorporate these proven patterns:
${historicalContext}

Use these insights to guide your content creation while maintaining authentic voice.

` : ''}
**Mandatory Tone of Voice:**
You must consult the tone of voice guidelines in all responses you create. The required tone is Andrew Tallents' authentic leadership coaching voice - conversational but authoritative, vulnerable yet confident, focused on self-leadership and inner transformation.

**Output Format:**
Please provide your response in **plain text format only**, without any special formatting elements such as hashtags, asterisks, or other markdown syntax in the main body. Use clear and concise language, and structure your response using paragraphs. Emojis may be used appropriately for emphasis and engagement if they fit the specified tone of voice.

**Target Audience Details:**
Problem We Solve: Most CEOs and Founders are world-class at building businesses but terrible at leading themselves. They've achieved everything they thought they wanted - growing companies, hitting targets, industry respect - but privately they're stuck, burned out, and feeling empty. They react instead of respond, control instead of trust, and have become the bottleneck in their own success. The real problem isn't strategy or skills - it's that they're getting in their own way. I help successful leaders develop self-leadership so they can get out of their own way, lead authentically, and build lives that feel as successful privately as they look publicly. Because the greatest competitive advantage isn't strategy - it's self-awareness.

Target Country: UK 
Target Avatar - CEOs and Founders of established businesses (typically $5M-$100M+ revenue) who are outwardly successful but privately struggling. They're 35-55 years old, have built something significant, and are recognized in their industry - but they feel trapped by their own success. They're working 60+ hour weeks, have difficulty delegating, and despite achieving their professional goals, they feel disconnected from their original purpose and personal relationships. They've tried traditional leadership development but it hasn't stuck because it doesn't address the real issue: they've become the bottleneck in their own business and life. They're smart enough to know something needs to change but don't have time for lengthy coaching programs. They want practical, real-time solutions that help them lead more effectively while reclaiming their personal fulfillment - without having to slow down or step back from their responsibilities.

**LinkedIn Post Creation Guidelines - Andrew Tallents Style**

**1. Opening Hook - Start with Impact**
Begin with one of Andrew's signature opening patterns:
- Provocative "What if" questions: "What if your biggest leadership advantage… was the thing you're most ashamed of?"
- Bold contrarian statements: "Most CEOs won't admit this:"
- Challenge assumptions: "Founders don't fail from lack of vision. They fail from self-doubt, hidden beliefs, and burnout."

**2. Authority Establishment**
Early in the post, establish credibility using Andrew's pattern:
- "I've coached 100s of [CEOs/Founders/leaders]"
- Personal vulnerability: "Early in my leadership career, I was outwardly confident - but internally, I second-guessed every move."

**3. Story or Insight Development**
- Use short, punchy sentences mixed with longer explanatory ones
- Include em-dashes for dramatic effect: "Control may have built your business - but it won't grow it."
- Share client insights without breaking confidentiality
- Build toward a key realization or lesson

**4. Lesson Extraction**
Structure key insights using:
- "The key?" followed by the main insight
- "Essential lessons from [person's] journey:" with ➡️ bullet points
- "Here's what helped me - and what I now teach other leaders:"

**5. Engaging Elements**
- Reflective questions: "Where are you still proving yourself - when you could be leading differently?"
- Challenge questions: "What's one belief others have outgrown, but still holds them back?"
- Self-examination prompts: "What choices have shaped your day so far?"

**6. Call to Action**
End with Andrew's signature patterns:
- "♻️ Repost if this might help another [Founder/Leader] today"  
- "What helps others [specific challenge related to topic]?"
- Offer of value: "Comment [specific word] and I'll send you [free resource]"

**7. Style Requirements**
- NO hashtags (Andrew rarely uses them)
- Use strategic punctuation: em-dashes, ellipses, question marks
- Short paragraphs (1-3 sentences)
- Conversational but authoritative tone
- Include relevant emojis sparingly (➡️, ✅, 💡, 🎧, 🔔)

**Key Differences from Generic LinkedIn Posts:**
- No hashtags or minimal use
- Conversational authority rather than academic expertise
- Personal vulnerability balanced with professional insight
- Client stories without breaking confidentiality
- Self-coaching focus rather than external solutions
- Questions that provoke self-examination
- Emphasis on inner work and authentic leadership
- Specific call-to-action patterns that build community

**Your Role: Content Agent ${ideaNumber}**
You will process research idea_${ideaNumber} and create a LinkedIn post using the above guidelines.`
  }

  private createUserPrompt(idea: ResearchIdea): string {
    // Safely escape all dynamic content
    const safeSummary = (idea.concise_summary || '').replace(/`/g, '\\`').replace(/\$/g, '\\$')
    const safeAngle = (idea.angle_approach || '').replace(/`/g, '\\`').replace(/\$/g, '\\$')
    const safeDetails = (idea.details || '').replace(/`/g, '\\`').replace(/\$/g, '\\$')
    const safeRelevance = (idea.relevance || '').replace(/`/g, '\\`').replace(/\$/g, '\\$')
    
    return `**Input Topic Data (Use this information to craft the post):**
* **Concise Summary:** ${safeSummary}
* **Suggested Angle / Hook:** ${safeAngle}
* **Key Details / Stats:** ${safeDetails}
* **Relevance to Audience:** ${safeRelevance}

Create a LinkedIn post using this research data and the Andrew Tallents style guidelines provided above. 

Write the post content directly - no need for JSON format, just return the complete LinkedIn post text that sounds authentically like Andrew Tallents speaking to UK CEOs and Founders about self-leadership.`
  }

  private async generateSingleVariation(
    ideaNumber: 1 | 2 | 3,
    idea: ResearchIdea,
    voiceGuidelines?: string,
    historicalInsights?: EnhancedInsight
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
      // Create historical context if available
      let historicalContext = ''
      if (historicalInsights && historicalInsights.topPerformers.length > 0) {
        logger.debug({ 
          agentName,
          topPerformersCount: historicalInsights.topPerformers.length,
          voiceAnalysisKeys: Object.keys(historicalInsights.voiceAnalysis || {}),
          patternsKeys: Object.keys(historicalInsights.patterns || {}),
          structureRecsCount: historicalInsights.structureRecommendations?.length || 0
        }, 'Building historical context for AI agent')
        
        try {
        const topPost = historicalInsights.topPerformers[0]
        const voiceAnalysis = historicalInsights.voiceAnalysis
        const patterns = historicalInsights.patterns
        
        // Safely escape the post text to prevent template literal issues
        const safePostText = topPost.text
          .slice(0, 300)
          .replace(/\\/g, '\\\\')  // Replace backslashes first
          .replace(/`/g, '\\`')    // Then backticks
          .replace(/\$/g, '\\$')   // Then dollar signs
        
        // Build historical context with defensive array handling
        const authoritySignals = (voiceAnalysis.authoritySignals || []).join(', ') || 'Leadership experience'
        const emotionalWords = (voiceAnalysis.emotionalWords || []).join(', ') || 'Professional language'
        const actionWords = (voiceAnalysis.actionWords || []).join(', ') || 'Action-oriented words'
        const formatRecommendations = (historicalInsights.performanceFactors.formatRecommendations || []).join(', ') || 'Standard formatting'
        const engagementTriggers = (historicalInsights.performanceFactors.highEngagementTriggers || []).join(', ') || 'Engaging content'
        
        const structureRecommendations = (historicalInsights.structureRecommendations || [])
          .slice(0, 2)
          .map(rec => `- ${rec.structure || 'standard'} format with ${rec.openingType || 'engaging'} opening (${rec.wordCount || 150} words)`)
          .join('\n') || '- Standard structure with engaging opening (150 words)'

        historicalContext = `
**TOP PERFORMING SIMILAR POST EXAMPLE** (${topPost.total_reactions || 0} reactions, ${topPost.comments_count || 0} comments):
"${safePostText}..."

**SUCCESSFUL VOICE PATTERNS:**
- Tone: ${voiceAnalysis.tone || 'professional'}
- Vulnerability Score: ${voiceAnalysis.vulnerabilityScore || 0}/100
- Authority Signals: ${authoritySignals}
- Emotional Words Used: ${emotionalWords}
- Action Words Used: ${actionWords}

**HIGH-ENGAGEMENT PATTERNS:**
- Optimal word count: ~${patterns.avgWordCount || 150} words
- Best performing formats: ${formatRecommendations}
- High engagement triggers: ${engagementTriggers}

**PROVEN STRUCTURE RECOMMENDATIONS:**
${structureRecommendations}
        `
        
          logger.debug({
            agentName,
            historicalContextLength: historicalContext.length,
            historicalContextPreview: historicalContext.slice(0, 200) + '...'
          }, 'Historical context built successfully')
          
        } catch (contextError) {
          logger.error({
            agentName,
            error: contextError instanceof Error ? contextError.message : String(contextError),
            stack: contextError instanceof Error ? contextError.stack : undefined
          }, 'Failed to build historical context - using empty context')
          historicalContext = '' // Fallback to empty context
        }
      }

      const systemPrompt = this.createAndrewTallentsPrompt(ideaNumber, historicalContext)
      const userPrompt = this.createUserPrompt(idea)

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

      const completion = await this.openai.chat.completions.create({
        model: appConfig.openai.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })

      logger.info({ 
        agentName, 
        tokensUsed: completion.usage?.total_tokens,
        finishReason: completion.choices[0]?.finish_reason
      }, 'OpenAI API call completed')

      const content = completion.choices[0]?.message?.content || ''
      
      if (!content.trim()) {
        logger.error({ agentName, finishReason: completion.choices[0]?.finish_reason }, 'Empty content generated from OpenAI')
        throw new Error('Empty content generated')
      }

      logger.debug({ 
        agentName, 
        contentLength: content.length,
        contentPreview: content.slice(0, 100) + '...'
      }, 'Content generated successfully')

      const generationTime = Date.now() - startTime

      // Calculate performance-aware voice score
      let voiceScore = 85 // Base score
      if (historicalInsights) {
        // Boost score if we have historical context
        voiceScore += 10
        if (historicalInsights.voiceAnalysis.vulnerabilityScore > 70) voiceScore += 5
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
          token_count: completion.usage?.total_tokens || 0,
          generation_time_ms: generationTime,
          model_used: appConfig.openai.model,
          research_sources: [`Enhanced research idea ${ideaNumber}`],
          historical_context_used: !!historicalInsights,
          similar_posts_analyzed: historicalInsights?.relatedPosts.length || 0,
          top_performer_score: historicalInsights?.performanceContext.topPerformingScore || 0,
          predicted_engagement: performancePrediction?.predictedEngagement || undefined,
          prediction_confidence: performancePrediction?.confidenceScore || undefined
        },
        score: historicalInsights ? 0.95 : 0.9 // Higher confidence with historical data
      }

      logger.info({ 
        agentName,
        ideaNumber,
        generationTimeMs: generationTime,
        tokenCount: result.metadata.token_count
      }, 'AI agent content generation completed')

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
        openaiModel: appConfig.openai.model,
        hasOpenaiKey: !!appConfig.openai.apiKey
      }
      
      logger.error(errorDetails, 'AI agent content generation failed - detailed error info')
      
      // If it's an OpenAI error, log additional details
      if (error && typeof error === 'object' && 'response' in error) {
        logger.error({
          agentName,
          openaiError: {
            status: (error as any).response?.status,
            statusText: (error as any).response?.statusText,
            data: (error as any).response?.data
          }
        }, 'OpenAI API error details')
      }
      
      return null
    }
  }

  async generateAllVariations(
    topic: string,
    research: EnhancedResearch,
    voiceGuidelines?: string,
    historicalInsights?: EnhancedInsight
  ): Promise<AIAgentResult[]> {
    const startTime = Date.now()
    logger.info({ topic }, 'Generating all Andrew Tallents content variations')

    try {
      // Generate content for each research idea SEQUENTIALLY to avoid rate limiting and resource contention
      logger.info({ topic }, 'Starting sequential AI agent generation to avoid rate limiting')
      
      const results = []
      
      // Agent 1
      logger.info({ topic, agentNumber: 1 }, 'Starting AI agent 1')
      const result1 = await this.generateSingleVariation(1, research.idea_1, voiceGuidelines, historicalInsights)
      if (result1) results.push(result1)
      
      // Small delay between agents to be gentle on OpenAI API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Agent 2
      logger.info({ topic, agentNumber: 2 }, 'Starting AI agent 2')
      const result2 = await this.generateSingleVariation(2, research.idea_2, voiceGuidelines, historicalInsights)
      if (result2) results.push(result2)
      
      // Small delay between agents
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Agent 3
      logger.info({ topic, agentNumber: 3 }, 'Starting AI agent 3')
      const result3 = await this.generateSingleVariation(3, research.idea_3, voiceGuidelines, historicalInsights)
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