import { NextResponse } from 'next/server'
import { createAirtableClient } from '@/lib/airtable'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const airtable = createAirtableClient()
    const rows = await airtable.getConnections({ maxRecords: 200 })
    
    // map to front-end friendly shape
    const connections = rows.map(r => {
      // Calculate engagement score based on follower/connection count
      const followerCount = r.fields['Follower Count'] || 0
      const connectionCount = r.fields['Connection Count'] || 0
      const engagementScore = Math.min(100, Math.round((followerCount + connectionCount) / 100))
      
      // Extract tags from headline or other fields
      const tags: string[] = []
      if (r.fields['Is Influencer']) tags.push('Influencer')
      if (r.fields['Is Creator']) tags.push('Creator')
      if (r.fields['Is Premium']) tags.push('Premium')
      if (r.fields['Current Company Title']?.toLowerCase().includes('founder') || 
          r.fields['Current Company Title']?.toLowerCase().includes('ceo')) {
        tags.push('Decision Maker')
      }
      
      return {
        id: r.id || '',
        name: r.fields['Full Name'] || '',
        role: r.fields['Current Company Title'] || '',
        company: r.fields['Company Name'] || '',
        linkedinUrl: r.fields['Username'] ? `https://linkedin.com/in/${r.fields['Username']}` : '',
        lastEngagement: 'Never', // This field doesn't exist in Airtable yet
        engagementScore,
        tags,
        notes: r.fields['Headline'] || ''
      }
    })
    
    return NextResponse.json(connections)
  } catch (error: any) {
    console.error('Error fetching connections:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
