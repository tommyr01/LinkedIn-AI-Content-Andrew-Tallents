import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    // Mock recent generations data
    const recentGenerations = [
      {
        id: '1',
        topic: 'AI in Business Strategy',
        created_at: new Date().toISOString(),
        variants_count: 3,
        status: 'completed'
      },
      {
        id: '2', 
        topic: 'Leadership in Remote Teams',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        variants_count: 2,
        status: 'completed'
      }
    ]

    return NextResponse.json({
      success: true,
      generations: recentGenerations
    })
  } catch (error) {
    console.error('Error fetching recent generations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent generations' },
      { status: 500 }
    )
  }
}