// ICP (Ideal Customer Profile) Scoring System for LinkedIn Prospects
import { LinkedInProfile } from './linkedin-scraper'

export interface ICPScore {
  totalScore: number
  category: 'Hot Lead' | 'Warm Lead' | 'Cold Lead' | 'Not ICP'
  breakdown: {
    roleMatch: number
    companySize: number
    industry: number
    tenure: number
    careerTransition: number
    leadership: number
    engagement: number
  }
  tags: string[]
  reasoning: string[]
}

export interface ProspectProfile {
  name: string
  headline: string
  company: string
  role: string
  profileUrl: string
  profilePicture?: string
  location: string
  followerCount: number
  connectionCount: number
  tenure?: string
  icpScore: ICPScore
}

export class ICPScorer {
  // ICP Criteria Configuration
  private readonly TARGET_ROLES = [
    'CEO', 'Chief Executive Officer', 'President', 'Managing Director',
    'Founder', 'Co-Founder', 'COO', 'VP', 'SVP', 'Division Head', 'GM'
  ]

  private readonly TARGET_INDUSTRIES = [
    'Technology', 'Software', 'SaaS', 'Professional Services', 'Consulting',
    'Manufacturing', 'Financial Services', 'Healthcare', 'Biotech', 
    'E-commerce', 'Retail'
  ]

  private readonly EXCLUDE_KEYWORDS = [
    'retired', 'former', 'ex-', 'seeking opportunities', 'between roles'
  ]

  private readonly LEADERSHIP_KEYWORDS = [
    'leadership', 'transformation', 'growth', 'scale', 'team building', 'strategy'
  ]

  private readonly CAREER_TRANSITION_KEYWORDS = [
    'new role', 'recently joined', 'promoted', 'new position', 'starting'
  ]

  // Scoring weights (totaling 100%)
  private readonly WEIGHTS = {
    roleMatch: 0.25,
    companySize: 0.15,
    industry: 0.10,
    tenure: 0.15,
    careerTransition: 0.15,
    leadership: 0.10,
    engagement: 0.10
  }

  public scoreProfile(profile: LinkedInProfile): ICPScore {
    const breakdown = {
      roleMatch: this.scoreRoleMatch(profile),
      companySize: this.scoreCompanySize(profile),
      industry: this.scoreIndustry(profile),
      tenure: this.scoreTenure(profile),
      careerTransition: this.scoreCareerTransition(profile),
      leadership: this.scoreLeadership(profile),
      engagement: this.scoreEngagement(profile)
    }

    const totalScore = Math.round(
      breakdown.roleMatch * this.WEIGHTS.roleMatch +
      breakdown.companySize * this.WEIGHTS.companySize +
      breakdown.industry * this.WEIGHTS.industry +
      breakdown.tenure * this.WEIGHTS.tenure +
      breakdown.careerTransition * this.WEIGHTS.careerTransition +
      breakdown.leadership * this.WEIGHTS.leadership +
      breakdown.engagement * this.WEIGHTS.engagement
    )

    const category = this.determineCategory(totalScore)
    const tags = this.generateTags(profile, breakdown)
    const reasoning = this.generateReasoning(profile, breakdown)

    return {
      totalScore,
      category,
      breakdown,
      tags,
      reasoning
    }
  }

  private scoreRoleMatch(profile: LinkedInProfile): number {
    const headline = profile.data.basic_info.headline?.toLowerCase() || ''
    const currentJob = profile.data.experience?.find(exp => exp.is_current)
    const title = currentJob?.title?.toLowerCase() || ''
    
    // Check for exclude keywords first
    const excludeText = `${headline} ${title}`.toLowerCase()
    if (this.EXCLUDE_KEYWORDS.some(keyword => excludeText.includes(keyword))) {
      return 0
    }

    // Check for exact role matches
    const searchText = `${headline} ${title}`.toLowerCase()
    
    if (this.hasRole(searchText, ['ceo', 'chief executive', 'president', 'managing director'])) {
      return 100
    }
    if (this.hasRole(searchText, ['founder', 'co-founder'])) {
      return 100
    }
    if (this.hasRole(searchText, ['coo', 'vp', 'svp', 'vice president', 'division head', 'gm', 'general manager'])) {
      return 90
    }
    if (this.hasRole(searchText, ['director', 'head of'])) {
      return 70
    }
    
    return 20 // Some leadership potential
  }

  private scoreCompanySize(profile: LinkedInProfile): number {
    // This would ideally come from company data, but we'll estimate based on available info
    const company = profile.data.basic_info.current_company || ''
    const headline = profile.data.basic_info.headline || ''
    
    // Look for size indicators in headline or company name
    const text = `${company} ${headline}`.toLowerCase()
    
    if (text.includes('enterprise') || text.includes('fortune') || text.includes('global')) {
      return 100 // 1000+ employees
    }
    if (text.includes('mid-market') || text.includes('regional')) {
      return 90 // 501-1000 employees
    }
    
    // Default to mid-size for now - this could be enhanced with company lookup
    return 85 // 201-500 employees
  }

  private scoreIndustry(profile: LinkedInProfile): number {
    const company = profile.data.basic_info.current_company?.toLowerCase() || ''
    const headline = profile.data.basic_info.headline?.toLowerCase() || ''
    const about = profile.data.basic_info.about?.toLowerCase() || ''
    
    const searchText = `${company} ${headline} ${about}`
    
    // Technology/Software/SaaS (highest priority)
    if (this.hasIndustry(searchText, ['technology', 'software', 'saas', 'tech', 'ai', 'cloud', 'digital'])) {
      return 100
    }
    
    // Professional Services & Financial (high priority)
    if (this.hasIndustry(searchText, ['consulting', 'professional services', 'financial', 'banking', 'investment'])) {
      return 90
    }
    
    // Other target industries
    if (this.hasIndustry(searchText, ['manufacturing', 'healthcare', 'biotech', 'e-commerce', 'retail'])) {
      return 80
    }
    
    return 40 // Not a target industry
  }

  private scoreTenure(profile: LinkedInProfile): number {
    const currentJob = profile.data.experience?.find(exp => exp.is_current)
    if (!currentJob?.start_date) return 60 // Unknown tenure
    
    const startYear = currentJob.start_date.year
    const currentYear = new Date().getFullYear()
    const monthsInRole = (currentYear - startYear) * 12
    
    if (monthsInRole <= 6) return 100 // 0-6 months
    if (monthsInRole <= 12) return 90 // 6-12 months
    if (monthsInRole <= 24) return 80 // 12-24 months
    
    return 50 // More than 24 months
  }

  private scoreCareerTransition(profile: LinkedInProfile): number {
    const headline = profile.data.basic_info.headline?.toLowerCase() || ''
    const about = profile.data.basic_info.about?.toLowerCase() || ''
    
    const searchText = `${headline} ${about}`
    
    if (this.CAREER_TRANSITION_KEYWORDS.some(keyword => searchText.includes(keyword))) {
      return 95 // Clear transition signals
    }
    
    // Check for recent role changes by looking at experience
    const recentExperience = profile.data.experience?.slice(0, 2) || []
    if (recentExperience.length >= 2) {
      const current = recentExperience[0]
      const previous = recentExperience[1]
      
      if (current.is_current && current.start_date?.year === new Date().getFullYear()) {
        return 85 // Started current role this year
      }
    }
    
    return 60 // No clear transition signals
  }

  private scoreLeadership(profile: LinkedInProfile): number {
    const headline = profile.data.basic_info.headline?.toLowerCase() || ''
    const about = profile.data.basic_info.about?.toLowerCase() || ''
    
    const searchText = `${headline} ${about}`
    const keywordMatches = this.LEADERSHIP_KEYWORDS.filter(keyword => 
      searchText.includes(keyword)
    ).length
    
    // Score based on number of leadership keyword matches
    if (keywordMatches >= 4) return 100
    if (keywordMatches >= 3) return 85
    if (keywordMatches >= 2) return 70
    if (keywordMatches >= 1) return 55
    
    return 30 // No leadership keywords
  }

  private scoreEngagement(profile: LinkedInProfile): number {
    const followerCount = profile.data.basic_info.follower_count || 0
    const isCreator = profile.data.basic_info.is_creator || false
    const isInfluencer = profile.data.basic_info.is_influencer || false
    
    if (isInfluencer) return 95
    if (isCreator && followerCount > 5000) return 90
    if (isCreator && followerCount > 1000) return 85
    if (followerCount > 2000) return 75
    if (followerCount > 500) return 65
    
    return 50 // Low engagement
  }

  private determineCategory(score: number): 'Hot Lead' | 'Warm Lead' | 'Cold Lead' | 'Not ICP' {
    if (score >= 80) return 'Hot Lead'
    if (score >= 60) return 'Warm Lead'
    if (score >= 40) return 'Cold Lead'
    return 'Not ICP'
  }

  private generateTags(profile: LinkedInProfile, breakdown: any): string[] {
    const tags: string[] = []
    
    // Role tags
    if (breakdown.roleMatch >= 90) {
      const headline = profile.data.basic_info.headline?.toLowerCase() || ''
      if (headline.includes('ceo') || headline.includes('chief executive')) tags.push('CEO')
      if (headline.includes('founder')) tags.push('Founder')
      if (headline.includes('president')) tags.push('President')
      if (headline.includes('vp') || headline.includes('vice president')) tags.push('VP')
    }
    
    // Company size tags
    if (breakdown.companySize >= 90) tags.push('Enterprise')
    else if (breakdown.companySize >= 80) tags.push('Mid-Market')
    else tags.push('SMB')
    
    // Industry tags
    const headline = profile.data.basic_info.headline?.toLowerCase() || ''
    if (headline.includes('technology') || headline.includes('software') || headline.includes('saas')) {
      tags.push('Technology')
    }
    
    // Signal tags
    if (breakdown.careerTransition >= 80) tags.push('Recent Transition')
    if (breakdown.leadership >= 80) tags.push('Experienced Leader')
    if (breakdown.engagement >= 80) tags.push('LinkedIn Active')
    
    return tags
  }

  private generateReasoning(profile: LinkedInProfile, breakdown: any): string[] {
    const reasoning: string[] = []
    
    if (breakdown.roleMatch >= 80) {
      reasoning.push(`Strong role match: ${profile.data.basic_info.headline}`)
    }
    if (breakdown.careerTransition >= 80) {
      reasoning.push('Shows recent career transition signals')
    }
    if (breakdown.leadership >= 70) {
      reasoning.push('Strong leadership indicators in profile')
    }
    if (breakdown.engagement >= 80) {
      reasoning.push('Active LinkedIn presence')
    }
    
    return reasoning
  }

  private hasRole(text: string, roles: string[]): boolean {
    return roles.some(role => text.includes(role))
  }

  private hasIndustry(text: string, industries: string[]): boolean {
    return industries.some(industry => text.includes(industry))
  }

  public createProspectProfile(profile: LinkedInProfile, profileUrl: string): ProspectProfile {
    const icpScore = this.scoreProfile(profile)
    const currentJob = profile.data.experience?.find(exp => exp.is_current)
    
    return {
      name: profile.data.basic_info.fullname,
      headline: profile.data.basic_info.headline || '',
      company: profile.data.basic_info.current_company || '',
      role: currentJob?.title || '',
      profileUrl,
      profilePicture: profile.data.basic_info.profile_picture_url,
      location: profile.data.basic_info.location?.full || '',
      followerCount: profile.data.basic_info.follower_count || 0,
      connectionCount: profile.data.basic_info.connection_count || 0,
      tenure: this.calculateTenure(currentJob),
      icpScore
    }
  }

  private calculateTenure(job: any): string {
    if (!job?.start_date) return 'Unknown'
    
    const startYear = job.start_date.year
    const currentYear = new Date().getFullYear()
    const monthsInRole = (currentYear - startYear) * 12
    
    if (monthsInRole < 12) return `${monthsInRole} months`
    const years = Math.floor(monthsInRole / 12)
    return `${years} year${years !== 1 ? 's' : ''}`
  }
}

// Export singleton instance
export const icpScorer = new ICPScorer()