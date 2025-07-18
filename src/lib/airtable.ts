import Airtable from 'airtable'
import { z } from 'zod'

// Airtable record schemas
export const ContentPostSchema = z.object({
  id: z.string().optional(),
  fields: z.object({
    'Post ID': z.string().optional(),
    'Content': z.string(),
    'Post Type': z.enum(['Thought Leadership', 'Tips', 'Story', 'Question', 'Announcement']).optional(),
    'Status': z.enum(['Draft', 'Review', 'Approved', 'Published']).optional(),
    'Hashtags': z.array(z.string()).optional(),
    'Scheduled Date': z.string().optional(),
    'Created By': z.enum(['Andrew', 'Erska', 'AI Assistant']).optional(),
    'Views': z.number().optional(),
    'Likes': z.number().optional(),
    'Comments': z.number().optional(),
    'Created': z.string().optional(),
  })
})

export type ContentPost = z.infer<typeof ContentPostSchema>

// Airtable client
export class AirtableClient {
  private base: Airtable.Base
  private tableId: string

  constructor(apiKey: string, baseId: string, tableId: string) {
    Airtable.configure({
      endpointUrl: 'https://api.airtable.com',
      apiKey: apiKey
    })
    this.base = Airtable.base(baseId)
    this.tableId = tableId
  }

  // Content Posts operations
  async getContentPosts(
    options: {
      maxRecords?: number
      filterByFormula?: string
      sort?: Array<{field: string, direction: 'asc' | 'desc'}>
    } = {}
  ): Promise<ContentPost[]> {
    try {
      const selectOptions: any = {
        maxRecords: options.maxRecords || 100,
      }
      
      if (options.filterByFormula) {
        selectOptions.filterByFormula = options.filterByFormula
      }
      
      if (options.sort) {
        selectOptions.sort = options.sort
      }
      
      const records = await this.base(this.tableId).select(selectOptions).all()

      return records.map(record => ({
        id: record.id,
        fields: record.fields as ContentPost['fields']
      }))
    } catch (error) {
      console.error('Error fetching content posts:', error)
      throw error
    }
  }

  async createContentPost(fields: ContentPost['fields']): Promise<ContentPost> {
    try {
      const record = await this.base(this.tableId).create(fields)
      return {
        id: record.id,
        fields: record.fields as ContentPost['fields']
      }
    } catch (error) {
      console.error('Error creating content post:', error)
      throw error
    }
  }

  async updateContentPost(id: string, fields: Partial<ContentPost['fields']>): Promise<ContentPost> {
    try {
      const record = await this.base(this.tableId).update(id, fields)
      return {
        id: record.id,
        fields: record.fields as ContentPost['fields']
      }
    } catch (error) {
      console.error('Error updating content post:', error)
      throw error
    }
  }

  async deleteContentPost(id: string): Promise<void> {
    try {
      await this.base(this.tableId).destroy(id)
    } catch (error) {
      console.error('Error deleting content post:', error)
      throw error
    }
  }

  // Get posts by status
  async getPostsByStatus(status: 'Draft' | 'Review' | 'Approved' | 'Published'): Promise<ContentPost[]> {
    return this.getContentPosts({
      filterByFormula: `{Status} = "${status}"`,
      sort: [{ field: 'Created', direction: 'desc' }]
    })
  }

  // Get recent posts
  async getRecentPosts(limit: number = 10): Promise<ContentPost[]> {
    return this.getContentPosts({
      maxRecords: limit,
      sort: [{ field: 'Created', direction: 'desc' }]
    })
  }

  // Get scheduled posts
  async getScheduledPosts(): Promise<ContentPost[]> {
    return this.getContentPosts({
      filterByFormula: `AND({Status} = "Approved", {Scheduled Date} != "")`,
      sort: [{ field: 'Scheduled Date', direction: 'asc' }]
    })
  }

  // Get posts for calendar view
  async getPostsForCalendar(): Promise<ContentPost[]> {
    return this.getContentPosts({
      filterByFormula: `{Scheduled Date} != ""`,
      sort: [{ field: 'Scheduled Date', direction: 'asc' }]
    })
  }

  // Analytics helpers
  async getPostStats(): Promise<{
    total: number
    published: number
    drafts: number
    pending: number
  }> {
    const allPosts = await this.getContentPosts()
    
    return {
      total: allPosts.length,
      published: allPosts.filter(post => post.fields.Status === 'Published').length,
      drafts: allPosts.filter(post => post.fields.Status === 'Draft').length,
      pending: allPosts.filter(post => post.fields.Status === 'Review').length,
    }
  }
}

// Utility functions
export const createAirtableClient = (
  apiKey?: string,
  baseId?: string,
  tableId?: string
) => {
  const key = apiKey || process.env.AIRTABLE_API_KEY
  const base = baseId || process.env.AIRTABLE_BASE_ID
  const table = tableId || process.env.AIRTABLE_TABLE_ID

  if (!key || !base || !table) {
    throw new Error('Airtable API key, base ID, and table ID are required')
  }

  return new AirtableClient(key, base, table)
}