import { NextResponse } from 'next/server'
import { createConnection } from '@/lib/airtable-http'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const testLinkedInUrl = "https://www.linkedin.com/in/jamesrichardson/"
    
    // Extract username from LinkedIn URL
    let username = testLinkedInUrl
    const match = testLinkedInUrl.match(/linkedin\.com\/in\/([^/]+)/)
    if (match) {
      username = match[1]
    }

    console.log(`Test: Username extracted: "${username}" from URL: "${testLinkedInUrl}"`)

    const record = await createConnection({
      'Full Name': 'James Richardson (Test)',
      'Username': username,
      'Is Current': true,
      'Start Date': new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      extractedUsername: username,
      originalUrl: testLinkedInUrl,
      createdRecord: record
    })
  } catch (error: any) {
    console.error('Test create error:', error)
    return NextResponse.json({ 
      error: error.message || 'Test failed'
    }, { status: 500 })
  }
}