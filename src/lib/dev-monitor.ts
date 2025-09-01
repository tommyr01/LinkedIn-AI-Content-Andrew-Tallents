/**
 * Development Monitoring System
 * Real-time tracking of user interactions for debugging and optimization
 */

import { createClient } from '@supabase/supabase-js'

interface DevInteraction {
  id?: string
  session_id: string
  interaction_type: 'chat_query' | 'button_click' | 'page_view' | 'error' | 'response_received'
  user_input?: string
  ai_response?: string
  component_name?: string
  action_taken?: string
  tools_used?: any[]
  response_time_ms?: number
  chunks_found?: number
  similarity_scores?: number[]
  error_details?: string
  page_url?: string
  user_agent?: string
  timestamp: string
  metadata?: Record<string, any>
}

class DevMonitor {
  private supabase: any
  private sessionId: string
  private isEnabled: boolean

  constructor() {
    this.supabase = this.getSupabaseClient()
    this.sessionId = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    this.isEnabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_MONITORING === 'true'
    
    if (this.isEnabled && typeof window !== 'undefined') {
      console.log('🔍 Dev Monitor Active - Session:', this.sessionId)
      this.setupWindowTracking()
    }
  }

  private getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!url || !key) {
      console.warn('Supabase not configured for dev monitoring')
      return null
    }
    
    return createClient(url, key)
  }

  private setupWindowTracking() {
    // Track page navigation
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.track('page_view', {
          action_taken: 'page_exit',
          page_url: window.location.href
        })
      })

      // Track clicks on RAG-related elements
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement
        if (target.closest('[data-rag-component]') || 
            target.closest('.rag-chat') || 
            target.textContent?.toLowerCase().includes('strategic intelligence')) {
          this.track('button_click', {
            component_name: target.closest('[data-rag-component]')?.getAttribute('data-rag-component') || 'unknown',
            action_taken: 'click',
            metadata: {
              element_text: target.textContent?.slice(0, 100),
              element_id: target.id,
              element_class: target.className
            }
          })
        }
      })
    }
  }

  async track(type: DevInteraction['interaction_type'], data: Partial<DevInteraction> = {}) {
    if (!this.isEnabled || !this.supabase) return

    try {
      const interaction: DevInteraction = {
        session_id: this.sessionId,
        interaction_type: type,
        timestamp: new Date().toISOString(),
        page_url: typeof window !== 'undefined' ? window.location.href : undefined,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        ...data
      }

      // Also log to console for immediate feedback
      this.logToConsole(interaction)

      const { error } = await this.supabase
        .from('dev_interactions')
        .insert([interaction])

      if (error) {
        console.error('Dev monitoring error:', error)
      }
    } catch (error) {
      console.error('Failed to track dev interaction:', error)
    }
  }

  private logToConsole(interaction: DevInteraction) {
    const timestamp = new Date().toLocaleTimeString()
    const emoji = this.getEmojiForType(interaction.interaction_type)
    
    console.group(`${emoji} ${interaction.interaction_type.toUpperCase()} [${timestamp}]`)
    
    if (interaction.user_input) {
      console.log('🗣️ User Input:', interaction.user_input)
    }
    
    if (interaction.ai_response) {
      console.log('🤖 AI Response:', interaction.ai_response.slice(0, 200) + '...')
    }
    
    if (interaction.tools_used?.length) {
      console.log('🛠️ Tools Used:', interaction.tools_used)
    }
    
    if (interaction.response_time_ms) {
      console.log('⏱️ Response Time:', `${interaction.response_time_ms}ms`)
    }
    
    if (interaction.chunks_found) {
      console.log('📚 Chunks Found:', interaction.chunks_found)
    }
    
    if (interaction.similarity_scores?.length) {
      console.log('🎯 Similarity Scores:', interaction.similarity_scores.map(s => `${(s * 100).toFixed(1)}%`))
    }
    
    if (interaction.error_details) {
      console.error('❌ Error:', interaction.error_details)
    }
    
    console.groupEnd()
  }

  private getEmojiForType(type: DevInteraction['interaction_type']): string {
    const emojis = {
      'chat_query': '💬',
      'button_click': '🖱️',
      'page_view': '👀',
      'error': '❌',
      'response_received': '✅'
    }
    return emojis[type] || '🔍'
  }

  // Specific tracking methods
  trackChatQuery(userInput: string, startTime: number) {
    this.track('chat_query', {
      user_input: userInput,
      metadata: {
        query_length: userInput.length,
        query_words: userInput.split(' ').length,
        start_time: startTime
      }
    })

    return {
      complete: (aiResponse: string, toolsUsed: any[] = [], chunksFound: number = 0, similarityScores: number[] = []) => {
        const responseTime = Date.now() - startTime
        
        this.track('response_received', {
          user_input: userInput,
          ai_response: aiResponse,
          tools_used: toolsUsed,
          response_time_ms: responseTime,
          chunks_found: chunksFound,
          similarity_scores: similarityScores,
          metadata: {
            response_length: aiResponse.length,
            response_words: aiResponse.split(' ').length
          }
        })
      },
      
      error: (errorMessage: string) => {
        const responseTime = Date.now() - startTime
        
        this.track('error', {
          user_input: userInput,
          error_details: errorMessage,
          response_time_ms: responseTime
        })
      }
    }
  }

  trackComponentInteraction(componentName: string, action: string, metadata: any = {}) {
    this.track('button_click', {
      component_name: componentName,
      action_taken: action,
      metadata
    })
  }

  // Get recent interactions for debugging
  async getRecentInteractions(limit: number = 50) {
    if (!this.supabase) return []

    try {
      const { data } = await this.supabase
        .from('dev_interactions')
        .select('*')
        .eq('session_id', this.sessionId)
        .order('timestamp', { ascending: false })
        .limit(limit)

      return data || []
    } catch (error) {
      console.error('Failed to get recent interactions:', error)
      return []
    }
  }

  // Export session data for analysis
  async exportSession() {
    const interactions = await this.getRecentInteractions(1000)
    const blob = new Blob([JSON.stringify(interactions, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `rag-session-${this.sessionId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

// Global instance
export const devMonitor = new DevMonitor()

// React hook for easy component tracking
export function useDevMonitoring() {
  const trackChatQuery = (query: string) => {
    const startTime = Date.now()
    return devMonitor.trackChatQuery(query, startTime)
  }

  const trackClick = (componentName: string, action: string, metadata?: any) => {
    devMonitor.trackComponentInteraction(componentName, action, metadata)
  }

  const trackError = (error: string, context?: any) => {
    devMonitor.track('error', {
      error_details: error,
      metadata: context
    })
  }

  return {
    trackChatQuery,
    trackClick,
    trackError,
    exportSession: () => devMonitor.exportSession()
  }
}