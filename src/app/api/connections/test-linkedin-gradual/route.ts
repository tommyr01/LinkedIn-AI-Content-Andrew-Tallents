import { NextResponse } from 'next/server'
import { linkedInScraper } from '@/lib/linkedin-scraper'
import { createConnection } from '@/lib/airtable-http'

export const runtime = 'nodejs'

export async function GET() {
  try {
    console.log('🧪 Testing gradual field addition...')
    
    // Get LinkedIn data
    const profile = await linkedInScraper.getProfile('andrewtallents')
    const mappedData = linkedInScraper.mapToAirtableFields(profile)
    
    // Define field groups to add incrementally
    const fieldGroups = [
      {
        name: 'Basic Info',
        fields: ['Full Name', 'First Name', 'Last Name', 'Username']
      },
      {
        name: 'Professional', 
        fields: ['Headline', 'Current Company', 'Title']
      },
      {
        name: 'Dates',
        fields: ['Start Date', 'Is Current']
      },
      {
        name: 'Social Metrics',
        fields: ['Follower Count', 'Connection Count']
      },
      {
        name: 'Flags',
        fields: ['Is Creator', 'Is Influencer', 'Is Premium', 'Show Follower Count']
      },
      {
        name: 'Additional',
        fields: ['About', 'Full Location', 'Hashtags', 'Background Picture URL', 'URN', 'Company LinkedIn URL', 'Current Company URN']
      }
    ]
    
    const results: any = {}
    let cumulativeFields: any = {}
    
    for (const group of fieldGroups) {
      try {
        // Add this group's fields to cumulative set
        for (const fieldName of group.fields) {
          const mappedDataAny = mappedData as any
          if (mappedDataAny[fieldName] !== undefined && mappedDataAny[fieldName] !== null && mappedDataAny[fieldName] !== '') {
            cumulativeFields[fieldName] = mappedDataAny[fieldName]
          }
        }
        
        // Create a test record with cumulative fields
        const testRecord = {
          ...cumulativeFields,
          'Full Name': `Gradual Test ${group.name}` // Unique name for each test
        }
        
        console.log(`Testing ${group.name} with ${Object.keys(testRecord).length} fields:`, Object.keys(testRecord))
        
        const result = await createConnection(testRecord)
        results[group.name] = {
          status: 'SUCCESS',
          recordId: result.id,
          fieldCount: Object.keys(testRecord).length,
          fields: Object.keys(testRecord)
        }
        
        console.log(`✅ ${group.name} succeeded with ${Object.keys(testRecord).length} fields`)
        
      } catch (groupError: any) {
        results[group.name] = {
          status: 'FAILED',
          error: groupError.message,
          fieldCount: Object.keys(cumulativeFields).length + 1, // +1 for Full Name
          fields: Object.keys(cumulativeFields)
        }
        
        console.error(`❌ ${group.name} failed:`, groupError.message)
        break // Stop at first failure
      }
    }
    
    // Test with ALL original fields (the failing case)
    try {
      const allFieldsRecord = {
        ...mappedData,
        'Full Name': 'Full LinkedIn Data Test'
      }
      
      console.log(`Testing ALL fields (${Object.keys(allFieldsRecord).length} total)`)
      
      const fullResult = await createConnection(allFieldsRecord)
      results['ALL_FIELDS'] = {
        status: 'SUCCESS',
        recordId: fullResult.id,
        fieldCount: Object.keys(allFieldsRecord).length
      }
      
    } catch (allFieldsError: any) {
      results['ALL_FIELDS'] = {
        status: 'FAILED',
        error: allFieldsError.message,
        fieldCount: Object.keys(mappedData).length,
        allFields: Object.keys(mappedData)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Gradual field testing complete',
      totalMappedFields: Object.keys(mappedData).length,
      results,
      summary: {
        successfulGroups: Object.values(results).filter((r: any) => r.status === 'SUCCESS').length,
        failedGroups: Object.values(results).filter((r: any) => r.status === 'FAILED').length,
        maxSuccessfulFields: Math.max(...Object.values(results).filter((r: any) => r.status === 'SUCCESS').map((r: any) => r.fieldCount))
      }
    })
    
  } catch (error: any) {
    console.error('Gradual field test failed:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Gradual field test failed',
      details: error.message
    }, { status: 500 })
  }
}