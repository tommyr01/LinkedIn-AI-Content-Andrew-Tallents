import { NextResponse } from 'next/server'
import Airtable from 'airtable'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    // Direct Airtable connection test
    const apiKey = process.env.AIRTABLE_API_KEY
    const baseId = process.env.AIRTABLE_BASE_ID
    const tableId = process.env.AIRTABLE_CONNECTIONS_TABLE_ID
    
    if (!apiKey || !baseId || !tableId) {
      return NextResponse.json({
        error: 'Missing configuration',
        hasApiKey: !!apiKey,
        hasBaseId: !!baseId,
        hasTableId: !!tableId
      }, { status: 500 })
    }
    
    // Configure Airtable
    Airtable.configure({
      endpointUrl: 'https://api.airtable.com',
      apiKey: apiKey
    })
    
    const base = Airtable.base(baseId)
    
    // Try to fetch just one record with minimal fields
    const records = await base(tableId).select({
      maxRecords: 1,
      fields: ['Full Name'] // Just try to get the name field
    }).firstPage()
    
    return NextResponse.json({
      success: true,
      recordCount: records.length,
      firstRecord: records.length > 0 ? {
        id: records[0].id,
        hasFullName: !!records[0].fields['Full Name'],
        fullName: records[0].fields['Full Name'] || 'No name',
        allFields: Object.keys(records[0].fields)
      } : null
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: 'Airtable error',
      message: error.message,
      statusCode: error.statusCode,
      errorType: error.error?.type,
      details: error.error
    }, { status: 500 })
  }
}