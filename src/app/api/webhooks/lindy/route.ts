import { NextRequest, NextResponse } from 'next/server'
import { handleLindyWebhook } from '@/lib/lindy'

// Handle incoming webhooks from Lindy
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature if needed
    const signature = request.headers.get('lindy-signature')
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      )
    }

    // Use the Lindy webhook handler
    const response = await handleLindyWebhook(request)
    
    return response

  } catch (error) {
    console.error('Lindy webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}