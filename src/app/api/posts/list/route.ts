import { NextRequest, NextResponse } from 'next/server'
import { ConnectionPostRecord } from '../../../../lib/airtable-http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching connection posts from Airtable...')

    // Check required environment variables
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID || !process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID) {
      return NextResponse.json({ 
        error: 'Missing required Airtable configuration' 
      }, { status: 500 })
    }

    const searchParams = request.nextUrl.searchParams
    const maxRecords = parseInt(searchParams.get('maxRecords') || '100')
    const sortDirection = searchParams.get('sortDirection') || 'desc'
    const sortField = searchParams.get('sortField') || 'Posted Date'

    // Construct Airtable API URL with parameters
    const airtableUrl = new URL(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID}`)
    airtableUrl.searchParams.append('maxRecords', maxRecords.toString())
    airtableUrl.searchParams.append('sort[0][field]', sortField)
    airtableUrl.searchParams.append('sort[0][direction]', sortDirection)
    
    // Optional filters for recent posts
    const filterFormula = searchParams.get('filter')
    if (filterFormula) {
      airtableUrl.searchParams.append('filterByFormula', filterFormula)
    }

    console.log(`📡 Requesting from Airtable: ${airtableUrl.pathname}${airtableUrl.search}`)

    const response = await fetch(airtableUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Airtable API error:', response.status, errorText)
      return NextResponse.json({ 
        error: 'Failed to fetch posts from Airtable',
        details: errorText
      }, { status: response.status })
    }

    const data = await response.json()
    console.log(`✅ Successfully fetched ${data.records?.length || 0} connection posts`)

    // Transform Airtable records to our format
    const posts = data.records?.map((record: any) => {
      const fields = record.fields
      
      // Handle connection data (linked record)
      let connectionName = 'Unknown'
      let connectionCompany = ''
      
      // If Connection field is populated, it would be an array of linked record IDs
      // In a full implementation, you'd need to expand these records or fetch them separately
      // For now, we'll use the author information from the post itself
      connectionName = `${fields['Author First Name'] || ''} ${fields['Author Last Name'] || ''}`.trim() || 'Unknown'
      
      return {
        id: record.id,
        connectionName,
        connectionCompany,
        content: fields['Post Text'] || '',
        postedAt: fields['Posted Date'] || new Date().toISOString(),
        postUrn: fields['Post URN'] || '',
        postUrl: fields['Post URL'] || '',
        likesCount: fields['Likes'] || 0,
        commentsCount: fields['Comments Count'] || 0,
        totalReactions: fields['Total Reactions'] || 0,
        reposts: fields['Reposts'] || 0,
        authorFirstName: fields['Author First Name'] || '',
        authorLastName: fields['Author Last Name'] || '',
        authorHeadline: fields['Author Headline'] || '',
        authorLinkedInUrl: fields['Author LinkedIn URL'] || '',
        authorProfilePicture: fields['Author Profile Picture']?.[0]?.url || '',
        postType: fields['Post Type'] || 'regular',
        mediaType: fields['Media Type'] || '',
        mediaUrl: fields['Media URL'] || '',
        mediaThumbnail: fields['Media Thumbnail'] || '',
        createdTime: record.createdTime,
        hasMedia: !!(fields['Media Type'] && fields['Media URL'])
      }
    }) || []

    // Calculate summary stats
    const stats = {
      totalPosts: posts.length,
      totalLikes: posts.reduce((sum: number, post: any) => sum + (post.likesCount || 0), 0),
      totalComments: posts.reduce((sum: number, post: any) => sum + (post.commentsCount || 0), 0),
      totalReactions: posts.reduce((sum: number, post: any) => sum + (post.totalReactions || 0), 0),
      uniqueConnections: new Set(posts.map((post: any) => post.connectionName)).size,
      averageEngagement: posts.length > 0 
        ? Math.round(posts.reduce((sum: number, post: any) => sum + (post.totalReactions || 0), 0) / posts.length)
        : 0
    }

    console.log(`📊 Post stats: ${stats.totalPosts} posts, ${stats.totalReactions} reactions, ${stats.uniqueConnections} connections`)

    return NextResponse.json({
      success: true,
      posts,
      stats,
      meta: {
        recordsReturned: posts.length,
        maxRecords,
        sortField,
        sortDirection
      }
    })

  } catch (error: any) {
    console.error('Error fetching connection posts:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch connection posts',
      details: error.message
    }, { status: 500 })
  }
}