import logger from '../lib/logger'
import type { SyncJobResult } from '../types'

export class LinkedInSyncService {
  private baseUrl: string

  constructor() {
    // Get the base URL for the main app API
    this.baseUrl = process.env.MAIN_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    logger.info({
      baseUrl: this.baseUrl
    }, 'LinkedIn sync service initialized')
  }

  /**
   * Sync LinkedIn posts for a specific user
   */
  async syncPosts(username = 'andrewtallents', options: {
    maxPages?: number
    pageNumber?: number
    triggerVoiceAnalysis?: boolean
  } = {}): Promise<SyncJobResult> {
    const startTime = Date.now()
    const jobId = `sync_${username}_${Date.now()}`

    logger.info({
      jobId,
      username,
      options
    }, 'Starting LinkedIn posts sync')

    try {
      const syncUrl = `${this.baseUrl}/api/linkedin/posts/sync`
      
      const requestBody = {
        username,
        maxPages: options.maxPages || 3,
        pageNumber: options.pageNumber || 1
      }

      logger.debug({
        jobId,
        syncUrl,
        requestBody
      }, 'Making sync API request')

      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Worker-Service/1.0'
        },
        body: JSON.stringify(requestBody),
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(300000) // 5 minute timeout
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(`Sync API returned ${response.status}: ${responseData.error || responseData.message || 'Unknown error'}`)
      }

      if (!responseData.success) {
        throw new Error(`Sync API failed: ${responseData.error || responseData.details || 'Unknown error'}`)
      }

      const completedAt = new Date().toISOString()
      const duration = Date.now() - startTime

      const result: SyncJobResult = {
        jobId,
        type: 'linkedin_posts_sync',
        status: 'success',
        startedAt: new Date(startTime).toISOString(),
        completedAt,
        duration,
        summary: responseData.data?.summary || {
          totalFetched: 0,
          newPosts: 0,
          updatedPosts: 0,
          errors: 0,
          pagesProcessed: 0
        },
        details: responseData.data
      }

      logger.info({
        jobId,
        duration,
        summary: result.summary
      }, 'LinkedIn posts sync completed successfully')

      // Trigger voice analysis if requested
      if (options.triggerVoiceAnalysis && result.summary.newPosts && result.summary.newPosts > 0) {
        logger.info({
          jobId,
          newPosts: result.summary.newPosts
        }, 'Triggering voice learning analysis for new posts')
        
        try {
          await this.triggerVoiceAnalysis(username)
        } catch (error) {
          logger.warn({
            jobId,
            error: error instanceof Error ? error.message : String(error)
          }, 'Voice analysis trigger failed, but sync was successful')
        }
      }

      return result

    } catch (error) {
      const completedAt = new Date().toISOString()
      const duration = Date.now() - startTime

      const errorMessage = error instanceof Error ? error.message : String(error)

      logger.error({
        jobId,
        username,
        duration,
        error: errorMessage
      }, 'LinkedIn posts sync failed')

      return {
        jobId,
        type: 'linkedin_posts_sync',
        status: 'error',
        startedAt: new Date(startTime).toISOString(),
        completedAt,
        duration,
        summary: {
          totalFetched: 0,
          newPosts: 0,
          updatedPosts: 0,
          errors: 1,
          pagesProcessed: 0
        },
        error: errorMessage
      }
    }
  }

  /**
   * Get sync status for a user
   */
  async getSyncStatus(username = 'andrewtallents') {
    try {
      const statusUrl = `${this.baseUrl}/api/linkedin/posts/sync?username=${username}`
      
      logger.debug({
        username,
        statusUrl
      }, 'Getting sync status')

      const response = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Worker-Service/1.0'
        },
        // Short timeout for status checks
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      const responseData = await response.json()

      if (!response.ok || !responseData.success) {
        throw new Error(`Status API returned error: ${responseData.error || responseData.details || 'Unknown error'}`)
      }

      return responseData.data

    } catch (error) {
      logger.error({
        username,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to get sync status')
      
      throw error
    }
  }

  /**
   * Trigger voice learning analysis for updated posts
   */
  private async triggerVoiceAnalysis(username: string) {
    try {
      const analysisUrl = `${this.baseUrl}/api/voice-learning/analyze`
      
      const response = await fetch(analysisUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Worker-Service/1.0'
        },
        body: JSON.stringify({ username }),
        signal: AbortSignal.timeout(60000) // 1 minute timeout
      })

      if (!response.ok) {
        throw new Error(`Voice analysis API returned ${response.status}`)
      }

      logger.info({
        username
      }, 'Voice learning analysis triggered successfully')

    } catch (error) {
      logger.warn({
        username,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to trigger voice analysis')
      
      throw error
    }
  }

  /**
   * Health check for the sync service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const healthUrl = `${this.baseUrl}/api/health`
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Worker-Service/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      return response.ok

    } catch (error) {
      logger.warn({
        baseUrl: this.baseUrl,
        error: error instanceof Error ? error.message : String(error)
      }, 'LinkedIn sync service health check failed')
      
      return false
    }
  }
}

// Export singleton instance
export const linkedInSyncService = new LinkedInSyncService()