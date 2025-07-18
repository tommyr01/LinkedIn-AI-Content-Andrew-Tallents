import { NextRequest, NextResponse } from 'next/server'
import { createAirtableClient } from '@/lib/airtable'

export async function GET(request: NextRequest) {
  try {
    const airtableClient = createAirtableClient()
    
    const stats = await airtableClient.getPostStats()
    
    // Get additional stats
    const scheduledPosts = await airtableClient.getScheduledPosts()
    const recentPosts = await airtableClient.getRecentPosts(5)
    
    // Calculate engagement metrics
    const publishedPosts = recentPosts.filter(post => post.fields.Status === 'Published')
    const totalEngagement = publishedPosts.reduce((sum, post) => {
      return sum + (post.fields.Likes || 0) + (post.fields.Comments || 0)
    }, 0)
    
    return NextResponse.json({
      stats: {
        ...stats,
        scheduled: scheduledPosts.length,
        totalEngagement,
        avgEngagement: publishedPosts.length > 0 ? Math.round(totalEngagement / publishedPosts.length) : 0,
      },
      recentPosts: recentPosts.slice(0, 3),
      scheduledPosts: scheduledPosts.slice(0, 3),
    })
  } catch (error) {
    console.error('Airtable stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats from Airtable' },
      { status: 500 }
    )
  }
}