import { NextResponse } from 'next/server'
import { createAirtableClient } from '@/lib/airtable'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const airtable = createAirtableClient()
    const rows = await airtable.getInfluencers({ maxRecords: 200 })
    // map to front-end friendly shape
    const connections = rows.map(r => ({
      id: r.id,
      name: r.fields['Name'],
      company: r.fields['Company'] || '',
      role: r.fields['Role'] || '',
      linkedinUrl: r.fields['Profile URL'] || '',
      priorityRank: r.fields['Priority Rank'] || 0,
      lastEngagement: r.fields['Last Engaged'] || '',
      tags: [],
    }))
    return NextResponse.json(connections)
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
