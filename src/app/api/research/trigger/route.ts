import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const TriggerResearchSchema = z.object({
  profileUrl: z.string().url('Valid LinkedIn profile URL required'),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { profileUrl, priority, tags, notes } = TriggerResearchSchema.parse(body)

    // Validate LinkedIn URL
    if (!profileUrl.includes('linkedin.com/in/')) {
      return NextResponse.json(
        { error: 'Invalid LinkedIn profile URL format' },
        { status: 400 }
      )
    }

    // Generate unique job ID
    const jobId = `research_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Automation platform webhook URL (e.g., Make.com, Zapier, n8n)
    const automationWebhookUrl = process.env.RESEARCH_AUTOMATION_WEBHOOK_URL
    const webhookToken = process.env.RESEARCH_AUTOMATION_TOKEN

    if (!automationWebhookUrl) {
      return NextResponse.json(
        { error: 'Research automation not configured' },
        { status: 500 }
      )
    }

    // Prepare payload for automation platform
    const automationPayload = {
      jobId,
      profileUrl,
      priority,
      tags,
      notes,
      callbackUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/research/webhook`,
      requestedAt: new Date().toISOString(),
      
      // Research instructions for automation platform
      instructions: {
        firecrawl: {
          url: profileUrl,
          extractData: [
            'name', 'headline', 'location', 'summary',
            'currentRole', 'experience', 'education'
          ]
        },
        perplexity: {
          queries: [
            `company information for ${extractCompanyFromProfile(profileUrl)}`,
            `recent news about ${extractNameFromProfile(profileUrl)}`,
            `leadership changes at ${extractCompanyFromProfile(profileUrl)}`
          ]
        },
        linkedinSearch: {
          queries: [
            `${extractNameFromProfile(profileUrl)} recent posts`,
            `${extractNameFromProfile(profileUrl)} company news`
          ]
        }
      }
    }

    // Send to automation platform
    const response = await fetch(automationWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(webhookToken && { 'Authorization': `Bearer ${webhookToken}` })
      },
      body: JSON.stringify(automationPayload)
    })

    if (!response.ok) {
      console.error('Failed to trigger automation:', response.statusText)
      return NextResponse.json(
        { error: 'Failed to trigger research automation' },
        { status: 500 }
      )
    }

    const automationResult = await response.json()

    // Store job tracking information (could be in Airtable or memory)
    // For now, we'll return the job ID for tracking
    
    return NextResponse.json({
      success: true,
      jobId,
      status: 'triggered',
      profileUrl,
      message: 'Research automation has been triggered successfully',
      estimatedCompletionTime: '2-5 minutes',
      automationJobId: automationResult.id || automationResult.jobId
    })

  } catch (error) {
    console.error('Research trigger error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Utility functions to extract information from LinkedIn URLs
function extractNameFromProfile(url: string): string {
  try {
    // Extract from URL like https://linkedin.com/in/john-smith-12345/
    const matches = url.match(/\/in\/([^\/]+)/)
    if (matches && matches[1]) {
      return matches[1].replace(/-/g, ' ').replace(/\d/g, '').trim()
    }
    return 'Unknown'
  } catch {
    return 'Unknown'
  }
}

function extractCompanyFromProfile(url: string): string {
  // This would need to be enhanced with actual company extraction
  // For now, return placeholder
  return 'Unknown Company'
}

// GET method to check job status (optional)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')

  if (!jobId) {
    return NextResponse.json(
      { error: 'Job ID is required' },
      { status: 400 }
    )
  }

  // In a real implementation, you'd check job status from your tracking system
  // For now, return a placeholder response
  return NextResponse.json({
    jobId,
    status: 'processing',
    message: 'Research is in progress',
    estimatedTimeRemaining: '1-3 minutes'
  })
}