import { OpenAI } from 'openai'
import { appConfig } from '../config'
import logger from '../lib/logger'
import type { AIAgentResult } from '../types'

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

export class SimpleAIAgentsService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: appConfig.openai.apiKey
    })
  }

  private createSimplePrompt(ideaNumber: 1 | 2 | 3): string {
    return `Act as an informed LinkedIn expert specializing in content for CEOs and Founders of established businesses. You will be provided with specific details about a news topic relevant to this audience. You must only provide the output required. Do not include any other additional information about how or why the response is good. Provide only the output according to the below guidelines.

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
    idea: ResearchIdea
  ): Promise<AIAgentResult | null> {
    const startTime = Date.now()
    const agentName = `simple_andrew_agent_${ideaNumber}`
    
    logger.info({ agentName, ideaNumber }, 'Starting simple AI agent content generation')

    try {
      const systemPrompt = this.createSimplePrompt(ideaNumber)
      const userPrompt = this.createUserPrompt(idea)

      logger.info({ 
        agentName, 
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
        model: appConfig.openai.model 
      }, 'Making simple OpenAI API call')

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
      }, 'Simple OpenAI API call completed')

      const content = completion.choices[0]?.message?.content || ''
      
      if (!content.trim()) {
        logger.error({ agentName, finishReason: completion.choices[0]?.finish_reason }, 'Empty content generated from simple OpenAI call')
        throw new Error('Empty content generated')
      }

      const generationTime = Date.now() - startTime

      const result: AIAgentResult = {
        agent_name: agentName,
        content: {
          title: `Simple Andrew Post ${ideaNumber}`,
          body: content,
          hashtags: [], // Andrew rarely uses hashtags
          estimated_voice_score: 85, // Default score for simple version
          approach: `Simple Andrew style - Idea ${ideaNumber}`
        },
        metadata: {
          token_count: completion.usage?.total_tokens || 0,
          generation_time_ms: generationTime,
          model_used: appConfig.openai.model,
          research_sources: [`Simple research idea ${ideaNumber}`],
          historical_context_used: false,
          similar_posts_analyzed: 0,
          top_performer_score: 0
        },
        score: 0.85 // Default confidence for simple version
      }

      logger.info({ 
        agentName,
        ideaNumber,
        generationTimeMs: generationTime,
        tokenCount: result.metadata.token_count
      }, 'Simple AI agent content generation completed')

      return result

    } catch (error) {
      const errorDetails = {
        agentName,
        ideaNumber,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : 'Unknown',
        openaiModel: appConfig.openai.model,
        hasOpenaiKey: !!appConfig.openai.apiKey
      }
      
      logger.error(errorDetails, 'Simple AI agent content generation failed')
      
      return null
    }
  }

  async generateAllVariations(
    topic: string,
    research: EnhancedResearch
  ): Promise<AIAgentResult[]> {
    const startTime = Date.now()
    logger.info({ topic }, 'Generating all simple Andrew Tallents content variations')

    try {
      // Generate content for each research idea in parallel
      const generationPromises = [
        this.generateSingleVariation(1, research.idea_1),
        this.generateSingleVariation(2, research.idea_2),
        this.generateSingleVariation(3, research.idea_3)
      ]

      const results = await Promise.all(generationPromises)
      
      // Filter out any null results
      const validResults = results.filter((result): result is AIAgentResult => result !== null)

      if (validResults.length === 0) {
        throw new Error('No valid content generated by any simple agent')
      }

      const totalTime = Date.now() - startTime
      logger.info({ 
        topic,
        totalTimeMs: totalTime,
        successfulAgents: validResults.length,
        failedAgents: 3 - validResults.length
      }, 'All simple Andrew Tallents content variations completed')

      return validResults

    } catch (error) {
      logger.error({ error, topic }, 'Failed to generate all simple content variations')
      throw error
    }
  }
}

export const simpleAIAgentsService = new SimpleAIAgentsService()