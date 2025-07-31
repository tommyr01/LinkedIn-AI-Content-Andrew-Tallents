import { NextRequest, NextResponse } from 'next/server'
import { supabaseLinkedIn, type LinkedInPost } from '@/lib/supabase-linkedin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface RapidAPIResponse {
  success: boolean
  message: string
  data: {
    posts: LinkedInPost[]
    pagination_token?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting LinkedIn posts sync...')

    // Check environment variables
    if (!process.env.RAPIDAPI_KEY || !process.env.RAPIDAPI_HOST) {
      return NextResponse.json({ 
        error: 'Missing RapidAPI configuration' 
      }, { status: 500 })
    }

    if (!supabaseLinkedIn) {
      return NextResponse.json({ 
        error: 'Supabase LinkedIn service not available. Please check environment variables.' 
      }, { status: 500 })
    }

    // Get request parameters
    const body = await request.json().catch(() => ({}))
    const username = body.username || 'andrewtallents'
    const pageNumber = body.pageNumber || 1
    const maxPages = body.maxPages || 3 // Limit to prevent API overuse

    let allPosts: LinkedInPost[] = []
    let currentPage = pageNumber
    let hasMorePages = true
    let processedPages = 0

    while (hasMorePages && processedPages < maxPages) {
      console.log(`📡 Fetching posts page ${currentPage} for ${username}...`)
      
      const rapidApiUrl = `https://${process.env.RAPIDAPI_HOST}/profile/posts?username=${username}&page_number=${currentPage}`
      console.log(`🔗 Request URL: ${rapidApiUrl}`)
      console.log(`🔑 Using host: ${process.env.RAPIDAPI_HOST}`)
      
      const response = await fetch(rapidApiUrl, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': process.env.RAPIDAPI_HOST,
          'x-rapidapi-key': process.env.RAPIDAPI_KEY,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`RapidAPI error on page ${currentPage}:`, response.status, errorText)
        
        if (response.status === 429) {
          console.log(`⏸️ Rate limited on page ${currentPage}, stopping pagination but keeping existing posts`)
          hasMorePages = false
          break
        }
        
        if (response.status === 502 || response.status === 503) {
          console.log(`⚠️ API temporarily unavailable on page ${currentPage} (${response.status}), stopping pagination but keeping existing posts`)
          hasMorePages = false
          break
        }
        
        // For other errors, stop pagination but don't fail the entire sync
        console.log(`❌ Failed to fetch page ${currentPage}, stopping pagination but keeping existing posts`)
        hasMorePages = false
        break
      }

      const data: RapidAPIResponse = await response.json()
      
      if (!data.success) {
        throw new Error(`RapidAPI returned error: ${data.message}`)
      }

      const posts = data.data.posts || []
      console.log(`✅ Fetched ${posts.length} posts from page ${currentPage}`)

      if (posts.length === 0) {
        hasMorePages = false
        break
      }

      allPosts.push(...posts)
      currentPage++
      processedPages++

      // Check if we have pagination token for more pages
      if (!data.data.pagination_token && processedPages >= 1) {
        hasMorePages = false
      }

      // Add longer delay between requests to be respectful to API
      if (hasMorePages && processedPages < maxPages) {
        console.log(`⏳ Waiting 3 seconds before fetching page ${currentPage + 1}...`)
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }

    console.log(`📊 Total posts fetched: ${allPosts.length} from ${processedPages} pages`)
    
    // If we have no posts at all, that's a real error
    if (allPosts.length === 0) {
      throw new Error('No posts were fetched from any page. Please check API credentials and try again.')
    }

    // Process and save posts to Supabase
    const results = []
    let newPosts = 0
    let updatedPosts = 0
    let errors = 0

    for (const post of allPosts) {
      try {
        // Check if post already exists
        const existingPost = await supabaseLinkedIn.getPostByUrn(post.urn)
        const isNewPost = !existingPost

        // Save/update post
        const savedPost = await supabaseLinkedIn.upsertPost(post)
        
        results.push({
          urn: post.urn,
          status: isNewPost ? 'new' : 'updated',
          posted_at: post.posted_at,
          engagement: post.stats.total_reactions
        })

        if (isNewPost) {
          newPosts++
        } else {
          updatedPosts++
        }

        console.log(`✅ ${isNewPost ? 'Saved new' : 'Updated'} post: ${post.urn}`)
        
      } catch (error: any) {
        console.error(`❌ Error processing post ${post.urn}:`, error.message)
        errors++
        
        results.push({
          urn: post.urn,
          status: 'error',
          error: error.message
        })
      }
    }

    const summary = {
      totalFetched: allPosts.length,
      newPosts,
      updatedPosts,
      errors,
      pagesProcessed: processedPages
    }

    console.log('📈 Sync Summary:', summary)

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${allPosts.length} posts`,
      data: {
        posts: results,
        summary,
        nextActions: [
          'Sync comments for new posts',
          'Research comment authors for ICP scoring',
          'Update engagement metrics'
        ]
      }
    })

  } catch (error: any) {
    console.error('❌ LinkedIn posts sync failed:', error)
    
    return NextResponse.json({ 
      success: false,
      error: 'LinkedIn posts sync failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// GET endpoint for checking sync status
export async function GET(request: NextRequest) {
  try {
    if (!supabaseLinkedIn) {
      return NextResponse.json({ 
        error: 'Supabase LinkedIn service not available' 
      }, { status: 500 })
    }

    const username = request.nextUrl.searchParams.get('username') || 'andrewtallents'
    
    // Get latest posts from database
    const posts = await supabaseLinkedIn.getPostsByUsername(username, 10)
    
    const stats = {
      totalPosts: posts.length,
      latestPost: posts[0]?.posted_at,
      lastSync: posts[0]?.last_synced_at,
      avgEngagement: posts.length > 0 
        ? Math.round(posts.reduce((sum, post) => sum + post.total_reactions, 0) / posts.length)
        : 0
    }

    return NextResponse.json({
      success: true,
      data: {
        username,
        stats,
        recentPosts: posts.slice(0, 5).map(post => ({
          urn: post.urn,
          text: post.text.substring(0, 100) + '...',
          posted_at: post.posted_at,
          total_reactions: post.total_reactions,
          comments_count: post.comments_count
        }))
      }
    })
    
  } catch (error: any) {
    console.error('Error getting sync status:', error)
    
    return NextResponse.json({ 
      error: 'Failed to get sync status',
      details: error.message 
    }, { status: 500 })
  }
}