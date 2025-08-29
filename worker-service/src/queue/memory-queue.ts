import logger from '../lib/logger'
import type { JobData } from '../types'

// Simple in-memory queue implementation for development
export class MemoryQueue {
  private jobs: Array<{ id: string; data: JobData; status: 'waiting' | 'active' | 'completed' | 'failed' }> = []
  private jobIdCounter = 1
  private isProcessing = false

  async add(data: JobData) {
    const jobId = `memory-job-${this.jobIdCounter++}`
    this.jobs.push({
      id: jobId,
      data,
      status: 'waiting'
    })
    
    logger.info({ jobId, data }, 'Job added to memory queue')
    
    // Auto-process if not already processing
    if (!this.isProcessing) {
      this.processNext()
    }
    
    return { id: jobId }
  }

  async getWaiting() {
    return this.jobs.filter(job => job.status === 'waiting')
  }

  async getActive() {
    return this.jobs.filter(job => job.status === 'active')
  }

  async getCompleted() {
    return this.jobs.filter(job => job.status === 'completed')
  }

  async getFailed() {
    return this.jobs.filter(job => job.status === 'failed')
  }

  private async processNext() {
    this.isProcessing = true
    
    while (true) {
      const waitingJob = this.jobs.find(job => job.status === 'waiting')
      if (!waitingJob) {
        break // No more waiting jobs
      }
      
      waitingJob.status = 'active'
      logger.info({ jobId: waitingJob.id }, 'Processing job')
      
      try {
        // Simulate job processing
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        waitingJob.status = 'completed'
        logger.info({ jobId: waitingJob.id }, 'Job completed successfully')
        
      } catch (error) {
        waitingJob.status = 'failed'
        logger.error({ jobId: waitingJob.id, error }, 'Job failed')
      }
    }
    
    this.isProcessing = false
  }

  async close() {
    logger.info('Memory queue closed')
  }

  async ping() {
    return 'PONG'
  }
}

// Health check for memory queue
export const checkMemoryQueueHealth = async () => {
  try {
    const memoryQueue = new MemoryQueue()
    await memoryQueue.ping()
    
    const waiting = await memoryQueue.getWaiting()
    const active = await memoryQueue.getActive()
    const completed = await memoryQueue.getCompleted()
    const failed = await memoryQueue.getFailed()
    
    return {
      redis: 'connected', // For compatibility
      queues: {
        'content-generation': {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length
        }
      }
    }
  } catch (error) {
    return {
      redis: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}