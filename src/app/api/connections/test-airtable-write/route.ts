import { NextResponse } from 'next/server'
import { createConnection } from '@/lib/airtable-http'

export const runtime = 'nodejs'

export async function GET() {
  try {
    console.log('🧪 Testing Airtable write functionality...')
    
    // Test data similar to what LinkedIn enrichment would create
    const testRecord = {
      'Full Name': 'Test User (LinkedIn Integration Test)',
      'First Name': 'Test',
      'Last Name': 'User',
      'Username': 'testuser',
      'Headline': 'Test headline for LinkedIn integration',
      'Current Company': 'Test Company',
      'Title': 'Test Title',
      'Follower Count': 1000,
      'Connection Count': 500,
      'Is Creator': true,
      'Is Premium': false,
      'Start Date': '2024-01-15',
      'Is Current': true,
      'Full Location': 'Test City, Test Country'
    }
    
    console.log('📝 Attempting to create test record with fields:', Object.keys(testRecord))
    console.log('🎯 Sample field values:', {
      'Full Name': testRecord['Full Name'],
      'Current Company': testRecord['Current Company'],
      'Follower Count': testRecord['Follower Count']
    })
    
    const result = await createConnection(testRecord)
    
    console.log('✅ Test record created successfully:', {
      id: result.id,
      createdTime: result.createdTime
    })
    
    return NextResponse.json({
      success: true,
      message: 'Airtable write test successful',
      recordId: result.id,
      createdTime: result.createdTime,
      fieldsCreated: Object.keys(testRecord).length,
      testRecord: {
        name: testRecord['Full Name'],
        company: testRecord['Current Company'],
        followers: testRecord['Follower Count']
      },
      environmentCheck: {
        hasAirtableKey: !!process.env.AIRTABLE_API_KEY,
        hasAirtableBase: !!process.env.AIRTABLE_BASE_ID,
        hasConnectionsTable: !!process.env.AIRTABLE_CONNECTIONS_TABLE_ID,
        airtableKeyLength: process.env.AIRTABLE_API_KEY?.length || 0
      }
    })
  } catch (error: any) {
    console.error('💥 Airtable write test failed:', {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      airtableError: error.error
    })
    
    let errorMessage = 'Airtable write test failed'
    let statusCode = 500
    
    if (error.message.includes('401')) {
      errorMessage = 'Airtable authentication failed - check API key'
      statusCode = 401
    } else if (error.message.includes('404')) {
      errorMessage = 'Airtable base or table not found - check IDs'
      statusCode = 404
    } else if (error.message.includes('422')) {
      errorMessage = 'Airtable field validation error - check field names'
      statusCode = 422
    }
    
    return NextResponse.json({ 
      success: false,
      error: errorMessage,
      details: {
        originalError: error.message,
        statusCode: error.statusCode,
        environmentCheck: {
          hasAirtableKey: !!process.env.AIRTABLE_API_KEY,
          hasAirtableBase: !!process.env.AIRTABLE_BASE_ID,
          hasConnectionsTable: !!process.env.AIRTABLE_CONNECTIONS_TABLE_ID,
          airtableKeyLength: process.env.AIRTABLE_API_KEY?.length || 0
        }
      }
    }, { status: statusCode })
  }
}