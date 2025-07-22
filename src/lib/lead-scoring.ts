import { z } from 'zod'

// Research data structure from automation platform
export const ResearchDataSchema = z.object({
  profile: z.object({
    name: z.string(),
    profileUrl: z.string(),
    headline: z.string().optional(),
    location: z.string().optional(),
    summary: z.string().optional(),
  }),
  currentRole: z.object({
    title: z.string(),
    company: z.string(),
    startDate: z.string().optional(),
    tenure: z.number().optional(), // in months
  }).optional(),
  companyInfo: z.object({
    name: z.string(),
    size: z.string().optional(),
    industry: z.string().optional(),
    description: z.string().optional(),
    website: z.string().optional(),
  }).optional(),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    duration: z.string().optional(),
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
})

export type ResearchData = z.infer<typeof ResearchDataSchema>

// ICP (Ideal Customer Profile) criteria
export interface ICPCriteria {
  roles: string[]
  companySizes: string[]
  industries: string[]
  tenureRange: { min: number; max: number } // in months
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

// Default ICP for Andrew Tallents (CEO Coach)
export const DEFAULT_ICP: ICPCriteria = {
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
  tenureRange: { min: 0, max: 24 }, // Recently appointed or facing transition
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

export class LeadScoringEngine {
  private icp: ICPCriteria

  constructor(icp: ICPCriteria = DEFAULT_ICP) {
    this.icp = icp
  }

  calculateICPScore(researchData: ResearchData): {
    totalScore: number
    breakdown: Record<string, { score: number; reasoning: string }>
    recommendation: 'Hot Lead' | 'Warm Lead' | 'Cold Lead' | 'Not ICP'
    tags: string[]
  } {
    const breakdown: Record<string, { score: number; reasoning: string }> = {}
    let weightedScore = 0

    // 1. Role Score (25% weight)
    const roleScore = this.scoreRole(researchData)
    breakdown.role = roleScore
    weightedScore += roleScore.score * this.icp.weights.role

    // 2. Company Size Score (15% weight)
    const companySizeScore = this.scoreCompanySize(researchData)
    breakdown.companySize = companySizeScore
    weightedScore += companySizeScore.score * this.icp.weights.companySize

    // 3. Industry Score (10% weight)
    const industryScore = this.scoreIndustry(researchData)
    breakdown.industry = industryScore
    weightedScore += industryScore.score * this.icp.weights.industry

    // 4. Tenure Score (15% weight)
    const tenureScore = this.scoreTenure(researchData)
    breakdown.tenure = tenureScore
    weightedScore += tenureScore.score * this.icp.weights.tenure

    // 5. Recent Transition Score (15% weight)
    const transitionScore = this.scoreRecentTransition(researchData)
    breakdown.recentTransition = transitionScore
    weightedScore += transitionScore.score * this.icp.weights.recentTransition

    // 6. Leadership Experience Score (10% weight)
    const leadershipScore = this.scoreLeadershipExperience(researchData)
    breakdown.leadershipExperience = leadershipScore
    weightedScore += leadershipScore.score * this.icp.weights.leadershipExperience

    // 7. Engagement Level Score (10% weight)
    const engagementScore = this.scoreEngagementLevel(researchData)
    breakdown.engagementLevel = engagementScore
    weightedScore += engagementScore.score * this.icp.weights.engagementLevel

    const totalScore = Math.round(weightedScore)
    const recommendation = this.getRecommendation(totalScore)
    const tags = this.generateTags(researchData, breakdown)

    return {
      totalScore,
      breakdown,
      recommendation,
      tags
    }
  }

  private scoreRole(data: ResearchData): { score: number; reasoning: string } {
    const currentTitle = data.currentRole?.title || data.profile.headline || ''
    const titleLower = currentTitle.toLowerCase()

    for (const role of this.icp.roles) {
      if (titleLower.includes(role.toLowerCase())) {
        if (role === 'CEO' || role === 'Chief Executive Officer') {
          return { score: 100, reasoning: `Perfect match: ${role}` }
        } else if (role.includes('President') || role.includes('Founder')) {
          return { score: 90, reasoning: `Strong match: ${role}` }
        } else if (role.includes('VP') || role.includes('COO')) {
          return { score: 80, reasoning: `Good match: ${role}` }
        } else {
          return { score: 70, reasoning: `Moderate match: ${role}` }
        }
      }
    }

    // Check for leadership indicators
    if (titleLower.includes('director') || titleLower.includes('head of') || titleLower.includes('lead')) {
      return { score: 50, reasoning: 'Leadership role but not senior executive' }
    }

    return { score: 20, reasoning: 'Role does not match ICP criteria' }
  }

  private scoreCompanySize(data: ResearchData): { score: number; reasoning: string } {
    const companySize = data.companyInfo?.size

    if (!companySize) {
      return { score: 50, reasoning: 'Company size unknown' }
    }

    if (this.icp.companySizes.includes(companySize)) {
      if (companySize === '1000+') {
        return { score: 100, reasoning: 'Large enterprise (1000+ employees)' }
      } else if (companySize === '501-1000') {
        return { score: 90, reasoning: 'Mid-large company (501-1000 employees)' }
      } else if (companySize === '201-500') {
        return { score: 85, reasoning: 'Mid-size company (201-500 employees)' }
      } else if (companySize === '51-200') {
        return { score: 75, reasoning: 'Small-mid company (51-200 employees)' }
      }
    }

    if (companySize === '1-50') {
      return { score: 40, reasoning: 'Small company but may have budget constraints' }
    }

    return { score: 30, reasoning: 'Company size does not match ICP' }
  }

  private scoreIndustry(data: ResearchData): { score: number; reasoning: string } {
    const industry = data.companyInfo?.industry

    if (!industry) {
      return { score: 50, reasoning: 'Industry unknown' }
    }

    for (const targetIndustry of this.icp.industries) {
      if (industry.toLowerCase().includes(targetIndustry.toLowerCase())) {
        if (targetIndustry.includes('Technology') || targetIndustry.includes('Software')) {
          return { score: 100, reasoning: `High-value industry: ${targetIndustry}` }
        } else if (targetIndustry.includes('Professional Services') || targetIndustry.includes('Financial')) {
          return { score: 90, reasoning: `Good industry match: ${targetIndustry}` }
        } else {
          return { score: 80, reasoning: `Industry match: ${targetIndustry}` }
        }
      }
    }

    return { score: 40, reasoning: 'Industry not in target list but may still be relevant' }
  }

  private scoreTenure(data: ResearchData): { score: number; reasoning: string } {
    const tenure = data.currentRole?.tenure

    if (tenure === undefined) {
      return { score: 50, reasoning: 'Tenure unknown' }
    }

    if (tenure >= this.icp.tenureRange.min && tenure <= this.icp.tenureRange.max) {
      if (tenure <= 6) {
        return { score: 100, reasoning: 'Very recent appointment (0-6 months) - likely needs support' }
      } else if (tenure <= 12) {
        return { score: 90, reasoning: 'Recent appointment (6-12 months) - in transition phase' }
      } else if (tenure <= 24) {
        return { score: 80, reasoning: 'Still in early tenure (1-2 years) - establishing leadership' }
      }
    }

    if (tenure > 60) {
      return { score: 30, reasoning: 'Long tenure (5+ years) - may be less likely to seek coaching' }
    } else if (tenure > 24) {
      return { score: 50, reasoning: 'Established in role (2+ years) - moderate coaching potential' }
    }

    return { score: 40, reasoning: 'Tenure outside optimal range' }
  }

  private scoreRecentTransition(data: ResearchData): { score: number; reasoning: string } {
    const experience = data.experience || []
    const currentRole = data.currentRole
    
    if (experience.length === 0 || !currentRole) {
      return { score: 50, reasoning: 'Transition history unknown' }
    }

    // Look for recent job changes or promotions
    const recentRoles = experience.slice(0, 3) // Last 3 roles
    let transitionScore = 50

    // Check for role progression
    const hasProgressedToSeniorRole = recentRoles.some(role => 
      this.icp.roles.some(icpRole => 
        role.title.toLowerCase().includes(icpRole.toLowerCase())
      )
    )

    if (hasProgressedToSeniorRole) {
      transitionScore = 85
    }

    // Check for company changes (indicates ambition/growth)
    const uniqueCompanies = new Set(recentRoles.map(role => role.company))
    if (uniqueCompanies.size >= 2) {
      transitionScore = Math.max(transitionScore, 75)
    }

    // Check for recent appointment indicators
    const headline = data.profile.headline || ''
    if (headline.toLowerCase().includes('new') || headline.toLowerCase().includes('recently')) {
      transitionScore = 95
    }

    if (transitionScore >= 85) {
      return { score: transitionScore, reasoning: 'Recent transition to senior role - high coaching potential' }
    } else if (transitionScore >= 75) {
      return { score: transitionScore, reasoning: 'Career progression indicates growth mindset' }
    } else {
      return { score: transitionScore, reasoning: 'Limited transition indicators' }
    }
  }

  private scoreLeadershipExperience(data: ResearchData): { score: number; reasoning: string } {
    const experience = data.experience || []
    const summary = data.profile.summary || ''
    const headline = data.profile.headline || ''

    let leadershipIndicators = 0
    const leadershipKeywords = [
      'led', 'managed', 'built', 'scaled', 'transformed',
      'team of', 'direct reports', 'p&l', 'budget',
      'strategy', 'vision', 'culture', 'growth'
    ]

    // Check summary and headline
    const fullText = (summary + ' ' + headline).toLowerCase()
    leadershipKeywords.forEach(keyword => {
      if (fullText.includes(keyword)) {
        leadershipIndicators++
      }
    })

    // Check experience titles
    experience.forEach(role => {
      if (this.icp.roles.some(icpRole => 
        role.title.toLowerCase().includes(icpRole.toLowerCase())
      )) {
        leadershipIndicators += 2
      }
    })

    if (leadershipIndicators >= 6) {
      return { score: 100, reasoning: 'Strong leadership background with multiple indicators' }
    } else if (leadershipIndicators >= 4) {
      return { score: 80, reasoning: 'Good leadership experience' }
    } else if (leadershipIndicators >= 2) {
      return { score: 60, reasoning: 'Some leadership indicators' }
    } else {
      return { score: 30, reasoning: 'Limited leadership experience indicators' }
    }
  }

  private scoreEngagementLevel(data: ResearchData): { score: number; reasoning: string } {
    const activity = data.recentActivity

    if (!activity) {
      return { score: 50, reasoning: 'Activity level unknown' }
    }

    let engagementScore = 50

    // Posts frequency
    if (activity.posts && activity.posts > 0) {
      if (activity.posts >= 4) {
        engagementScore = 90
      } else if (activity.posts >= 2) {
        engagementScore = 75
      } else {
        engagementScore = 60
      }
    }

    // Topic relevance
    const topics = activity.topics || []
    const relevantTopics = ['leadership', 'management', 'growth', 'strategy', 'culture', 'coaching']
    const hasRelevantTopics = topics.some(topic => 
      relevantTopics.some(relevant => 
        topic.toLowerCase().includes(relevant)
      )
    )

    if (hasRelevantTopics) {
      engagementScore = Math.max(engagementScore, 80)
    }

    // Engagement quality
    const engagement = activity.engagement || ''
    if (engagement.includes('high') || engagement.includes('active')) {
      engagementScore = Math.max(engagementScore, 85)
    }

    if (engagementScore >= 85) {
      return { score: engagementScore, reasoning: 'High LinkedIn engagement with relevant content' }
    } else if (engagementScore >= 70) {
      return { score: engagementScore, reasoning: 'Good LinkedIn activity level' }
    } else {
      return { score: engagementScore, reasoning: 'Moderate or unknown activity level' }
    }
  }

  private getRecommendation(score: number): 'Hot Lead' | 'Warm Lead' | 'Cold Lead' | 'Not ICP' {
    if (score >= 80) return 'Hot Lead'
    if (score >= 60) return 'Warm Lead' 
    if (score >= 40) return 'Cold Lead'
    return 'Not ICP'
  }

  private generateTags(data: ResearchData, breakdown: Record<string, { score: number; reasoning: string }>): string[] {
    const tags: string[] = []

    // Role-based tags
    const role = data.currentRole?.title || data.profile.headline || ''
    if (role.toLowerCase().includes('ceo')) tags.push('CEO')
    if (role.toLowerCase().includes('founder')) tags.push('Founder')
    if (role.toLowerCase().includes('president')) tags.push('President')
    if (role.toLowerCase().includes('new') || breakdown.tenure.score >= 90) tags.push('New Role')

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
    if (breakdown.recentTransition.score >= 85) tags.push('Recent Transition')
    if (breakdown.leadershipExperience.score >= 80) tags.push('Experienced Leader')
    if (breakdown.engagementLevel.score >= 80) tags.push('LinkedIn Active')

    return tags
  }

  // Update ICP criteria
  updateICP(newICP: Partial<ICPCriteria>): void {
    this.icp = { ...this.icp, ...newICP }
  }

  // Get current ICP criteria
  getICP(): ICPCriteria {
    return { ...this.icp }
  }
}

// Utility function to create scoring engine
export const createLeadScoringEngine = (customICP?: ICPCriteria) => {
  return new LeadScoringEngine(customICP)
}