import { NextRequest, NextResponse } from 'next/server'
import { supabaseLinkedIn } from '../../../../../lib/supabase-linkedin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Check if Supabase connection is available
    if (!supabaseLinkedIn) {
      return NextResponse.json({
        error: 'Supabase connection not available',
        details: 'Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables'
      }, { status: 500 })
    }

    console.log('🔍 Calculating connection posts statistics...')

    const stats = await calculateConnectionPostsStats()
    
    console.log('✅ Connection posts statistics calculated:', stats)

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error: any) {
    console.error('Error calculating connection posts stats:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5)
    })
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to calculate connection posts statistics',
      stats: {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalReactions: 0,
        uniqueConnections: 0,
        averageEngagement: 0,
        topConnections: [],
        engagementTrends: [],
        recentActivity: []
      }
    }, { status: 500 })
  }
}

// Calculate comprehensive statistics for connection posts
async function calculateConnectionPostsStats() {
  const { createClient } = require('@supabase/supabase-js')
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration')
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Get all connection posts
  const { data: posts, error: postsError } = await supabase
    .from('connection_posts')
    .select('*')

  if (postsError) {
    throw new Error(`Failed to fetch connection posts: ${postsError.message}`)
  }

  const allPosts = posts || []

  // Get all connections for name mapping
  const { data: connections, error: connectionsError } = await supabase
    .from('linkedin_connections')
    .select('id, full_name, current_company')

  if (connectionsError) {
    console.warn('Failed to fetch connections for stats:', connectionsError)
  }

  const connectionsMap = new Map()
  if (connections) {
    connections.forEach(conn => {
      connectionsMap.set(conn.id, conn)
    })
  }

  // Basic stats
  const totalPosts = allPosts.length
  const totalLikes = allPosts.reduce((sum, post) => sum + (post.likes || 0), 0)
  const totalComments = allPosts.reduce((sum, post) => sum + (post.comments_count || 0), 0)
  const totalReactions = allPosts.reduce((sum, post) => sum + (post.total_reactions || 0), 0)
  const uniqueConnections = new Set(allPosts.map(post => post.connection_id)).size
  const averageEngagement = totalPosts > 0 ? Math.round(totalReactions / totalPosts) : 0

  // Top connections by post count and engagement
  const connectionStats = new Map()
  allPosts.forEach(post => {
    const connectionId = post.connection_id
    if (!connectionId) return

    if (!connectionStats.has(connectionId)) {
      const connection = connectionsMap.get(connectionId)
      connectionStats.set(connectionId, {
        connectionId,
        name: connection?.full_name || 'Unknown',
        company: connection?.current_company || '',
        postCount: 0,
        totalReactions: 0,
        totalLikes: 0,
        totalComments: 0
      })
    }

    const stats = connectionStats.get(connectionId)
    stats.postCount++
    stats.totalReactions += (post.total_reactions || 0)
    stats.totalLikes += (post.likes || 0)
    stats.totalComments += (post.comments_count || 0)
  })

  // Top 10 connections by engagement
  const topConnections = Array.from(connectionStats.values())
    .sort((a, b) => b.totalReactions - a.totalReactions)
    .slice(0, 10)
    .map(conn => ({
      name: conn.name,
      company: conn.company,
      postCount: conn.postCount,
      totalReactions: conn.totalReactions,
      averageEngagement: conn.postCount > 0 ? Math.round(conn.totalReactions / conn.postCount) : 0
    }))

  // Engagement trends (last 30 days by day)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const recentPosts = allPosts.filter(post => {
    if (!post.posted_date) return false
    const postDate = new Date(post.posted_date)
    return postDate >= thirtyDaysAgo
  })

  const dailyStats = new Map()
  recentPosts.forEach(post => {
    const date = new Date(post.posted_date).toISOString().split('T')[0]
    if (!dailyStats.has(date)) {
      dailyStats.set(date, { date, posts: 0, reactions: 0 })
    }
    const stats = dailyStats.get(date)
    stats.posts++
    stats.reactions += (post.total_reactions || 0)
  })

  const engagementTrends = Array.from(dailyStats.values())
    .sort((a, b) => a.date.localeCompare(b.date))

  // Recent activity (last 10 posts)
  const recentActivity = allPosts
    .sort((a, b) => new Date(b.posted_date || b.created_at).getTime() - new Date(a.posted_date || a.created_at).getTime())
    .slice(0, 10)
    .map(post => {
      const connection = connectionsMap.get(post.connection_id)
      return {
        connectionName: connection?.full_name || 'Unknown',
        company: connection?.current_company || '',
        postPreview: (post.post_text || '').substring(0, 100),
        reactions: post.total_reactions || 0,
        postedAt: post.posted_date || post.created_at
      }
    })

  return {
    totalPosts,
    totalLikes,
    totalComments,
    totalReactions,
    uniqueConnections,
    averageEngagement,
    topConnections,
    engagementTrends,
    recentActivity
  }
}