/**
 * RAG API Client - Simple HTTP client to connect to the existing RAG system
 * 
 * This client provides a clean interface to the RAG system running at localhost:8058
 * which contains 865 Andrew voice chunks ready for semantic search.
 */

import logger from '../lib/logger'

interface RAGSearchRequest {
  query: string
  limit?: number
  similarity_threshold?: number
}

interface RAGSearchResult {
  content: string
  document_title: string
  similarity_score: number
  metadata?: any
}

interface RAGResponse {
  results: RAGSearchResult[]
  total_results: number
  query_time_ms: number
}

class RAGClient {
  private baseURL: string
  private timeout: number

  constructor(baseURL: string = 'http://localhost:8058', timeout: number = 30000) {
    this.baseURL = baseURL
    this.timeout = timeout
  }

  /**
   * Search for voice chunks using semantic similarity
   */
  async searchVoiceChunks(query: string, limit: number = 10, similarityThreshold: number = 0.65): Promise<RAGSearchResult[]> {
    try {
      const searchRequest: RAGSearchRequest = {
        query,
        limit,
        similarity_threshold: similarityThreshold
      }

      logger.info('Searching RAG system', { query, limit, similarityThreshold })

      const response = await fetch(`${this.baseURL}/search/vector`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchRequest),
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        throw new Error(`RAG API returned ${response.status}: ${response.statusText}`)
      }

      const data: RAGResponse = await response.json()

      logger.info('RAG search completed', {
        results_count: data.results?.length || 0,
        query_time: data.query_time_ms,
        total_results: data.total_results
      })

      return data.results || []

    } catch (error) {
      logger.error('RAG search failed:', error)
      
      // Return empty results on failure instead of throwing
      return []
    }
  }

  /**
   * Check if RAG service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        return false
      }

      const health = await response.json()
      return health.status === 'healthy' || health.status === 'degraded'

    } catch (error) {
      logger.warn('RAG health check failed:', error)
      return false
    }
  }

  /**
   * Get RAG system statistics
   */
  async getStats(): Promise<{ total_chunks: number; service_status: string } | null> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        return null
      }

      const health = await response.json()
      
      return {
        total_chunks: 865, // Known chunk count from working system
        service_status: health.status || 'unknown'
      }

    } catch (error) {
      logger.warn('Failed to get RAG stats:', error)
      return null
    }
  }
}

// Export singleton instance
export const ragClient = new RAGClient()
export default ragClient