import { NextRequest, NextResponse } from 'next/server'
import { createAirtableClient } from '@/lib/airtable'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, linkedinUrl } = body as {
      name?: string
      linkedinUrl?: string
    }

    if (!name || !linkedinUrl) {
      return NextResponse.json({ error: 'Name and LinkedIn URL are required' }, { status: 400 })
    }

    const airtable = createAirtableClient()

    const record = await airtable.createInfluencer({
      'Full Name': name,
      'Username': linkedinUrl,
            'Created': new Date().toISOString(),
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error: any) {
    console.error('Create connection error', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
