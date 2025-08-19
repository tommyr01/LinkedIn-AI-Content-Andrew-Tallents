import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const test = searchParams.get('test') || 'all'
    
    console.log('🔍 Debug worker test requested:', test)
    
    const results: any = {
      timestamp: new Date().toISOString(),
      test,
      results: {}
    }

    // Test Redis connection
    if (test === 'all' || test === 'redis') {
      try {
        const response = await fetch(`${process.env.WORKER_SERVICE_URL || 'http://localhost:3001'}/debug/redis`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          results.results.redis = { status: 'success', data }
        } else {
          results.results.redis = { status: 'error', message: `HTTP ${response.status}` }
        }
      } catch (error) {
        results.results.redis = { 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    }

    // Test OpenAI connection
    if (test === 'all' || test === 'openai') {
      try {
        const response = await fetch(`${process.env.WORKER_SERVICE_URL || 'http://localhost:3001'}/debug/openai`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          results.results.openai = { status: 'success', data }
        } else {
          results.results.openai = { status: 'error', message: `HTTP ${response.status}` }
        }
      } catch (error) {
        results.results.openai = { 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    }

    // Test Supabase connection
    if (test === 'all' || test === 'supabase') {
      try {
        const response = await fetch(`${process.env.WORKER_SERVICE_URL || 'http://localhost:3001'}/debug/supabase`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          results.results.supabase = { status: 'success', data }
        } else {
          results.results.supabase = { status: 'error', message: `HTTP ${response.status}` }
        }
      } catch (error) {
        results.results.supabase = { 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    }

    // Test Research services
    if (test === 'all' || test === 'research') {
      try {
        const response = await fetch(`${process.env.WORKER_SERVICE_URL || 'http://localhost:3001'}/debug/research`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ topic: 'test leadership topic' })
        })
        
        if (response.ok) {
          const data = await response.json()
          results.results.research = { status: 'success', data }
        } else {
          results.results.research = { status: 'error', message: `HTTP ${response.status}` }
        }
      } catch (error) {
        results.results.research = { 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Debug worker test error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to run debug tests',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { topic = 'test topic' } = body
    
    console.log('🔍 Debug simple job test with topic:', topic)
    
    // Test a simple job creation and processing
    const response = await fetch(`${process.env.WORKER_SERVICE_URL || 'http://localhost:3001'}/debug/simple-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ topic })
    })
    
    if (!response.ok) {
      throw new Error(`Worker service responded with ${response.status}`)
    }
    
    const result = await response.json()
    
    return NextResponse.json({
      success: true,
      message: 'Simple job test completed',
      result
    })

  } catch (error) {
    console.error('Debug simple job test error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to test simple job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}