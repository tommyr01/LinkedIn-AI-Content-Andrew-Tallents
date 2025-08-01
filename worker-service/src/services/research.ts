import { createHash } from 'crypto'
import { appConfig } from '../config'
import logger from '../lib/logger'
import { supabaseService } from './supabase'
import { historicalAnalysisService } from './historical-analysis'
import { performanceInsightsService } from './performance-insights'
import type { ResearchResult } from '../types'

export class ResearchService {
  
  private generateQueryHash(query: string, source: string): string {
    return createHash('sha256').update(`${source}:${query}`).digest('hex')
  }

  private async getCachedResearch(query: string, source: string): Promise<any | null> {
    const queryHash = this.generateQueryHash(query, source)
    const cached = await supabaseService.getCachedResearch(queryHash)
    
    if (cached) {
      logger.info({ source, queryHash }, 'Using cached research data')
      return cached.results
    }
    
    return null
  }

  private async setCachedResearch(query: string, source: string, results: any, ttlHours: number = 24): Promise<void> {
    const queryHash = this.generateQueryHash(query, source)
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)
    
    await supabaseService.setCachedResearch({
      queryHash,
      source,
      queryText: query,
      results,
      expiresAt
    })
    
    logger.debug({ source, queryHash, ttlHours }, 'Cached research data')
  }

  async searchWithFirecrawl(query: string): Promise<ResearchResult[]> {
    try {
      // Check cache first
      const cached = await this.getCachedResearch(query, 'firecrawl')
      if (cached) {
        return cached
      }

      logger.info({ query }, 'Searching with Firecrawl')

      // Use Firecrawl search API
      const response = await fetch('https://api.firecrawl.dev/v0/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${appConfig.research.firecrawl.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          pageOptions: {
            fetchPageContent: true,
            includeHtml: false
          },
          searchOptions: {
            limit: 5
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`)
      }

      const data: any = await response.json()
      
      const results: ResearchResult[] = (data.data || []).map((item: any) => ({
        source: 'firecrawl',
        title: item.metadata?.title || 'No title',
        content: item.content || item.markdown || '',
        url: item.metadata?.sourceURL || item.url,
        relevance_score: 0.8,
        summary: item.content?.substring(0, 200) + '...' || ''
      }))

      // Cache results for 24 hours
      await this.setCachedResearch(query, 'firecrawl', results, 24)

      logger.info({ query, resultCount: results.length }, 'Firecrawl search completed')
      return results

    } catch (error) {
      logger.error({ error, query }, 'Firecrawl search failed')
      return []
    }
  }

  async searchWithPerplexity(query: string): Promise<ResearchResult[]> {
    try {
      // Check cache first
      const cached = await this.getCachedResearch(query, 'perplexity')
      if (cached) {
        return cached
      }

      logger.info({ query }, 'Searching with Perplexity')

      // Use Perplexity API for research
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${appConfig.research.perplexity.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'system',
              content: 'You are a research assistant. Provide comprehensive, factual information about the given topic. Include relevant statistics, recent developments, and key insights. Format your response as structured information that would be useful for creating LinkedIn content.'
            },
            {
              role: 'user',
              content: `Research the topic: ${query}. Provide key insights, recent trends, statistics, and practical information that would be valuable for creating professional LinkedIn content about this topic.`
            }
          ],
          max_tokens: 1000,
          temperature: 0.3,
          return_citations: true,
          return_images: false
        })
      })

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`)
      }

      const data: any = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      const citations = data.citations || []

      const results: ResearchResult[] = [{
        source: 'perplexity',
        title: `Research: ${query}`,
        content,
        url: citations[0]?.url || null,
        relevance_score: 0.9,
        summary: content.substring(0, 300) + '...'
      }]

      // Add citations as separate results
      citations.forEach((citation: any, index: number) => {
        if (citation.url && citation.title) {
          results.push({
            source: 'perplexity',
            title: citation.title,
            content: citation.snippet || '',
            url: citation.url,
            relevance_score: 0.7,
            summary: citation.snippet?.substring(0, 200) + '...' || ''
          })
        }
      })

      // Cache results for 12 hours (more dynamic content)
      await this.setCachedResearch(query, 'perplexity', results, 12)

      logger.info({ query, resultCount: results.length }, 'Perplexity search completed')
      return results

    } catch (error) {
      logger.error({ error, query }, 'Perplexity search failed')
      return []
    }
  }

  async enhancedFirecrawlResearch(topic: string): Promise<{
    idea_1: {
      concise_summary: string
      angle_approach: string
      details: string
      relevance: string
    }
    idea_2: {
      concise_summary: string
      angle_approach: string
      details: string
      relevance: string
    }
    idea_3: {
      concise_summary: string
      angle_approach: string
      details: string
      relevance: string
    }
    historicalInsights?: any
  }> {
    const startTime = Date.now()
    logger.info({ topic }, 'Starting enhanced Firecrawl research')

    try {
      // Calculate 7-day date range
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      // Search for recent UK business news related to CEOs and leadership
      const searchQueries = [
        'UK CEO leadership challenges 2024',
        'UK business founders burnout stress',
        'UK tech startup leadership self-leadership',
        'UK executive coaching leadership development'
      ]

      // Get news from multiple searches
      let allNewsContent = ''
      for (const query of searchQueries) {
        try {
          const searchResults = await this.searchWithFirecrawl(query)
          const recentResults = searchResults.slice(0, 3) // Top 3 results per query
          
          for (const result of recentResults) {
            allNewsContent += `\n\n=== ${result.title} ===\n${result.content}\nSource: ${result.url}\n`
          }
        } catch (error) {
          logger.warn({ query, error }, 'Failed to search with query')
        }
      }

      if (!allNewsContent.trim()) {
        throw new Error('No research content found')
      }

      // Use OpenAI to analyze the news with the user's research prompt
      const { OpenAI } = await import('openai')
      const openai = new OpenAI({ apiKey: appConfig.openai.apiKey })

      const researchPrompt = `You are a helpful assistant

Role: You are a specialized Research Analyst. Your sole purpose is to identify and research recent news topics relevant to a specific professional audience and compile the findings into a structured JSON output. You do not create the final content, only provide the research material.

Context: You will receive details about the target audience (Avatar), the service provided to them (Problem We Solve), their location (Country), and the current timestamp. You will analyze the provided news content to identify relevant topics.

Inputs Provided:
Problem We Solve: Most CEOs and Founders are world-class at building businesses but terrible at leading themselves. They've achieved everything they thought they wanted - growing companies, hitting targets, industry respect - but privately they're stuck, burned out, and feeling empty. They react instead of respond, control instead of trust, and have become the bottleneck in their own success. The real problem isn't strategy or skills - it's that they're getting in their own way. I help successful leaders develop self-leadership so they can get out of their own way, lead authentically, and build lives that feel as successful privately as they look publicly. Because the greatest competitive advantage isn't strategy - it's self-awareness.

Target Country: UK 
Current Timestamp: ${now.toISOString()}

Target Avatar - CEOs and Founders of established businesses (typically $5M-$100M+ revenue) who are outwardly successful but privately struggling. They're 35-55 years old, have built something significant, and are recognized in their industry - but they feel trapped by their own success. They're working 60+ hour weeks, have difficulty delegating, and despite achieving their professional goals, they feel disconnected from their original purpose and personal relationships. They've tried traditional leadership development but it hasn't stuck because it doesn't address the real issue: they've become the bottleneck in their own business and life. They're smart enough to know something needs to change but don't have time for lengthy coaching programs. They want practical, real-time solutions that help them lead more effectively while reclaiming their personal fulfillment - without having to slow down or step back from their responsibilities.

Your Task:
1. Analyze the provided news content covering the immediately preceding 7 days from ${now.toISOString()}.
2. Identify exactly three (3) distinct news topics that are highly relevant to CEOs and Founders operating in the UK. Focus on topics impacting their industry, business operations, challenges, or opportunities, particularly relating to the self-leadership problems I solve.
3. Extract Key Information: For each topic, determine a concise summary, a potential angle, key details, and its relevance to the target audience.

Required Output Format:
CRITICAL: Your response must be ONLY valid JSON. No explanations, no markdown, no code blocks, no additional text. 

Start your response immediately with { and end with }

Return exactly this JSON structure:

{
  "idea_1": {
    "concise_summary": "A brief (1-2 sentence) overview identifying the core news topic or idea found.",
    "angle_approach": "Suggest a specific angle or hook (1-2 sentences) for framing this topic in a LinkedIn post for the Target Avatar. Consider how it relates to self-leadership challenges.",
    "details": "List key details extracted from the research (2-4 bullet points or sentences). Include specific statistics, names, key findings, data points, source names, or update summaries mentioned in the source articles.",
    "relevance": "Explain clearly (2-3 sentences) WHY this topic and its details are relevant and insightful for the Target Avatar, considering their business challenges and self-leadership development opportunities in the UK."
  },
  "idea_2": {
    "concise_summary": "A brief (1-2 sentence) overview identifying the core news topic or idea found.",
    "angle_approach": "Suggest a specific angle or hook (1-2 sentences) for framing this topic in a LinkedIn post for the Target Avatar. Consider how it relates to self-leadership challenges.",
    "details": "List key details extracted from the research (2-4 bullet points or sentences). Include specific statistics, names, key findings, data points, source names, or update summaries mentioned in the source articles.",
    "relevance": "Explain clearly (2-3 sentences) WHY this topic and its details are relevant and insightful for the Target Avatar, considering their business challenges and self-leadership development opportunities in the UK."
  },
  "idea_3": {
    "concise_summary": "A brief (1-2 sentence) overview identifying the core news topic or idea found.",
    "angle_approach": "Suggest a specific angle or hook (1-2 sentences) for framing this topic in a LinkedIn post for the Target Avatar. Consider how it relates to self-leadership challenges.",
    "details": "List key details extracted from the research (2-4 bullet points or sentences). Include specific statistics, names, key findings, data points, source names, or update summaries mentioned in the source articles.",
    "relevance": "Explain clearly (2-3 sentences) WHY this topic and its details are relevant and insightful for the Target Avatar, considering their business challenges and self-leadership development opportunities in the UK."
  }
}

DO NOT include any text before or after the JSON object. DO NOT wrap in markdown code blocks.

Here is the news content to analyze:
${allNewsContent}`

      const completion = await openai.chat.completions.create({
        model: appConfig.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are a research analyst. You must respond with ONLY valid JSON. No explanations, no markdown, no code blocks. Start immediately with { and end with }.'
          },
          {
            role: 'user',
            content: researchPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1, // Lower temperature for more consistent JSON output
        response_format: { type: "json_object" } // Force JSON mode if available
      })

      const responseContent = completion.choices[0]?.message?.content || ''
      
      // SURGICAL LOGGING: Capture exact OpenAI response
      logger.error({ 
        responseLength: responseContent.length,
        responsePreview: responseContent.substring(0, 500) + '...',
        fullResponse: responseContent
      }, 'SURGICAL DEBUG - RAW OPENAI RESPONSE FOR RESEARCH')
      
      // Robust JSON parsing with fallback handling
      let researchData
      try {
        // Try direct JSON parsing first
        researchData = JSON.parse(responseContent)
        logger.error({ 
          parsedDataType: typeof researchData,
          parsedDataKeys: Object.keys(researchData),
          idea1Type: typeof researchData.idea_1,
          idea1Value: researchData.idea_1
        }, 'SURGICAL DEBUG - PARSED RESEARCH DATA STRUCTURE')
        
        // CRITICAL FIX: Validate and auto-correct structure if OpenAI returns strings instead of objects
        if (researchData && (typeof researchData.idea_1 === 'string' || typeof researchData.idea_2 === 'string' || typeof researchData.idea_3 === 'string')) {
          logger.error({
            idea1Type: typeof researchData.idea_1,
            idea2Type: typeof researchData.idea_2,
            idea3Type: typeof researchData.idea_3
          }, 'RESEARCH SERVICE FIX: OpenAI returned strings instead of objects - auto-correcting structure')
          
          // Convert string ideas to proper objects
          const fixIdea = (ideaString: string, ideaNumber: number) => ({
            concise_summary: `Research insight ${ideaNumber} on ${topic}`,
            angle_approach: `How this ${topic} development reveals key leadership challenges for UK executives`,
            details: typeof ideaString === 'string' ? ideaString.substring(0, 200) + '...' : 'Key insights from recent research',
            relevance: `This topic directly impacts UK CEOs and Founders who are struggling with self-leadership challenges as their businesses grow.`
          })
          
          researchData = {
            idea_1: typeof researchData.idea_1 === 'string' ? fixIdea(researchData.idea_1, 1) : researchData.idea_1,
            idea_2: typeof researchData.idea_2 === 'string' ? fixIdea(researchData.idea_2, 2) : researchData.idea_2,
            idea_3: typeof researchData.idea_3 === 'string' ? fixIdea(researchData.idea_3, 3) : researchData.idea_3
          }
          
          logger.info('Research data structure auto-corrected successfully')
        }
        
      } catch (parseError) {
        logger.warn({ parseError }, 'Direct JSON parsing failed, trying extraction methods')
        
        // Try to extract JSON from response (handle markdown code blocks, etc.)
        const jsonExtractionAttempts = [
          // Try to find JSON between ```json and ``` 
          responseContent.match(/```json\s*([\s\S]*?)\s*```/)?.[1],
          // Try to find JSON between { and }
          responseContent.match(/(\{[\s\S]*\})/)?.[1],
          // Try to find JSON after "output:" or similar
          responseContent.match(/(?:output|result|json):\s*(\{[\s\S]*\})/i)?.[1]
        ]
        
        let extractedJson = null
        for (const attempt of jsonExtractionAttempts) {
          if (attempt) {
            try {
              extractedJson = JSON.parse(attempt.trim())
              logger.info('Successfully extracted JSON from response')
              break
            } catch (extractError) {
              continue
            }
          }
        }
        
        if (extractedJson) {
          researchData = extractedJson
        } else {
          // Final fallback - create structured data from the response
          logger.warn('All JSON parsing failed, creating fallback research data')
          researchData = this.createFallbackResearchData(responseContent, topic)
        }
      }

      // Validate the structure (with more detailed logging)
      if (!researchData.idea_1 || !researchData.idea_2 || !researchData.idea_3) {
        logger.error({ 
          hasIdea1: !!researchData.idea_1,
          hasIdea2: !!researchData.idea_2, 
          hasIdea3: !!researchData.idea_3,
          dataKeys: Object.keys(researchData)
        }, 'Research response missing required ideas')
        
        // Try to fix missing ideas
        researchData = this.ensureRequiredIdeas(researchData, topic)
      }

      // NEW: Add historical analysis
      let historicalInsights = null
      try {
        logger.info({ topic }, 'Starting historical analysis for enhanced Firecrawl research')
        historicalInsights = await historicalAnalysisService.generateHistoricalInsights(topic)
        
        if (historicalInsights.relatedPosts.length > 0) {
          // Enhance insights with performance data
          const enhancedInsights = await performanceInsightsService.generateEnhancedInsights(historicalInsights)
          historicalInsights = enhancedInsights
          
          logger.info({ 
            relatedPosts: historicalInsights.relatedPosts.length,
            topPerformers: historicalInsights.topPerformers.length,
            avgEngagement: historicalInsights.performanceContext.avgEngagement
          }, 'Historical analysis completed for enhanced research')
        } else {
          logger.info('No related historical posts found for topic in enhanced research')
        }
      } catch (error) {
        logger.warn({ error: error instanceof Error ? error.message : String(error) }, 'Historical analysis failed in enhanced research, continuing without it')
      }

      const totalTime = Date.now() - startTime
      logger.info({ 
        totalTimeMs: totalTime,
        ideasFound: 3,
        hasHistoricalInsights: !!historicalInsights
      }, 'Enhanced Firecrawl research completed')

      return {
        ...researchData,
        historicalInsights
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error({ error: errorMessage }, 'Enhanced Firecrawl research failed')
      throw error
    }
  }

  private createFallbackResearchData(responseContent: string, topic: string) {
    logger.info('Creating fallback research data from OpenAI response')
    
    // Create basic structured data if JSON parsing completely fails
    return {
      idea_1: {
        concise_summary: `Recent developments in ${topic} affecting UK business leaders`,
        angle_approach: `How recent ${topic} trends reveal the self-leadership challenges facing UK CEOs`,
        details: `Based on current research: ${responseContent.substring(0, 200)}...`,
        relevance: `This topic directly impacts UK CEOs and Founders who are struggling with self-leadership and getting in their own way as their businesses grow.`
      },
      idea_2: {
        concise_summary: `Industry insights on ${topic} and leadership effectiveness`,
        angle_approach: `The hidden connection between ${topic} and authentic leadership that most executives miss`,
        details: `Key findings suggest: ${responseContent.substring(200, 400)}...`,
        relevance: `These insights are particularly relevant for successful leaders who feel privately stuck despite their outward achievements.`
      },
      idea_3: {
        concise_summary: `${topic} challenges requiring new approaches to self-leadership`,
        angle_approach: `Why traditional approaches to ${topic} fail - and what self-aware leaders do differently`,
        details: `Research indicates: ${responseContent.substring(400, 600)}...`,
        relevance: `This resonates with leaders who know they need to change but struggle with practical, real-time solutions that don't slow them down.`
      }
    }
  }

  private ensureRequiredIdeas(data: any, topic: string) {
    logger.info('Ensuring all required ideas are present in research data')
    
    const fallbackIdea = {
      concise_summary: `Key ${topic} developments affecting UK leadership`,
      angle_approach: `How this ${topic} trend connects to self-leadership challenges`,
      details: `Important developments in this area that impact executive effectiveness`,
      relevance: `Relevant for UK CEOs and Founders working on self-leadership development`
    }
    
    return {
      idea_1: data.idea_1 || fallbackIdea,
      idea_2: data.idea_2 || fallbackIdea,
      idea_3: data.idea_3 || fallbackIdea
    }
  }

  async comprehensiveResearch(topic: string, platform: string = 'linkedin'): Promise<{
    results: ResearchResult[]
    summary: string
    keyInsights: string[]
    historicalInsights?: any
  }> {
    const startTime = Date.now()
    logger.info({ topic, platform }, 'Starting comprehensive research')

    try {
      // Prepare research queries
      const queries = [
        `${topic} latest trends 2024`,
        `${topic} statistics and data`,
        `${topic} best practices for ${platform}`,
        `${topic} industry insights`
      ]

      // Run searches with Firecrawl only (Perplexity disabled)
      const searchPromises = queries.map(async (query) => {
        const [firecrawlResults] = await Promise.allSettled([
          this.searchWithFirecrawl(query)
          // Perplexity disabled for enhanced research approach
          // this.searchWithPerplexity(query)
        ])

        const results: ResearchResult[] = []
        
        if (firecrawlResults.status === 'fulfilled') {
          results.push(...firecrawlResults.value)
        }
        
        // Perplexity results disabled
        // if (perplexityResults.status === 'fulfilled') {
        //   results.push(...perplexityResults.value)
        // }

        return results
      })

      const searchResults = await Promise.all(searchPromises)
      const allResults = searchResults.flat()

      // Filter and rank results
      const uniqueResults = this.deduplicateResults(allResults)
      const rankedResults = this.rankResults(uniqueResults, topic)

      // Generate summary and insights
      const summary = this.generateSummary(rankedResults, topic)
      const keyInsights = this.extractKeyInsights(rankedResults)

      // NEW: Add historical analysis
      let historicalInsights = null
      try {
        logger.info({ topic }, 'Starting historical analysis for enhanced research')
        historicalInsights = await historicalAnalysisService.generateHistoricalInsights(topic)
        
        if (historicalInsights.relatedPosts.length > 0) {
          // Enhance insights with performance data
          const enhancedInsights = await performanceInsightsService.generateEnhancedInsights(historicalInsights)
          historicalInsights = enhancedInsights
          
          logger.info({ 
            relatedPosts: historicalInsights.relatedPosts.length,
            topPerformers: historicalInsights.topPerformers.length,
            avgEngagement: historicalInsights.performanceContext.avgEngagement
          }, 'Historical analysis completed successfully')
        } else {
          logger.info('No related historical posts found for topic')
        }
      } catch (error) {
        logger.warn({ error: error instanceof Error ? error.message : String(error) }, 'Historical analysis failed, continuing without it')
      }

      const totalTime = Date.now() - startTime
      logger.info({ 
        topic, 
        resultCount: rankedResults.length, 
        hasHistoricalInsights: !!historicalInsights,
        totalTimeMs: totalTime 
      }, 'Comprehensive research completed')

      return {
        results: rankedResults,
        summary,
        keyInsights,
        historicalInsights
      }

    } catch (error) {
      logger.error({ error, topic }, 'Comprehensive research failed')
      return {
        results: [],
        summary: `Research unavailable for topic: ${topic}`,
        keyInsights: [],
        historicalInsights: null
      }
    }
  }

  private deduplicateResults(results: ResearchResult[]): ResearchResult[] {
    const seen = new Set<string>()
    return results.filter(result => {
      const key = `${result.title}:${result.url}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  private rankResults(results: ResearchResult[], topic: string): ResearchResult[] {
    return results
      .filter(result => result.content.length > 50) // Filter out low-quality results
      .sort((a, b) => {
        // Sort by relevance score, then by content length
        if (a.relevance_score !== b.relevance_score) {
          return (b.relevance_score || 0) - (a.relevance_score || 0)
        }
        return b.content.length - a.content.length
      })
      .slice(0, 10) // Keep top 10 results
  }

  private generateSummary(results: ResearchResult[], topic: string): string {
    if (results.length === 0) {
      return `No research data available for ${topic}`
    }

    const topResults = results.slice(0, 3)
    const summaryParts = topResults.map((result, index) => 
      `${index + 1}. ${result.summary || result.content.substring(0, 100)}`
    )

    return `Research summary for "${topic}":\n\n${summaryParts.join('\n\n')}`
  }

  private extractKeyInsights(results: ResearchResult[]): string[] {
    const insights: string[] = []
    
    results.slice(0, 5).forEach(result => {
      // Extract sentences that contain key indicators
      const sentences = result.content.split(/[.!?]+/)
      const keyPhrases = [
        'research shows', 'studies indicate', 'data reveals', 'statistics show',
        'trend', 'growth', 'increase', 'decrease', 'improvement', 'challenge',
        'according to', 'report found', 'survey indicates'
      ]

      sentences.forEach(sentence => {
        const trimmed = sentence.trim()
        if (trimmed.length > 20 && trimmed.length < 200) {
          const hasKeyPhrase = keyPhrases.some(phrase => 
            trimmed.toLowerCase().includes(phrase)
          )
          if (hasKeyPhrase && !insights.includes(trimmed)) {
            insights.push(trimmed)
          }
        }
      })
    })

    return insights.slice(0, 5) // Return top 5 insights
  }
}

export const researchService = new ResearchService()
export default researchService