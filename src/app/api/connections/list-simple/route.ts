import { NextResponse } from 'next/server'
import { getConnections } from '@/lib/airtable-simple'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    // Fetch connections using the simple client
    const records = await getConnections(200)
    
    // Map to front-end friendly format
    const connections = records.map((record) => {
      const fields = record.fields
      
      // Calculate engagement score
      const followerCount = fields['Follower Count'] || 0
      const connectionCount = fields['Connection Count'] || 0
      const engagementScore = Math.min(100, Math.round((followerCount + connectionCount) / 100))
      
      // Build tags array
      const tags: string[] = []
      if (fields['Is Influencer']) tags.push('Influencer')
      if (fields['Is Creator']) tags.push('Creator')
      if (fields['Is Premium']) tags.push('Premium')
      
      const title = fields['Current Company Title']
      if (title && typeof title === 'string') {
        const lowerTitle = title.toLowerCase()
        if (lowerTitle.includes('founder') || lowerTitle.includes('ceo')) {
          tags.push('Decision Maker')
        }
      }
      
      return {
        id: record.id,
        name: fields['Full Name'] || '',
        role: fields['Current Company Title'] || '',
        company: fields['Company Name'] || '',
        linkedinUrl: fields['Username'] ? `https://linkedin.com/in/${fields['Username']}` : '',
        lastEngagement: 'Never',
        engagementScore,
        tags,
        notes: fields['Headline'] || ''
      }
    })
    
    return NextResponse.json(connections)
  } catch (error: any) {
    console.error('Simple route error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch connections',
      type: error.error?.type,
      statusCode: error.statusCode
    }, { status: 500 })
  }
}