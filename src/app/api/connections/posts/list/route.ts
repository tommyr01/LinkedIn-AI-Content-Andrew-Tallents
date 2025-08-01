import { NextRequest, NextResponse } from 'next/server'
import { supabaseLinkedIn, type DBConnectionPost } from '../../../../../lib/supabase-linkedin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const connectionId = searchParams.get('connectionId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Check if Supabase connection is available
    if (!supabaseLinkedIn) {
      return NextResponse.json({
        error: 'Supabase connection not available',
        details: 'Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables'
      }, { status: 500 })
    }

    console.log(`🔍 Fetching connection posts`, {
      connectionId: connectionId || 'all',
      limit,
      offset
    })

    let connectionPosts: DBConnectionPost[] = []
    
    if (connectionId) {
      // Fetch posts for specific connection
      connectionPosts = await supabaseLinkedIn.getConnectionPosts(connectionId)
    } else {
      // Fetch all connection posts with pagination
      connectionPosts = await fetchAllConnectionPosts(limit, offset)
    }

    // Transform to match ConnectionPost interface
    const transformedPosts = await transformConnectionPosts(connectionPosts)
    
    // Calculate stats
    const stats = calculatePostStats(transformedPosts)
    
    // Get metadata
    const lastSync = connectionPosts.length > 0 
      ? new Date(Math.max(...connectionPosts.map(p => new Date(p.created_at).getTime())))
      : null

    console.log(`✅ Fetched ${transformedPosts.length} connection posts`)

    return NextResponse.json({
      success: true,
      posts: transformedPosts,
      stats,
      meta: {
        total: transformedPosts.length,
        limit,
        offset,
        lastSync: lastSync?.toISOString()
      }
    })

  } catch (error: any) {
    console.error('Error fetching connection posts:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5)
    })
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to fetch connection posts',
      posts: [],
      stats: {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalReactions: 0,
        uniqueConnections: 0,
        averageEngagement: 0
      },
      details: process.env.NODE_ENV === 'development' ? {
        supabaseAvailable: !!supabaseLinkedIn,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      } : undefined
    }, { status: 500 })
  }
}

// Helper function to fetch all connection posts with pagination using efficient JOIN
async function fetchAllConnectionPosts(limit: number, offset: number): Promise<any[]> {
  if (!supabaseLinkedIn) return []
  
  try {
    const { createClient } = require('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log(`🔍 Fetching ${limit} connection posts with JOIN query...`)
    
    // Single efficient query with JOIN to get posts and connection data
    const { data, error } = await supabase
      .from('connection_posts')
      .select(`
        *,
        linkedin_connections!inner(
          id,
          full_name,
          current_company,
          profile_picture_url,
          headline
        )
      `)
      .order('posted_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching connection posts with JOIN:', error)
      throw new Error(`Failed to fetch connection posts: ${error.message}`)
    }

    console.log(`✅ Fetched ${data?.length || 0} posts with connection data in single query`)
    return data || []
    
  } catch (error: any) {
    console.error('Error in fetchAllConnectionPosts:', error)
    throw error
  }
}

// No longer needed - replaced with efficient JOIN query above

// Transform connection posts to match ConnectionPost interface
async function transformConnectionPosts(posts: any[]): Promise<any[]> {
  return posts.map(post => {
    const connection = post.linkedin_connections || {}
    
    return {
      id: post.id,
      connectionName: connection.full_name || `${post.author_first_name} ${post.author_last_name}`.trim() || 'Unknown',
      connectionCompany: connection.current_company || '',
      content: post.post_text || '',
      postedAt: post.posted_date || post.created_at,
      postUrn: post.post_urn,
      postUrl: post.post_url || '',
      likesCount: post.likes || 0,
      commentsCount: post.comments_count || 0,
      totalReactions: post.total_reactions || 0,
      reposts: post.reposts || 0,
      authorFirstName: post.author_first_name || '',
      authorLastName: post.author_last_name || '',
      authorHeadline: post.author_headline || connection.headline || '',
      authorLinkedInUrl: post.author_linkedin_url || '',
      authorProfilePicture: post.author_profile_picture || connection.profile_picture_url || '',
      postType: post.post_type || 'regular',
      mediaType: post.media_type || '',
      mediaUrl: post.media_url || '',
      mediaThumbnail: post.media_thumbnail || '',
      createdTime: post.created_at,
      hasMedia: !!(post.media_url || post.media_thumbnail),
      documentTitle: '', // Not stored in connection_posts yet
      documentPageCount: 0 // Not stored in connection_posts yet
    }
  })
}

// Calculate post statistics
function calculatePostStats(posts: any[]) {
  if (posts.length === 0) {
    return {
      totalPosts: 0,
      totalLikes: 0,
      totalComments: 0,
      totalReactions: 0,
      uniqueConnections: 0,
      averageEngagement: 0
    }
  }

  const totalLikes = posts.reduce((sum, post) => sum + post.likesCount, 0)
  const totalComments = posts.reduce((sum, post) => sum + post.commentsCount, 0)
  const totalReactions = posts.reduce((sum, post) => sum + post.totalReactions, 0)
  const uniqueConnections = new Set(posts.map(post => post.connectionName)).size
  const averageEngagement = posts.length > 0 ? Math.round(totalReactions / posts.length) : 0

  return {
    totalPosts: posts.length,
    totalLikes,
    totalComments,
    totalReactions,
    uniqueConnections,
    averageEngagement
  }
}