import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }

    const { topic, limit = 10 } = body

    // This endpoint provides a way to test historical analysis without running a full job
    // In production, this would call the worker service's historical analysis
    
    console.log('🔍 Historical analysis request:', { topic, limit })

    // For now, return a mock response since the full worker integration is complex
    // In the real implementation, you would:
    // 1. Call the historical analysis service
    // 2. Return the similar posts and performance insights
    
    const mockResponse = {
      success: true,
      topic,
      analysis: {
        relatedPosts: [],
        topPerformers: [],
        patterns: {
          avgWordCount: 0,
          commonOpenings: [],
          commonStructures: [],
          bestPerformingFormats: [],
          engagementTriggers: []
        },
        performanceContext: {
          avgEngagement: 0,
          topPerformingScore: 0,
          suggestionScore: 0
        }
      },
      message: 'Historical analysis endpoint created. Full integration with worker service needed for production.'
    }

    return NextResponse.json(mockResponse)

  } catch (error) {
    console.error('Historical analysis error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to perform historical analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const topic = searchParams.get('topic')
    
    if (!topic) {
      return NextResponse.json(
        { error: 'Topic query parameter is required' },
        { status: 400 }
      )
    }

    // This would call the historical analysis service
    console.log('🔍 GET Historical analysis for topic:', topic)
    
    const mockResponse = {
      success: true,
      topic,
      analysis: {
        message: 'GET endpoint for historical analysis. Use POST for full analysis.'
      }
    }

    return NextResponse.json(mockResponse)

  } catch (error) {
    console.error('Historical analysis GET error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get historical analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}