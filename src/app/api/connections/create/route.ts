import { NextRequest, NextResponse } from 'next/server'
import { createConnection } from '@/lib/airtable-http'

export const runtime = 'nodejs'

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

    console.log(`Creating connection: Name="${name}", Username="${username}", LinkedIn URL="${linkedinUrl}"`)

    const record = await createConnection({
      'Full Name': name,
      'Username': username,
      // Don't set Profile Picture URL here - that should be the actual image URL, not LinkedIn profile URL
      'Is Current': true,
      'Start Date': new Date().toISOString(),
    })

    console.log('Connection created successfully:', record.id)

    return NextResponse.json(record, { status: 201 })
  } catch (error: any) {
    console.error('Create connection error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
