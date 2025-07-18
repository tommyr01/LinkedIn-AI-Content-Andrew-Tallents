import { NextRequest, NextResponse } from 'next/server'
import { createLindyClient } from '@linkedin-automation/lindy'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.comment || !body.postUrl || !body.connectionId) {
      return NextResponse.json(
        { error: 'Comment, postUrl, and connectionId are required' },
        { status: 400 }
      )
    }

    // Create Lindy client
    const lindyClient = createLindyClient()

    // Trigger Lindy webhook to comment on LinkedIn
    const result = await lindyClient.commentOnLinkedIn({
      comment: body.comment,
      postUrl: body.postUrl,
      authorId: body.authorId || 'andrew-tallents',
      connectionId: body.connectionId,
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
      message: 'Comment sent to LinkedIn via Lindy' 
    })

  } catch (error) {
    console.error('LinkedIn comment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}