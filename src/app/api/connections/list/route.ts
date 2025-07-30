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
      name: r.fields['Full Name'],
      linkedinUrl: r.fields['Username'],
      tags: [],
    }))
    return NextResponse.json(connections)
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
