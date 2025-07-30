// Airtable attachment type
interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  type: string;
  size: number;
}

// Direct HTTP client for Airtable API - bypasses SDK AbortSignal issues
export interface ConnectionRecord {
  id: string;
  fields: {
    'Full Name'?: string;
    'First Name'?: string;
    'Last Name'?: string;
    'Headline'?: string;
    'Username'?: string;
    'Profile Picture URL'?: AirtableAttachment[]; // Attachment field is array
    'About'?: string;
    'Full Location'?: string;
    'Hashtags'?: string;
    'Is Creator'?: boolean;
    'Is Influencer'?: boolean;
    'Is Premium'?: boolean;
    'Show Follower Count'?: boolean;
    'Background Picture URL'?: string;
    'URN'?: string;
    'Follower Count'?: number;
    'Connection Count'?: number;
    'Current Company'?: string;
    'Title'?: string;
    'Company Location'?: string;
    'Duration'?: string;
    'Start Date'?: string;
    'Is Current'?: boolean;
    'Company LinkedIn URL'?: string;
    'Current Company URN'?: string;
    [key: string]: any;
  };
}

export interface ConnectionPostRecord {
  id: string;
  fields: {
    // Connection linking (need to add this field to Airtable)
    'Connection'?: string[]; // Link to Connections table - ADD THIS FIELD TO AIRTABLE
    
    // Post identification
    'Post URN'?: string;
    'Full URN'?: string;
    
    // Dates
    'Posted Date'?: string;
    'Relative Posted'?: string;
    
    // Post details
    'Post Type'?: string;
    'Post Text'?: string;
    'Post URL'?: string;
    
    // Author details
    'Author First Name'?: string;
    'Author Last Name'?: string;
    'Author Headline'?: string;
    'Username'?: string;
    'Author LinkedIn URL'?: string;
    'Author Profile Picture'?: AirtableAttachment[] | string; // Can be attachment array or string
    
    // Engagement metrics
    'Total Reactions'?: number;
    'Likes'?: number;
    'Support'?: number;
    'Love'?: number;
    'Insight'?: number;
    'Celebrate'?: number;
    'Comments Count'?: number;
    'Reposts'?: number;
    
    // Media
    'Media Type'?: string;
    'Media URL'?: string;
    'Media Thumbnail'?: string;
    
    [key: string]: any;
  };
}

// Direct HTTP client for Airtable
export class AirtableHttpClient {
  private apiKey: string;
  private baseId: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.AIRTABLE_API_KEY!;
    this.baseId = process.env.AIRTABLE_BASE_ID!;
    this.baseUrl = `https://api.airtable.com/v0/${this.baseId}`;
    
    if (!this.apiKey || !this.baseId) {
      throw new Error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID');
    }
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async getConnections(maxRecords = 200): Promise<ConnectionRecord[]> {
    const tableId = process.env.AIRTABLE_CONNECTIONS_TABLE_ID!;
    
    if (!tableId) {
      throw new Error('Missing AIRTABLE_CONNECTIONS_TABLE_ID');
    }

    try {
      const url = `${this.baseUrl}/${tableId}?maxRecords=${maxRecords}&sort%5B0%5D%5Bfield%5D=Full%20Name&sort%5B0%5D%5Bdirection%5D=asc`;
      
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Airtable API error:', response.status, errorText);
        throw new Error(`Airtable API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      console.log('Raw Airtable response:', {
        recordCount: data.records?.length || 0,
        hasRecords: !!data.records,
        firstRecordFields: data.records?.[0]?.fields ? Object.keys(data.records[0].fields) : []
      });

      return data.records || [];
    } catch (error) {
      console.error('Error fetching connections via HTTP:', error);
      throw error;
    }
  }

  async createConnection(fields: Partial<ConnectionRecord['fields']>): Promise<ConnectionRecord> {
    const tableId = process.env.AIRTABLE_CONNECTIONS_TABLE_ID!;
    
    if (!tableId) {
      throw new Error('Missing AIRTABLE_CONNECTIONS_TABLE_ID');
    }

    try {
      const url = `${this.baseUrl}/${tableId}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          fields
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Airtable create error:', response.status, errorText);
        throw new Error(`Airtable create error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating connection via HTTP:', error);
      throw error;
    }
  }

  async createConnectionPost(fields: Partial<ConnectionPostRecord['fields']>): Promise<ConnectionPostRecord> {
    const tableId = process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID!;
    
    if (!tableId) {
      throw new Error('Missing AIRTABLE_CONNECTION_POSTS_TABLE_ID');
    }

    try {
      const url = `${this.baseUrl}/${tableId}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          fields
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Airtable create post error:', response.status, errorText);
        throw new Error(`Airtable create post error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating connection post via HTTP:', error);
      throw error;
    }
  }

  async createConnectionPosts(posts: Partial<ConnectionPostRecord['fields']>[]): Promise<ConnectionPostRecord[]> {
    const tableId = process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID!;
    
    if (!tableId) {
      throw new Error('Missing AIRTABLE_CONNECTION_POSTS_TABLE_ID');
    }

    if (posts.length === 0) {
      return [];
    }

    try {
      const url = `${this.baseUrl}/${tableId}`;
      
      // Airtable batch create supports up to 10 records at a time
      const batchSize = 10;
      const allResults: ConnectionPostRecord[] = [];
      
      for (let i = 0; i < posts.length; i += batchSize) {
        const batch = posts.slice(i, i + batchSize);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            records: batch.map(fields => ({ fields }))
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Airtable batch create posts error:', response.status, errorText);
          throw new Error(`Airtable batch create posts error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        allResults.push(...data.records);
        
        console.log(`Created batch of ${batch.length} posts (${i + batch.length}/${posts.length})`);
        
        // Add a small delay between batches to be respectful to Airtable API
        if (i + batchSize < posts.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      return allResults;
    } catch (error) {
      console.error('Error batch creating connection posts via HTTP:', error);
      throw error;
    }
  }
}

// Helper functions
export async function getConnections(maxRecords = 200): Promise<ConnectionRecord[]> {
  const client = new AirtableHttpClient();
  return client.getConnections(maxRecords);
}

export async function createConnection(fields: Partial<ConnectionRecord['fields']>): Promise<ConnectionRecord> {
  const client = new AirtableHttpClient();
  return client.createConnection(fields);
}

export async function createConnectionPost(fields: Partial<ConnectionPostRecord['fields']>): Promise<ConnectionPostRecord> {
  const client = new AirtableHttpClient();
  return client.createConnectionPost(fields);
}

export async function createConnectionPosts(posts: Partial<ConnectionPostRecord['fields']>[]): Promise<ConnectionPostRecord[]> {
  const client = new AirtableHttpClient();
  return client.createConnectionPosts(posts);
}