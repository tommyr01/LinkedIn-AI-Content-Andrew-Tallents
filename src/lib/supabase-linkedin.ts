import { createClient } from '@supabase/supabase-js'
import { icpScorer, ProspectProfile } from './icp-scorer'
import { enhancedICPScorer, type LinkedInCommentAuthor, type EnhancedProspectProfile } from './enhanced-icp-scorer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// LinkedIn API Response Types
export interface LinkedInPost {
  urn: string
  full_urn: string
  posted_at: string
  text: string
  url: string
  post_type: string
  author: {
    first_name: string
    last_name: string
    headline: string
    username: string
    profile_url: string
    profile_picture: string
  }
  stats: {
    total_reactions: number
    like: number
    support: number
    love: number
    insight: number
    celebrate: number
    comments: number
    reposts: number
  }
  document?: {
    title: string
    page_count: number
    url: string
    thumbnail: string
  }
}

export interface LinkedInComment {
  comment_id: string
  text: string
  posted_at: string
  is_edited: boolean
  is_pinned: boolean
  comment_url: string
  author: {
    name: string
    headline: string
    profile_url: string
    profile_picture: string
  }
  stats: {
    total_reactions: number
    reactions: {
      like: number
      appreciation: number
      empathy: number
      interest: number
      praise: number
    }
    comments: number
  }
  replies?: any[]
}

// Database row types
export interface DBLinkedInPost {
  id: string
  urn: string
  full_urn?: string
  posted_at: string
  text: string
  url: string
  post_type: string
  author_first_name: string
  author_last_name: string
  author_headline: string
  author_username: string
  author_profile_url: string
  author_profile_picture: string
  total_reactions: number
  like_count: number
  support_count: number
  love_count: number
  insight_count: number
  celebrate_count: number
  comments_count: number
  reposts_count: number
  document_title?: string
  document_page_count?: number
  document_url?: string
  document_thumbnail?: string
  created_at: string
  updated_at: string
  last_synced_at: string
}

export interface DBLinkedInComment {
  id: string
  comment_id: string
  post_urn: string
  text: string
  posted_at: string
  is_edited: boolean
  is_pinned: boolean
  comment_url: string
  author_name: string
  author_headline: string
  author_profile_url: string
  author_profile_picture: string
  total_reactions: number
  like_reactions: number
  appreciation_reactions: number
  empathy_reactions: number
  interest_reactions: number
  praise_reactions: number
  comments_count: number
  replies?: any
  replies_count: number
  icp_score?: number
  icp_category?: string
  icp_breakdown?: any
  icp_tags?: string[]
  icp_reasoning?: string[]
  profile_researched: boolean
  research_completed_at?: string
  created_at: string
  updated_at: string
}

export class SupabaseLinkedInService {
  
  // Posts Operations
  async upsertPost(linkedInPost: LinkedInPost): Promise<DBLinkedInPost> {
    const dbPost = this.transformPostToDB(linkedInPost)
    
    const { data, error } = await supabase
      .from('linkedin_posts')
      .upsert(dbPost, { 
        onConflict: 'urn',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting LinkedIn post:', error)
      throw new Error(`Failed to save post: ${error.message}`)
    }

    // Record engagement history
    await this.recordEngagementHistory(linkedInPost.urn, linkedInPost.stats)

    return data
  }

  async getPostsByUsername(username: string, limit: number = 50): Promise<DBLinkedInPost[]> {
    const { data, error } = await supabase
      .from('linkedin_posts')
      .select('*')
      .eq('author_username', username)
      .order('posted_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching posts:', error)
      throw new Error(`Failed to fetch posts: ${error.message}`)
    }

    return data || []
  }

  async getPostByUrn(urn: string): Promise<DBLinkedInPost | null> {
    const { data, error } = await supabase
      .from('linkedin_posts')
      .select('*')
      .eq('urn', urn)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found error
      console.error('Error fetching post:', error)
      throw new Error(`Failed to fetch post: ${error.message}`)
    }

    return data
  }

  // Comments Operations
  async upsertComment(comment: LinkedInComment, postUrn: string): Promise<DBLinkedInComment> {
    const dbComment = this.transformCommentToDB(comment, postUrn)
    
    const { data, error } = await supabase
      .from('linkedin_comments')
      .upsert(dbComment, { 
        onConflict: 'comment_id',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting LinkedIn comment:', error)
      throw new Error(`Failed to save comment: ${error.message}`)
    }

    return data
  }

  async getCommentsByPostUrn(postUrn: string): Promise<DBLinkedInComment[]> {
    const { data, error } = await supabase
      .from('linkedin_comments')
      .select('*')
      .eq('post_urn', postUrn)
      .order('posted_at', { ascending: false })

    if (error) {
      console.error('Error fetching comments:', error)
      throw new Error(`Failed to fetch comments: ${error.message}`)
    }

    return data || []
  }

  // Profile Research & ICP Scoring
  async researchCommentAuthor(comment: LinkedInComment): Promise<EnhancedProspectProfile | null> {
    try {
      // Check if profile already exists
      const existingProfile = await this.getProfileByUrl(comment.author.profile_url)
      
      if (existingProfile && existingProfile.last_researched_at) {
        // If researched within last 7 days, return existing data (shorter cache for better accuracy)
        const lastResearch = new Date(existingProfile.last_researched_at)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        
        if (lastResearch > sevenDaysAgo) {
          return this.transformDBProfileToEnhancedProspect(existingProfile)
        }
      }

      // Use enhanced ICP scorer for LinkedIn comment authors
      const author: LinkedInCommentAuthor = {
        name: comment.author.name,
        headline: comment.author.headline,
        profile_url: comment.author.profile_url,
        profile_picture: comment.author.profile_picture
      }

      const prospectProfile = enhancedICPScorer.createEnhancedProspectProfile(author, comment.author.profile_url)
      
      // Save enhanced data to database
      await this.upsertProfile({
        profile_url: comment.author.profile_url,
        name: comment.author.name,
        headline: comment.author.headline,
        profile_picture: comment.author.profile_picture,
        current_company: prospectProfile.company,
        current_role: prospectProfile.role,
        icp_score: prospectProfile.icpScore.totalScore,
        icp_category: prospectProfile.icpScore.category,
        icp_breakdown: prospectProfile.icpScore.breakdown,
        icp_tags: prospectProfile.icpScore.tags,
        icp_reasoning: prospectProfile.icpScore.reasoning,
        // Enhanced fields
        icp_confidence: prospectProfile.icpScore.confidence,
        data_quality: prospectProfile.icpScore.dataQuality,
        signals: prospectProfile.icpScore.signals,
        red_flags: prospectProfile.icpScore.redFlags
      })

      console.log(`✅ Enhanced ICP scoring for ${comment.author.name}: ${prospectProfile.icpScore.totalScore}/100 (${prospectProfile.icpScore.category}) - Confidence: ${prospectProfile.icpScore.confidence}%`)

      return prospectProfile
    } catch (error) {
      console.error('Error researching comment author:', error)
      return null
    }
  }

  async upsertProfile(profileData: any): Promise<void> {
    const { error } = await supabase
      .from('linkedin_profiles')
      .upsert({
        ...profileData,
        last_researched_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'profile_url',
        ignoreDuplicates: false 
      })

    if (error) {
      console.error('Error upserting profile:', error)
      throw new Error(`Failed to save profile: ${error.message}`)
    }
  }

  async getProfileByUrl(profileUrl: string): Promise<any> {
    const { data, error } = await supabase
      .from('linkedin_profiles')
      .select('*')
      .eq('profile_url', profileUrl)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error)
      throw new Error(`Failed to fetch profile: ${error.message}`)
    }

    return data
  }

  // Engagement History
  async recordEngagementHistory(postUrn: string, stats: any): Promise<void> {
    const { error } = await supabase
      .from('post_engagement_history')
      .insert({
        post_urn: postUrn,
        total_reactions: stats.total_reactions,
        like_count: stats.like,
        support_count: stats.support,
        love_count: stats.love,
        insight_count: stats.insight,
        celebrate_count: stats.celebrate,
        comments_count: stats.comments,
        reposts_count: stats.reposts,
        recorded_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error recording engagement history:', error)
      // Don't throw - this is non-critical
    }
  }

  // Analytics
  async getHighValueProspects(minScore: number = 60): Promise<any[]> {
    const { data, error } = await supabase
      .from('high_value_prospects')
      .select('*')
      .gte('icp_score', minScore)
      .order('icp_score', { ascending: false })

    if (error) {
      console.error('Error fetching high value prospects:', error)
      return []
    }

    return data || []
  }

  async getPostsWithStats(): Promise<any[]> {
    const { data, error } = await supabase
      .from('posts_with_latest_stats')
      .select('*')
      .order('posted_at', { ascending: false })

    if (error) {
      console.error('Error fetching posts with stats:', error)
      throw new Error(`Failed to fetch posts: ${error.message}`)
    }

    return data || []
  }

  // Transform functions
  private transformPostToDB(post: LinkedInPost): Partial<DBLinkedInPost> {
    return {
      urn: post.urn,
      full_urn: post.full_urn,
      posted_at: post.posted_at,
      text: post.text,
      url: post.url,
      post_type: post.post_type,
      author_first_name: post.author.first_name,
      author_last_name: post.author.last_name,
      author_headline: post.author.headline,
      author_username: post.author.username,
      author_profile_url: post.author.profile_url,
      author_profile_picture: post.author.profile_picture,
      total_reactions: post.stats.total_reactions,
      like_count: post.stats.like,
      support_count: post.stats.support,
      love_count: post.stats.love,
      insight_count: post.stats.insight,
      celebrate_count: post.stats.celebrate,
      comments_count: post.stats.comments,
      reposts_count: post.stats.reposts,
      document_title: post.document?.title,
      document_page_count: post.document?.page_count,
      document_url: post.document?.url,
      document_thumbnail: post.document?.thumbnail,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  private transformCommentToDB(comment: LinkedInComment, postUrn: string): Partial<DBLinkedInComment> {
    return {
      comment_id: comment.comment_id,
      post_urn: postUrn,
      text: comment.text,
      posted_at: comment.posted_at,
      is_edited: comment.is_edited,
      is_pinned: comment.is_pinned,
      comment_url: comment.comment_url,
      author_name: comment.author.name,
      author_headline: comment.author.headline,
      author_profile_url: comment.author.profile_url,
      author_profile_picture: comment.author.profile_picture,
      total_reactions: comment.stats.total_reactions,
      like_reactions: comment.stats.reactions.like,
      appreciation_reactions: comment.stats.reactions.appreciation,
      empathy_reactions: comment.stats.reactions.empathy,
      interest_reactions: comment.stats.reactions.interest,
      praise_reactions: comment.stats.reactions.praise,
      comments_count: comment.stats.comments,
      replies: comment.replies,
      replies_count: comment.replies?.length || 0,
      profile_researched: false,
      updated_at: new Date().toISOString()
    }
  }

  private transformDBProfileToProspect(dbProfile: any): ProspectProfile {
    return {
      name: dbProfile.name,
      headline: dbProfile.headline,
      company: dbProfile.current_company || '',
      role: dbProfile.current_role || '',
      profileUrl: dbProfile.profile_url,
      profilePicture: dbProfile.profile_picture,
      location: dbProfile.location || '',
      followerCount: dbProfile.follower_count || 0,
      connectionCount: dbProfile.connection_count || 0,
      icpScore: {
        totalScore: dbProfile.icp_score,
        category: dbProfile.icp_category,
        breakdown: dbProfile.icp_breakdown,
        tags: dbProfile.icp_tags || [],
        reasoning: dbProfile.icp_reasoning || []
      }
    }
  }

  private transformDBProfileToEnhancedProspect(dbProfile: any): EnhancedProspectProfile {
    return {
      name: dbProfile.name,
      headline: dbProfile.headline,
      company: dbProfile.current_company || '',
      role: dbProfile.current_role || '',
      profileUrl: dbProfile.profile_url,
      profilePicture: dbProfile.profile_picture,
      location: dbProfile.location || '',
      followerCount: dbProfile.follower_count || 0,
      connectionCount: dbProfile.connection_count || 0,
      icpScore: {
        totalScore: dbProfile.icp_score,
        category: dbProfile.icp_category,
        breakdown: dbProfile.icp_breakdown,
        tags: dbProfile.icp_tags || [],
        reasoning: dbProfile.icp_reasoning || [],
        confidence: dbProfile.icp_confidence || 75,
        dataQuality: dbProfile.data_quality || 'medium',
        signals: dbProfile.signals || [],
        redFlags: dbProfile.red_flags || []
      }
    }
  }

  private extractCompanyFromHeadline(headline: string): string {
    // Simple extraction - look for "at Company" or "@ Company"
    const atMatch = headline.match(/(?:at|@)\s+([^|•\n]+)/i)
    if (atMatch) {
      return atMatch[1].trim()
    }
    
    // Look for common patterns
    const patterns = [
      /CEO of (.+?)(?:\s*[|•]|$)/i,
      /Founder of (.+?)(?:\s*[|•]|$)/i,
      /(\w+(?:\s+\w+)*)\s*(?:CEO|Founder|CTO|VP)/i
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

export const supabaseLinkedIn = new SupabaseLinkedInService()