import { NextRequest, NextResponse } from 'next/server'
import { createLindyClient } from '@linkedin-automation/lindy'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.content || !body.postId) {
      return NextResponse.json(
        { error: 'Content and postId are required' },
        { status: 400 }
      )
    }

    // Create Lindy client
    const lindyClient = createLindyClient()

    // Trigger Lindy webhook to post to LinkedIn
    const result = await lindyClient.postToLinkedIn({
      content: body.content,
      hashtags: body.hashtags || [],
      mentions: body.mentions || [],
      scheduledTime: body.scheduledTime,
      authorId: body.authorId || 'andrew-tallents',
      postId: body.postId,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      jobId: result.jobId,
      message: 'Post sent to LinkedIn via Lindy' 
    })

  } catch (error) {
    console.error('LinkedIn post API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { error: 'JobId is required' },
        { status: 400 }
      )
    }

    const lindyClient = createLindyClient()
    const status = await lindyClient.getJobStatus(jobId)

    return NextResponse.json(status)

  } catch (error) {
    console.error('LinkedIn job status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}