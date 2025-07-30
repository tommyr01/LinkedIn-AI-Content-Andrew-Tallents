import { NextRequest, NextResponse } from 'next/server'
import { createConnection } from '@/lib/airtable-simple'

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

    // Extract username from LinkedIn URL
    let username = linkedinUrl
    const match = linkedinUrl.match(/linkedin\.com\/in\/([^/]+)/)
    if (match) {
      username = match[1]
    }

    const record = await createConnection({
      'Full Name': name,
      'Username': username,
      'Profile Picture About': linkedinUrl, // Store full URL in this field
      'Is Current': true,
      'Start Date': new Date().toISOString(),
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error: any) {
    console.error('Create connection error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
