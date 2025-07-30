import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { postContent, authorName, postUrl, postId } = body

    if (!postContent || !authorName) {
      return NextResponse.json({ 
        error: 'Missing required fields: postContent and authorName' 
      }, { status: 400 })
    }

    console.log('🚀 Comment generation webhook called:', {
      postId,
      authorName,
      postContentLength: postContent.length,
      hasPostUrl: !!postUrl
    })

    // TODO: Replace this with actual n8n webhook URL when ready
    const n8nWebhookUrl = process.env.N8N_COMMENT_WEBHOOK_URL

    if (!n8nWebhookUrl) {
      console.warn('⚠️ N8N_COMMENT_WEBHOOK_URL not configured, using mock response')
      
      // Mock response for development
      const mockGeneratedComment = `This is really insightful, ${authorName}! Thanks for sharing your perspective on this topic. I particularly found the point about innovation to be compelling. Looking forward to seeing how this develops.`
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      return NextResponse.json({
        success: true,
        generatedComment: mockGeneratedComment,
        mock: true
      })
    }

    // Call n8n webhook for actual comment generation
    console.log('📡 Calling n8n webhook:', n8nWebhookUrl)
    const webhookResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postContent,
        authorName,
        postUrl,
        postId,
        timestamp: new Date().toISOString()
      })
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      console.error('❌ n8n webhook error:', webhookResponse.status, errorText)
      throw new Error(`n8n webhook failed: ${webhookResponse.status} ${errorText}`)
    }

    const webhookData = await webhookResponse.json()
    console.log('✅ n8n webhook response received')

    return NextResponse.json({
      success: true,
      generatedComment: webhookData.generatedComment || webhookData.comment || 'Generated comment from n8n',
      webhookData
    })

  } catch (error: any) {
    console.error('💥 Error in comment generation webhook:', error)
    
    return NextResponse.json({ 
      error: 'Failed to generate comment',
      details: error.message,
      mock: !process.env.N8N_COMMENT_WEBHOOK_URL
    }, { status: 500 })
  }
}