import { NextRequest, NextResponse } from 'next/server'
import { supabaseLinkedIn } from '@/lib/supabase-linkedin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching LinkedIn posts from Supabase...')

    if (!supabaseLinkedIn) {
      return NextResponse.json({ 
        success: false,
        error: 'Supabase LinkedIn service not available. Please check environment variables.' 
      }, { status: 500 })
    }

    const searchParams = request.nextUrl.searchParams
    const username = searchParams.get('username') || 'andrewtallents'
    const maxRecords = parseInt(searchParams.get('maxRecords') || '50')
    const sortField = searchParams.get('sortField') || 'posted_at'
    const sortDirection = searchParams.get('sortDirection') || 'desc'

    console.log(`📡 Requesting posts for ${username}, limit: ${maxRecords}`)

    // Fetch posts from Supabase
    const dbPosts = await supabaseLinkedIn.getPostsByUsername(username, maxRecords)
    
    console.log(`✅ Successfully fetched ${dbPosts.length} posts from Supabase`)

    // Transform Supabase data to match the existing ConnectionPost interface
    const posts = dbPosts.map((post) => ({
      id: post.id,
      connectionName: `${post.author_first_name} ${post.author_last_name}`.trim(),
      connectionCompany: extractCompanyFromHeadline(post.author_headline),
      content: post.text || '',
      postedAt: post.posted_at,
      postUrn: post.urn,
      postUrl: post.url,
      likesCount: post.like_count || 0,
      commentsCount: post.comments_count || 0,
      totalReactions: post.total_reactions || 0,
      reposts: post.reposts_count || 0,
      authorFirstName: post.author_first_name,
      authorLastName: post.author_last_name,
      authorHeadline: post.author_headline,
      authorLinkedInUrl: post.author_profile_url,
      authorProfilePicture: post.author_profile_picture,
      postType: post.post_type || 'regular',
      mediaType: post.document_title ? 
        (post.document_title.toLowerCase().includes('.pdf') ? 'document' : 
         post.document_thumbnail ? 'image' : 'document') : '',
      mediaUrl: post.document_url || '',
      mediaThumbnail: post.document_thumbnail || '',
      createdTime: post.created_at,
      hasMedia: !!(post.document_url || post.document_thumbnail),
      
      // Extended LinkedIn-specific data
      support: post.support_count || 0,
      love: post.love_count || 0,
      insight: post.insight_count || 0,
      celebrate: post.celebrate_count || 0,
      documentTitle: post.document_title,
      documentPageCount: post.document_page_count,
      lastSyncedAt: post.last_synced_at
    }))

    // Calculate summary stats
    const stats = {
      totalPosts: posts.length,
      totalLikes: posts.reduce((sum, post) => sum + (post.likesCount || 0), 0),
      totalComments: posts.reduce((sum, post) => sum + (post.commentsCount || 0), 0),
      totalReactions: posts.reduce((sum, post) => sum + (post.totalReactions || 0), 0),
      uniqueConnections: 1, // Since these are all from one user
      averageEngagement: posts.length > 0 
        ? Math.round(posts.reduce((sum, post) => sum + (post.totalReactions || 0), 0) / posts.length)
        : 0,
      totalReposts: posts.reduce((sum, post) => sum + (post.reposts || 0), 0),
      
      // Extended stats
      totalSupport: posts.reduce((sum, post) => sum + (post.support || 0), 0),
      totalLove: posts.reduce((sum, post) => sum + (post.love || 0), 0),
      totalInsight: posts.reduce((sum, post) => sum + (post.insight || 0), 0),
      totalCelebrate: posts.reduce((sum, post) => sum + (post.celebrate || 0), 0),
      postsWithMedia: posts.filter(post => post.hasMedia).length,
      documentsShared: posts.filter(post => post.documentTitle).length
    }

    // Sort posts if needed
    if (sortField === 'posted_at') {
      posts.sort((a, b) => {
        const dateA = new Date(a.postedAt).getTime()
        const dateB = new Date(b.postedAt).getTime()
        return sortDirection === 'desc' ? dateB - dateA : dateA - dateB
      })
    } else if (sortField === 'totalReactions') {
      posts.sort((a, b) => {
        return sortDirection === 'desc' 
          ? (b.totalReactions || 0) - (a.totalReactions || 0)
          : (a.totalReactions || 0) - (b.totalReactions || 0)
      })
    }

    console.log(`📊 LinkedIn post stats: ${stats.totalPosts} posts, ${stats.totalReactions} reactions, ${stats.totalComments} comments`)

    return NextResponse.json({
      success: true,
      posts: posts,
      stats: stats,
      meta: {
        recordsReturned: posts.length,
        maxRecords,
        sortField,
        sortDirection,
        username,
        dataSource: 'supabase',
        lastSync: posts.length > 0 ? posts[0].lastSyncedAt : null
      },
      actions: {
        syncPosts: `/api/linkedin/posts/sync`,
        syncComments: (postUrn: string) => `/api/linkedin/comments/sync/${postUrn}`,
        viewAnalytics: `/api/linkedin/analytics`
      }
    })

  } catch (error: any) {
    console.error('Error fetching LinkedIn posts from Supabase:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch LinkedIn posts',
      details: error.message
    }, { status: 500 })
  }
}

// POST endpoint for triggering data sync
export async function POST(request: NextRequest) {
  try {
    if (!supabaseLinkedIn) {
      return NextResponse.json({ 
        success: false,
        error: 'Supabase LinkedIn service not available. Please check environment variables.' 
      }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const username = body.username || 'andrewtallents'
    
    console.log(`🔄 Triggering sync for ${username}...`)
    
    // Trigger posts sync
    const syncResponse = await fetch(`${request.nextUrl.origin}/api/linkedin/posts/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, maxPages: 2 })
    })
    
    if (!syncResponse.ok) {
      throw new Error('Failed to sync posts')
    }
    
    const syncData = await syncResponse.json()
    
    // After posts sync, trigger comments sync for new posts
    let commentsResults = []
    if (syncData.success && syncData.data.posts) {
      const newPosts = syncData.data.posts.filter((p: any) => p.status === 'new').slice(0, 5) // Limit to 5 new posts
      
      for (const post of newPosts) {
        try {
          console.log(`🔄 Syncing comments for post: ${post.urn}`)
          
          const commentsResponse = await fetch(`${request.nextUrl.origin}/api/linkedin/comments/sync/${post.urn}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          
          if (commentsResponse.ok) {
            const commentsData = await commentsResponse.json()
            commentsResults.push({
              postUrn: post.urn,
              comments: commentsData.data?.summary?.totalComments || 0,
              prospects: commentsData.data?.summary?.highValueProspects || 0
            })
          }
          
          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 2000))
          
        } catch (commentsError) {
          console.warn(`Failed to sync comments for ${post.urn}:`, commentsError)
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      data: {
        postSync: syncData.data,
        commentSync: commentsResults,
        summary: {
          postsProcessed: syncData.data?.summary?.totalFetched || 0,
          newPosts: syncData.data?.summary?.newPosts || 0,
          totalComments: commentsResults.reduce((sum, r) => sum + r.comments, 0),
          totalProspects: commentsResults.reduce((sum, r) => sum + r.prospects, 0)
        }
      }
    })
    
  } catch (error: any) {
    console.error('Error in sync operation:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Sync operation failed',
      details: error.message
    }, { status: 500 })
  }
}

function extractCompanyFromHeadline(headline: string): string {
  if (!headline) return 'CEO Coach'
  
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
  
  return 'CEO Coach' // Default for Andrew
}