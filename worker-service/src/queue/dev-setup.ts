import logger from '../lib/logger'
import { MemoryQueue, checkMemoryQueueHealth } from './memory-queue'
import type { JobData } from '../types'

// Development queue setup using in-memory queue
export const QUEUE_NAMES = {
  CONTENT_GENERATION: 'content-generation'
} as const

// Simple memory-based queue for Phase 3 development
class DevContentGenerationQueue {
  private memoryQueue = new MemoryQueue()

  async add(name: string, data: JobData) {
    return await this.memoryQueue.add(data)
  }

  async getWaiting() {
    return await this.memoryQueue.getWaiting()
  }

  async getActive() {
    return await this.memoryQueue.getActive()
  }

  async getCompleted() {
    return await this.memoryQueue.getCompleted()
  }

  async getFailed() {
    return await this.memoryQueue.getFailed()
  }

  async close() {
    await this.memoryQueue.close()
  }
}

export const contentGenerationQueue = new DevContentGenerationQueue()

// Mock queue events for compatibility
export const queueEvents = {
  on: (event: string, callback: Function) => {
    logger.debug({ event }, 'Queue event listener registered (development mode)')
  },
  close: async () => {
    logger.info('Queue events closed (development mode)')
  }
}

// Health check function for development
export const checkQueueHealth = async () => {
  logger.info('Running development queue health check...')
  return await checkMemoryQueueHealth()
}

// Graceful shutdown for development
export const closeQueue = async () => {
  try {
    await queueEvents.close()
    await contentGenerationQueue.close()
    logger.info('Development queue connections closed successfully')
  } catch (error) {
    logger.error({ error }, 'Error closing development queue connections')
  }
}

logger.info('Using development in-memory queue system')

export default {
  contentGenerationQueue,
  queueEvents,
  checkQueueHealth,
  closeQueue
}