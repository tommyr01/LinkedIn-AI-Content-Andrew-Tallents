import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.content && !body.topic) {
      return NextResponse.json(
        { error: 'Either content or topic is required' },
        { status: 400 }
      )
    }

    const { content, topic, targetPerformance } = body

    console.log('📊 Performance insights request:', { 
      hasContent: !!content, 
      topic, 
      targetPerformance 
    })

    // This endpoint would:
    // 1. Analyze the provided content against historical patterns
    // 2. Generate performance predictions
    // 3. Provide optimization suggestions

    const mockResponse = {
      success: true,
      insights: {
        performancePrediction: {
          predictedEngagement: 75,
          confidenceScore: 80,
          strengthFactors: [
            'Good opening hook',
            'Personal story element',
            'Clear call to action'
          ],
          improvementSuggestions: [
            'Add more specific metrics or data points',
            'Include a vulnerable personal element',
            'Shorten paragraphs for better readability'
          ],
          similarPostPerformance: {
            avgEngagement: 65,
            topPerformance: 120,
            similarityScore: 78
          }
        },
        optimizationSuggestions: {
          suggestions: [
            'Consider starting with a provocative question',
            'Include a specific client example (anonymized)',
            'Add bullet points for key insights for better scanability'
          ],
          rewriteExamples: [
            'Alternative opening: "What if the thing holding back your business... is you?"',
            'Alternative closing: "What belief is still running your decisions - even though you\'ve outgrown it?"'
          ],
          structureImprovements: [
            'Break up long paragraphs',
            'Add more white space between sections',
            'Use em-dashes for dramatic effect'
          ],
          voiceAdjustments: [
            'Increase vulnerability by sharing a personal struggle',
            'Add more authority signals from coaching experience',
            'Include more direct reader engagement'
          ]
        },
        historicalContext: {
          similarPostsFound: 8,
          avgPerformanceOfSimilar: 82,
          topPerformingSimilar: 156,
          patternMatches: [
            'Story-driven narrative structure',
            'Personal vulnerability balanced with authority',
            'Question-based engagement pattern'
          ]
        }
      },
      message: 'Performance insights endpoint created. Full integration with worker service needed for production.'
    }

    return NextResponse.json(mockResponse)

  } catch (error) {
    console.error('Performance insights error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate performance insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const jobId = searchParams.get('jobId')
    const draftId = searchParams.get('draftId')
    
    if (!jobId && !draftId) {
      return NextResponse.json(
        { error: 'Either jobId or draftId query parameter is required' },
        { status: 400 }
      )
    }

    console.log('📊 GET Performance insights for:', { jobId, draftId })
    
    // This would retrieve performance insights for a specific job or draft
    const mockResponse = {
      success: true,
      jobId,
      draftId,
      insights: {
        message: 'GET endpoint for performance insights. Use POST for analysis of new content.'
      }
    }

    return NextResponse.json(mockResponse)

  } catch (error) {
    console.error('Performance insights GET error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get performance insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}