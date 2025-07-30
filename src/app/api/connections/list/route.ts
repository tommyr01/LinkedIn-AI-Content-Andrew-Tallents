import { NextResponse } from 'next/server'
import { getConnections } from '@/lib/airtable-simple'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Use the simplified Airtable client
    const rows = await getConnections(200)
    console.log(`Fetched ${rows.length} connections from Airtable`)
    
    // map to front-end friendly shape with error handling for each record
    const connections = rows.map((r, index) => {
      try {
        // Safely access numeric fields
        const followerCount = r.fields['Follower Count'] || 0
        const connectionCount = r.fields['Connection Count'] || 0
        const engagementScore = Math.min(100, Math.round((followerCount + connectionCount) / 100))
        
        // Extract tags from headline or other fields
        const tags: string[] = []
        if (r.fields['Is Influencer'] === true) tags.push('Influencer')
        if (r.fields['Is Creator'] === true) tags.push('Creator')
        if (r.fields['Is Premium'] === true) tags.push('Premium')
        
        const title = r.fields['Current Company Title']
        if (title && typeof title === 'string') {
          const lowerTitle = title.toLowerCase()
          if (lowerTitle.includes('founder') || lowerTitle.includes('ceo')) {
            tags.push('Decision Maker')
          }
        }
        
        return {
          id: r.id || `connection-${index}`,
          name: r.fields['Full Name'] || 'Unknown',
          role: r.fields['Current Company Title'] || '',
          company: r.fields['Company Name'] || '',
          linkedinUrl: r.fields['Username'] ? `https://linkedin.com/in/${r.fields['Username']}` : '',
          lastEngagement: 'Never', // This field doesn't exist in Airtable yet
          engagementScore,
          tags,
          notes: r.fields['Headline'] || ''
        }
      } catch (recordError: any) {
        console.error(`Error mapping record ${index}:`, recordError)
        // Return a minimal valid record
        return {
          id: r.id || `connection-${index}`,
          name: r.fields['Full Name'] || 'Error loading record',
          role: '',
          company: '',
          linkedinUrl: '',
          lastEngagement: 'Never',
          engagementScore: 0,
          tags: [],
          notes: 'Error loading record data'
        }
      }
    })
    
    console.log(`Successfully mapped ${connections.length} connections`)
    return NextResponse.json(connections)
  } catch (error: any) {
    console.error('Error fetching connections - Full details:', {
      message: error.message,
      statusCode: error.statusCode,
      error: error.error,
      stack: error.stack?.split('\n').slice(0, 5)
    })
    
    // Return more specific error information
    return NextResponse.json({ 
      error: error.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? {
        statusCode: error.statusCode,
        airtableError: error.error
      } : undefined
    }, { status: 500 })
  }
}
