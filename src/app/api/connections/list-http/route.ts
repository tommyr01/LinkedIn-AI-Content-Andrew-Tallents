import { NextResponse } from 'next/server'
import { getConnections } from '@/lib/airtable-http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    console.log('Using direct HTTP client for Airtable');
    
    // Fetch connections using direct HTTP
    const rows = await getConnections(200)
    console.log(`Fetched ${rows.length} connections via HTTP`)
    
    // Map to frontend format
    const connections = rows.map((record, index) => {
      try {
        const fields = record.fields
        
        // Calculate engagement score
        const followerCount = fields['Follower Count'] || 0
        const connectionCount = fields['Connection Count'] || 0
        const engagementScore = Math.min(100, Math.round((followerCount + connectionCount) / 100))
        
        // Build tags
        const tags: string[] = []
        if (fields['Is Influencer'] === true) tags.push('Influencer')
        if (fields['Is Creator'] === true) tags.push('Creator')
        if (fields['Is Premium'] === true) tags.push('Premium')
        
        const title = fields['Title']
        if (title && typeof title === 'string') {
          const lowerTitle = title.toLowerCase()
          if (lowerTitle.includes('founder') || lowerTitle.includes('ceo')) {
            tags.push('Decision Maker')
          }
        }
        
        return {
          id: record.id,
          name: fields['Full Name'] || 'Unknown',
          role: fields['Title'] || '',
          company: fields['Current Company'] || '',
          linkedinUrl: fields['Username'] ? `https://linkedin.com/in/${fields['Username']}` : '',
          lastEngagement: 'Never',
          engagementScore,
          tags,
          notes: fields['Headline'] || ''
        }
      } catch (mapError: any) {
        console.error(`Error mapping record ${index}:`, mapError)
        return {
          id: record.id || `connection-${index}`,
          name: 'Error loading record',
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
    console.error('HTTP client error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch connections via HTTP',
      type: 'HTTP_CLIENT_ERROR'
    }, { status: 500 })
  }
}