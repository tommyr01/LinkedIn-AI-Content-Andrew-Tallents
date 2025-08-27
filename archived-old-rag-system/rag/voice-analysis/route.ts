import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface VoiceAnalysisRequest {
  content: string
  compareToPattern?: string
}

interface VoiceAnalysisResponse {
  success: boolean
  authenticityScore: number
  matchingPatterns: string[]
  voiceCharacteristics: {
    tone: string
    structure: string
    vocabulary: string
    authenticity: string
  }
  recommendations: string[]
  ragInsights?: {
    topMatches: Array<{
      patternId: string
      similarity: number
      type: string
    }>
    confidence: number
    sourceEpisodes: string[]
  }
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

    const body: VoiceAnalysisRequest = await request.json()
    const { content, compareToPattern } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Content parameter is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Voice Analysis Request:', { 
      contentLength: content.length,
      hasComparePattern: !!compareToPattern
    })

    // Analyze voice characteristics
    const voiceCharacteristics = analyzeVoiceCharacteristics(content)
    
    // Calculate authenticity score
    const authenticityScore = calculateAuthenticityScore(content)
    
    // Find matching patterns
    const matchingPatterns = await findMatchingPatterns(content)
    
    // Generate recommendations
    const recommendations = generateRecommendations(content, authenticityScore, matchingPatterns)
    
    // Get RAG insights if we have matching patterns
    const ragInsights = matchingPatterns.length > 0 
      ? await generateRAGInsights(content, matchingPatterns)
      : undefined

    console.log('✅ Voice Analysis Complete:', { 
      authenticityScore: authenticityScore.toFixed(2),
      matchingPatternsCount: matchingPatterns.length,
      tone: voiceCharacteristics.tone,
      hasRAGInsights: !!ragInsights
    })

    const response: VoiceAnalysisResponse = {
      success: true,
      authenticityScore,
      matchingPatterns: matchingPatterns.map(p => p.id),
      voiceCharacteristics,
      recommendations,
      ragInsights
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Voice Analysis Error:', error)
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
 * Analyze voice characteristics of the content
 */
function analyzeVoiceCharacteristics(content: string) {
  const lowerContent = content.toLowerCase()
  
  // Analyze tone
  let tone = 'Professional'
  if (lowerContent.includes('what if') || lowerContent.includes('?')) {
    tone = 'Questioning/Curious'
  } else if (lowerContent.includes('here\'s the truth') || lowerContent.includes('research shows')) {
    tone = 'Authoritative'
  } else if (lowerContent.includes('i\'ve learned') || lowerContent.includes('my experience')) {
    tone = 'Personal/Reflective'
  } else if (lowerContent.includes('excited') || lowerContent.includes('amazing') || lowerContent.includes('!')) {
    tone = 'Enthusiastic'
  }

  // Analyze structure
  let structure = 'Standard'
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const avgSentenceLength = content.length / sentences.length
  
  if (avgSentenceLength < 80) {
    structure = 'Punchy/Direct'
  } else if (content.includes('1️⃣') || content.includes('2️⃣') || content.includes('3️⃣')) {
    structure = 'Structured/Numbered'
  } else if (content.includes('...') || content.includes('—') || content.includes('💡')) {
    structure = 'Dramatic/Engaging'
  }

  // Analyze vocabulary sophistication
  let vocabulary = 'Professional'
  const complexWords = [
    'sophisticated', 'comprehensive', 'strategic', 'implementation', 'optimization',
    'paradigm', 'methodology', 'framework', 'initiative', 'leverage'
  ]
  const personalWords = ['I', 'my', 'we', 'our', 'personally', 'experience']
  
  const hasComplexVocab = complexWords.some(word => lowerContent.includes(word.toLowerCase()))
  const hasPersonalTouch = personalWords.some(word => content.includes(word))
  
  if (hasComplexVocab && hasPersonalTouch) {
    vocabulary = 'Professional with personal touches'
  } else if (hasComplexVocab) {
    vocabulary = 'Sophisticated/Academic'
  } else if (hasPersonalTouch) {
    vocabulary = 'Conversational/Personal'
  }

  // Determine overall authenticity level
  const authenticityScore = calculateAuthenticityScore(content)
  let authenticity = 'Low'
  if (authenticityScore > 0.8) {
    authenticity = 'High'
  } else if (authenticityScore > 0.6) {
    authenticity = 'Medium'
  }

  return {
    tone,
    structure,
    vocabulary,
    authenticity
  }
}

/**
 * Calculate authenticity score based on Andrew's patterns
 */
function calculateAuthenticityScore(content: string): number {
  let score = 0.4 // Base score
  const lowerContent = content.toLowerCase()

  // Andrew's authentic LinkedIn opening patterns
  const authenticLinkedInPatterns = [
    /^what if your job as a leader/i,
    /^what if\s+.*isn't to\s+/i,
    /^the best leaders i know/i,
    /^most leaders think/i,
    /^here's something i've learned/i,
    /^who holds you to account/i
  ]
  if (authenticLinkedInPatterns.some(pattern => pattern.test(content))) {
    score += 0.25 // High value for authentic openings
  }

  // Research citations (Andrew frequently uses these)
  const researchPatterns = [
    /yale center for/i,
    /harvard (studies|research|business school)/i,
    /research (shows|from|indicates)/i,
    /studies (show|indicate|reveal)/i
  ]
  if (researchPatterns.some(pattern => pattern.test(content))) {
    score += 0.15
  }

  // Authority establishment phrases
  if (/the best founders i work with/i.test(content)) {
    score += 0.1
  }
  if (/top performers/i.test(content)) {
    score += 0.08
  }

  // Dramatic structural elements (Andrew's signature style)
  if (/…/.test(content)) score += 0.06
  if (/[1-3]️⃣/.test(content)) score += 0.06
  if (/💡|➡️|✅/.test(content)) score += 0.04

  // Signature phrases
  const signaturePhrases = [
    /here's the truth:/i,
    /but here's the shift:/i,
    /follow me if/i
  ]
  signaturePhrases.forEach(pattern => {
    if (pattern.test(content)) score += 0.06
  })

  // Challenge-reframe pattern (very Andrew-like)
  if (/most [^.!?]+ do [^.!?]+\. but [^.!?]+\./i.test(content)) {
    score += 0.08
  }

  // Punchy sentence structure
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const shortSentences = sentences.filter(s => s.trim().split(/\s+/).length <= 8).length
  if (sentences.length > 0 && (shortSentences / sentences.length) > 0.4) {
    score += 0.06
  }

  // Penalty for generic business speak
  const genericPatterns = [
    /are you feeling (overwhelmed|stuck|frustrated)/i,
    /many leaders struggle with/i,
    /what if (we told you|i told you)/i,
    /in today's (competitive|business|challenging) environment/i,
    /^[a-z][^.!?]*\s+is killing your\s+/i,
    /^stop doing\s+/i,
    /^this is why\s+/i
  ]
  if (genericPatterns.some(pattern => pattern.test(content))) {
    score -= 0.15
  }

  return Math.max(0, Math.min(1, score))
}

/**
 * Find matching patterns in the database
 */
async function findMatchingPatterns(content: string) {
  try {
    const { data: patterns, error } = await supabaseAdmin!
      .from('voice_patterns')
      .select('id, pattern_type, pattern_text, confidence_score, source_episode, performance_score')
      .gte('confidence_score', 0.6)
      .order('performance_score', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching patterns:', error)
      return []
    }

    if (!patterns) return []

    // Find patterns that have text similarity with the content
    const matchingPatterns = patterns.filter(pattern => {
      const similarity = calculateTextSimilarity(content, pattern.pattern_text)
      return similarity > 0.3 // Threshold for considering it a match
    })

    // Sort by relevance
    return matchingPatterns
      .map(pattern => ({
        ...pattern,
        similarity: calculateTextSimilarity(content, pattern.pattern_text)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5) // Top 5 matches

  } catch (error) {
    console.error('Error finding matching patterns:', error)
    return []
  }
}

/**
 * Calculate text similarity between content and pattern
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/)
  const words2 = text2.toLowerCase().split(/\s+/)
  
  const intersection = words1.filter(word => words2.includes(word))
  const union = [...new Set([...words1, ...words2])]
  
  // Jaccard similarity
  return intersection.length / union.length
}

/**
 * Generate recommendations for improving authenticity
 */
function generateRecommendations(content: string, authenticityScore: number, matchingPatterns: any[]): string[] {
  const recommendations: string[] = []
  const lowerContent = content.toLowerCase()

  if (authenticityScore < 0.8) {
    recommendations.push('Consider using more of Andrew\'s question-based opening patterns like "What if your job as a leader..."')
  }

  if (matchingPatterns.length === 0) {
    recommendations.push('Incorporate specific voice patterns from Andrew\'s content library for higher authenticity')
  }

  if (authenticityScore < 0.6) {
    recommendations.push('Add research citations (Harvard, Yale Center) for authority')
    recommendations.push('Use more dramatic formatting elements (emojis, ellipses, numbered points)')
  }

  if (!lowerContent.includes('what if') && !lowerContent.includes('?')) {
    recommendations.push('Try opening with a thought-provoking question')
  }

  if (!lowerContent.includes('research') && !lowerContent.includes('study')) {
    recommendations.push('Consider backing your points with research or studies')
  }

  if (!/[1-3]️⃣/.test(content) && !/💡|➡️|✅/.test(content)) {
    recommendations.push('Add visual elements like numbered emojis or icons for engagement')
  }

  if (recommendations.length === 0) {
    recommendations.push('Content authenticity looks strong! Consider minor refinements based on top-performing patterns.')
  }

  return recommendations.slice(0, 5) // Limit to top 5 recommendations
}

/**
 * Generate RAG insights based on matching patterns
 */
async function generateRAGInsights(content: string, matchingPatterns: any[]) {
  try {
    const topMatches = matchingPatterns.slice(0, 3).map(pattern => ({
      patternId: pattern.id,
      similarity: pattern.similarity || 0.5,
      type: pattern.pattern_type
    }))

    const confidence = matchingPatterns.length > 0 
      ? matchingPatterns.reduce((sum, p) => sum + (p.confidence_score || 0.5), 0) / matchingPatterns.length
      : 0.5

    const sourceEpisodes = [...new Set(
      matchingPatterns
        .map(p => p.source_episode)
        .filter(source => source && source !== 'unknown')
    )].slice(0, 3)

    return {
      topMatches,
      confidence,
      sourceEpisodes
    }

  } catch (error) {
    console.error('Error generating RAG insights:', error)
    return undefined
  }
}