import { NextRequest, NextResponse } from 'next/server'
import { supabaseLinkedIn, type LinkedInPost } from '@/lib/supabase-linkedin'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface RapidAPIResponse {
  success?: boolean
  message?: string
  data?: {
    posts?: LinkedInPost[]
    pagination_token?: string
  }
  posts?: LinkedInPost[] // Allow posts at root level
  [key: string]: any // Allow any additional properties for flexibility
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

    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'Supabase admin not available. Please check environment variables.' 
      }, { status: 500 })
    }

    // Get request parameters
    const body = await request.json().catch(() => ({}))
    const username = body.username || 'andrewtallents'
    const pageNumber = body.pageNumber || 1
    const maxPages = body.maxPages || 3 // Limit to prevent API overuse

    // Get connection ID from username
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('linkedin_connections')
      .select('id')
      .eq('username', username)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ 
        error: `Connection not found for username: ${username}` 
      }, { status: 404 })
    }

    const connectionId = connection.id

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

      let data: RapidAPIResponse
      try {
        data = await response.json()
      } catch (parseError) {
        console.error(`❌ Failed to parse JSON response on page ${currentPage}:`, parseError)
        hasMorePages = false
        break
      }
      
      // Handle different response structures like the working standalone script
      const posts = data.data?.posts || data.posts || (Array.isArray(data) ? data : [])
      
      // More flexible success checking
      if (data.success === false) {
        console.log(`⚠️ API returned success=false on page ${currentPage}: ${data.message || 'Unknown error'}`)
        hasMorePages = false
        break
      }
      console.log(`✅ Fetched ${posts.length} posts from page ${currentPage}`)
      
      // Validate that posts is actually an array
      if (!Array.isArray(posts)) {
        console.warn(`⚠️ Posts data is not an array on page ${currentPage}:`, typeof posts)
        hasMorePages = false
        break
      }

      if (posts.length === 0) {
        console.log(`ℹ️ No posts found on page ${currentPage}, stopping pagination`)
        hasMorePages = false
        break
      }

      allPosts.push(...posts)
      currentPage++
      processedPages++

      // Check pagination - simpler logic like the working script
      // If we got fewer posts than expected or no pagination token, likely last page
      if (posts.length < 10 || (!data.data?.pagination_token && processedPages >= 1)) {
        console.log(`📄 Reached end of available posts (got ${posts.length} posts, no pagination token)`)
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
        // Check if post already exists in connection_posts
        const { data: existingPost } = await supabaseAdmin
          .from('connection_posts')
          .select('id')
          .eq('connection_id', connectionId)
          .eq('post_urn', post.urn)
          .single()

        const isNewPost = !existingPost

        // Save/update post to connection_posts table
        await supabaseLinkedIn.upsertConnectionPost(connectionId, post)
        
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