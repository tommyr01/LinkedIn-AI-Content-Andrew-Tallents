import { NextRequest, NextResponse } from 'next/server'
import { linkedInScraper } from '../../../../lib/linkedin-scraper'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    console.log('📝 Fetching post comments...')

    // Check required environment variables
    if (!process.env.RAPIDAPI_KEY) {
      return NextResponse.json({ 
        error: 'Missing required RapidAPI configuration' 
      }, { status: 500 })
    }

    const searchParams = request.nextUrl.searchParams
    const postUrl = searchParams.get('postUrl')
    const pageNumber = parseInt(searchParams.get('pageNumber') || '1')
    const sortOrder = searchParams.get('sortOrder') || 'Most relevant'

    if (!postUrl) {
      return NextResponse.json({ 
        error: 'Missing required postUrl parameter' 
      }, { status: 400 })
    }

    console.log(`📡 Requesting comments for post: ${postUrl}`)
    console.log(`📄 Page: ${pageNumber}, Sort: ${sortOrder}`)

    const commentsData = await linkedInScraper.getPostComments(postUrl, pageNumber, sortOrder)
    
    console.log(`✅ Successfully fetched ${commentsData.data.comments.length} comments`)

    return NextResponse.json({
      success: true,
      data: {
        post: commentsData.data.post,
        comments: commentsData.data.comments,
        total: commentsData.data.total,
        meta: {
          pageNumber,
          sortOrder,
          commentsCount: commentsData.data.comments.length
        }
      }
    })

  } catch (error: any) {
    console.error('Error fetching post comments:', error)
    
    // Handle specific API errors
    if (error.message?.includes('LinkedIn Comments API error')) {
      return NextResponse.json({ 
        error: 'Failed to fetch comments from LinkedIn',
        details: error.message
      }, { status: 502 })
    }

    return NextResponse.json({ 
      error: 'Failed to fetch post comments',
      details: error.message
    }, { status: 500 })
  }
}