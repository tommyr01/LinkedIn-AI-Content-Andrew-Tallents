import { NextResponse } from 'next/server'
import { getConnections } from '@/lib/airtable-http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const connections = await getConnections(5)
    
    const debugData = connections.map(conn => ({
      id: conn.id,
      name: conn.fields['Full Name'],
      profilePictureRaw: conn.fields['Profile Picture URL'], // Raw attachment data
      profilePictureUrl: conn.fields['Profile Picture URL']?.[0]?.url, // Extracted URL
      hasAttachment: !!conn.fields['Profile Picture URL'],
      attachmentCount: conn.fields['Profile Picture URL']?.length || 0
    }))
    
    return NextResponse.json({
      message: 'Debug attachment data',
      connections: debugData,
      sampleRawAttachment: connections[0]?.fields['Profile Picture URL']
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}