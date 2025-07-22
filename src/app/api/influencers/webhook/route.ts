import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAirtableClient } from '@/lib/airtable'

// Webhook payload schema from automation platform for influencer posts
const InfluencerWebhookSchema = z.object({
  jobId: z.string(),
  status: z.enum(['completed', 'failed', 'partial']),
  timestamp: z.string(),
  influencers: z.array(z.object({
    name: z.string(),
    profileUrl: z.string().url(),
    posts: z.array(z.object({
      linkedinPostId: z.string(),
      content: z.string(),
      postedAt: z.string(),
      likesCount: z.number().optional().default(0),
      commentsCount: z.number().optional().default(0),
      imageUrl: z.string().optional(),
      postUrl: z.string().optional(),
    }))
  })),
  error: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Verify webhook authenticity
    const webhookToken = process.env.INFLUENCER_AUTOMATION_TOKEN
    const authHeader = request.headers.get('authorization')
    
    if (webhookToken && (!authHeader || authHeader !== `Bearer ${webhookToken}`)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const payload = InfluencerWebhookSchema.parse(body)

    console.log('Received influencer posts webhook:', { 
      jobId: payload.jobId, 
      status: payload.status,
      influencerCount: payload.influencers.length,
      totalPosts: payload.influencers.reduce((sum, inf) => sum + inf.posts.length, 0)
    })

    // Handle failed scraping
    if (payload.status === 'failed') {
      console.error('Influencer scraping failed:', { jobId: payload.jobId, error: payload.error })
      
      return NextResponse.json({
        success: true,
        message: 'Failed scraping recorded'
      })
    }

    const airtable = createAirtableClient()
    let processedPosts = 0
    let skippedPosts = 0
    let newInfluencers = 0

    // Process each influencer
    for (const influencerData of payload.influencers) {
      try {
        // Check if influencer exists, if not create them
        let influencer = await findOrCreateInfluencer(airtable, influencerData)
        if (!influencer.existed) {
          newInfluencers++
        }

        // Process posts for this influencer
        const newPosts = []
        
        for (const postData of influencerData.posts) {
          try {
            // Check if post already exists to avoid duplicates
            const existingPosts = await airtable.getInfluencerPosts({
              filterByFormula: `{LinkedIn Post ID} = "${postData.linkedinPostId}"`,
              maxRecords: 1
            })

            if (existingPosts.length > 0) {
              skippedPosts++
              continue
            }

            // Prepare post data for Airtable
            const postFields = {
              'Influencer': [influencer.id],
              'Content': postData.content,
              'Posted At': postData.postedAt,
              'LinkedIn Post ID': postData.linkedinPostId,
              'Likes Count': postData.likesCount || 0,
              'Comments Count': postData.commentsCount || 0,
              'Engagement Status': 'Not Engaged' as const,
              'Scraped At': new Date().toISOString(),
            }

            newPosts.push(postFields)
            processedPosts++

          } catch (postError) {
            console.error('Error processing individual post:', postError)
            continue
          }
        }

        // Batch create posts for this influencer if any new posts
        if (newPosts.length > 0) {
          await airtable.batchCreateInfluencerPosts(newPosts)
          console.log(`Created ${newPosts.length} posts for ${influencerData.name}`)
        }

        // Update influencer engagement count
        if (influencer.existed) {
          await airtable.updateInfluencer(influencer.id, {
            'Last Engaged': new Date().toISOString(),
            'Engagement Count': (influencer.fields['Engagement Count'] || 0) + newPosts.length
          })
        }

      } catch (influencerError) {
        console.error(`Error processing influencer ${influencerData.name}:`, influencerError)
        continue
      }
    }

    // Log summary
    console.log('Influencer posts processing completed:', {
      processedPosts,
      skippedPosts,
      newInfluencers,
      totalInfluencers: payload.influencers.length
    })

    return NextResponse.json({
      success: true,
      jobId: payload.jobId,
      summary: {
        processedPosts,
        skippedPosts,
        newInfluencers,
        totalInfluencers: payload.influencers.length
      },
      message: `Successfully processed ${processedPosts} new posts from ${payload.influencers.length} influencers`
    })

  } catch (error) {
    console.error('Influencer webhook error:', error)

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

// Helper function to find or create influencer
async function findOrCreateInfluencer(airtable: any, influencerData: any): Promise<{ id: string, fields: any, existed: boolean }> {
  try {
    // Try to find existing influencer by profile URL
    const existing = await airtable.getInfluencers({
      filterByFormula: `{Profile URL} = "${influencerData.profileUrl}"`,
      maxRecords: 1
    })

    if (existing.length > 0) {
      return {
        id: existing[0].id,
        fields: existing[0].fields,
        existed: true
      }
    }

    // Create new influencer
    const newInfluencer = await airtable.createInfluencer({
      'Name': influencerData.name,
      'Profile URL': influencerData.profileUrl,
      'Priority Rank': 10, // Default priority
      'Engagement Count': 0,
      'Created': new Date().toISOString(),
    })

    return {
      id: newInfluencer.id!,
      fields: newInfluencer.fields,
      existed: false
    }

  } catch (error) {
    console.error('Error in findOrCreateInfluencer:', error)
    throw error
  }
}

// GET endpoint to trigger influencer post scraping (manual trigger)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const influencerIds = searchParams.get('influencers')?.split(',') || []
    
    // Get influencers from Airtable
    const airtable = createAirtableClient()
    let influencersToScrape = []

    if (influencerIds.length > 0) {
      // Specific influencers requested
      for (const id of influencerIds) {
        const influencer = await airtable.getInfluencers({
          filterByFormula: `RECORD_ID() = "${id}"`,
          maxRecords: 1
        })
        if (influencer.length > 0) {
          influencersToScrape.push(influencer[0])
        }
      }
    } else {
      // Get all influencers (or recent ones)
      influencersToScrape = await airtable.getInfluencers({
        sort: [{ field: 'Priority Rank', direction: 'asc' }],
        maxRecords: 50
      })
    }

    if (influencersToScrape.length === 0) {
      return NextResponse.json(
        { error: 'No influencers found to scrape' },
        { status: 404 }
      )
    }

    // Prepare automation trigger payload
    const jobId = `influencer_scrape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const automationWebhookUrl = process.env.INFLUENCER_AUTOMATION_WEBHOOK_URL
    const webhookToken = process.env.INFLUENCER_AUTOMATION_TOKEN

    if (!automationWebhookUrl) {
      return NextResponse.json(
        { error: 'Influencer automation not configured' },
        { status: 500 }
      )
    }

    const automationPayload = {
      jobId,
      influencers: influencersToScrape.map(inf => ({
        name: inf.fields['Name'],
        profileUrl: inf.fields['Profile URL'],
        lastScraped: inf.fields['Last Engaged'] || null
      })),
      callbackUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/influencers/webhook`,
      requestedAt: new Date().toISOString(),
      instructions: {
        maxPostsPerInfluencer: 10,
        dateRange: '7d', // Last 7 days
        includeEngagement: true
      }
    }

    // Trigger automation
    const response = await fetch(automationWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(webhookToken && { 'Authorization': `Bearer ${webhookToken}` })
      },
      body: JSON.stringify(automationPayload)
    })

    if (!response.ok) {
      console.error('Failed to trigger influencer automation:', response.statusText)
      return NextResponse.json(
        { error: 'Failed to trigger influencer scraping' },
        { status: 500 }
      )
    }

    const automationResult = await response.json()

    return NextResponse.json({
      success: true,
      jobId,
      influencerCount: influencersToScrape.length,
      status: 'triggered',
      message: `Scraping initiated for ${influencersToScrape.length} influencers`,
      estimatedCompletionTime: '3-10 minutes',
      automationJobId: automationResult.id || automationResult.jobId
    })

  } catch (error) {
    console.error('Trigger influencer scraping error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}