import { supabaseService } from './supabase'
import { vectorSimilarityService } from './vector-similarity'
import logger from '../lib/logger'

interface PostToEmbed {
  id: string
  post_text: string
  total_reactions: number
  like_count: number
  comments_count: number
  reposts: number
  shares: number
  posted_date: string
}

export class EmbeddingsPopulatorService {
  
  /**
   * Populate embeddings for all Andrew's existing posts
   */
  async populateAllPostEmbeddings(): Promise<void> {
    try {
      logger.info('Starting to populate post embeddings')

      // Get all Andrew's posts from connection_posts
      const posts = await this.getAndrewsPosts()
      logger.info({ count: posts.length }, 'Found Andrew\'s posts to process')
      
      if (posts.length > 0) {
        logger.info({ 
          samplePost: {
            id: posts[0].id,
            textLength: posts[0].post_text.length,
            reactions: posts[0].total_reactions
          }
        }, 'Sample post for processing')
      }

      if (posts.length === 0) {
        logger.warn('No posts found to embed')
        return
      }

      // Process posts in batches to avoid rate limits
      const batchSize = 10
      let processed = 0
      let errors = 0

      for (let i = 0; i < posts.length; i += batchSize) {
        const batch = posts.slice(i, i + batchSize)
        logger.info({ batch: i / batchSize + 1, total_batches: Math.ceil(posts.length / batchSize) }, 'Processing batch')

        // Process batch with delay between each post
        for (const post of batch) {
          try {
            await this.processPost(post)
            processed++
            logger.info({ postId: post.id, progress: `${processed}/${posts.length}` }, 'Successfully processed post')
            
            // Small delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 1000))
          } catch (error) {
            errors++
            logger.error({ 
              postId: post.id, 
              postTextLength: post.post_text?.length,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined
            }, 'Failed to process post - detailed error')
          }
        }

        // Longer delay between batches
        if (i + batchSize < posts.length) {
          logger.info('Waiting between batches...')
          await new Promise(resolve => setTimeout(resolve, 5000))
        }
      }

      logger.info({ processed, errors, total: posts.length }, 'Completed embedding population')

      // Update performance tiers after all embeddings are created
      await this.updatePerformanceTiers()
      
      logger.info('Post embedding population completed successfully')
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to populate embeddings')
      throw error
    }
  }

  /**
   * Get Andrew's posts from the connection_posts table
   */
  private async getAndrewsPosts(): Promise<PostToEmbed[]> {
    try {
      const { data: posts, error } = await supabaseService['client']
        .from('connection_posts')
        .select(`
          id,
          post_text,
          total_reactions,
          like_count,
          comments_count,
          reposts,
          shares,
          posted_date
        `)
        .eq('username', 'andrewtallents')
        .not('post_text', 'is', null)
        .not('post_text', 'eq', '')
        .order('posted_date', { ascending: false })

      if (error) {
        throw error
      }

      return (posts || []).map(post => ({
        id: post.id,
        post_text: post.post_text || '',
        total_reactions: post.total_reactions || 0,
        like_count: post.like_count || 0,
        comments_count: post.comments_count || 0,
        reposts: post.reposts || 0,
        shares: post.shares || 0,
        posted_date: post.posted_date
      }))
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to fetch Andrew\'s posts')
      throw error
    }
  }

  /**
   * Process a single post and create embedding
   */
  private async processPost(post: PostToEmbed): Promise<void> {
    try {
      // Skip very short posts (likely not content posts)
      if (post.post_text.length < 50) {
        logger.debug({ postId: post.id }, 'Skipping short post')
        return
      }

      // Prepare performance metrics
      const performanceMetrics = {
        total_reactions: post.total_reactions,
        like_count: post.like_count,
        comments_count: post.comments_count,
        reposts_count: post.reposts,
        shares_count: post.shares,
        posted_date: new Date(post.posted_date)
      }

      // Store the embedding
      await vectorSimilarityService.storePostEmbedding(
        post.id,
        post.post_text,
        performanceMetrics
      )
    } catch (error) {
      logger.error({ 
        postId: post.id, 
        error: error instanceof Error ? error.message : String(error) 
      }, 'Failed to process individual post')
      throw error
    }
  }

  /**
   * Update performance tiers for all posts
   */
  private async updatePerformanceTiers(): Promise<void> {
    try {
      logger.info('Updating performance tiers')
      
      const { error } = await supabaseService['client']
        .rpc('update_performance_tiers')

      if (error) {
        throw error
      }

      logger.info('Performance tiers updated successfully')
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to update performance tiers')
      throw error
    }
  }

  /**
   * Get statistics about the embeddings database
   */
  async getEmbeddingsStats(): Promise<any> {
    try {
      const { data: stats, error } = await supabaseService['client']
        .from('post_embeddings')
        .select('performance_tier')
        .then(result => {
          if (result.error) throw result.error
          
          const tiers = result.data.reduce((acc: any, row: any) => {
            acc[row.performance_tier] = (acc[row.performance_tier] || 0) + 1
            return acc
          }, {})

          return { data: tiers, error: null }
        })

      if (error) {
        throw error
      }

      const { data: total, error: countError } = await supabaseService['client']
        .from('post_embeddings')
        .select('id', { count: 'exact' })

      if (countError) {
        throw countError
      }

      return {
        total_posts: total?.length || 0,
        performance_tiers: stats,
        ready_for_similarity_search: (total?.length || 0) > 0
      }
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to get embeddings stats')
      throw error
    }
  }
}

export const embeddingsPopulatorService = new EmbeddingsPopulatorService()