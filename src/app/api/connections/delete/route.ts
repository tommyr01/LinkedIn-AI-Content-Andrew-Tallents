import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('id')

    if (!connectionId) {
      return NextResponse.json({ 
        error: 'Connection ID is required' 
      }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'Server configuration error' 
      }, { status: 500 })
    }

    // Get connection details before deletion
    const { data: connection, error: fetchError } = await supabaseAdmin
      .from('linkedin_connections')
      .select('full_name, username')
      .eq('id', connectionId)
      .single()

    if (fetchError || !connection) {
      return NextResponse.json({ 
        error: 'Connection not found' 
      }, { status: 404 })
    }

    console.log(`🗑️ Deleting connection: ${connection.full_name} (@${connection.username})`)

    // First, delete all posts from this connection
    const { error: postsDeleteError } = await supabaseAdmin
      .from('connection_posts')
      .delete()
      .eq('connection_id', connectionId)

    if (postsDeleteError) {
      console.error('❌ Error deleting connection posts:', postsDeleteError)
      return NextResponse.json({ 
        error: 'Failed to delete connection posts',
        details: postsDeleteError.message 
      }, { status: 500 })
    }

    // Then delete the connection
    const { error: connectionDeleteError } = await supabaseAdmin
      .from('linkedin_connections')
      .delete()
      .eq('id', connectionId)

    if (connectionDeleteError) {
      console.error('❌ Error deleting connection:', connectionDeleteError)
      return NextResponse.json({ 
        error: 'Failed to delete connection',
        details: connectionDeleteError.message 
      }, { status: 500 })
    }

    console.log(`✅ Successfully deleted connection and all related posts`)

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${connection.full_name} and all their posts`,
      deletedConnection: {
        id: connectionId,
        name: connection.full_name,
        username: connection.username
      }
    })

  } catch (error: any) {
    console.error('❌ Delete connection error:', error)
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to delete connection',
      details: error.message
    }, { status: 500 })
  }
}