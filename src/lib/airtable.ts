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

export const InfluencerSchema = z.object({
  id: z.string().optional(),
  fields: z.object({
    'Full Name': z.string(),
    'Username': z.string(),
    'Profile URL': z.string().optional(),
    'Role': z.string().optional(),
    'Company': z.string().optional(),
    'Priority Rank': z.number().optional(),
    'Last Engaged': z.string().optional(),
    'Status': z.enum(['Active','Paused','Archived']).optional(),
    'Engagement Count': z.number().optional(),
    'Created': z.string().optional(),
  })
})

export const InfluencerPostSchema = z.object({
  id: z.string().optional(),
  fields: z.object({
    'Influencer': z.array(z.string()).optional(), // Link to Influencers table
    'Content': z.string(),
    'Posted At': z.string(),
    'LinkedIn Post ID': z.string().optional(),
    'Likes Count': z.number().optional(),
    'Comments Count': z.number().optional(),
    'Engagement Status': z.enum(['Not Engaged', 'Commented', 'Liked']).optional(),
    'Scraped At': z.string().optional(),
  })
})

export const LeadSchema = z.object({
  id: z.string().optional(),
  fields: z.object({
    'Name': z.string(),
    'Profile URL': z.string(),
    'Role': z.string().optional(),
    'Company': z.string().optional(),
    'Company Size': z.enum(['1-50', '51-200', '201-500', '501-1000', '1000+']).optional(),
    'Tenure Months': z.number().optional(),
    'ICP Score': z.number().optional(),
    'Score Breakdown': z.string().optional(), // JSON string
    'Tags': z.array(z.string()).optional(),
    'Notes': z.string().optional(),
    'Status': z.enum(['New', 'Qualified', 'Engaged', 'Not ICP']).optional(),
    'Research Data': z.string().optional(), // JSON string
    'Created': z.string().optional(),
  })
})

export const GeneratedCommentSchema = z.object({
  id: z.string().optional(),
  fields: z.object({
    'Post': z.array(z.string()).optional(), // Link to InfluencerPosts table
    'Comment Variations': z.string(), // JSON array
    'Selected Comment': z.string().optional(),
    'Posted Status': z.boolean().optional(),
    'Posted At': z.string().optional(),
    'Created': z.string().optional(),
  })
})

export const ConnectionSchema = z.object({
  id: z.string().optional(),
  fields: z.object({
    'Full Name': z.string(),
    'First Name': z.string().optional(),
    'Last Name': z.string().optional(),
    'Headline': z.string().optional(),
    'Username': z.string().optional(),
    'Profile Picture About': z.string().optional(),
    'Full Location Hashtags': z.string().optional(),
    'Is Creator': z.boolean().optional(),
    'Is Influencer': z.boolean().optional(),
    'Is Premium': z.boolean().optional(),
    'Show Follow Background I URN': z.string().optional(),
    'Follower Count': z.number().optional(),
    'Connection Count': z.number().optional(),
    'Current Company Title': z.string().optional(),
    'Company Location': z.string().optional(),
    'Duration': z.string().optional(),
    'Start Date': z.string().optional(),
    'Is Current': z.boolean().optional(),
    'Company Name': z.string().optional(),
    'Current Company ID': z.string().optional(),
  })
})

export type ContentPost = z.infer<typeof ContentPostSchema>
export type Influencer = z.infer<typeof InfluencerSchema>
export type InfluencerPost = z.infer<typeof InfluencerPostSchema>
export type Lead = z.infer<typeof LeadSchema>
export type GeneratedComment = z.infer<typeof GeneratedCommentSchema>
export type Connection = z.infer<typeof ConnectionSchema>

// Airtable client
export class AirtableClient {
  private base: Airtable.Base
  private tables: {
    contentPosts: string
    influencers: string
    influencerPosts: string
    leads: string
    generatedComments: string
    connections: string
  }

  constructor(apiKey: string, baseId: string, tables: {
    contentPosts: string
    influencers: string
    influencerPosts: string
    leads: string
    generatedComments: string
    connections: string
  }) {
    Airtable.configure({
      endpointUrl: 'https://api.airtable.com',
      apiKey: apiKey
    })
    this.base = Airtable.base(baseId)
    this.tables = tables
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
      
      const records = await this.base(this.tables.contentPosts).select(selectOptions).all()

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
      const record = await this.base(this.tables.contentPosts).create(fields)
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
      const record = await this.base(this.tables.contentPosts).update(id, fields)
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
      await this.base(this.tables.contentPosts).destroy(id)
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

  // Influencers operations
  async getInfluencers(
    options: {
      maxRecords?: number
      filterByFormula?: string
      sort?: Array<{field: string, direction: 'asc' | 'desc'}>
    } = {}
  ): Promise<Influencer[]> {
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
      
      const records = await this.base(this.tables.influencers).select(selectOptions).all()

      return records.map(record => ({
        id: record.id,
        fields: record.fields as Influencer['fields']
      }))
    } catch (error) {
      console.error('Error fetching influencers:', error)
      throw error
    }
  }

  async createInfluencer(fields: Influencer['fields']): Promise<Influencer> {
    try {
      const record = await this.base(this.tables.influencers).create(fields)
      return {
        id: record.id,
        fields: record.fields as Influencer['fields']
      }
    } catch (error) {
      console.error('Error creating influencer:', error)
      throw error
    }
  }

  async updateInfluencer(id: string, fields: Partial<Influencer['fields']>): Promise<Influencer> {
    try {
      const record = await this.base(this.tables.influencers).update(id, fields)
      return {
        id: record.id,
        fields: record.fields as Influencer['fields']
      }
    } catch (error) {
      console.error('Error updating influencer:', error)
      throw error
    }
  }

  async deleteInfluencer(id: string): Promise<void> {
    try {
      await this.base(this.tables.influencers).destroy(id)
    } catch (error) {
      console.error('Error deleting influencer:', error)
      throw error
    }
  }

  // Influencer Posts operations
  async getInfluencerPosts(
    options: {
      maxRecords?: number
      filterByFormula?: string
      sort?: Array<{field: string, direction: 'asc' | 'desc'}>
    } = {}
  ): Promise<InfluencerPost[]> {
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
      
      const records = await this.base(this.tables.influencerPosts).select(selectOptions).all()

      return records.map(record => ({
        id: record.id,
        fields: record.fields as InfluencerPost['fields']
      }))
    } catch (error) {
      console.error('Error fetching influencer posts:', error)
      throw error
    }
  }

  async createInfluencerPost(fields: InfluencerPost['fields']): Promise<InfluencerPost> {
    try {
      const record = await this.base(this.tables.influencerPosts).create(fields)
      return {
        id: record.id,
        fields: record.fields as InfluencerPost['fields']
      }
    } catch (error) {
      console.error('Error creating influencer post:', error)
      throw error
    }
  }

  async updateInfluencerPost(id: string, fields: Partial<InfluencerPost['fields']>): Promise<InfluencerPost> {
    try {
      const record = await this.base(this.tables.influencerPosts).update(id, fields)
      return {
        id: record.id,
        fields: record.fields as InfluencerPost['fields']
      }
    } catch (error) {
      console.error('Error updating influencer post:', error)
      throw error
    }
  }

  async getRecentInfluencerPosts(limit: number = 50): Promise<InfluencerPost[]> {
    return this.getInfluencerPosts({
      maxRecords: limit,
      sort: [{ field: 'Posted At', direction: 'desc' }]
    })
  }

  async getUnengagedPosts(): Promise<InfluencerPost[]> {
    return this.getInfluencerPosts({
      filterByFormula: `{Engagement Status} = "Not Engaged"`,
      sort: [{ field: 'Posted At', direction: 'desc' }]
    })
  }

  // Leads operations
  async getLeads(
    options: {
      maxRecords?: number
      filterByFormula?: string
      sort?: Array<{field: string, direction: 'asc' | 'desc'}>
    } = {}
  ): Promise<Lead[]> {
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
      
      const records = await this.base(this.tables.leads).select(selectOptions).all()

      return records.map(record => ({
        id: record.id,
        fields: record.fields as Lead['fields']
      }))
    } catch (error) {
      console.error('Error fetching leads:', error)
      throw error
    }
  }

  async createLead(fields: Lead['fields']): Promise<Lead> {
    try {
      const record = await this.base(this.tables.leads).create(fields)
      return {
        id: record.id,
        fields: record.fields as Lead['fields']
      }
    } catch (error) {
      console.error('Error creating lead:', error)
      throw error
    }
  }

  async updateLead(id: string, fields: Partial<Lead['fields']>): Promise<Lead> {
    try {
      const record = await this.base(this.tables.leads).update(id, fields)
      return {
        id: record.id,
        fields: record.fields as Lead['fields']
      }
    } catch (error) {
      console.error('Error updating lead:', error)
      throw error
    }
  }

  async getHotLeads(minScore: number = 70): Promise<Lead[]> {
    return this.getLeads({
      filterByFormula: `{ICP Score} >= ${minScore}`,
      sort: [{ field: 'ICP Score', direction: 'desc' }]
    })
  }

  async getLeadsByStatus(status: 'New' | 'Qualified' | 'Engaged' | 'Not ICP'): Promise<Lead[]> {
    return this.getLeads({
      filterByFormula: `{Status} = "${status}"`,
      sort: [{ field: 'Created', direction: 'desc' }]
    })
  }

  // Generated Comments operations
  async getGeneratedComments(
    options: {
      maxRecords?: number
      filterByFormula?: string
      sort?: Array<{field: string, direction: 'asc' | 'desc'}>
    } = {}
  ): Promise<GeneratedComment[]> {
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
      
      const records = await this.base(this.tables.generatedComments).select(selectOptions).all()

      return records.map(record => ({
        id: record.id,
        fields: record.fields as GeneratedComment['fields']
      }))
    } catch (error) {
      console.error('Error fetching generated comments:', error)
      throw error
    }
  }

  async createGeneratedComment(fields: GeneratedComment['fields']): Promise<GeneratedComment> {
    try {
      const record = await this.base(this.tables.generatedComments).create(fields)
      return {
        id: record.id,
        fields: record.fields as GeneratedComment['fields']
      }
    } catch (error) {
      console.error('Error creating generated comment:', error)
      throw error
    }
  }

  async updateGeneratedComment(id: string, fields: Partial<GeneratedComment['fields']>): Promise<GeneratedComment> {
    try {
      const record = await this.base(this.tables.generatedComments).update(id, fields)
      return {
        id: record.id,
        fields: record.fields as GeneratedComment['fields']
      }
    } catch (error) {
      console.error('Error updating generated comment:', error)
      throw error
    }
  }

  // Connections operations
  async getConnections(
    options: {
      maxRecords?: number
      filterByFormula?: string
      sort?: Array<{field: string, direction: 'asc' | 'desc'}>
    } = {}
  ): Promise<Connection[]> {
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
      
      const records = await this.base(this.tables.connections).select(selectOptions).all()

      return records.map(record => ({
        id: record.id,
        fields: record.fields as Connection['fields']
      }))
    } catch (error) {
      console.error('Error fetching connections:', error)
      throw error
    }
  }

  async createConnection(fields: Connection['fields']): Promise<Connection> {
    try {
      const record = await this.base(this.tables.connections).create(fields)
      return {
        id: record.id,
        fields: record.fields as Connection['fields']
      }
    } catch (error) {
      console.error('Error creating connection:', error)
      throw error
    }
  }

  async updateConnection(id: string, fields: Partial<Connection['fields']>): Promise<Connection> {
    try {
      const record = await this.base(this.tables.connections).update(id, fields)
      return {
        id: record.id,
        fields: record.fields as Connection['fields']
      }
    } catch (error) {
      console.error('Error updating connection:', error)
      throw error
    }
  }

  async deleteConnection(id: string): Promise<void> {
    try {
      await this.base(this.tables.connections).destroy(id)
    } catch (error) {
      console.error('Error deleting connection:', error)
      throw error
    }
  }

  // Batch operations for performance
  async batchCreateInfluencerPosts(posts: InfluencerPost['fields'][]): Promise<InfluencerPost[]> {
    try {
      const records = await this.base(this.tables.influencerPosts).create(
        posts.map(fields => ({ fields })),
        { typecast: true }
      )
      return records.map(record => ({
        id: record.id,
        fields: record.fields as InfluencerPost['fields']
      }))
    } catch (error) {
      console.error('Error batch creating influencer posts:', error)
      throw error
    }
  }

  async batchUpdateLeads(updates: { id: string, fields: Partial<Lead['fields']> }[]): Promise<Lead[]> {
    try {
      const records = await this.base(this.tables.leads).update(
        updates.map(({ id, fields }) => ({ id, fields })),
        { typecast: true }
      )
      return records.map(record => ({
        id: record.id,
        fields: record.fields as Lead['fields']
      }))
    } catch (error) {
      console.error('Error batch updating leads:', error)
      throw error
    }
  }
}

// Utility functions
export const createAirtableClient = (
  apiKey?: string,
  baseId?: string,
  tableIds?: {
    contentPosts?: string
    influencers?: string
    influencerPosts?: string
    leads?: string
    generatedComments?: string
    connections?: string
  }
) => {
  const key = apiKey || process.env.AIRTABLE_API_KEY
  const base = baseId || process.env.AIRTABLE_BASE_ID
  
  const tables = {
    contentPosts: tableIds?.contentPosts || process.env.AIRTABLE_CONTENT_POSTS_TABLE_ID || process.env.AIRTABLE_TABLE_ID || '',
    influencers: tableIds?.influencers || process.env.AIRTABLE_INFLUENCERS_TABLE_ID || '',
    influencerPosts: tableIds?.influencerPosts || process.env.AIRTABLE_INFLUENCER_POSTS_TABLE_ID || process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID || '',
    leads: tableIds?.leads || process.env.AIRTABLE_LEADS_TABLE_ID || '',
    generatedComments: tableIds?.generatedComments || process.env.AIRTABLE_GENERATED_COMMENTS_TABLE_ID || '',
    connections: tableIds?.connections || process.env.AIRTABLE_CONNECTIONS_TABLE_ID || ''
  }

  if (!key || !base) {
    throw new Error('Airtable API key and base ID are required')
  }

  if (!tables.contentPosts) {
    throw new Error('Content posts table ID is required')
  }

  return new AirtableClient(key, base, tables as any)
}