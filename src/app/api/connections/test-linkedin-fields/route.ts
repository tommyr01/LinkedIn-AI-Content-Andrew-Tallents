import { NextResponse } from 'next/server'
import { linkedInScraper } from '@/lib/linkedin-scraper'
import { createConnection } from '@/lib/airtable-http'

export const runtime = 'nodejs'

export async function GET() {
  try {
    console.log('🧪 Testing LinkedIn field mapping...')
    
    // Get LinkedIn data
    const profile = await linkedInScraper.getProfile('andrewtallents')
    const mappedData = linkedInScraper.mapToAirtableFields(profile)
    
    // Test with minimal fields first
    const minimalFields = {
      'Full Name': mappedData['Full Name'],
      'Username': mappedData['Username']
    }
    
    console.log('Testing minimal fields:', minimalFields)
    
    try {
      const minimalResult = await createConnection(minimalFields)
      console.log('✅ Minimal fields work:', minimalResult.id)
      
      // Now test individual fields one by one
      const fieldTests: any = {
        minimal: 'SUCCESS'
      }
      
      const fieldsToTest = [
        'First Name',
        'Last Name', 
        'Headline',
        'Current Company',
        'Title',
        'Start Date',
        'Follower Count',
        'Connection Count',
        'Is Creator',
        'Is Premium',
        'Full Location'
      ]
      
      for (const fieldName of fieldsToTest) {
        try {
          const testRecord = {
            'Full Name': `Test ${fieldName} Field`,
            'Username': `test-${fieldName.toLowerCase().replace(' ', '-')}`,
            [fieldName]: mappedData[fieldName]
          }
          
          console.log(`Testing field: ${fieldName} = ${mappedData[fieldName]}`)
          const result = await createConnection(testRecord)
          fieldTests[fieldName] = 'SUCCESS'
          console.log(`✅ Field ${fieldName} works`)
        } catch (fieldError: any) {
          fieldTests[fieldName] = `ERROR: ${fieldError.message}`
          console.error(`❌ Field ${fieldName} failed:`, fieldError.message)
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'LinkedIn field testing complete',
        profileData: {
          name: profile.data.basic_info.fullname,
          company: profile.data.basic_info.current_company
        },
        mappedFields: Object.keys(mappedData).length,
        fieldTests,
        failedFields: Object.entries(fieldTests).filter(([_, result]) => result !== 'SUCCESS')
      })
      
    } catch (minimalError: any) {
      return NextResponse.json({
        success: false,
        error: 'Even minimal fields failed',
        details: minimalError.message,
        minimalFields
      }, { status: 500 })
    }
    
  } catch (error: any) {
    console.error('LinkedIn field test failed:', error)
    return NextResponse.json({ 
      success: false,
      error: 'LinkedIn field test failed',
      details: error.message
    }, { status: 500 })
  }
}