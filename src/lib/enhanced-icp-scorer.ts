// Enhanced ICP Scorer specifically for LinkedIn comment authors
import { ICPScore, ProspectProfile } from './icp-scorer'

export interface LinkedInCommentAuthor {
  name: string
  headline: string
  profile_url: string
  profile_picture: string
}

export interface EnhancedICPScore extends ICPScore {
  confidence: number // How confident we are in this score (0-100)
  dataQuality: 'high' | 'medium' | 'low' // Quality of available data
  signals: string[] // Specific signals found
  redFlags: string[] // Negative indicators
}

export interface EnhancedProspectProfile extends ProspectProfile {
  icpScore: EnhancedICPScore
  commentEngagement?: {
    totalComments: number
    avgReactions: number
    commentQuality: 'high' | 'medium' | 'low'
  }
  linkedInActivity?: {
    isActive: boolean
    engagementPattern: string
    contentInterests: string[]
  }
}

export class EnhancedICPScorer {
  // Enhanced role patterns with weights
  private readonly ROLE_PATTERNS = {
    // C-Suite (highest priority)
    ceo: { patterns: ['ceo', 'chief executive', 'managing director', 'president'], weight: 100, confidence: 95 },
    founder: { patterns: ['founder', 'co-founder', 'founding'], weight: 100, confidence: 95 },
    
    // Senior Leadership (high priority)
    coo: { patterns: ['coo', 'chief operating', 'operations director'], weight: 90, confidence: 90 },
    vp: { patterns: ['vp', 'vice president', 'svp', 'senior vice president'], weight: 85, confidence: 85 },
    
    // Directors (medium-high priority)
    director: { patterns: ['director', 'head of', 'division head'], weight: 75, confidence: 80 },
    
    // Managers (lower priority but still relevant)
    manager: { patterns: ['manager', 'senior manager', 'general manager'], weight: 50, confidence: 70 }
  }

  // Industry scoring with specific focus
  private readonly INDUSTRY_PATTERNS = {
    // Technology (highest priority for Andrew's coaching)
    tech: { 
      patterns: ['technology', 'software', 'saas', 'tech', 'ai', 'artificial intelligence', 'cloud', 'digital transformation', 'fintech'], 
      weight: 100, 
      confidence: 90 
    },
    
    // Professional Services (high priority)
    consulting: { 
      patterns: ['consulting', 'advisory', 'professional services', 'management consulting'], 
      weight: 90, 
      confidence: 85 
    },
    
    // Financial Services (high priority)
    finance: { 
      patterns: ['financial', 'banking', 'investment', 'fintech', 'capital', 'private equity', 'venture capital'], 
      weight: 90, 
      confidence: 85 
    },
    
    // Healthcare/Biotech (medium-high priority)
    healthcare: { 
      patterns: ['healthcare', 'biotech', 'pharmaceutical', 'medical', 'health tech'], 
      weight: 80, 
      confidence: 80 
    },
    
    // Manufacturing/Industrial (medium priority)
    manufacturing: { 
      patterns: ['manufacturing', 'industrial', 'supply chain', 'logistics'], 
      weight: 70, 
      confidence: 75 
    }
  }

  // Company size indicators
  private readonly COMPANY_SIZE_INDICATORS = {
    enterprise: { patterns: ['fortune 500', 'global', 'enterprise', 'multinational', '1000+', 'large scale'], weight: 100 },
    midmarket: { patterns: ['mid-market', 'regional', '100-1000', 'growing', 'scale-up'], weight: 85 },
    startup: { patterns: ['startup', 'early stage', 'series a', 'series b', 'scale-up'], weight: 90 }, // High for founders
    smb: { patterns: ['small business', 'local', 'family business'], weight: 60 }
  }

  // Leadership transition signals (high value)
  private readonly TRANSITION_SIGNALS = {
    new_role: { patterns: ['new role', 'recently joined', 'just started', 'new position'], weight: 95 },
    promotion: { patterns: ['promoted', 'promoted to', 'new ceo', 'appointed'], weight: 90 },
    career_change: { patterns: ['career change', 'pivot', 'transition'], weight: 85 }
  }

  // Red flags that reduce score
  private readonly RED_FLAGS = {
    retired: ['retired', 'former', 'ex-', 'previously'],
    seeking: ['seeking opportunities', 'looking for', 'open to work', 'available'],
    student: ['student', 'intern', 'graduate', 'mba candidate'],
    consultant_individual: ['freelance', 'independent consultant', 'sole proprietor'] // Individual consultants vs firm partners
  }

  // Self-leadership keyword signals
  private readonly SELF_LEADERSHIP_SIGNALS = {
    high: ['leadership development', 'executive coaching', 'transformation', 'culture change', 'team building', 'scaling', 'growth mindset'],
    medium: ['leadership', 'management', 'strategy', 'vision', 'culture', 'people'],
    low: ['leader', 'manage', 'team']
  }

  public scoreLinkedInProfile(author: LinkedInCommentAuthor, context?: any): EnhancedICPScore {
    const signals: string[] = []
    const redFlags: string[] = []
    let confidence = 80 // Base confidence
    
    // Analyze headline text
    const headline = author.headline.toLowerCase()
    const name = author.name.toLowerCase()
    const fullText = `${headline} ${name}`.toLowerCase()

    // 1. Role Analysis (35% weight)
    const roleScore = this.analyzeRole(fullText, signals, redFlags)
    
    // 2. Industry Analysis (20% weight)
    const industryScore = this.analyzeIndustry(fullText, signals)
    
    // 3. Company Size Analysis (15% weight)
    const companySizeScore = this.analyzeCompanySize(fullText, signals)
    
    // 4. Transition Signals (15% weight)
    const transitionScore = this.analyzeTransitions(fullText, signals)
    
    // 5. Self-Leadership Relevance (10% weight)
    const leadershipScore = this.analyzeSelfLeadershipRelevance(fullText, signals)
    
    // 6. Profile Quality (5% weight)
    const profileQuality = this.analyzeProfileQuality(author, signals)

    // Apply red flags
    const redFlagPenalty = this.applyRedFlags(fullText, redFlags)
    
    // Calculate weighted score
    const rawScore = Math.round(
      roleScore * 0.35 +
      industryScore * 0.20 +
      companySizeScore * 0.15 +
      transitionScore * 0.15 +
      leadershipScore * 0.10 +
      profileQuality * 0.05
    )

    // Apply red flag penalty
    const finalScore = Math.max(0, Math.min(100, rawScore - redFlagPenalty))

    // Adjust confidence based on data quality
    if (author.headline.length < 20) confidence -= 20
    if (redFlags.length > 0) confidence -= 15 * redFlags.length
    if (signals.length > 3) confidence += 10

    const breakdown = {
      roleMatch: roleScore,
      companySize: companySizeScore,
      industry: industryScore,
      tenure: transitionScore, // Using transition as tenure proxy
      careerTransition: transitionScore,
      leadership: leadershipScore,
      engagement: profileQuality
    }

    const category = this.determineEnhancedCategory(finalScore, confidence)
    const tags = this.generateEnhancedTags(author, signals, finalScore)
    const reasoning = this.generateEnhancedReasoning(signals, redFlags, finalScore)

    return {
      totalScore: finalScore,
      category,
      breakdown,
      tags,
      reasoning,
      confidence: Math.max(0, Math.min(100, confidence)),
      dataQuality: this.assessDataQuality(author, signals),
      signals,
      redFlags
    }
  }

  private analyzeRole(text: string, signals: string[], redFlags: string[]): number {
    let maxScore = 0
    let bestMatch = ''

    for (const [role, config] of Object.entries(this.ROLE_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (text.includes(pattern)) {
          if (config.weight > maxScore) {
            maxScore = config.weight
            bestMatch = role
          }
        }
      }
    }

    if (bestMatch) {
      signals.push(`${bestMatch.toUpperCase()} role identified`)
    }

    return maxScore
  }

  private analyzeIndustry(text: string, signals: string[]): number {
    let maxScore = 0
    let industries: string[] = []

    for (const [industry, config] of Object.entries(this.INDUSTRY_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (text.includes(pattern)) {
          maxScore = Math.max(maxScore, config.weight)
          industries.push(industry)
          break
        }
      }
    }

    if (industries.length > 0) {
      signals.push(`Target industry: ${industries.join(', ')}`)
    }

    return maxScore
  }

  private analyzeCompanySize(text: string, signals: string[]): number {
    let maxScore = 0
    let sizeIndicator = ''

    for (const [size, config] of Object.entries(this.COMPANY_SIZE_INDICATORS)) {
      for (const pattern of config.patterns) {
        if (text.includes(pattern)) {
          if (config.weight > maxScore) {
            maxScore = config.weight
            sizeIndicator = size
          }
        }
      }
    }

    if (sizeIndicator) {
      signals.push(`Company size: ${sizeIndicator}`)
    } else {
      // Default scoring for unknown company size
      maxScore = 70
    }

    return maxScore
  }

  private analyzeTransitions(text: string, signals: string[]): number {
    let maxScore = 50 // Default score
    
    for (const [transition, config] of Object.entries(this.TRANSITION_SIGNALS)) {
      for (const pattern of config.patterns) {
        if (text.includes(pattern)) {
          maxScore = Math.max(maxScore, config.weight)
          signals.push(`Career transition: ${transition}`)
          break
        }
      }
    }

    return maxScore
  }

  private analyzeSelfLeadershipRelevance(text: string, signals: string[]): number {
    let score = 30 // Base score
    let relevanceLevel = 'low'

    // Check for high relevance signals
    for (const signal of this.SELF_LEADERSHIP_SIGNALS.high) {
      if (text.includes(signal)) {
        score = 90
        relevanceLevel = 'high'
        break
      }
    }

    // Check for medium relevance signals
    if (score < 60) {
      for (const signal of this.SELF_LEADERSHIP_SIGNALS.medium) {
        if (text.includes(signal)) {
          score = 60
          relevanceLevel = 'medium'
          break
        }
      }
    }

    // Check for low relevance signals
    if (score < 45) {
      for (const signal of this.SELF_LEADERSHIP_SIGNALS.low) {
        if (text.includes(signal)) {
          score = 45
          relevanceLevel = 'low'
          break
        }
      }
    }

    if (relevanceLevel !== 'low') {
      signals.push(`Self-leadership relevance: ${relevanceLevel}`)
    }

    return score
  }

  private analyzeProfileQuality(author: LinkedInCommentAuthor, signals: string[]): number {
    let score = 50 // Base score

    // Check profile picture
    if (author.profile_picture && author.profile_picture.length > 0) {
      score += 20
      signals.push('Professional profile picture')
    }

    // Check headline quality
    if (author.headline.length > 50) {
      score += 15
      signals.push('Detailed headline')
    }

    // Check if LinkedIn URL looks professional
    if (author.profile_url.includes('/in/')) {
      score += 15
      signals.push('Professional LinkedIn profile')
    }

    return Math.min(100, score)
  }

  private applyRedFlags(text: string, redFlags: string[]): number {
    let penalty = 0

    for (const [flag, patterns] of Object.entries(this.RED_FLAGS)) {
      for (const pattern of patterns) {
        if (text.includes(pattern)) {
          redFlags.push(flag)
          penalty += 25 // Significant penalty for red flags
          break
        }
      }
    }

    return penalty
  }

  private determineEnhancedCategory(score: number, confidence: number): 'Hot Lead' | 'Warm Lead' | 'Cold Lead' | 'Not ICP' {
    // Adjust thresholds based on confidence
    const confidenceMultiplier = confidence / 100

    if (score >= 75 && confidence >= 70) return 'Hot Lead'
    if (score >= 60 && confidence >= 60) return 'Warm Lead'
    if (score >= 40 && confidence >= 50) return 'Cold Lead'
    return 'Not ICP'
  }

  private generateEnhancedTags(author: LinkedInCommentAuthor, signals: string[], score: number): string[] {
    const tags: string[] = []
    const headline = author.headline.toLowerCase()

    // Role tags
    if (headline.includes('ceo') || headline.includes('chief executive')) tags.push('CEO')
    if (headline.includes('founder') || headline.includes('co-founder')) tags.push('Founder')
    if (headline.includes('president')) tags.push('President')
    if (headline.includes('vp') || headline.includes('vice president')) tags.push('VP')
    if (headline.includes('director')) tags.push('Director')

    // Industry tags
    if (headline.includes('technology') || headline.includes('software') || headline.includes('saas')) {
      tags.push('Technology')
    }
    if (headline.includes('consulting')) tags.push('Consulting')
    if (headline.includes('financial') || headline.includes('fintech')) tags.push('Financial Services')

    // Signal-based tags
    if (signals.some(s => s.includes('transition'))) tags.push('Career Transition')
    if (signals.some(s => s.includes('leadership'))) tags.push('Leadership Focus')
    if (score >= 80) tags.push('High Priority')
    if (signals.some(s => s.includes('enterprise'))) tags.push('Enterprise')

    return tags
  }

  private generateEnhancedReasoning(signals: string[], redFlags: string[], score: number): string[] {
    const reasoning: string[] = []

    // Positive signals
    if (signals.length > 0) {
      reasoning.push(`Strong profile indicators: ${signals.slice(0, 3).join(', ')}`)
    }

    // Score-based reasoning
    if (score >= 80) {
      reasoning.push('Excellent fit for self-leadership coaching')
    } else if (score >= 60) {
      reasoning.push('Good potential for leadership development')
    } else if (score >= 40) {
      reasoning.push('May benefit from targeted outreach')
    }

    // Red flags
    if (redFlags.length > 0) {
      reasoning.push(`Caution: ${redFlags.join(', ')}`)
    }

    return reasoning
  }

  private assessDataQuality(author: LinkedInCommentAuthor, signals: string[]): 'high' | 'medium' | 'low' {
    let qualityScore = 0

    if (author.headline.length > 50) qualityScore += 3
    if (author.profile_picture && author.profile_picture.length > 0) qualityScore += 2
    if (signals.length >= 3) qualityScore += 2
    if (author.profile_url.includes('/in/')) qualityScore += 1

    if (qualityScore >= 6) return 'high'
    if (qualityScore >= 3) return 'medium'
    return 'low'
  }

  public createEnhancedProspectProfile(author: LinkedInCommentAuthor, profileUrl: string): EnhancedProspectProfile {
    const icpScore = this.scoreLinkedInProfile(author)
    
    // Extract company and role from headline
    const company = this.extractCompanyFromHeadline(author.headline)
    const role = this.extractRoleFromHeadline(author.headline)

    return {
      name: author.name,
      headline: author.headline,
      company: company,
      role: role,
      profileUrl,
      profilePicture: author.profile_picture,
      location: 'Unknown', // Would need additional API call
      followerCount: 0, // Would need additional API call
      connectionCount: 0, // Would need additional API call
      icpScore
    }
  }

  private extractCompanyFromHeadline(headline: string): string {
    // Enhanced company extraction
    const patterns = [
      /(?:at|@)\s+([^|•\n]+)/i,
      /CEO of (.+?)(?:\s*[|•]|$)/i,
      /Founder of (.+?)(?:\s*[|•]|$)/i,
      /(\w+(?:\s+\w+)*)\s*(?:CEO|Founder|CTO|VP|President)/i
    ]
    
    for (const pattern of patterns) {
      const match = headline.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }
    
    return 'Unknown'
  }

  private extractRoleFromHeadline(headline: string): string {
    const rolePatterns = [
      /^([^|•@]+?)(?:\s+at\s+|\s+@\s+)/i,
      /(CEO|CTO|CFO|VP|President|Founder|Co-Founder|Director|Manager)/i
    ]
    
    for (const pattern of rolePatterns) {
      const match = headline.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }
    
    return 'Unknown'
  }
}

// Export singleton instance
export const enhancedICPScorer = new EnhancedICPScorer()