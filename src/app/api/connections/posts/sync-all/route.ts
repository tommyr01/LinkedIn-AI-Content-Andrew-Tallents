import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for bulk sync

interface Connection {
  id: string
  linkedin_username: string
  name: string
  last_posts_sync?: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting bulk posts sync for all connections...')

    // Get all connections from Supabase
    const { data: connections, error } = await supabase
      .from('connections')
      .select('id, linkedin_username, name, last_posts_sync')
      .not('linkedin_username', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching connections:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch connections',
        details: error.message 
      }, { status: 500 })
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No connections found to sync',
        data: {
          totalConnections: 0,
          processed: 0,
          newPosts: 0,
          errors: 0,
          skipped: 0
        }
      })
    }

    console.log(`📊 Found ${connections.length} connections to potentially sync`)

    // Filter out connections that were synced recently (within last 30 minutes)
    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
    
    const connectionsToSync = connections.filter(conn => {
      if (!conn.last_posts_sync) return true
      const lastSync = new Date(conn.last_posts_sync)
      return lastSync < thirtyMinutesAgo
    })

    const skippedCount = connections.length - connectionsToSync.length
    console.log(`📋 Syncing ${connectionsToSync.length} connections (${skippedCount} skipped - recently synced)`)

    // Track results
    let processed = 0
    let totalNewPosts = 0
    let errors = 0
    const results: any[] = []
    const BATCH_SIZE = 3 // Process in small batches
    const DELAY_BETWEEN_CONNECTIONS = 2000 // 2 seconds

    // Process connections in batches
    for (let i = 0; i < connectionsToSync.length; i += BATCH_SIZE) {
      const batch = connectionsToSync.slice(i, i + BATCH_SIZE)
      
      console.log(`🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(connectionsToSync.length / BATCH_SIZE)}`)
      
      // Process batch in parallel
      const batchPromises = batch.map(async (connection) => {
        try {
          console.log(`📡 Syncing posts for ${connection.name} (@${connection.linkedin_username})`)
          
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/linkedin/posts/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              username: connection.linkedin_username,
              maxPages: 2 // Limit to avoid long processing times
            })
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP ${response.status}`)
          }

          const syncResult = await response.json()
          
          if (syncResult.success) {
            const newPosts = syncResult.data?.summary?.newPosts || 0
            totalNewPosts += newPosts
            
            // Update last sync time
            await supabase
              .from('connections')
              .update({ last_posts_sync: new Date().toISOString() })
              .eq('id', connection.id)
            
            console.log(`✅ ${connection.name}: ${newPosts} new posts synced`)
            
            return {
              connectionId: connection.id,
              name: connection.name,
              username: connection.linkedin_username,
              status: 'success',
              newPosts,
              totalPosts: syncResult.data?.summary?.totalFetched || 0
            }
          } else {
            throw new Error(syncResult.error || 'Sync failed')
          }
          
        } catch (error: any) {
          console.error(`❌ Error syncing ${connection.name}:`, error.message)
          errors++
          
          return {
            connectionId: connection.id,
            name: connection.name,
            username: connection.linkedin_username,
            status: 'error',
            error: error.message,
            newPosts: 0
          }
        }
      })

      // Wait for batch to complete
      const batchResults = await Promise.allSettled(batchPromises)
      
      // Process results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
          processed++
        } else {
          console.error('❌ Batch promise rejected:', result.reason)
          errors++
        }
      })

      // Delay between batches (except for last batch)
      if (i + BATCH_SIZE < connectionsToSync.length) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_CONNECTIONS}ms before next batch...`)
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CONNECTIONS))
      }
    }

    const summary = {
      totalConnections: connections.length,
      processed,
      newPosts: totalNewPosts,
      errors,
      skipped: skippedCount,
      duration: `${Math.round((Date.now() - now.getTime()) / 1000)}s`
    }

    console.log('📈 Bulk sync summary:', summary)

    return NextResponse.json({
      success: true,
      message: `Bulk sync completed: ${totalNewPosts} new posts from ${processed} connections`,
      data: {
        ...summary,
        results,
        completedAt: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('❌ Bulk posts sync failed:', error)
    
    return NextResponse.json({ 
      success: false,
      error: 'Bulk posts sync failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// GET endpoint for checking bulk sync status
export async function GET() {
  try {
    // Get some stats about recent syncs
    const { data: connections, error } = await supabase
      .from('connections')
      .select('id, name, linkedin_username, last_posts_sync')
      .not('linkedin_username', 'is', null)
      .order('last_posts_sync', { ascending: false, nullsFirst: false })
      .limit(10)

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to get sync status',
        details: error.message 
      }, { status: 500 })
    }

    const now = new Date()
    const recentlySynced = connections?.filter(conn => {
      if (!conn.last_posts_sync) return false
      const lastSync = new Date(conn.last_posts_sync)
      const diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60)
      return diffMinutes < 60 // Synced within last hour
    }) || []

    return NextResponse.json({
      success: true,
      data: {
        totalConnections: connections?.length || 0,
        recentlySyncedCount: recentlySynced.length,
        lastSyncTimes: connections?.slice(0, 5).map(c => ({
          name: c.name,
          username: c.linkedin_username,
          lastSync: c.last_posts_sync
        })) || []
      }
    })
    
  } catch (error: any) {
    console.error('Error getting bulk sync status:', error)
    
    return NextResponse.json({ 
      error: 'Failed to get sync status',
      details: error.message 
    }, { status: 500 })
  }
}