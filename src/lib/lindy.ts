import { z } from 'zod'

// Lindy webhook payload schemas
export const LinkedInPostSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  hashtags: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
  scheduledTime: z.string().optional(),
  authorId: z.string(),
  postId: z.string(),
})

export const LinkedInCommentSchema = z.object({
  comment: z.string().min(1, 'Comment is required'),
  postUrl: z.string().url('Valid LinkedIn post URL required'),
  authorId: z.string(),
  connectionId: z.string(),
})

export type LinkedInPostPayload = z.infer<typeof LinkedInPostSchema>
export type LinkedInCommentPayload = z.infer<typeof LinkedInCommentSchema>

// Lindy webhook client
export class LindyClient {
  private baseUrl: string
  private webhookToken: string

  constructor(baseUrl: string, webhookToken: string) {
    this.baseUrl = baseUrl
    this.webhookToken = webhookToken
  }

  async postToLinkedIn(payload: LinkedInPostPayload): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      // Validate payload
      const validatedPayload = LinkedInPostSchema.parse(payload)

      const response = await fetch(`${this.baseUrl}/webhooks/linkedin/post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.webhookToken}`,
        },
        body: JSON.stringify(validatedPayload),
      })

      if (!response.ok) {
        const error = await response.text()
        return { success: false, error }
      }

      const result = await response.json()
      return { success: true, jobId: result.jobId }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  async commentOnLinkedIn(payload: LinkedInCommentPayload): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      // Validate payload
      const validatedPayload = LinkedInCommentSchema.parse(payload)

      const response = await fetch(`${this.baseUrl}/webhooks/linkedin/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.webhookToken}`,
        },
        body: JSON.stringify(validatedPayload),
      })

      if (!response.ok) {
        const error = await response.text()
        return { success: false, error }
      }

      const result = await response.json()
      return { success: true, jobId: result.jobId }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  async getJobStatus(jobId: string): Promise<{ 
    status: 'pending' | 'processing' | 'completed' | 'failed'
    result?: any
    error?: string 
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/webhooks/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.webhookToken}`,
        },
      })

      if (!response.ok) {
        return { status: 'failed', error: 'Failed to get job status' }
      }

      return await response.json()
    } catch (error) {
      return { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
}

// Webhook response handlers
export const handleLindyWebhook = async (request: Request): Promise<Response> => {
  try {
    const body = await request.json()
    
    // Handle different webhook types
    switch (body.type) {
      case 'linkedin.post.completed':
        // Handle successful post
        console.log('LinkedIn post completed:', body.data)
        break
      case 'linkedin.post.failed':
        // Handle failed post
        console.error('LinkedIn post failed:', body.error)
        break
      case 'linkedin.comment.completed':
        // Handle successful comment
        console.log('LinkedIn comment completed:', body.data)
        break
      case 'linkedin.comment.failed':
        // Handle failed comment
        console.error('LinkedIn comment failed:', body.error)
        break
      default:
        console.warn('Unknown webhook type:', body.type)
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Utility functions
export const createLindyClient = (webhookUrl?: string, token?: string) => {
  const baseUrl = webhookUrl || process.env.LINDY_WEBHOOK_URL || ''
  const webhookToken = token || process.env.LINDY_WEBHOOK_TOKEN || ''
  
  if (!baseUrl || !webhookToken) {
    throw new Error('Lindy webhook URL and token are required')
  }
  
  return new LindyClient(baseUrl, webhookToken)
}