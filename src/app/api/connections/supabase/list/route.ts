import { NextResponse } from 'next/server'
import { supabaseLinkedIn, type DBLinkedInConnection } from '../../../../../lib/supabase-linkedin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    // Check if Supabase connection is available
    if (!supabaseLinkedIn) {
      return NextResponse.json({
        error: 'Supabase connection not available',
        details: 'Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables'
      }, { status: 500 })
    }

    // Fetch connections from Supabase
    const connections = await supabaseLinkedIn.getConnections(200)
    console.log(`Fetched ${connections.length} connections from Supabase`)
    
    // Map to frontend-friendly format with error handling for each record
    const formattedConnections = connections.map((connection, index) => {
      try {
        // Calculate engagement score based on follower and connection counts
        const followerCount = connection.follower_count || 0
        const connectionCount = connection.connection_count || 0
        const engagementScore = Math.min(100, Math.round((followerCount + connectionCount) / 100))
        
        // Extract tags from profile flags
        const tags: string[] = []
        if (connection.is_influencer) tags.push('Influencer')
        if (connection.is_creator) tags.push('Creator')
        if (connection.is_premium) tags.push('Premium')
        
        // Add decision maker tag based on title
        const title = connection.title
        if (title && typeof title === 'string') {
          const lowerTitle = title.toLowerCase()
          if (lowerTitle.includes('founder') || lowerTitle.includes('ceo') || 
              lowerTitle.includes('president') || lowerTitle.includes('owner')) {
            tags.push('Decision Maker')
          }
        }
        
        return {
          id: connection.id,
          name: connection.full_name || 'Unknown',
          role: connection.title || '',
          company: connection.current_company || '',
          linkedinUrl: connection.username ? `https://linkedin.com/in/${connection.username}` : '',
          profilePictureUrl: connection.profile_picture_url || '',
          lastEngagement: 'Never', // TODO: Calculate from connection_posts table
          engagementScore,
          tags,
          notes: connection.headline || '',
          startDate: connection.start_date || '',
          followerCount: connection.follower_count || 0,
          connectionCount: connection.connection_count || 0,
          companyLinkedinUrl: connection.company_linkedin_url || '',
          location: connection.full_location || ''
        }
      } catch (recordError: any) {
        console.error(`Error mapping connection record ${index}:`, recordError)
        // Return a minimal valid record
        return {
          id: connection.id,
          name: connection.full_name || 'Error loading record',
          role: '',
          company: '',
          linkedinUrl: '',
          profilePictureUrl: '',
          lastEngagement: 'Never',
          engagementScore: 0,
          tags: [],
          notes: 'Error loading record data',
          startDate: '',
          followerCount: 0,
          connectionCount: 0,
          companyLinkedinUrl: '',
          location: ''
        }
      }
    })
    
    console.log(`Successfully mapped ${formattedConnections.length} connections`)
    return NextResponse.json(formattedConnections)
    
  } catch (error: any) {
    console.error('Error fetching connections from Supabase:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5)
    })
    
    // Return more specific error information
    return NextResponse.json({ 
      error: error.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? {
        supabaseAvailable: !!supabaseLinkedIn,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      } : undefined
    }, { status: 500 })
  }
}