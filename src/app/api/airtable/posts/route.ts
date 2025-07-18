import { NextRequest, NextResponse } from 'next/server'
import { createAirtableClient } from '@/lib/airtable'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = searchParams.get('limit')
    
    const airtableClient = createAirtableClient()
    
    let posts
    if (status) {
      posts = await airtableClient.getPostsByStatus(status as any)
    } else {
      posts = await airtableClient.getRecentPosts(limit ? parseInt(limit) : 10)
    }

    return NextResponse.json({ posts })
  } catch (error) {
    console.error('Airtable API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts from Airtable' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const airtableClient = createAirtableClient()
    
    const post = await airtableClient.createContentPost({
      'Content': body.content,
      'Post Type': body.postType || 'Thought Leadership',
      'Status': body.status || 'Draft',
      'Hashtags': body.hashtags || [],
      'Scheduled Date': body.scheduledDate,
      'Created By': body.createdBy || 'Erska',
      'Created': new Date().toISOString(),
    })

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Airtable create post error:', error)
    return NextResponse.json(
      { error: 'Failed to create post in Airtable' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    const airtableClient = createAirtableClient()
    
    const updateFields: any = {}
    if (body.content !== undefined) updateFields['Content'] = body.content
    if (body.status !== undefined) updateFields['Status'] = body.status
    if (body.scheduledDate !== undefined) updateFields['Scheduled Date'] = body.scheduledDate
    if (body.hashtags !== undefined) updateFields['Hashtags'] = body.hashtags
    if (body.views !== undefined) updateFields['Views'] = body.views
    if (body.likes !== undefined) updateFields['Likes'] = body.likes
    if (body.comments !== undefined) updateFields['Comments'] = body.comments

    const post = await airtableClient.updateContentPost(body.id, updateFields)

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Airtable update post error:', error)
    return NextResponse.json(
      { error: 'Failed to update post in Airtable' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    const airtableClient = createAirtableClient()
    await airtableClient.deleteContentPost(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Airtable delete post error:', error)
    return NextResponse.json(
      { error: 'Failed to delete post from Airtable' },
      { status: 500 }
    )
  }
}