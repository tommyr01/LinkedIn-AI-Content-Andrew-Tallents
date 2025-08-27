import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface PatternSearchRequest {
  query: string
  patternTypes?: string[]
  limit?: number
  minConfidence?: number
  contextFilters?: {
    audience?: string
    situation?: string
    performanceThreshold?: number
  }
}

interface PatternSearchResponse {
  success: boolean
  patterns: Array<{
    id: string
    type: string
    text: string
    relevanceScore: number
    source: string
    contextMatch: number
    performanceHistory: {
      avgEngagement: number
      usageCount: number
      successRate: number
    }
  }>
  totalFound: number
  searchQuality: number
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase admin client not configured' },
        { status: 500 }
      )
    }

    const body: PatternSearchRequest = await request.json()
    const { query, patternTypes, limit = 10, minConfidence = 0.7, contextFilters } = body

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Query parameter is required' },
        { status: 400 }
      )
    }

    console.log('🔍 RAG Pattern Search Request:', { 
      query: query.substring(0, 100), 
      patternTypes, 
      limit, 
      minConfidence 
    })

    // Build the search query
    let searchQuery = supabaseAdmin
      .from('voice_patterns')
      .select(`
        id,
        pattern_type,
        pattern_text,
        confidence_score,
        source_episode,
        performance_score,
        usage_count,
        metadata,
        created_at
      `)
      .gte('confidence_score', minConfidence)

    // Add pattern type filter if specified
    if (patternTypes && patternTypes.length > 0) {
      searchQuery = searchQuery.in('pattern_type', patternTypes)
    }

    // Add performance threshold filter if specified
    if (contextFilters?.performanceThreshold) {
      searchQuery = searchQuery.gte('performance_score', contextFilters.performanceThreshold)
    }

    // Text search on pattern content
    searchQuery = searchQuery.ilike('pattern_text', `%${query}%`)

    // Order by performance and confidence
    searchQuery = searchQuery
      .order('performance_score', { ascending: false })
      .order('confidence_score', { ascending: false })
      .limit(Math.min(limit, 50)) // Cap at 50 results

    const { data: patterns, error } = await searchQuery

    if (error) {
      console.error('❌ Database search error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to search patterns' },
        { status: 500 }
      )
    }

    if (!patterns || patterns.length === 0) {
      console.log('📭 No patterns found for query:', query)
      return NextResponse.json<PatternSearchResponse>({
        success: true,
        patterns: [],
        totalFound: 0,
        searchQuality: 0
      })
    }

    // Transform results
    const transformedPatterns = patterns.map(pattern => ({
      id: pattern.id,
      type: pattern.pattern_type,
      text: pattern.pattern_text,
      relevanceScore: calculateRelevanceScore(query, pattern.pattern_text, pattern.confidence_score),
      source: pattern.source_episode || 'unknown',
      contextMatch: calculateContextMatch(query, pattern.pattern_text),
      performanceHistory: {
        avgEngagement: Math.round(pattern.performance_score * 100), // Convert to percentage
        usageCount: pattern.usage_count || 0,
        successRate: Math.round(pattern.confidence_score * 100) // Convert to percentage
      }
    }))

    // Sort by relevance score
    transformedPatterns.sort((a, b) => b.relevanceScore - a.relevanceScore)

    // Calculate search quality
    const avgRelevance = transformedPatterns.reduce((sum, p) => sum + p.relevanceScore, 0) / transformedPatterns.length
    const searchQuality = Math.min(1.0, avgRelevance)

    console.log('✅ RAG Pattern Search Success:', { 
      foundPatterns: transformedPatterns.length,
      avgRelevance: avgRelevance.toFixed(2),
      searchQuality: searchQuality.toFixed(2)
    })

    const response: PatternSearchResponse = {
      success: true,
      patterns: transformedPatterns,
      totalFound: transformedPatterns.length,
      searchQuality
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ RAG Pattern Search Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

/**
 * Calculate relevance score based on query match and pattern quality
 */
function calculateRelevanceScore(query: string, patternText: string, confidenceScore: number): number {
  const queryLower = query.toLowerCase()
  const patternLower = patternText.toLowerCase()
  
  // Base score from confidence
  let score = confidenceScore * 0.5
  
  // Exact phrase match bonus
  if (patternLower.includes(queryLower)) {
    score += 0.3
  }
  
  // Word match scoring
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2)
  const matchingWords = queryWords.filter(word => patternLower.includes(word))
  const wordMatchRatio = matchingWords.length / queryWords.length
  score += wordMatchRatio * 0.2
  
  // Length bonus (prefer longer, more detailed patterns)
  if (patternText.length > 100) {
    score += 0.05
  }
  
  return Math.min(1.0, score)
}

/**
 * Calculate context match score
 */
function calculateContextMatch(query: string, patternText: string): number {
  const queryLower = query.toLowerCase()
  const patternLower = patternText.toLowerCase()
  
  let contextScore = 0
  
  // Leadership context indicators
  const leadershipTerms = ['leader', 'team', 'management', 'executive', 'ceo', 'culture']
  const hasLeadershipContext = leadershipTerms.some(term => 
    queryLower.includes(term) && patternLower.includes(term)
  )
  if (hasLeadershipContext) contextScore += 0.3
  
  // Business context indicators
  const businessTerms = ['business', 'company', 'strategy', 'growth', 'performance']
  const hasBusinessContext = businessTerms.some(term => 
    queryLower.includes(term) && patternLower.includes(term)
  )
  if (hasBusinessContext) contextScore += 0.2
  
  // Personal development context
  const personalTerms = ['develop', 'learn', 'grow', 'coach', 'mentor']
  const hasPersonalContext = personalTerms.some(term => 
    queryLower.includes(term) && patternLower.includes(term)
  )
  if (hasPersonalContext) contextScore += 0.25
  
  // Question-based patterns (Andrew's signature style)
  if (patternLower.startsWith('what if') || patternLower.includes('?')) {
    contextScore += 0.15
  }
  
  // Research/authority patterns
  if (patternLower.includes('research') || patternLower.includes('study') || patternLower.includes('harvard') || patternLower.includes('yale')) {
    contextScore += 0.1
  }
  
  return Math.min(1.0, contextScore)
}