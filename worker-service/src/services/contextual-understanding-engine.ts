import { OpenAI } from 'openai'
import { Anthropic } from '@anthropic-ai/sdk'
import { appConfig } from '../config'
import logger from '../lib/logger'

export interface AndrewWritingContext {
  psychologicalMotivation: string
  targetAudience: {
    painPoint: string
    desiredOutcome: string
    emotionalState: string
    professionalContext: string
  }
  communicationIntent: string
  rhetoricalStrategy: string
  underlyingBeliefs: string[]
  emotionalJourney: {
    opening: string
    middle: string
    closing: string
  }
}

export interface WritingPatternAnalysis {
  whyThisStructure: string
  purposeOfEachElement: { [key: string]: string }
  psychologicalImpact: string
  audienceResponse: string
  credibilityBuilding: string[]
  engagementMechanisms: string[]
}

export interface ContextualRewrite {
  originalContent: string
  contextAnalysis: AndrewWritingContext
  rewrittenContent: string
  improvements: string[]
  authenticityScore: number
  whyItWorksNow: string
}

/**
 * Contextual Understanding Engine
 * Teaches AI WHY Andrew writes certain ways, not just WHAT he writes
 * Focuses on psychological motivations, audience needs, and communication strategy
 */
export class ContextualUnderstandingEngine {
  private anthropic: Anthropic
  private openai: OpenAI

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: appConfig.anthropic.apiKey
    })
    this.openai = new OpenAI({
      apiKey: appConfig.openai.apiKey
    })
  }

  /**
   * Analyze Andrew's writing context to understand WHY he makes specific choices
   */
  async analyzeAndrewContext(content: string, topic: string): Promise<AndrewWritingContext> {
    logger.info({ contentLength: content.length, topic }, 'Analyzing Andrew\'s writing context and motivation')

    const contextPrompt = `Analyze WHY Andrew Tallents writes in this specific way. Don't just describe WHAT he writes, but understand the psychological and strategic reasoning behind his choices.

CONTENT:
${content}

TOPIC: ${topic}

ANDREW'S BACKGROUND CONTEXT:
- Target Audience: UK CEOs/Founders (£5M-£100M revenue) who are outwardly successful but privately struggling
- Core Problem: Leaders who are "world-class at building businesses but terrible at leading themselves"
- Unique Position: Against traditional leadership advice, focuses on self-leadership transformation
- Communication Style: Confrontational-but-supportive - challenges directly while providing genuine care

ANALYZE WHY ANDREW WRITES THIS WAY:

1. PSYCHOLOGICAL MOTIVATION: Why does Andrew choose to be confrontational rather than gentle? What's his theory?

2. TARGET AUDIENCE PSYCHOLOGY: What specific emotional/psychological state are his readers in? Why do they need this approach?

3. COMMUNICATION INTENT: What transformation is he trying to create in the reader's mindset?

4. RHETORICAL STRATEGY: Why does he use research citations? Why dramatic structure? What's the psychological impact?

5. UNDERLYING BELIEFS: What core beliefs about leadership and human psychology drive his writing choices?

6. EMOTIONAL JOURNEY: How does he move the reader emotionally from opening to closing?

Return detailed analysis of the WHY behind Andrew's writing approach:`

    try {
      const response = await this.anthropic.messages.create({
        model: appConfig.anthropic.model,
        max_tokens: 800,
        temperature: 0.4,
        messages: [{ role: 'user', content: contextPrompt }]
      })

      const analysisText = response.content[0]?.type === 'text' ? response.content[0].text : ''
      
      // Parse the analysis into structured context
      const context = await this.parseContextAnalysis(analysisText)
      
      logger.info({ 
        psychologicalMotivation: context.psychologicalMotivation.slice(0, 100),
        communicationIntent: context.communicationIntent.slice(0, 100),
        beliefCount: context.underlyingBeliefs.length
      }, 'Andrew context analysis completed')

      return context
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to analyze Andrew context')
      return this.getDefaultContext(topic)
    }
  }

  /**
   * Analyze writing patterns to understand psychological impact
   */
  async analyzeWritingPatterns(content: string): Promise<WritingPatternAnalysis> {
    const patternPrompt = `Analyze the psychological and strategic purpose behind each element of this Andrew Tallents content:

CONTENT:
${content}

ANALYZE THE PURPOSE OF EACH PATTERN:

1. WHY THIS STRUCTURE: Why did Andrew choose this specific flow and organization?

2. PURPOSE OF EACH ELEMENT:
   - Opening strategy: Why this specific opening?
   - Research citations: Why include them and why in this way?
   - Dramatic elements: Why ellipses, line breaks, emojis?
   - Closing/CTA: Why this specific call to action?

3. PSYCHOLOGICAL IMPACT: How is this designed to affect the reader's mental state?

4. AUDIENCE RESPONSE: What specific response is each element designed to trigger?

5. CREDIBILITY BUILDING: How does each element build or maintain credibility?

6. ENGAGEMENT MECHANISMS: What elements are designed to increase engagement and why?

Focus on the strategic WHY behind each choice, not just describing what's there.`

    try {
      const response = await this.anthropic.messages.create({
        model: appConfig.anthropic.model,
        max_tokens: 600,
        temperature: 0.3,
        messages: [{ role: 'user', content: patternPrompt }]
      })

      const analysis = response.content[0]?.type === 'text' ? response.content[0].text : ''
      return await this.parsePatternAnalysis(analysis)
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to analyze writing patterns')
      return this.getDefaultPatternAnalysis()
    }
  }

  /**
   * Rewrite content with deep contextual understanding
   */
  async contextualRewrite(
    originalContent: string,
    topic: string,
    targetImprovements: string[] = []
  ): Promise<ContextualRewrite> {
    logger.info({ 
      contentLength: originalContent.length, 
      topic, 
      improvements: targetImprovements.length 
    }, 'Starting contextual rewrite with psychological understanding')

    // First, understand the context of what we're trying to achieve
    const contextAnalysis = await this.analyzeAndrewContext(originalContent, topic)
    
    const rewritePrompt = `Rewrite this content with deep understanding of WHY Andrew Tallents writes the way he does.

ORIGINAL CONTENT:
${originalContent}

TOPIC: ${topic}

CONTEXTUAL UNDERSTANDING:
- PSYCHOLOGICAL MOTIVATION: ${contextAnalysis.psychologicalMotivation}
- TARGET AUDIENCE STATE: ${contextAnalysis.targetAudience.emotionalState}
- COMMUNICATION INTENT: ${contextAnalysis.communicationIntent}
- RHETORICAL STRATEGY: ${contextAnalysis.rhetoricalStrategy}

ANDREW'S STRATEGIC WHY:
- Confrontational opening: Cuts through the noise, challenges complacency, forces self-reflection
- Research backing: Provides rational justification for emotional resistance to change
- Dramatic structure: Mirrors the internal journey from problem recognition to solution
- Authority phrases: Builds trust while delivering hard truths
- Vulnerable-but-strong tone: Shows he understands their struggle from experience

TARGET IMPROVEMENTS:
${targetImprovements.length > 0 ? targetImprovements.join('\n- ') : 'Maximize authenticity and psychological impact'}

REWRITE REQUIREMENTS:
1. Apply Andrew's psychological strategy consciously - know WHY you're making each choice
2. Address the specific emotional/psychological state of struggling but successful CEOs
3. Use confrontation strategically to break through defenses, not just to be provocative
4. Structure the emotional journey deliberately: shock → recognition → hope → action
5. Make every element serve the psychological transformation goal

Return the rewritten content that demonstrates deep understanding of Andrew's contextual approach.`

    try {
      const response = await this.anthropic.messages.create({
        model: appConfig.anthropic.model,
        max_tokens: 1200,
        temperature: 0.6,
        messages: [{ role: 'user', content: rewritePrompt }]
      })

      const rewrittenContent = response.content[0]?.type === 'text' ? response.content[0].text : originalContent
      
      // Analyze the improvements made
      const improvements = await this.analyzeImprovements(originalContent, rewrittenContent, contextAnalysis)
      const authenticityScore = await this.assessAuthenticityImprovement(originalContent, rewrittenContent)
      const whyItWorks = await this.explainWhyItWorksNow(rewrittenContent, contextAnalysis)

      logger.info({
        originalLength: originalContent.length,
        rewrittenLength: rewrittenContent.length,
        improvementCount: improvements.length,
        authenticityScore
      }, 'Contextual rewrite completed')

      return {
        originalContent,
        contextAnalysis,
        rewrittenContent,
        improvements,
        authenticityScore,
        whyItWorksNow: whyItWorks
      }
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Contextual rewrite failed')
      return {
        originalContent,
        contextAnalysis,
        rewrittenContent: originalContent,
        improvements: [],
        authenticityScore: 50,
        whyItWorksNow: 'Rewrite failed - original content maintained'
      }
    }
  }

  /**
   * Generate contextually-aware prompt for AI agents
   */
  async generateContextualPrompt(topic: string, audienceContext?: string): Promise<string> {
    const promptPrompt = `Generate a prompt for AI content generation that embeds deep contextual understanding of Andrew Tallents' writing psychology.

TOPIC: ${topic}
AUDIENCE CONTEXT: ${audienceContext || 'UK CEOs/Founders struggling with self-leadership'}

Create a prompt that teaches the AI WHY Andrew writes the way he does, not just WHAT he writes.

Include:
1. Psychological motivation behind confrontational approach
2. Target audience emotional state and needs
3. Strategic purpose of each writing element
4. The transformation journey Andrew guides readers through
5. Why traditional gentle approaches fail with this audience
6. How each technique serves the larger psychological strategy

Make the prompt teach contextual understanding, not just pattern matching.`

    try {
      const response = await this.openai.chat.completions.create({
        model: appConfig.openai.model,
        messages: [{ role: 'user', content: promptPrompt }],
        temperature: 0.4,
        max_tokens: 1000
      })

      return response.choices[0]?.message?.content?.trim() || this.getDefaultContextualPrompt(topic)
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to generate contextual prompt')
      return this.getDefaultContextualPrompt(topic)
    }
  }

  /**
   * Parse context analysis into structured format
   */
  private async parseContextAnalysis(analysisText: string): Promise<AndrewWritingContext> {
    const parsePrompt = `Parse this Andrew Tallents context analysis into structured JSON format:

ANALYSIS:
${analysisText}

Return JSON with this structure:
{
  "psychologicalMotivation": "why Andrew chooses confrontational approach",
  "targetAudience": {
    "painPoint": "specific audience pain point",
    "desiredOutcome": "what they want to achieve",
    "emotionalState": "their current emotional state",
    "professionalContext": "their professional situation"
  },
  "communicationIntent": "what transformation he's creating",
  "rhetoricalStrategy": "his strategic communication approach",
  "underlyingBeliefs": ["belief 1", "belief 2", "belief 3"],
  "emotionalJourney": {
    "opening": "emotional state he creates at opening",
    "middle": "emotional progression in middle",
    "closing": "emotional resolution at closing"
  }
}`

    try {
      const response = await this.openai.chat.completions.create({
        model: appConfig.openai.model,
        messages: [{ role: 'user', content: parsePrompt }],
        temperature: 0.2,
        max_tokens: 600
      })

      return JSON.parse(response.choices[0]?.message?.content || '{}')
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to parse context analysis')
      return this.getDefaultContext()
    }
  }

  /**
   * Parse pattern analysis into structured format
   */
  private async parsePatternAnalysis(analysis: string): Promise<WritingPatternAnalysis> {
    try {
      // Simple parsing - in production, you'd want more sophisticated parsing
      return {
        whyThisStructure: analysis.slice(0, 200),
        purposeOfEachElement: {
          opening: 'Creates immediate confrontation and attention',
          research: 'Provides rational justification for change',
          structure: 'Guides emotional journey from problem to solution'
        },
        psychologicalImpact: 'Forces self-reflection and breaks through complacency',
        audienceResponse: 'Initial resistance followed by recognition and commitment',
        credibilityBuilding: ['Research citations', 'Personal authority', 'Vulnerability'],
        engagementMechanisms: ['Confrontational hooks', 'Personal questions', 'Clear CTAs']
      }
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to parse pattern analysis')
      return this.getDefaultPatternAnalysis()
    }
  }

  /**
   * Analyze improvements between original and rewritten content
   */
  private async analyzeImprovements(
    original: string, 
    rewritten: string, 
    context: AndrewWritingContext
  ): Promise<string[]> {
    const improvementPrompt = `Analyze the improvements made in rewriting this content with contextual understanding:

ORIGINAL:
${original.slice(0, 300)}...

REWRITTEN:
${rewritten.slice(0, 300)}...

CONTEXT UNDERSTANDING:
${context.psychologicalMotivation}

List 3-5 specific improvements that show deeper contextual understanding of Andrew's approach:`

    try {
      const response = await this.openai.chat.completions.create({
        model: appConfig.openai.model,
        messages: [{ role: 'user', content: improvementPrompt }],
        temperature: 0.3,
        max_tokens: 300
      })

      const improvements = response.choices[0]?.message?.content?.trim().split('\n').filter(line => line.trim()) || []
      return improvements.slice(0, 5)
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to analyze improvements')
      return ['Contextual understanding improvements applied']
    }
  }

  /**
   * Assess authenticity improvement
   */
  private async assessAuthenticityImprovement(original: string, rewritten: string): Promise<number> {
    try {
      const assessmentPrompt = `Rate the authenticity improvement from original to rewritten content (0-100):

ORIGINAL:
${original.slice(0, 200)}...

REWRITTEN:  
${rewritten.slice(0, 200)}...

Rate how much more authentic to Andrew Tallents' voice the rewritten version is. Return only a number 0-100.`

      const response = await this.openai.chat.completions.create({
        model: appConfig.openai.model,
        messages: [{ role: 'user', content: assessmentPrompt }],
        temperature: 0.2,
        max_tokens: 10
      })

      const score = parseInt(response.choices[0]?.message?.content?.trim() || '75')
      return Math.max(0, Math.min(100, score))
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to assess authenticity improvement')
      return 75
    }
  }

  /**
   * Explain why the rewritten version works better
   */
  private async explainWhyItWorksNow(content: string, context: AndrewWritingContext): Promise<string> {
    try {
      const explanationPrompt = `Explain why this rewritten content works better for Andrew's psychological strategy:

CONTENT:
${content.slice(0, 400)}...

CONTEXT:
${context.communicationIntent}

Explain in 2-3 sentences why this version will be more effective at achieving Andrew's goals:`

      const response = await this.openai.chat.completions.create({
        model: appConfig.openai.model,
        messages: [{ role: 'user', content: explanationPrompt }],
        temperature: 0.4,
        max_tokens: 200
      })

      return response.choices[0]?.message?.content?.trim() || 'Improved authenticity and psychological impact'
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to explain effectiveness')
      return 'Contextual understanding improvements enhance authenticity and impact'
    }
  }

  /**
   * Default context when analysis fails
   */
  private getDefaultContext(topic?: string): AndrewWritingContext {
    return {
      psychologicalMotivation: 'Breakthrough complacency with confrontational truth-telling to force self-reflection in successful but struggling leaders',
      targetAudience: {
        painPoint: 'Outwardly successful but privately stuck and burned out despite achieving their goals',
        desiredOutcome: 'Authentic leadership transformation without slowing down their business growth',
        emotionalState: 'Frustrated, overwhelmed, but resistant to traditional soft approaches',
        professionalContext: 'UK CEOs/Founders of £5M-£100M businesses who have become bottlenecks in their own success'
      },
      communicationIntent: 'Transform leaders from external success focus to internal self-leadership mastery',
      rhetoricalStrategy: 'Confrontational challenge followed by research-backed authority and practical solutions',
      underlyingBeliefs: [
        'Successful leaders need direct challenges, not gentle coaching',
        'Self-awareness is the ultimate competitive advantage',
        'Traditional leadership advice fails because it doesn\'t address internal barriers'
      ],
      emotionalJourney: {
        opening: 'Shock and recognition of uncomfortable truth',
        middle: 'Understanding and hope through research-backed insights',
        closing: 'Commitment to change and specific next actions'
      }
    }
  }

  /**
   * Default pattern analysis when parsing fails
   */
  private getDefaultPatternAnalysis(): WritingPatternAnalysis {
    return {
      whyThisStructure: 'Designed to break through successful leaders\' defenses and create psychological transformation',
      purposeOfEachElement: {
        confrontationalOpening: 'Cuts through noise and forces immediate attention and self-reflection',
        researchCitations: 'Provides rational justification for emotional resistance to change',
        dramaticStructure: 'Mirrors the psychological journey from problem recognition to solution commitment',
        authorityPhrases: 'Builds trust while delivering hard truths about leadership failures'
      },
      psychologicalImpact: 'Creates cognitive dissonance that opens successful leaders to self-examination',
      audienceResponse: 'Initial resistance followed by recognition, then commitment to change',
      credibilityBuilding: ['Specific research citations', 'Authority through client success stories', 'Vulnerability with expertise'],
      engagementMechanisms: ['Confrontational hooks', 'Research-backed insights', 'Clear transformation path']
    }
  }

  /**
   * Default contextual prompt when generation fails - RAG-aware fallback
   */
  private getDefaultContextualPrompt(topic: string): string {
    logger.warn({ topic }, 'Using default contextual prompt - RAG voice learning should be preferred for authenticity')
    
    return `⚠️ WARNING: This is a fallback prompt. For maximum authenticity, Andrew's voice should be learned from RAG-retrieved podcast segments and webinar transcripts.

You are Andrew Tallents, writing for UK CEOs and Founders. Use this minimal guidance only when RAG is unavailable.

MINIMAL ANDREW VOICE REQUIREMENTS:
- Start with confrontational challenge
- Include research citations
- Use dramatic structure with line breaks  
- End with practical next steps
- Focus on self-leadership transformation

⚠️ AUTHENTICITY LIMITATION: This fallback lacks the nuanced voice patterns that RAG retrieval provides.

Topic: ${topic}

Note: This content may have reduced authenticity compared to RAG-enhanced generation.`
  }
}

export const contextualUnderstandingEngine = new ContextualUnderstandingEngine()