import { z } from 'zod'

// Enhanced research data structure to support LinkedIn API data
export const EnhancedResearchDataSchema = z.object({
  profile: z.object({
    name: z.string(),
    profileUrl: z.string(),
    headline: z.string().optional(),
    location: z.string().optional(),
    summary: z.string().optional(),
    followerCount: z.number().optional(),
    connectionCount: z.number().optional(),
  }),
  currentRole: z.object({
    title: z.string(),
    company: z.string(),
    companyId: z.string().optional(), // LinkedIn company_id for advanced lookup
    startDate: z.string().optional(),
    tenure: z.number().optional(), // in months
    isCurrentRole: z.boolean().optional(),
  }).optional(),
  companyInfo: z.object({
    name: z.string(),
    size: z.string().optional(),
    sizeEmployees: z.number().optional(), // Numeric company size for precise scoring
    industry: z.string().optional(),
    description: z.string().optional(),
    website: z.string().optional(),
    linkedinUrl: z.string().optional(),
  }).optional(),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    companyId: z.string().optional(),
    duration: z.string().optional(),
    isCurrentRole: z.boolean().optional(),
    startDate: z.object({
      year: z.number(),
      month: z.string().optional(),
    }).optional(),
  })).optional(),
  education: z.array(z.object({
    school: z.string(),
    degree: z.string().optional(),
    fieldOfStudy: z.string().optional(),
  })).optional(),
  recentActivity: z.object({
    posts: z.number().optional(),
    engagement: z.string().optional(),
    topics: z.array(z.string()).optional(),
  }).optional(),
  // Enhanced post analysis data (last 60 days)
  postAnalysis: z.object({
    totalPosts: z.number().optional(),
    averageEngagement: z.number().optional(),
    topicConsistency: z.number().optional(), // 0-1 score for topic alignment
    leadershipContent: z.number().optional(), // 0-1 score for leadership-focused posts
    engagementQuality: z.number().optional(), // 0-1 score for meaningful vs superficial engagement
    postFrequency: z.string().optional(), // 'high', 'medium', 'low'
    thoughtLeadership: z.number().optional(), // 0-1 score for original insights vs sharing
  }).optional(),
  // Psychographic analysis
  psychographics: z.object({
    leadershipStyle: z.string().optional(), // 'transformational', 'transactional', 'authentic', 'servant'
    challengeAwareness: z.number().optional(), // 0-1 score for awareness of leadership challenges
    growthMindset: z.number().optional(), // 0-1 score for growth vs fixed mindset indicators
    coachingReceptivity: z.number().optional(), // 0-1 score for openness to coaching/development
    urgencyLevel: z.string().optional(), // 'high', 'medium', 'low' - need for immediate support
  }).optional(),
})

export type EnhancedResearchData = z.infer<typeof EnhancedResearchDataSchema>

// Backward compatibility
export const ResearchDataSchema = EnhancedResearchDataSchema
export type ResearchData = EnhancedResearchData

// Enhanced ICP criteria for Andrew Tallents
export interface EnhancedICPCriteria {
  roles: string[]
  companySizes: string[]
  companySizeRanges: { min: number; max: number; score: number }[] // Precise employee count scoring
  industries: string[]
  tenureRange: { min: number; max: number } // in months
  excludeKeywords: string[]
  requiredKeywords: string[]
  
  // Enhanced scoring weights
  weights: {
    role: number
    companySize: number
    industry: number
    tenure: number
    recentTransition: number
    leadershipExperience: number
    engagementLevel: number
    postQuality: number // NEW: Quality of LinkedIn posts
    psychographicFit: number // NEW: Psychological coaching fit
    urgencyIndicators: number // NEW: Signs of immediate need
  }
  
  // Post analysis criteria
  postCriteria: {
    minimumPosts: number // Minimum posts in 60 days to be considered active
    leadershipTopics: string[] // Topics that indicate leadership focus
    challengeKeywords: string[] // Keywords indicating leadership challenges
    growthKeywords: string[] // Keywords indicating growth mindset
  }
  
  // Psychographic indicators
  psychographicIndicators: {
    transformationalLeadership: string[] // Keywords for transformational leadership
    challengeAwareness: string[] // Keywords showing awareness of challenges
    coachingReceptivity: string[] // Keywords showing openness to coaching
    urgencySignals: string[] // Keywords indicating urgent need for support
  }
}

// Enhanced default ICP for Andrew Tallents (CEO Coach)
export const ENHANCED_DEFAULT_ICP: EnhancedICPCriteria = {
  roles: [
    'CEO', 'Chief Executive Officer',
    'President', 'Managing Director',
    'Founder', 'Co-Founder',
    'General Manager', 'COO', 'Chief Operating Officer',
    'VP', 'Vice President', 'SVP', 'Senior Vice President',
    'Division Head', 'Business Unit Leader',
    'Managing Partner', 'Executive Director'
  ],
  companySizes: ['51-200', '201-500', '501-1000', '1000+'],
  
  // Precise employee count scoring for better company size detection
  companySizeRanges: [
    { min: 1000, max: 50000, score: 100 }, // Large enterprise
    { min: 501, max: 1000, score: 95 }, // Mid-large company
    { min: 201, max: 500, score: 85 }, // Mid-size company  
    { min: 51, max: 200, score: 75 }, // Small-mid company
    { min: 11, max: 50, score: 40 }, // Small company
    { min: 1, max: 10, score: 20 }, // Very small company
  ],
  
  industries: [
    'Technology', 'Software', 'SaaS', 'Artificial Intelligence',
    'Professional Services', 'Consulting', 'Management Consulting',
    'Manufacturing', 'Financial Services', 'Banking', 'Fintech',
    'Healthcare', 'Biotechnology', 'Pharmaceuticals',
    'E-commerce', 'Retail', 'Consumer Goods',
    'Media', 'Marketing', 'Real Estate'
  ],
  tenureRange: { min: 0, max: 24 }, // Recently appointed or facing transition
  excludeKeywords: [
    'retired', 'former', 'ex-', 'previous',
    'seeking opportunities', 'between roles', 'job search',
    'unemployed', 'consultant', 'freelance'
  ],
  requiredKeywords: [
    'leadership', 'transformation', 'growth',
    'scale', 'team building', 'strategy', 'vision',
    'culture', 'performance', 'results'
  ],
  
  // Enhanced weights with new categories
  weights: {
    role: 0.20, // Slightly reduced to make room for new factors
    companySize: 0.15,
    industry: 0.08,
    tenure: 0.12,
    recentTransition: 0.12,
    leadershipExperience: 0.08,
    engagementLevel: 0.08,
    postQuality: 0.10, // NEW: LinkedIn post quality analysis
    psychographicFit: 0.12, // NEW: Psychological coaching readiness
    urgencyIndicators: 0.05, // NEW: Immediate need signals
  },
  
  // Post analysis criteria
  postCriteria: {
    minimumPosts: 3, // At least 3 posts in 60 days to be considered
    leadershipTopics: [
      'leadership', 'team', 'culture', 'vision', 'strategy',
      'growth', 'transformation', 'performance', 'results',
      'coaching', 'development', 'mentoring', 'innovation'
    ],
    challengeKeywords: [
      'challenge', 'difficult', 'struggle', 'complex',
      'navigate', 'uncertainty', 'pressure', 'transition',
      'change management', 'scaling', 'growth pains'
    ],
    growthKeywords: [
      'learning', 'development', 'improvement', 'better',
      'evolving', 'adapting', 'growing', 'progress',
      'feedback', 'reflection', 'insight'
    ]
  },
  
  // Psychographic indicators
  psychographicIndicators: {
    transformationalLeadership: [
      'inspire', 'motivate', 'empower', 'vision', 'purpose',
      'values', 'culture', 'transformation', 'change',
      'innovation', 'creativity', 'breakthrough'
    ],
    challengeAwareness: [
      'struggle', 'challenge', 'difficult', 'complex',
      'overwhelmed', 'pressure', 'stress', 'burnout',
      'transition', 'uncertainty', 'tough decisions'
    ],
    coachingReceptivity: [
      'mentor', 'coach', 'advisor', 'guidance', 'support',
      'learn', 'feedback', 'development', 'improvement',
      'help', 'advice', 'wisdom', 'perspective'
    ],
    urgencySignals: [
      'urgent', 'immediate', 'crisis', 'critical',
      'struggling', 'failing', 'desperate', 'need help',
      'overwhelmed', 'breaking point', 'can\'t handle'
    ]
  }
}

// Company size detection service
export class CompanySizeDetectionService {
  private static companyDatabase = new Map<string, number>()
  
  static async getCompanySize(companyId: string, companyName: string): Promise<number | null> {
    // Check cache first
    if (this.companyDatabase.has(companyId)) {
      return this.companyDatabase.get(companyId) || null
    }
    
    // For now, implement basic size detection from company name patterns
    // This can be enhanced with external APIs (LinkedIn Company API, Clearbit, etc.)
    const estimatedSize = this.estimateSizeFromName(companyName)
    
    if (estimatedSize && companyId) {
      this.companyDatabase.set(companyId, estimatedSize)
    }
    
    return estimatedSize
  }
  
  private static estimateSizeFromName(companyName: string): number | null {
    const name = companyName.toLowerCase()
    
    // Fortune 500 / Large enterprise indicators
    if (name.includes('microsoft') || name.includes('google') || name.includes('amazon') ||
        name.includes('apple') || name.includes('meta') || name.includes('tesla') ||
        name.includes('netflix') || name.includes('salesforce') || name.includes('oracle')) {
      return 50000
    }
    
    // Mid-size company indicators
    if (name.includes('startup') || name.includes('inc.') || name.includes('llc')) {
      return 100
    }
    
    // Small company indicators
    if (name.includes('consulting') || name.includes('solutions') || name.includes('services')) {
      return 25
    }
    
    return null // Unknown size
  }
}

// Post quality analyzer
export class PostQualityAnalyzer {
  static analyzePostQuality(posts: any[], criteria: EnhancedICPCriteria['postCriteria']): {
    topicConsistency: number
    leadershipContent: number
    engagementQuality: number
    thoughtLeadership: number
  } {
    if (!posts || posts.length === 0) {
      return {
        topicConsistency: 0,
        leadershipContent: 0,
        engagementQuality: 0,
        thoughtLeadership: 0
      }
    }
    
    let leadershipPostCount = 0
    let totalEngagementScore = 0
    let originalContentCount = 0
    
    posts.forEach(post => {
      const text = (post.text || '').toLowerCase()
      
      // Check for leadership topics
      const hasLeadershipContent = criteria.leadershipTopics.some(topic => 
        text.includes(topic.toLowerCase())
      )
      if (hasLeadershipContent) leadershipPostCount++
      
      // Analyze engagement quality (meaningful vs vanity metrics)
      const engagement = post.stats || {}
      const totalReactions = engagement.total_reactions || 0
      const comments = engagement.comments || 0
      const reposts = engagement.reposts || 0
      
      // Weight comments and reposts higher than simple likes
      const qualityEngagement = (comments * 3) + (reposts * 2) + totalReactions
      totalEngagementScore += qualityEngagement
      
      // Check for original content vs sharing
      if (!text.includes('repost') && !text.includes('shared') && text.length > 100) {
        originalContentCount++
      }
    })
    
    return {
      topicConsistency: posts.length > 0 ? leadershipPostCount / posts.length : 0,
      leadershipContent: leadershipPostCount / Math.max(posts.length, 1),
      engagementQuality: totalEngagementScore / Math.max(posts.length, 1) / 100, // Normalize to 0-1
      thoughtLeadership: originalContentCount / Math.max(posts.length, 1)
    }
  }
}

// Psychographic analyzer
export class PsychographicAnalyzer {
  static analyzePsychographics(
    posts: any[], 
    profile: any, 
    indicators: EnhancedICPCriteria['psychographicIndicators']
  ): {
    leadershipStyle: string
    challengeAwareness: number
    growthMindset: number
    coachingReceptivity: number
    urgencyLevel: string
  } {
    const allText = [
      profile?.headline || '',
      profile?.summary || '',
      ...posts.map(p => p.text || '')
    ].join(' ').toLowerCase()
    
    // Analyze leadership style
    const transformationalScore = this.countKeywords(allText, indicators.transformationalLeadership)
    const leadershipStyle = transformationalScore > 2 ? 'transformational' : 'transactional'
    
    // Analyze challenge awareness
    const challengeScore = this.countKeywords(allText, indicators.challengeAwareness)
    const challengeAwareness = Math.min(challengeScore / 5, 1) // Normalize to 0-1
    
    // Analyze growth mindset
    const growthScore = this.countKeywords(allText, indicators.coachingReceptivity)
    const growthMindset = Math.min(growthScore / 3, 1)
    
    // Analyze coaching receptivity
    const coachingScore = this.countKeywords(allText, indicators.coachingReceptivity)
    const coachingReceptivity = Math.min(coachingScore / 4, 1)
    
    // Analyze urgency level
    const urgencyScore = this.countKeywords(allText, indicators.urgencySignals)
    const urgencyLevel = urgencyScore > 3 ? 'high' : urgencyScore > 1 ? 'medium' : 'low'
    
    return {
      leadershipStyle,
      challengeAwareness,
      growthMindset,
      coachingReceptivity,
      urgencyLevel
    }
  }
  
  private static countKeywords(text: string, keywords: string[]): number {
    return keywords.reduce((count, keyword) => {
      return count + (text.includes(keyword.toLowerCase()) ? 1 : 0)
    }, 0)
  }
}

export class EnhancedLeadScoringEngine {
  private icp: EnhancedICPCriteria

  constructor(icp: EnhancedICPCriteria = ENHANCED_DEFAULT_ICP) {
    this.icp = icp
  }

  async calculateICPScore(researchData: EnhancedResearchData, linkedInPosts?: any[]): Promise<{
    totalScore: number
    breakdown: Record<string, { score: number; reasoning: string }>
    recommendation: 'Hot Lead' | 'Warm Lead' | 'Cold Lead' | 'Not ICP'
    tags: string[]
    psychographicProfile: any
    urgencyLevel: string
  }> {
    const breakdown: Record<string, { score: number; reasoning: string }> = {}
    let weightedScore = 0

    // 1. Role Score (20% weight)
    const roleScore = this.scoreRole(researchData)
    breakdown.role = roleScore
    weightedScore += roleScore.score * this.icp.weights.role

    // 2. Enhanced Company Size Score (15% weight)
    const companySizeScore = await this.scoreCompanySize(researchData)
    breakdown.companySize = companySizeScore
    weightedScore += companySizeScore.score * this.icp.weights.companySize

    // 3. Industry Score (8% weight)
    const industryScore = this.scoreIndustry(researchData)
    breakdown.industry = industryScore
    weightedScore += industryScore.score * this.icp.weights.industry

    // 4. Tenure Score (12% weight)
    const tenureScore = this.scoreTenure(researchData)
    breakdown.tenure = tenureScore
    weightedScore += tenureScore.score * this.icp.weights.tenure

    // 5. Recent Transition Score (12% weight)
    const transitionScore = this.scoreRecentTransition(researchData)
    breakdown.recentTransition = transitionScore
    weightedScore += transitionScore.score * this.icp.weights.recentTransition

    // 6. Leadership Experience Score (8% weight)
    const leadershipScore = this.scoreLeadershipExperience(researchData)
    breakdown.leadershipExperience = leadershipScore
    weightedScore += leadershipScore.score * this.icp.weights.leadershipExperience

    // 7. Engagement Level Score (8% weight)
    const engagementScore = this.scoreEngagementLevel(researchData)
    breakdown.engagementLevel = engagementScore
    weightedScore += engagementScore.score * this.icp.weights.engagementLevel

    // 8. NEW: Post Quality Score (10% weight)
    const postQualityScore = this.scorePostQuality(researchData, linkedInPosts)
    breakdown.postQuality = postQualityScore
    weightedScore += postQualityScore.score * this.icp.weights.postQuality

    // 9. NEW: Psychographic Fit Score (12% weight)  
    const psychographicScore = this.scorePsychographicFit(researchData, linkedInPosts)
    breakdown.psychographicFit = psychographicScore
    weightedScore += psychographicScore.score * this.icp.weights.psychographicFit

    // 10. NEW: Urgency Indicators Score (5% weight)
    const urgencyScore = this.scoreUrgencyIndicators(researchData, linkedInPosts)
    breakdown.urgencyIndicators = urgencyScore
    weightedScore += urgencyScore.score * this.icp.weights.urgencyIndicators

    const totalScore = Math.round(weightedScore)
    const recommendation = this.getEnhancedRecommendation(totalScore)
    const tags = this.generateEnhancedTags(researchData, breakdown, linkedInPosts)
    
    // Generate psychographic profile
    const psychographicProfile = linkedInPosts ? 
      PsychographicAnalyzer.analyzePsychographics(linkedInPosts, researchData.profile, this.icp.psychographicIndicators) :
      null

    return {
      totalScore,
      breakdown,
      recommendation,
      tags,
      psychographicProfile,
      urgencyLevel: psychographicProfile?.urgencyLevel || 'unknown'
    }
  }

  private scoreRole(data: EnhancedResearchData): { score: number; reasoning: string } {
    const currentTitle = data.currentRole?.title || data.profile.headline || ''
    const titleLower = currentTitle.toLowerCase()

    // Enhanced role scoring with more precision
    for (const role of this.icp.roles) {
      if (titleLower.includes(role.toLowerCase())) {
        if (role === 'CEO' || role === 'Chief Executive Officer') {
          return { score: 100, reasoning: `Perfect match: ${role} - highest coaching potential` }
        } else if (role.includes('President') || role.includes('Founder') || role.includes('Managing Director')) {
          return { score: 95, reasoning: `Excellent match: ${role} - top leadership role` }
        } else if (role.includes('COO') || role === 'Chief Operating Officer') {
          return { score: 90, reasoning: `Strong match: ${role} - operational leadership` }
        } else if (role.includes('VP') || role.includes('Vice President')) {
          return { score: 85, reasoning: `Good match: ${role} - senior executive` }
        } else if (role.includes('General Manager') || role.includes('Division Head')) {
          return { score: 80, reasoning: `Good match: ${role} - business unit leadership` }
        } else {
          return { score: 75, reasoning: `Moderate match: ${role}` }
        }
      }
    }

    // Check for leadership indicators
    if (titleLower.includes('director') || titleLower.includes('head of') || titleLower.includes('lead')) {
      return { score: 60, reasoning: 'Leadership role but not senior executive level' }
    }

    if (titleLower.includes('manager') || titleLower.includes('supervisor')) {
      return { score: 40, reasoning: 'Management role but limited senior leadership scope' }
    }

    return { score: 20, reasoning: 'Role does not match ICP criteria - limited coaching potential' }
  }

  private async scoreCompanySize(data: EnhancedResearchData): Promise<{ score: number; reasoning: string }> {
    let employeeCount: number | null = null
    
    // Try to get precise employee count
    if (data.companyInfo?.sizeEmployees) {
      employeeCount = data.companyInfo.sizeEmployees
    } else if (data.currentRole?.companyId && data.companyInfo?.name) {
      employeeCount = await CompanySizeDetectionService.getCompanySize(
        data.currentRole.companyId, 
        data.companyInfo.name
      )
    }
    
    // Use precise employee count if available
    if (employeeCount) {
      for (const range of this.icp.companySizeRanges) {
        if (employeeCount >= range.min && employeeCount <= range.max) {
          return { 
            score: range.score, 
            reasoning: `Company size: ${employeeCount} employees (${range.min}-${range.max} range)` 
          }
        }
      }
    }
    
    // Fall back to original string-based scoring
    const companySize = data.companyInfo?.size
    
    if (!companySize) {
      return { score: 50, reasoning: 'Company size unknown - needs verification' }
    }

    if (this.icp.companySizes.includes(companySize)) {
      if (companySize === '1000+') {
        return { score: 100, reasoning: 'Large enterprise (1000+ employees) - high budget potential' }
      } else if (companySize === '501-1000') {
        return { score: 95, reasoning: 'Mid-large company (501-1000 employees) - excellent fit' }
      } else if (companySize === '201-500') {
        return { score: 85, reasoning: 'Mid-size company (201-500 employees) - good budget capacity' }
      } else if (companySize === '51-200') {
        return { score: 75, reasoning: 'Small-mid company (51-200 employees) - moderate budget' }
      }
    }

    if (companySize === '11-50') {
      return { score: 45, reasoning: 'Small company - limited budget but high impact potential' }
    }
    
    if (companySize === '1-10') {
      return { score: 25, reasoning: 'Very small company - likely budget constraints' }
    }

    return { score: 30, reasoning: 'Company size outside optimal range for coaching investment' }
  }

  private scoreIndustry(data: EnhancedResearchData): { score: number; reasoning: string } {
    const industry = data.companyInfo?.industry

    if (!industry) {
      return { score: 50, reasoning: 'Industry unknown - needs verification' }
    }

    const industryLower = industry.toLowerCase()

    // Premium industries (high coaching investment likelihood)
    const premiumIndustries = ['technology', 'software', 'saas', 'artificial intelligence', 'fintech']
    if (premiumIndustries.some(premium => industryLower.includes(premium))) {
      return { score: 100, reasoning: `Premium industry: ${industry} - high coaching investment potential` }
    }

    // High-value industries
    const highValueIndustries = ['professional services', 'consulting', 'financial services', 'banking']
    if (highValueIndustries.some(high => industryLower.includes(high))) {
      return { score: 90, reasoning: `High-value industry: ${industry} - strong coaching fit` }
    }

    // Good-fit industries
    const goodFitIndustries = ['healthcare', 'manufacturing', 'media', 'real estate']
    if (goodFitIndustries.some(good => industryLower.includes(good))) {
      return { score: 80, reasoning: `Good industry match: ${industry}` }
    }

    // Check against ICP industries list
    for (const targetIndustry of this.icp.industries) {
      if (industryLower.includes(targetIndustry.toLowerCase())) {
        return { score: 75, reasoning: `Industry match: ${targetIndustry}` }
      }
    }

    return { score: 40, reasoning: 'Industry not in primary target list but may still have coaching needs' }
  }

  private scoreTenure(data: EnhancedResearchData): { score: number; reasoning: string } {
    const tenure = data.currentRole?.tenure

    if (tenure === undefined) {
      // Try to calculate from start date
      if (data.currentRole?.startDate) {
        const startDate = new Date(data.currentRole.startDate)
        const now = new Date()
        const diffMonths = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth())
        return this.scoreTenureValue(diffMonths)
      }
      return { score: 50, reasoning: 'Tenure unknown - needs verification' }
    }

    return this.scoreTenureValue(tenure)
  }

  private scoreTenureValue(tenure: number): { score: number; reasoning: string } {
    if (tenure >= this.icp.tenureRange.min && tenure <= this.icp.tenureRange.max) {
      if (tenure <= 3) {
        return { score: 100, reasoning: 'Very recent appointment (0-3 months) - critical transition period, highest coaching need' }
      } else if (tenure <= 6) {
        return { score: 95, reasoning: 'Recent appointment (3-6 months) - establishing leadership, prime coaching window' }
      } else if (tenure <= 12) {
        return { score: 85, reasoning: 'Early tenure (6-12 months) - solidifying leadership approach' }
      } else if (tenure <= 24) {
        return { score: 75, reasoning: 'Established but still early (1-2 years) - growth optimization phase' }
      }
    }

    if (tenure > 60) {
      return { score: 35, reasoning: 'Long tenure (5+ years) - may be set in patterns, lower coaching urgency' }
    } else if (tenure > 36) {
      return { score: 45, reasoning: 'Established tenure (3+ years) - moderate coaching potential' }
    } else if (tenure > 24) {
      return { score: 55, reasoning: 'Settled in role (2+ years) - some coaching potential for next level growth' }
    }

    return { score: 40, reasoning: 'Tenure outside optimal coaching window' }
  }

  private scoreRecentTransition(data: EnhancedResearchData): { score: number; reasoning: string } {
    const experience = data.experience || []
    const currentRole = data.currentRole
    
    if (experience.length === 0 || !currentRole) {
      return { score: 50, reasoning: 'Transition history unknown' }
    }

    let transitionScore = 50
    let reasoning = 'Limited transition indicators'

    // Check for very recent role (high coaching potential)
    if (currentRole.tenure !== undefined && currentRole.tenure <= 6) {
      transitionScore = 95
      reasoning = 'Very recent transition (under 6 months) - critical coaching window'
    } else if (currentRole.tenure !== undefined && currentRole.tenure <= 12) {
      transitionScore = 85
      reasoning = 'Recent transition (under 1 year) - high coaching potential'
    }

    // Check headline for transition signals
    const headline = data.profile.headline || ''
    const transitionKeywords = ['new', 'recently', 'joined', 'appointed', 'promoted']
    if (transitionKeywords.some(keyword => headline.toLowerCase().includes(keyword))) {
      transitionScore = Math.max(transitionScore, 90)
      reasoning = 'Recent transition mentioned in headline - immediate coaching opportunity'
    }

    // Check for role progression
    const recentRoles = experience.slice(0, 3)
    const hasProgressedToSeniorRole = recentRoles.some(role => 
      this.icp.roles.some(icpRole => 
        role.title.toLowerCase().includes(icpRole.toLowerCase())
      )
    )

    if (hasProgressedToSeniorRole) {
      transitionScore = Math.max(transitionScore, 80)
      reasoning = 'Recent progression to senior role - strong coaching fit'
    }

    // Check for company changes (indicates ambition/growth)
    const uniqueCompanies = new Set(recentRoles.map(role => role.company))
    if (uniqueCompanies.size >= 2) {
      transitionScore = Math.max(transitionScore, 70)
    }

    return { score: transitionScore, reasoning }
  }

  private scoreLeadershipExperience(data: EnhancedResearchData): { score: number; reasoning: string } {
    const experience = data.experience || []
    const summary = data.profile.summary || ''
    const headline = data.profile.headline || ''

    let leadershipIndicators = 0
    const leadershipKeywords = [
      'led', 'managed', 'built', 'scaled', 'transformed',
      'team of', 'direct reports', 'p&l', 'budget', 'revenue',
      'strategy', 'vision', 'culture', 'growth', 'performance',
      'executive', 'leadership', 'management', 'oversight'
    ]

    // Enhanced leadership keyword scoring
    const fullText = (summary + ' ' + headline).toLowerCase()
    leadershipKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      const matches = fullText.match(regex)
      if (matches) {
        leadershipIndicators += matches.length
      }
    })

    // Check experience titles with enhanced scoring
    experience.forEach(role => {
      if (this.icp.roles.some(icpRole => 
        role.title.toLowerCase().includes(icpRole.toLowerCase())
      )) {
        leadershipIndicators += 3 // Higher weight for exact role matches
      } else if (role.title.toLowerCase().includes('director') || 
                role.title.toLowerCase().includes('manager') ||
                role.title.toLowerCase().includes('head')) {
        leadershipIndicators += 1
      }
    })

    if (leadershipIndicators >= 10) {
      return { score: 100, reasoning: 'Extensive leadership background with multiple strong indicators' }
    } else if (leadershipIndicators >= 7) {
      return { score: 85, reasoning: 'Strong leadership experience across multiple areas' }
    } else if (leadershipIndicators >= 5) {
      return { score: 70, reasoning: 'Good leadership experience with solid track record' }
    } else if (leadershipIndicators >= 3) {
      return { score: 55, reasoning: 'Some leadership indicators present' }
    } else if (leadershipIndicators >= 1) {
      return { score: 35, reasoning: 'Limited leadership experience indicators' }
    } else {
      return { score: 20, reasoning: 'Minimal leadership experience evident' }
    }
  }

  private scoreEngagementLevel(data: EnhancedResearchData): { score: number; reasoning: string } {
    const activity = data.recentActivity
    const followerCount = data.profile.followerCount || 0

    if (!activity) {
      // Use follower count as engagement proxy if available
      if (followerCount > 5000) {
        return { score: 70, reasoning: 'High follower count suggests strong engagement potential' }
      } else if (followerCount > 1000) {
        return { score: 60, reasoning: 'Moderate follower count suggests some engagement' }
      }
      return { score: 50, reasoning: 'Activity level unknown - needs verification' }
    }

    let engagementScore = 50
    let reasoning = 'Moderate engagement level'

    // Posts frequency scoring
    if (activity.posts && activity.posts > 0) {
      if (activity.posts >= 8) {
        engagementScore = 95
        reasoning = 'Very high posting frequency - excellent engagement'
      } else if (activity.posts >= 4) {
        engagementScore = 80
        reasoning = 'High posting frequency - good engagement'
      } else if (activity.posts >= 2) {
        engagementScore = 65
        reasoning = 'Regular posting activity'
      } else {
        engagementScore = 50
        reasoning = 'Low posting frequency but still active'
      }
    }

    // Topic relevance boost
    const topics = activity.topics || []
    const relevantTopics = ['leadership', 'management', 'growth', 'strategy', 'culture', 'coaching', 'development']
    const hasRelevantTopics = topics.some(topic => 
      relevantTopics.some(relevant => 
        topic.toLowerCase().includes(relevant)
      )
    )

    if (hasRelevantTopics) {
      engagementScore = Math.max(engagementScore, 75)
      reasoning += ' with leadership-relevant content'
    }

    // Engagement quality
    const engagement = activity.engagement || ''
    if (engagement.includes('high') || engagement.includes('active')) {
      engagementScore = Math.max(engagementScore, 85)
      reasoning += ' - high quality interactions'
    }

    return { score: engagementScore, reasoning }
  }

  private scorePostQuality(data: EnhancedResearchData, posts?: any[]): { score: number; reasoning: string } {
    if (!posts || posts.length === 0) {
      return { score: 40, reasoning: 'No recent posts available for analysis' }
    }

    const postAnalysis = data.postAnalysis || PostQualityAnalyzer.analyzePostQuality(posts, this.icp.postCriteria)
    
    // Calculate weighted quality score
    const qualityScore = (
      (postAnalysis.leadershipContent || 0) * 0.3 +
      (postAnalysis.engagementQuality || 0) * 0.25 +
      (postAnalysis.thoughtLeadership || 0) * 0.25 +
      (postAnalysis.topicConsistency || 0) * 0.2
    ) * 100

    if (qualityScore >= 80) {
      return { score: Math.round(qualityScore), reasoning: 'Excellent post quality - strong thought leadership and engagement' }
    } else if (qualityScore >= 60) {
      return { score: Math.round(qualityScore), reasoning: 'Good post quality with leadership focus' }
    } else if (qualityScore >= 40) {
      return { score: Math.round(qualityScore), reasoning: 'Moderate post quality - some leadership content' }
    } else {
      return { score: Math.round(qualityScore), reasoning: 'Limited leadership content in posts' }
    }
  }

  private scorePsychographicFit(data: EnhancedResearchData, posts?: any[]): { score: number; reasoning: string } {
    if (!posts || posts.length === 0) {
      return { score: 50, reasoning: 'Insufficient content for psychographic analysis' }
    }

    const psychographics = data.psychographics || 
      PsychographicAnalyzer.analyzePsychographics(posts, data.profile, this.icp.psychographicIndicators)
    
    // Calculate psychographic fit score
    const fitScore = (
      (psychographics.challengeAwareness || 0) * 0.3 +
      (psychographics.coachingReceptivity || 0) * 0.3 +
      (psychographics.growthMindset || 0) * 0.25 +
      (psychographics.leadershipStyle === 'transformational' ? 0.8 : 0.5) * 0.15
    ) * 100

    if (fitScore >= 80) {
      return { score: Math.round(fitScore), reasoning: 'Excellent psychographic fit - high coaching receptivity and growth mindset' }
    } else if (fitScore >= 65) {
      return { score: Math.round(fitScore), reasoning: 'Strong psychographic fit - good coaching potential' }
    } else if (fitScore >= 50) {
      return { score: Math.round(fitScore), reasoning: 'Moderate psychographic fit - some coaching indicators' }
    } else {
      return { score: Math.round(fitScore), reasoning: 'Limited psychographic fit indicators' }
    }
  }

  private scoreUrgencyIndicators(data: EnhancedResearchData, posts?: any[]): { score: number; reasoning: string } {
    if (!posts || posts.length === 0) {
      return { score: 30, reasoning: 'No content available to assess urgency' }
    }

    const allText = [
      data.profile.headline || '',
      data.profile.summary || '',
      ...posts.map(p => p.text || '')
    ].join(' ').toLowerCase()

    let urgencyScore = 0
    const urgencyKeywords = this.icp.psychographicIndicators.urgencySignals

    // Count urgency indicators
    urgencyKeywords.forEach(keyword => {
      if (allText.includes(keyword.toLowerCase())) {
        urgencyScore += 20 // Each keyword adds significant urgency
      }
    })

    // Check for recent role transition urgency
    if (data.currentRole?.tenure !== undefined && data.currentRole.tenure <= 6) {
      urgencyScore += 30
    }

    // Check for challenge-related content
    const challengeKeywords = this.icp.postCriteria.challengeKeywords
    const challengeCount = challengeKeywords.reduce((count, keyword) => {
      return count + (allText.includes(keyword.toLowerCase()) ? 1 : 0)
    }, 0)
    
    urgencyScore += challengeCount * 10

    urgencyScore = Math.min(urgencyScore, 100) // Cap at 100

    if (urgencyScore >= 70) {
      return { score: urgencyScore, reasoning: 'High urgency indicators - immediate coaching need apparent' }
    } else if (urgencyScore >= 40) {
      return { score: urgencyScore, reasoning: 'Moderate urgency indicators - some immediate coaching potential' }
    } else {
      return { score: urgencyScore, reasoning: 'Low urgency indicators - coaching need not immediate' }
    }
  }

  private getEnhancedRecommendation(score: number): 'Hot Lead' | 'Warm Lead' | 'Cold Lead' | 'Not ICP' {
    if (score >= 85) return 'Hot Lead'     // Andrew's premium tier
    if (score >= 65) return 'Warm Lead'    // Andrew's target tier  
    if (score >= 40) return 'Cold Lead'    // Andrew's nurture tier
    return 'Not ICP'
  }

  private generateEnhancedTags(
    data: EnhancedResearchData, 
    breakdown: Record<string, { score: number; reasoning: string }>,
    posts?: any[]
  ): string[] {
    const tags: string[] = []

    // Role-based tags
    const role = data.currentRole?.title || data.profile.headline || ''
    if (role.toLowerCase().includes('ceo')) tags.push('CEO')
    if (role.toLowerCase().includes('founder')) tags.push('Founder')
    if (role.toLowerCase().includes('president')) tags.push('President')
    if (role.toLowerCase().includes('coo')) tags.push('COO')

    // Tenure-based tags
    if (breakdown.tenure.score >= 90) tags.push('New Role')
    if (breakdown.recentTransition.score >= 80) tags.push('Recent Transition')

    // Company size tags
    const companySize = data.companyInfo?.size
    if (companySize === '1000+') tags.push('Enterprise')
    if (companySize === '501-1000' || companySize === '201-500') tags.push('Mid-Market')
    if (companySize === '51-200') tags.push('SMB')

    // Industry tags
    const industry = data.companyInfo?.industry || ''
    if (industry.toLowerCase().includes('tech') || industry.toLowerCase().includes('software')) {
      tags.push('Technology')
    }
    if (industry.toLowerCase().includes('saas')) tags.push('SaaS')

    // Scoring-based tags
    if (breakdown.leadershipExperience.score >= 80) tags.push('Experienced Leader')
    if (breakdown.engagementLevel.score >= 75) tags.push('LinkedIn Active')
    if (breakdown.postQuality?.score >= 70) tags.push('Thought Leader')
    if (breakdown.psychographicFit?.score >= 70) tags.push('Coaching Ready')
    if (breakdown.urgencyIndicators?.score >= 60) tags.push('High Urgency')

    // Psychographic tags
    if (posts && posts.length > 0) {
      const psychographics = PsychographicAnalyzer.analyzePsychographics(
        posts, 
        data.profile, 
        this.icp.psychographicIndicators
      )
      
      if (psychographics.leadershipStyle === 'transformational') tags.push('Transformational Leader')
      if (psychographics.challengeAwareness > 0.7) tags.push('Challenge Aware')
      if (psychographics.coachingReceptivity > 0.6) tags.push('Coach Receptive')
      if (psychographics.urgencyLevel === 'high') tags.push('Urgent Need')
    }

    return tags
  }

  // Update ICP criteria
  updateICP(newICP: Partial<EnhancedICPCriteria>): void {
    this.icp = { ...this.icp, ...newICP }
  }

  // Get current ICP criteria
  getICP(): EnhancedICPCriteria {
    return { ...this.icp }
  }
}

// Legacy interface for backward compatibility  
interface LegacyICPCriteria {
  roles: string[]
  companySizes: string[]
  industries: string[]
  tenureRange: { min: number; max: number }
  excludeKeywords: string[]
  requiredKeywords: string[]
  weights: {
    role: number
    companySize: number
    industry: number
    tenure: number
    recentTransition: number
    leadershipExperience: number
    engagementLevel: number
  }
}

// Default legacy ICP (original Andrew Tallents criteria)
export const DEFAULT_ICP: LegacyICPCriteria = {
  roles: [
    'CEO', 'Chief Executive Officer',
    'President', 'Managing Director',
    'Founder', 'Co-Founder',
    'General Manager', 'COO', 'Chief Operating Officer',
    'VP', 'Vice President', 'SVP', 'Senior Vice President',
    'Division Head', 'Business Unit Leader'
  ],
  companySizes: ['51-200', '201-500', '501-1000', '1000+'],
  industries: [
    'Technology', 'Software', 'SaaS',
    'Professional Services', 'Consulting',
    'Manufacturing', 'Financial Services',
    'Healthcare', 'Biotechnology',
    'E-commerce', 'Retail'
  ],
  tenureRange: { min: 0, max: 24 },
  excludeKeywords: [
    'retired', 'former', 'ex-', 'previous',
    'seeking opportunities', 'between roles'
  ],
  requiredKeywords: [
    'leadership', 'transformation', 'growth',
    'scale', 'team building', 'strategy'
  ],
  weights: {
    role: 0.25,
    companySize: 0.15,
    industry: 0.10,
    tenure: 0.15,
    recentTransition: 0.15,
    leadershipExperience: 0.10,
    engagementLevel: 0.10
  }
}

// Backward compatibility - Legacy class
export class LeadScoringEngine {
  private enhancedEngine: EnhancedLeadScoringEngine

  constructor(icp?: LegacyICPCriteria) {
    // Convert legacy ICP to enhanced format if needed
    const enhancedICP = icp ? this.convertLegacyICP(icp) : ENHANCED_DEFAULT_ICP
    this.enhancedEngine = new EnhancedLeadScoringEngine(enhancedICP)
  }

  private convertLegacyICP(legacyICP: LegacyICPCriteria): EnhancedICPCriteria {
    return {
      ...ENHANCED_DEFAULT_ICP,
      ...legacyICP,
      // Add missing fields with defaults
      companySizeRanges: ENHANCED_DEFAULT_ICP.companySizeRanges,
      postCriteria: ENHANCED_DEFAULT_ICP.postCriteria,
      psychographicIndicators: ENHANCED_DEFAULT_ICP.psychographicIndicators,
      weights: {
        ...ENHANCED_DEFAULT_ICP.weights,
        ...legacyICP.weights,
        // Set new weights to 0 for legacy compatibility
        postQuality: 0,
        psychographicFit: 0,
        urgencyIndicators: 0
      }
    }
  }

  // Legacy method signature
  async calculateICPScore(researchData: any): Promise<{
    totalScore: number
    breakdown: Record<string, { score: number; reasoning: string }>
    recommendation: 'Hot Lead' | 'Warm Lead' | 'Cold Lead' | 'Not ICP'
    tags: string[]
  }> {
    const result = await this.enhancedEngine.calculateICPScore(researchData)
    return {
      totalScore: result.totalScore,
      breakdown: result.breakdown,
      recommendation: result.recommendation,
      tags: result.tags
    }
  }

  // Legacy utility methods
  updateICP(newICP: Partial<LegacyICPCriteria>): void {
    const enhancedICP = this.convertLegacyICP({...DEFAULT_ICP, ...newICP})
    this.enhancedEngine.updateICP(enhancedICP)
  }

  getICP(): LegacyICPCriteria {
    const enhanced = this.enhancedEngine.getICP()
    return {
      roles: enhanced.roles,
      companySizes: enhanced.companySizes,
      industries: enhanced.industries,
      tenureRange: enhanced.tenureRange,
      excludeKeywords: enhanced.excludeKeywords,
      requiredKeywords: enhanced.requiredKeywords,
      weights: {
        role: enhanced.weights.role,
        companySize: enhanced.weights.companySize,
        industry: enhanced.weights.industry,
        tenure: enhanced.weights.tenure,
        recentTransition: enhanced.weights.recentTransition,
        leadershipExperience: enhanced.weights.leadershipExperience,
        engagementLevel: enhanced.weights.engagementLevel
      }
    }
  }
}

// Utility functions
export const createLeadScoringEngine = (customICP?: LegacyICPCriteria) => {
  return new LeadScoringEngine(customICP)
}

export const createEnhancedLeadScoringEngine = (customICP?: EnhancedICPCriteria) => {
  return new EnhancedLeadScoringEngine(customICP)
}

// Export main enhanced engine as default
export default EnhancedLeadScoringEngine