import { createHash } from 'crypto'
import { appConfig } from '../config'
import logger from '../lib/logger'
import { supabaseService } from './supabase'
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

  async comprehensiveResearch(topic: string, platform: string = 'linkedin'): Promise<{
    results: ResearchResult[]
    summary: string
    keyInsights: string[]
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

      // Run searches in parallel
      const searchPromises = queries.map(async (query) => {
        const [firecrawlResults, perplexityResults] = await Promise.allSettled([
          this.searchWithFirecrawl(query),
          this.searchWithPerplexity(query)
        ])

        const results: ResearchResult[] = []
        
        if (firecrawlResults.status === 'fulfilled') {
          results.push(...firecrawlResults.value)
        }
        
        if (perplexityResults.status === 'fulfilled') {
          results.push(...perplexityResults.value)
        }

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

      const totalTime = Date.now() - startTime
      logger.info({ 
        topic, 
        resultCount: rankedResults.length, 
        totalTimeMs: totalTime 
      }, 'Comprehensive research completed')

      return {
        results: rankedResults,
        summary,
        keyInsights
      }

    } catch (error) {
      logger.error({ error, topic }, 'Comprehensive research failed')
      return {
        results: [],
        summary: `Research unavailable for topic: ${topic}`,
        keyInsights: []
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