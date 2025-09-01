/**
 * RAG System Analytics and Monitoring
 * Tracks usage, performance, and effectiveness of the Strategic Intelligence Chat
 */

import { createClient } from '@supabase/supabase-js'

interface RAGAnalytics {
  session_id: string
  user_query: string
  response_generated: boolean
  chunks_retrieved: number
  avg_similarity_score: number
  response_time_ms: number
  error_message?: string
  embedding_generated: boolean
  fallback_used: string | null
  user_agent?: string
  timestamp: string
  metadata: Record<string, any>
}

interface PerformanceMetrics {
  endpoint: string
  method: string
  status_code: number
  response_time_ms: number
  memory_usage_mb?: number
  chunks_processed: number
  embedding_time_ms?: number
  database_time_ms?: number
  llm_time_ms?: number
  timestamp: string
}

class RAGMonitoring {
  private supabase: any
  private sessionId: string

  constructor() {
    this.supabase = this.getSupabaseClient()
    this.sessionId = this.generateSessionId()
  }

  private getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!url || !key) {
      console.warn('Supabase not configured for analytics')
      return null
    }
    
    return createClient(url, key)
  }

  private generateSessionId(): string {
    return `rag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async trackRAGUsage(data: Partial<RAGAnalytics>) {
    if (!this.supabase) return

    try {
      const analytics: RAGAnalytics = {
        session_id: this.sessionId,
        user_query: data.user_query || '',
        response_generated: data.response_generated ?? false,
        chunks_retrieved: data.chunks_retrieved || 0,
        avg_similarity_score: data.avg_similarity_score || 0,
        response_time_ms: data.response_time_ms || 0,
        error_message: data.error_message,
        embedding_generated: data.embedding_generated ?? false,
        fallback_used: data.fallback_used || null,
        user_agent: data.user_agent,
        timestamp: new Date().toISOString(),
        metadata: data.metadata || {}
      }

      const { error } = await this.supabase
        .from('rag_analytics')
        .insert([analytics])

      if (error) {
        console.error('Analytics tracking error:', error)
      }
    } catch (error) {
      console.error('Failed to track RAG usage:', error)
    }
  }

  async trackPerformance(data: PerformanceMetrics) {
    if (!this.supabase) return

    try {
      const { error } = await this.supabase
        .from('rag_performance_metrics')
        .insert([{
          ...data,
          session_id: this.sessionId
        }])

      if (error) {
        console.error('Performance tracking error:', error)
      }
    } catch (error) {
      console.error('Failed to track performance:', error)
    }
  }

  async getUsageStats(hours: number = 24) {
    if (!this.supabase) return null

    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

      // Get usage statistics
      const { data: stats } = await this.supabase
        .from('rag_analytics')
        .select('*')
        .gte('timestamp', since)

      // Get performance metrics
      const { data: performance } = await this.supabase
        .from('rag_performance_metrics')
        .select('*')
        .gte('timestamp', since)

      return {
        stats,
        performance,
        summary: this.calculateSummary(stats || [])
      }
    } catch (error) {
      console.error('Failed to get usage stats:', error)
      return null
    }
  }

  private calculateSummary(stats: RAGAnalytics[]) {
    if (!stats.length) return null

    const totalQueries = stats.length
    const successfulResponses = stats.filter(s => s.response_generated).length
    const averageResponseTime = stats.reduce((sum, s) => sum + s.response_time_ms, 0) / totalQueries
    const averageSimilarity = stats
      .filter(s => s.avg_similarity_score > 0)
      .reduce((sum, s) => sum + s.avg_similarity_score, 0) / stats.filter(s => s.avg_similarity_score > 0).length
    const fallbackUsage = stats.filter(s => s.fallback_used).length

    return {
      totalQueries,
      successfulResponses,
      successRate: (successfulResponses / totalQueries) * 100,
      averageResponseTime: Math.round(averageResponseTime),
      averageSimilarity: Math.round(averageSimilarity * 100),
      fallbackUsage,
      fallbackRate: (fallbackUsage / totalQueries) * 100
    }
  }

  // Client-side usage tracking
  trackClientUsage(query: string, startTime: number) {
    return {
      complete: (success: boolean, chunksFound: number = 0, similarity: number = 0, error?: string) => {
        const responseTime = Date.now() - startTime
        
        this.trackRAGUsage({
          user_query: query,
          response_generated: success,
          chunks_retrieved: chunksFound,
          avg_similarity_score: similarity,
          response_time_ms: responseTime,
          error_message: error,
          embedding_generated: similarity > 0,
          fallback_used: similarity === 0 && success ? 'static_content' : null,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          metadata: {
            client_side: true,
            query_length: query.length
          }
        })
      }
    }
  }
}

// Global instance
export const ragMonitoring = new RAGMonitoring()

// Performance monitoring middleware
export function withPerformanceTracking<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  endpoint: string,
  method: string = 'POST'
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()
    const startMemory = process.memoryUsage().heapUsed / 1024 / 1024

    try {
      const result = await fn(...args)
      const responseTime = Date.now() - startTime
      const endMemory = process.memoryUsage().heapUsed / 1024 / 1024

      await ragMonitoring.trackPerformance({
        endpoint,
        method,
        status_code: 200,
        response_time_ms: responseTime,
        memory_usage_mb: endMemory - startMemory,
        chunks_processed: 0, // Will be updated by specific implementations
        timestamp: new Date().toISOString()
      })

      return result
    } catch (error) {
      const responseTime = Date.now() - startTime
      
      await ragMonitoring.trackPerformance({
        endpoint,
        method,
        status_code: 500,
        response_time_ms: responseTime,
        memory_usage_mb: 0,
        chunks_processed: 0,
        timestamp: new Date().toISOString()
      })

      throw error
    }
  }
}

// React hook for client-side monitoring
export function useRAGMonitoring() {
  const trackQuery = (query: string) => {
    const startTime = Date.now()
    return ragMonitoring.trackClientUsage(query, startTime)
  }

  return { trackQuery }
}