import { NextResponse } from 'next/server'
import { createAirtableClient } from '@/lib/airtable'

export const dynamic = 'force-dynamic'

export async function GET() {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    environment: {
      hasApiKey: !!process.env.AIRTABLE_API_KEY,
      hasBaseId: !!process.env.AIRTABLE_BASE_ID,
      hasConnectionsTableId: !!process.env.AIRTABLE_CONNECTIONS_TABLE_ID,
      hasTableId: !!process.env.AIRTABLE_TABLE_ID,
      connectionsTableId: process.env.AIRTABLE_CONNECTIONS_TABLE_ID?.substring(0, 5) + '...',
    },
    errors: [],
    data: null,
    rawRecord: null,
  }

  try {
    // Test 1: Can we create the client?
    debugInfo.steps = ['Creating Airtable client...']
    const airtable = createAirtableClient()
    debugInfo.steps.push('✓ Client created successfully')

    // Test 2: Can we access the connections table at all?
    debugInfo.steps.push('Attempting to fetch connections...')
    
    try {
      // Get just one record to test
      const testRecords = await airtable.getConnections({ maxRecords: 1 })
      debugInfo.steps.push(`✓ Successfully fetched ${testRecords.length} test record(s)`)
      
      if (testRecords.length > 0) {
        // Show raw record structure
        debugInfo.rawRecord = {
          id: testRecords[0].id,
          fields: Object.keys(testRecords[0].fields || {}),
          sampleData: {}
        }
        
        // Show sample data for each field
        const fields = testRecords[0].fields
        for (const [key, value] of Object.entries(fields)) {
          debugInfo.rawRecord.sampleData[key] = {
            type: typeof value,
            value: value === null ? 'null' : value === undefined ? 'undefined' : 
                   typeof value === 'string' ? value.substring(0, 50) + (value.length > 50 ? '...' : '') :
                   typeof value === 'boolean' ? value :
                   typeof value === 'number' ? value :
                   Array.isArray(value) ? `Array(${value.length})` :
                   'Object'
          }
        }
      }
      
      // Test 3: Try the full query
      debugInfo.steps.push('Attempting full query with mapping...')
      const rows = await airtable.getConnections({ maxRecords: 5 })
      
      const connections = rows.map((r, index) => {
        try {
          const followerCount = r.fields['Follower Count'] || 0
          const connectionCount = r.fields['Connection Count'] || 0
          const engagementScore = Math.min(100, Math.round((followerCount + connectionCount) / 100))
          
          const tags: string[] = []
          if (r.fields['Is Influencer']) tags.push('Influencer')
          if (r.fields['Is Creator']) tags.push('Creator')
          if (r.fields['Is Premium']) tags.push('Premium')
          
          return {
            index,
            id: r.id || '',
            name: r.fields['Full Name'] || '',
            hasRole: !!r.fields['Current Company Title'],
            hasCompany: !!r.fields['Company Name'],
            engagementScore,
            tagsCount: tags.length,
            mapping: 'success'
          }
        } catch (mapError: any) {
          return {
            index,
            mapping: 'failed',
            error: mapError.message
          }
        }
      })
      
      debugInfo.steps.push(`✓ Mapped ${connections.filter(c => c.mapping === 'success').length}/${connections.length} records successfully`)
      debugInfo.data = connections
      
    } catch (tableError: any) {
      debugInfo.errors.push({
        stage: 'Table Access',
        message: tableError.message,
        details: tableError.error || tableError
      })
    }
    
  } catch (error: any) {
    debugInfo.errors.push({
      stage: 'Client Creation',
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    })
  }

  // Return debug information
  return NextResponse.json(debugInfo, { 
    status: debugInfo.errors.length > 0 ? 500 : 200,
    headers: {
      'Cache-Control': 'no-store'
    }
  })
}