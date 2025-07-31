import { NextRequest, NextResponse } from 'next/server'
import { QueueService } from '@/lib/queue'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }

    const {
      topic,
      platform = 'linkedin',
      voiceGuidelines,
      postType = 'Thought Leadership',
      tone = 'professional',
      userId
    } = body

    // Validate platform
    const validPlatforms = ['linkedin', 'twitter', 'facebook', 'instagram']
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be one of: ' + validPlatforms.join(', ') },
        { status: 400 }
      )
    }

    console.log('🚀 Creating async content generation job:', {
      topic: topic.substring(0, 50) + '...',
      platform,
      postType,
      hasVoiceGuidelines: !!voiceGuidelines
    })

    // Add job to queue
    const result = await QueueService.addContentGenerationJob({
      topic,
      platform,
      voiceGuidelines,
      postType,
      tone,
      userId
    })

    if (!result.success) {
      console.error('Failed to add job to queue:', result.error)
      return NextResponse.json(
        { error: 'Failed to create content generation job' },
        { status: 500 }
      )
    }

    console.log('✅ Job added to queue successfully:', result.jobId)

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      status: 'pending',
      message: 'Content generation job created successfully',
      estimatedTimeMs: 60000 // 60 seconds estimated
    })

  } catch (error) {
    console.error('Content generation job creation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create content generation job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}