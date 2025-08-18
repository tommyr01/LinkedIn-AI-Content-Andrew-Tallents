import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Check environment variables
    const hasRapidApiKey = !!process.env.RAPIDAPI_KEY
    const hasAirtableKey = !!process.env.AIRTABLE_API_KEY
    const hasAirtableBase = !!process.env.AIRTABLE_BASE_ID
    const hasConnectionsTable = !!process.env.AIRTABLE_CONNECTIONS_TABLE_ID
    
    const rapidApiKeyLength = process.env.RAPIDAPI_KEY?.length || 0
    const airtableKeyLength = process.env.AIRTABLE_API_KEY?.length || 0
    
    // Test basic LinkedIn API call
    let linkedinTestResult: any = null
    let linkedinError = null
    
    if (hasRapidApiKey) {
      try {
        const testUrl = 'https://linkedin-scraper-api-real-time-fast-affordable.p.rapidapi.com/profile/detail?username=andrewtallents'
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'x-rapidapi-host': 'linkedin-scraper-api-real-time-fast-affordable.p.rapidapi.com',
            'x-rapidapi-key': process.env.RAPIDAPI_KEY!,
          },
        })
        
        linkedinTestResult = {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        }
        
        if (response.ok) {
          const data = await response.json()
          linkedinTestResult.hasData = !!data.data
          linkedinTestResult.success = data.success
          linkedinTestResult.profileName = data.data?.basic_info?.fullname
        } else {
          const errorText = await response.text()
          linkedinError = `${response.status}: ${errorText}`
        }
      } catch (error: any) {
        linkedinError = error.message
      }
    }
    
    // Test Airtable connection
    let airtableTestResult: any = null
    let airtableError = null
    
    if (hasAirtableKey && hasAirtableBase && hasConnectionsTable) {
      try {
        const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_CONNECTIONS_TABLE_ID}?maxRecords=1`
        const response = await fetch(airtableUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        })
        
        airtableTestResult = {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        }
        
        if (response.ok) {
          const data = await response.json()
          airtableTestResult.hasRecords = !!data.records
          airtableTestResult.recordCount = data.records?.length || 0
        } else {
          const errorText = await response.text()
          airtableError = `${response.status}: ${errorText}`
        }
      } catch (error: any) {
        airtableError = error.message
      }
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        hasRapidApiKey,
        rapidApiKeyLength: rapidApiKeyLength > 0 ? `${rapidApiKeyLength} characters` : 'Not set',
        hasAirtableKey,
        airtableKeyLength: airtableKeyLength > 0 ? `${airtableKeyLength} characters` : 'Not set',
        hasAirtableBase,
        hasConnectionsTable,
        nodeEnv: process.env.NODE_ENV,
      },
      linkedin: {
        apiConfigured: hasRapidApiKey,
        testResult: linkedinTestResult,
        error: linkedinError
      },
      airtable: {
        apiConfigured: hasAirtableKey && hasAirtableBase && hasConnectionsTable,
        testResult: airtableTestResult,
        error: airtableError
      },
      recommendations: [
        !hasRapidApiKey && 'Add RAPIDAPI_KEY to environment variables',
        !hasAirtableKey && 'Add AIRTABLE_API_KEY to environment variables',
        !hasAirtableBase && 'Add AIRTABLE_BASE_ID to environment variables',
        !hasConnectionsTable && 'Add AIRTABLE_CONNECTIONS_TABLE_ID to environment variables',
        linkedinError && `LinkedIn API Error: ${linkedinError}`,
        airtableError && `Airtable API Error: ${airtableError}`
      ].filter(Boolean)
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Debug check failed',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}