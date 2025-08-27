import { supabaseService } from './supabase'
import logger from '../lib/logger'

interface VoicePattern {
  type: 'opening' | 'structure' | 'tone' | 'research' | 'closing'
  pattern: string
  frequency: number
  engagementScore: number
  example: string
}

interface AuthenticVoiceProfile {
  openingPatterns: VoicePattern[]
  structuralElements: VoicePattern[]
  toneMarkers: VoicePattern[]
  researchPatterns: VoicePattern[]
  closingPatterns: VoicePattern[]
  overallGuidelines: string[]
}

/**
 * Authentic voice patterns extracted ONLY from Andrew's real LinkedIn posts
 * No generic business templates - pure Andrew authenticity from the 833 clean chunks
 */
export class AuthenticVoicePatterns {

  /**
   * Extract authentic voice patterns from LinkedIn post chunks
   */
  async extractAuthenticPatterns(): Promise<AuthenticVoiceProfile> {
    try {
      logger.info('Extracting authentic voice patterns from LinkedIn posts')

      // Get all LinkedIn chunks to analyze patterns
      const { data: chunks, error } = await supabaseService.client
        .from('linkedin_post_chunks')
        .select('*')
        .order('engagement_score', { ascending: false })
        .limit(500) // Analyze top 500 chunks for patterns

      if (error) {
        throw new Error(`Failed to fetch LinkedIn chunks: ${error.message}`)
      }

      const patterns = this.analyzeChunksForPatterns(chunks || [])
      
      logger.info({ 
        openings: patterns.openingPatterns.length,
        structures: patterns.structuralElements.length,
        tones: patterns.toneMarkers.length,
        research: patterns.researchPatterns.length,
        closings: patterns.closingPatterns.length
      }, 'Authentic voice patterns extracted')

      return patterns

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to extract authentic patterns')
      return this.getDefaultAuthenticPatterns()
    }
  }

  /**
   * Analyze chunks to find authentic Andrew patterns (not generic ones)
   */
  private analyzeChunksForPatterns(chunks: any[]): AuthenticVoiceProfile {
    const openingPatterns: VoicePattern[] = []
    const structuralElements: VoicePattern[] = []
    const toneMarkers: VoicePattern[] = []
    const researchPatterns: VoicePattern[] = []
    const closingPatterns: VoicePattern[] = []

    // Track pattern frequencies
    const patternCounts = new Map<string, { count: number, examples: string[], avgEngagement: number }>()

    chunks.forEach(chunk => {
      const content = chunk.content
      const engagement = chunk.engagement_score || 0

      // Find opening patterns (not "X is killing your Y")
      const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10)
      if (sentences.length > 0) {
        const opening = sentences[0]
        
        // Andrew's authentic question patterns
        if (/^What if\s+.*\s+(isn't|is)\s+/i.test(opening)) {
          this.trackPattern('question_what_if', opening, engagement, patternCounts)
        } else if (/^The best\s+(leaders|founders)\s+I\s+(know|work with)/i.test(opening)) {
          this.trackPattern('authority_best_leaders', opening, engagement, patternCounts)
        } else if (/^Most\s+leaders\s+think/i.test(opening)) {
          this.trackPattern('challenge_most_leaders', opening, engagement, patternCounts)
        } else if (/^Here's something I've learned/i.test(opening)) {
          this.trackPattern('personal_insight', opening, engagement, patternCounts)
        }
      }

      // Structural elements
      if (/…/.test(content)) {
        this.trackPattern('ellipses_drama', 'Uses ellipses for dramatic effect', engagement, patternCounts)
      }
      if (/[1-3]️⃣/.test(content)) {
        this.trackPattern('numbered_emojis', 'Uses numbered emojis for structure', engagement, patternCounts)
      }
      if (/💡/.test(content)) {
        this.trackPattern('lightbulb_emoji', 'Uses 💡 for insights', engagement, patternCounts)
      }

      // Tone markers
      if (/Here's the truth:/i.test(content)) {
        this.trackPattern('direct_truth', 'Here\'s the truth:', engagement, patternCounts)
      }
      if (/But here's the shift:/i.test(content)) {
        this.trackPattern('reframe_shift', 'But here\'s the shift:', engagement, patternCounts)
      }

      // Research patterns
      if (/Yale Center/i.test(content)) {
        this.trackPattern('yale_citation', 'Cites Yale Center research', engagement, patternCounts)
      }
      if (/Harvard/i.test(content)) {
        this.trackPattern('harvard_citation', 'Cites Harvard research', engagement, patternCounts)
      }
      if (/Research shows/i.test(content)) {
        this.trackPattern('research_shows', 'Research shows pattern', engagement, patternCounts)
      }

      // Closing patterns
      if (/Follow me if/i.test(content)) {
        this.trackPattern('follow_if', 'Follow me if...', engagement, patternCounts)
      }
    })

    // Convert tracked patterns to structured format
    patternCounts.forEach((data, key) => {
      const avgEngagement = data.avgEngagement / data.count
      const bestExample = data.examples[0] // First example is usually best

      const pattern: VoicePattern = {
        type: this.getPatternType(key),
        pattern: key,
        frequency: data.count,
        engagementScore: avgEngagement,
        example: bestExample
      }

      switch (pattern.type) {
        case 'opening':
          openingPatterns.push(pattern)
          break
        case 'structure':
          structuralElements.push(pattern)
          break
        case 'tone':
          toneMarkers.push(pattern)
          break
        case 'research':
          researchPatterns.push(pattern)
          break
        case 'closing':
          closingPatterns.push(pattern)
          break
      }
    })

    // Sort by engagement score (best patterns first)
    const sortByEngagement = (a: VoicePattern, b: VoicePattern) => b.engagementScore - a.engagementScore

    return {
      openingPatterns: openingPatterns.sort(sortByEngagement),
      structuralElements: structuralElements.sort(sortByEngagement),
      toneMarkers: toneMarkers.sort(sortByEngagement),
      researchPatterns: researchPatterns.sort(sortByEngagement),
      closingPatterns: closingPatterns.sort(sortByEngagement),
      overallGuidelines: this.generateOverallGuidelines(openingPatterns, structuralElements, toneMarkers)
    }
  }

  /**
   * Track pattern frequency and engagement
   */
  private trackPattern(key: string, example: string, engagement: number, counts: Map<string, any>) {
    if (!counts.has(key)) {
      counts.set(key, { count: 0, examples: [], avgEngagement: 0 })
    }
    
    const data = counts.get(key)!
    data.count++
    data.examples.push(example)
    data.avgEngagement += engagement
    
    // Keep only best examples
    if (data.examples.length > 3) {
      data.examples = data.examples.slice(0, 3)
    }
  }

  /**
   * Determine pattern type from key
   */
  private getPatternType(key: string): VoicePattern['type'] {
    if (key.includes('question') || key.includes('authority') || key.includes('challenge') || key.includes('personal')) {
      return 'opening'
    }
    if (key.includes('ellipses') || key.includes('emoji') || key.includes('numbered')) {
      return 'structure'
    }
    if (key.includes('truth') || key.includes('shift')) {
      return 'tone'
    }
    if (key.includes('citation') || key.includes('research')) {
      return 'research'
    }
    if (key.includes('follow')) {
      return 'closing'
    }
    return 'tone'
  }

  /**
   * Generate overall guidelines from patterns
   */
  private generateOverallGuidelines(openings: VoicePattern[], structures: VoicePattern[], tones: VoicePattern[]): string[] {
    return [
      'AUTHENTIC ANDREW VOICE (From Real LinkedIn Posts):',
      '',
      '1. OPENINGS - Use Andrew\'s authentic question patterns:',
      ...openings.slice(0, 3).map(p => `   • ${p.example}`),
      '',
      '2. STRUCTURE - Apply Andrew\'s visual formatting:',
      ...structures.slice(0, 3).map(p => `   • ${p.example}`),
      '',
      '3. TONE - Match Andrew\'s authentic voice markers:',
      ...tones.slice(0, 2).map(p => `   • ${p.example}`),
      '',
      '4. AVOID - Generic business speak and confrontational formulas',
      '5. RESEARCH - Include specific citations for credibility',
      '6. COMMUNITY - End with genuine connection building'
    ]
  }

  /**
   * Get default patterns if analysis fails
   */
  private getDefaultAuthenticPatterns(): AuthenticVoiceProfile {
    return {
      openingPatterns: [
        {
          type: 'opening',
          pattern: 'question_what_if',
          frequency: 10,
          engagementScore: 85,
          example: 'What if your job as a leader isn\'t to stay on the field...'
        }
      ],
      structuralElements: [
        {
          type: 'structure',
          pattern: 'numbered_emojis',
          frequency: 8,
          engagementScore: 80,
          example: 'Uses 1️⃣ 2️⃣ 3️⃣ for clear structure'
        }
      ],
      toneMarkers: [
        {
          type: 'tone',
          pattern: 'direct_truth',
          frequency: 5,
          engagementScore: 90,
          example: 'Here\'s the truth:'
        }
      ],
      researchPatterns: [
        {
          type: 'research',
          pattern: 'research_shows',
          frequency: 7,
          engagementScore: 75,
          example: 'Research shows that...'
        }
      ],
      closingPatterns: [
        {
          type: 'closing',
          pattern: 'follow_if',
          frequency: 6,
          engagementScore: 70,
          example: 'Follow me if this resonates'
        }
      ],
      overallGuidelines: [
        'Use authentic Andrew voice patterns from real LinkedIn posts',
        'Apply question-based openings, not confrontational statements',
        'Include research backing and dramatic structure',
        'End with genuine community building'
      ]
    }
  }
}

export const authenticVoicePatterns = new AuthenticVoicePatterns()