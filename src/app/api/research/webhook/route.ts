import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAirtableClient } from '@/lib/airtable'
import { ResearchDataSchema, createLeadScoringEngine } from '@/lib/lead-scoring'

// Webhook payload schema from automation platform
const WebhookPayloadSchema = z.object({
  jobId: z.string(),
  status: z.enum(['completed', 'failed', 'partial']),
  profileUrl: z.string().url(),
  data: z.object({
    firecrawl: z.object({
      profile: z.object({
        name: z.string(),
        headline: z.string().optional(),
        location: z.string().optional(),
        summary: z.string().optional(),
      }),
      currentRole: z.object({
        title: z.string(),
        company: z.string(),
        startDate: z.string().optional(),
        tenure: z.number().optional(),
      }).optional(),
      experience: z.array(z.object({
        title: z.string(),
        company: z.string(),
        duration: z.string().optional(),
      })).optional(),
      education: z.array(z.object({
        school: z.string(),
        degree: z.string().optional(),
        fieldOfStudy: z.string().optional(),
      })).optional(),
    }).optional(),
    perplexity: z.object({
      companyInfo: z.object({
        name: z.string(),
        size: z.string().optional(),
        industry: z.string().optional(),
        description: z.string().optional(),
        website: z.string().optional(),
      }).optional(),
      recentNews: z.array(z.object({
        title: z.string(),
        summary: z.string().optional(),
        url: z.string().optional(),
        date: z.string().optional(),
      })).optional(),
    }).optional(),
    linkedinSearch: z.object({
      recentActivity: z.object({
        posts: z.number().optional(),
        engagement: z.string().optional(),
        topics: z.array(z.string()).optional(),
      }).optional(),
    }).optional(),
  }),
  error: z.string().optional(),
  completedAt: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    // Verify webhook authenticity
    const webhookToken = process.env.RESEARCH_AUTOMATION_TOKEN
    const authHeader = request.headers.get('authorization')
    
    if (webhookToken && (!authHeader || authHeader !== `Bearer ${webhookToken}`)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const payload = WebhookPayloadSchema.parse(body)

    console.log('Received research webhook:', { jobId: payload.jobId, status: payload.status })

    // Handle failed research
    if (payload.status === 'failed') {
      console.error('Research failed:', { jobId: payload.jobId, error: payload.error })
      
      // You could store failed attempts in Airtable for tracking
      return NextResponse.json({
        success: true,
        message: 'Failed research recorded'
      })
    }

    // Combine research data from all sources
    const researchData = combineResearchData(payload.data)
    
    if (!researchData) {
      console.error('No valid research data received')
      return NextResponse.json(
        { error: 'No valid research data received' },
        { status: 400 }
      )
    }

    // Calculate ICP score
    const scoringEngine = createLeadScoringEngine()
    const scoreResult = scoringEngine.calculateICPScore(researchData)

    // Prepare lead data for Airtable
    const leadFields = {
      'Name': researchData.profile.name,
      'Profile URL': researchData.profile.profileUrl,
      'Role': researchData.currentRole?.title || '',
      'Company': researchData.currentRole?.company || researchData.companyInfo?.name || '',
      'Company Size': mapCompanySize(researchData.companyInfo?.size),
      'Tenure Months': researchData.currentRole?.tenure || 0,
      'ICP Score': scoreResult.totalScore,
      'Score Breakdown': JSON.stringify(scoreResult.breakdown),
      'Tags': scoreResult.tags,
      'Notes': generateLeadNotes(researchData, scoreResult),
      'Status': mapScoreToStatus(scoreResult.totalScore) as 'New' | 'Qualified' | 'Engaged' | 'Not ICP',
      'Research Data': JSON.stringify(researchData),
      'Created': new Date().toISOString(),
    }

    // Save to Airtable
    const airtable = createAirtableClient()
    const lead = await airtable.createLead(leadFields)

    console.log('Lead created successfully:', { 
      id: lead.id, 
      name: leadFields.Name, 
      score: scoreResult.totalScore,
      recommendation: scoreResult.recommendation
    })

    // Return success response
    return NextResponse.json({
      success: true,
      leadId: lead.id,
      jobId: payload.jobId,
      score: scoreResult.totalScore,
      recommendation: scoreResult.recommendation,
      tags: scoreResult.tags,
      message: `Lead research completed. Score: ${scoreResult.totalScore}/100 (${scoreResult.recommendation})`
    })

  } catch (error) {
    console.error('Research webhook error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid webhook payload', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Combine data from different sources into unified format
function combineResearchData(data: any): any {
  const firecrawl = data.firecrawl
  const perplexity = data.perplexity
  const linkedinSearch = data.linkedinSearch

  if (!firecrawl?.profile) {
    return null
  }

  return {
    profile: {
      name: firecrawl.profile.name,
      profileUrl: firecrawl.profile.profileUrl || '',
      headline: firecrawl.profile.headline,
      location: firecrawl.profile.location,
      summary: firecrawl.profile.summary,
    },
    currentRole: firecrawl.currentRole,
    companyInfo: perplexity?.companyInfo,
    experience: firecrawl.experience,
    education: firecrawl.education,
    recentActivity: linkedinSearch?.recentActivity,
  }
}

// Map company size strings to Airtable enum values
function mapCompanySize(size?: string): '1-50' | '51-200' | '201-500' | '501-1000' | '1000+' | undefined {
  if (!size) return undefined
  
  const sizeNum = parseInt(size.replace(/\D/g, ''))
  
  if (sizeNum <= 50) return '1-50'
  if (sizeNum <= 200) return '51-200'
  if (sizeNum <= 500) return '201-500'
  if (sizeNum <= 1000) return '501-1000'
  return '1000+'
}

// Map ICP score to lead status
function mapScoreToStatus(score: number): string {
  if (score >= 80) return 'Qualified'
  if (score >= 60) return 'New'
  if (score >= 40) return 'New'
  return 'Not ICP'
}

// Generate lead notes based on research data and scoring
function generateLeadNotes(data: any, scoreResult: any): string {
  const notes = []
  
  notes.push(`Research completed: ${new Date().toLocaleDateString()}`)
  notes.push(`ICP Score: ${scoreResult.totalScore}/100 (${scoreResult.recommendation})`)
  
  if (data.currentRole) {
    notes.push(`Current Role: ${data.currentRole.title} at ${data.currentRole.company}`)
    if (data.currentRole.tenure !== undefined) {
      notes.push(`Tenure: ${data.currentRole.tenure} months`)
    }
  }
  
  if (data.companyInfo) {
    notes.push(`Company: ${data.companyInfo.name}`)
    if (data.companyInfo.industry) {
      notes.push(`Industry: ${data.companyInfo.industry}`)
    }
    if (data.companyInfo.size) {
      notes.push(`Company Size: ${data.companyInfo.size}`)
    }
  }
  
  // Add top scoring factors
  const topFactors = Object.entries(scoreResult.breakdown)
    .sort(([,a], [,b]) => (b as any).score - (a as any).score)
    .slice(0, 3)
    .map(([factor, data]) => `${factor}: ${(data as any).reasoning}`)
  
  if (topFactors.length > 0) {
    notes.push('Key Factors:')
    notes.push(...topFactors.map(factor => `• ${factor}`))
  }
  
  return notes.join('\n')
}

// Verify webhook signature (if using signed webhooks)
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  // Implementation depends on your automation platform
  // Example for GitHub-style webhooks:
  // const crypto = require('crypto')
  // const expectedSignature = crypto
  //   .createHmac('sha256', secret)
  //   .update(payload)
  //   .digest('hex')
  // return `sha256=${expectedSignature}` === signature
  return true // Simplified for now
}