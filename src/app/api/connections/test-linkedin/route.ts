import { NextResponse } from 'next/server'
import { linkedInScraper } from '@/lib/linkedin-scraper'

export const runtime = 'nodejs'

export async function GET() {
  try {
    // Test with the example username from the provided data
    const testUsername = 'andrewtallents'
    
    console.log(`Testing LinkedIn integration with username: ${testUsername}`)
    
    // Test the LinkedIn scraper service
    const profile = await linkedInScraper.getProfile(testUsername)
    const mappedData = linkedInScraper.mapToAirtableFields(profile)
    
    return NextResponse.json({
      success: true,
      message: 'LinkedIn integration test successful',
      testUsername,
      profileData: {
        name: profile.data.basic_info.fullname,
        headline: profile.data.basic_info.headline,
        company: profile.data.basic_info.current_company,
        location: profile.data.basic_info.location?.full,
        followerCount: profile.data.basic_info.follower_count,
        connectionCount: profile.data.basic_info.connection_count,
        isCreator: profile.data.basic_info.is_creator,
        isInfluencer: profile.data.basic_info.is_influencer,
        isPremium: profile.data.basic_info.is_premium
      },
      mappedAirtableFields: Object.keys(mappedData).length,
      sampleMappedFields: {
        'Full Name': mappedData['Full Name'],
        'Current Company': mappedData['Current Company'],
        'Title': mappedData['Title'],
        'Follower Count': mappedData['Follower Count'],
        'Connection Count': mappedData['Connection Count']
      },
      experienceCount: profile.data.experience?.length || 0,
      educationCount: profile.data.education?.length || 0,
      hasProfilePicture: !!profile.data.basic_info.profile_picture_url,
      apiKeyConfigured: !!process.env.RAPIDAPI_KEY
    })
  } catch (error: any) {
    console.error('LinkedIn integration test failed:', error)
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Test failed',
      apiKeyConfigured: !!process.env.RAPIDAPI_KEY,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        cause: error.cause
      } : undefined
    }, { status: 500 })
  }
}