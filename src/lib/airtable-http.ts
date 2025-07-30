// Direct HTTP client for Airtable API - bypasses SDK AbortSignal issues
export interface ConnectionRecord {
  id: string;
  fields: {
    'Full Name'?: string;
    'First Name'?: string;
    'Last Name'?: string;
    'Headline'?: string;
    'Username'?: string;
    'Profile Picture URL'?: string;
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