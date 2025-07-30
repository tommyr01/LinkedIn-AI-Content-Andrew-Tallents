import { NextRequest, NextResponse } from 'next/server'
import { linkedInScraper } from '@/lib/linkedin-scraper'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const username = searchParams.get('username') || 'andrewtallents'
    const maxPosts = parseInt(searchParams.get('maxPosts') || '10')
    
    console.log(`🧪 Testing posts fetching for username: ${username}, maxPosts: ${maxPosts}`)
    
    // Test posts fetching
    const posts = await linkedInScraper.getAllPosts(username, maxPosts)
    
    console.log(`✅ Successfully fetched ${posts.length} posts`)
    
    // Map a sample post to show the data structure
    const samplePost = posts[0] ? {
      id: posts[0].id,
      text: posts[0].text?.substring(0, 100) + '...',
      posted_at: posts[0].posted_at,
      likes_count: posts[0].likes_count,
      comments_count: posts[0].comments_count,
      shares_count: posts[0].shares_count,
      author: posts[0].author,
      has_media: !!posts[0].media && posts[0].media.length > 0
    } : null
    
    return NextResponse.json({
      success: true,
      message: `Successfully fetched ${posts.length} posts`,
      username,
      totalPosts: posts.length,
      requestedMax: maxPosts,
      samplePost,
      postsData: posts.slice(0, 3).map(post => ({
        id: post.id,
        preview: post.text?.substring(0, 150) + '...',
        engagement: {
          likes: post.likes_count,
          comments: post.comments_count,
          shares: post.shares_count
        },
        posted_at: post.posted_at
      })),
      configuration: {
        hasRapidApiKey: !!process.env.RAPIDAPI_KEY,
        rapidApiKeyLength: process.env.RAPIDAPI_KEY?.length,
        hasConnectionPostsTable: !!process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID
      }
    })
    
  } catch (error: any) {
    console.error('Error testing posts fetching:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to test posts fetching',
      details: error.message,
      configuration: {
        hasRapidApiKey: !!process.env.RAPIDAPI_KEY,
        rapidApiKeyLength: process.env.RAPIDAPI_KEY?.length,
        hasConnectionPostsTable: !!process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID
      }
    }, { status: 500 })
  }
}