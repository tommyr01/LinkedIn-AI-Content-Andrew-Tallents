import { OpenAI } from 'openai'
import { appConfig } from '../config'
import logger from '../lib/logger'
import type { AIAgentResult, ResearchResult } from '../types'

export class AIAgentsService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: appConfig.openai.apiKey
    })
  }

  private createSystemPrompt(agentType: 'thought_leader' | 'storyteller' | 'practical_advisor'): string {
    const basePrompt = `You are Andrew Tallents, an experienced CEO coach who helps successful leaders develop self-leadership. Write LinkedIn posts in Andrew's authentic voice.

**CRITICAL INSTRUCTIONS:**
- Write the post directly without any headers, sections, or template markers
- Use natural paragraph breaks and spacing
- Make it feel like Andrew is speaking directly to the reader
- Return ONLY valid JSON without any markdown formatting or code blocks

**Andrew's Voice Guidelines:**
- Conversational yet professional
- Uses personal anecdotes and real client stories
- Vulnerable and authentic about struggles
- Direct and impactful
- Focuses on the inner journey of leadership

**Target Audience:**
CEOs and Founders ($5M-$100M revenue) who are outwardly successful but privately struggling. They're burned out, disconnected from purpose, and know they're the bottleneck in their own success.`

    const agentSpecificPrompts = {
      thought_leader: `
**Your Role: Thought Leadership Agent**
Focus on industry insights, leadership philosophy, and forward-thinking perspectives. Use the research data to provide authoritative commentary on trends and challenges.

**Approach:**
- Lead with a bold statement or contrarian view
- Back it up with data from research
- Connect it to leadership challenges
- End with a thought-provoking question or call to action`,

      storyteller: `
**Your Role: Storytelling Agent**
Focus on narrative-driven content using personal anecdotes, client stories, and emotional connections. Use research as context but lead with story.

**Approach:**
- Start with a compelling story or scenario
- Use specific details and emotions
- Weave in research insights naturally
- Connect the story to universal leadership lessons`,

      practical_advisor: `
**Your Role: Practical Advisor Agent**
Focus on actionable advice, frameworks, and tools. Use research to support practical recommendations.

**Approach:**
- Identify a specific challenge from research
- Provide step-by-step solutions
- Include practical frameworks or tools
- Give concrete next steps readers can take`
    }

    return `${basePrompt}\n\n${agentSpecificPrompts[agentType]}`
  }

  private createUserPrompt(
    topic: string, 
    research: { results: ResearchResult[], summary: string, keyInsights: string[] },
    agentType: string
  ): string {
    return `Create a LinkedIn post about: ${topic}

**Research Context:**
${research.summary}

**Key Insights:**
${research.keyInsights.slice(0, 3).map(insight => `• ${insight}`).join('\n')}

**Research Sources:**
${research.results.slice(0, 3).map(r => `• ${r.title} (${r.source})`).join('\n')}

Use this research to inform your content but write in Andrew's authentic voice. 

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "content": "Your complete LinkedIn post content here",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "estimated_voice_score": 85,
  "approach": "Brief description of your approach"
}`
  }

  async generateContent(
    topic: string,
    research: { results: ResearchResult[], summary: string, keyInsights: string[] },
    agentType: 'thought_leader' | 'storyteller' | 'practical_advisor',
    voiceGuidelines?: string
  ): Promise<AIAgentResult | null> {
    const startTime = Date.now()
    
    try {
      logger.info({ topic, agentType }, 'Generating content with AI agent')

      const systemPrompt = this.createSystemPrompt(agentType)
      const userPrompt = this.createUserPrompt(topic, research, agentType)

      const completion = await this.openai.chat.completions.create({
        model: appConfig.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from OpenAI')
      }

      // Parse JSON response
      let parsedContent
      try {
        // Clean up response
        const cleanResponse = response
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
        
        const jsonStart = cleanResponse.indexOf('{')
        const jsonEnd = cleanResponse.lastIndexOf('}')
        const jsonString = cleanResponse.substring(jsonStart, jsonEnd + 1)
        
        parsedContent = JSON.parse(jsonString)
      } catch (parseError) {
        logger.warn({ agentType, response }, 'Failed to parse JSON, creating fallback')
        
        // Create fallback content
        parsedContent = {
          content: response.replace(/```json|```/g, '').trim(),
          hashtags: ['#leadership', '#growth'],
          estimated_voice_score: 75,
          approach: `${agentType.replace('_', ' ')} approach`
        }
      }

      const generationTime = Date.now() - startTime

      const result: AIAgentResult = {
        agent_name: agentType,
        content: {
          title: parsedContent.title,
          body: parsedContent.content,
          hashtags: Array.isArray(parsedContent.hashtags) ? parsedContent.hashtags : ['#leadership'],
          estimated_voice_score: parsedContent.estimated_voice_score || 80,
          approach: parsedContent.approach || `${agentType.replace('_', ' ')} approach`
        },
        metadata: {
          token_count: completion.usage?.total_tokens || 0,
          generation_time_ms: generationTime,
          model_used: appConfig.openai.model,
          research_sources: research.results.slice(0, 3).map(r => r.source)
        },
        score: (parsedContent.estimated_voice_score || 80) / 100
      }

      logger.info({ 
        agentType, 
        generationTimeMs: generationTime,
        voiceScore: result.content.estimated_voice_score,
        tokenCount: result.metadata.token_count
      }, 'AI agent content generation completed')

      return result

    } catch (error) {
      logger.error({ error, agentType, topic }, 'AI agent content generation failed')
      return null
    }
  }

  async generateAllVariations(
    topic: string,
    research: { results: ResearchResult[], summary: string, keyInsights: string[] },
    voiceGuidelines?: string
  ): Promise<AIAgentResult[]> {
    const startTime = Date.now()
    logger.info({ topic }, 'Generating all content variations')

    const agents: ('thought_leader' | 'storyteller' | 'practical_advisor')[] = [
      'thought_leader',
      'storyteller', 
      'practical_advisor'
    ]

    try {
      // Generate content with all agents in parallel
      const promises = agents.map(agentType => 
        this.generateContent(topic, research, agentType, voiceGuidelines)
      )

      const results = await Promise.allSettled(promises)
      
      const successfulResults: AIAgentResult[] = []
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          successfulResults.push(result.value)
        } else {
          logger.warn({ agentType: agents[index] }, 'Agent failed to generate content')
        }
      })

      // If we have fewer than 3 results, create fallback content
      while (successfulResults.length < 3) {
        const fallbackAgent = agents[successfulResults.length]
        successfulResults.push({
          agent_name: fallbackAgent,
          content: {
            body: `LinkedIn post about ${topic} - ${fallbackAgent.replace('_', ' ')} approach\n\nThis is a fallback response as the AI service was unavailable. The content would normally be generated based on research insights and Andrew's authentic voice.`,
            hashtags: ['#leadership', '#growth'],
            estimated_voice_score: 70,
            approach: `${fallbackAgent.replace('_', ' ')} approach (fallback)`
          },
          metadata: {
            token_count: 100,
            generation_time_ms: 100,
            model_used: 'fallback',
            research_sources: []
          },
          score: 0.70
        })
      }

      const totalTime = Date.now() - startTime
      logger.info({ 
        topic, 
        variationCount: successfulResults.length,
        totalTimeMs: totalTime 
      }, 'All content variations generated')

      return successfulResults

    } catch (error) {
      logger.error({ error, topic }, 'Failed to generate content variations')
      
      // Return minimal fallback content
      return agents.map(agentType => ({
        agent_name: agentType,
        content: {
          body: `Content about ${topic} - ${agentType.replace('_', ' ')} perspective`,
          hashtags: ['#leadership'],
          estimated_voice_score: 60,
          approach: `${agentType.replace('_', ' ')} approach (error fallback)`
        },
        metadata: {
          token_count: 50,
          generation_time_ms: 0,
          model_used: 'fallback',
          research_sources: []
        },
        score: 0.60
      }))
    }
  }
}

export const aiAgentsService = new AIAgentsService()
export default aiAgentsService