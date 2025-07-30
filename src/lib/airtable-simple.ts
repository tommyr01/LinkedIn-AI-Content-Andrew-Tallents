// Simplified Airtable integration matching the working project pattern
import Airtable from 'airtable';

// Configure Airtable connection
const apiKey = process.env.AIRTABLE_API_KEY!;
const baseId = process.env.AIRTABLE_BASE_ID!;

// Create a configured Airtable instance
const airtableInstance = new Airtable({ apiKey });
const base = airtableInstance.base(baseId);

// Export the base for direct use
export const airtableBase = base;

// Table IDs - using environment variables
export const tables = {
  connections: process.env.AIRTABLE_CONNECTIONS_TABLE_ID!,
  connectionPosts: process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID || '',
  contentPosts: process.env.AIRTABLE_TABLE_ID || '', // Andrew's Posts table
};

// Simple type definitions for connections
export interface ConnectionRecord {
  id: string;
  fields: {
    'Full Name'?: string;
    'First Name'?: string;
    'Last Name'?: string;
    'Headline'?: string;
    'Username'?: string;
    'Profile Picture About'?: string;
    'Full Location Hashtags'?: string;
    'Is Creator'?: boolean;
    'Is Influencer'?: boolean;
    'Is Premium'?: boolean;
    'Show Follow Background I URN'?: string;
    'Follower Count'?: number;
    'Connection Count'?: number;
    'Current Company Title'?: string;
    'Company Location'?: string;
    'Duration'?: string;
    'Start Date'?: string;
    'Is Current'?: boolean;
    'Company Name'?: string;
    'Current Company ID'?: string;
    [key: string]: any; // Allow other fields
  };
}

// Helper function to get connections
export async function getConnections(maxRecords = 200) {
  try {
    const records = await base(tables.connections)
      .select({
        maxRecords,
        sort: [{ field: 'Full Name', direction: 'asc' }]
      })
      .all();
    
    return records.map(record => ({
      id: record.id,
      fields: record.fields
    })) as ConnectionRecord[];
  } catch (error) {
    console.error('Error fetching connections:', error);
    throw error;
  }
}

// Helper function to create a connection
export async function createConnection(fields: Partial<ConnectionRecord['fields']>) {
  try {
    const record = await base(tables.connections).create(fields);
    return {
      id: record.id,
      fields: record.fields
    } as ConnectionRecord;
  } catch (error) {
    console.error('Error creating connection:', error);
    throw error;
  }
}

// Helper function to update a connection
export async function updateConnection(id: string, fields: Partial<ConnectionRecord['fields']>) {
  try {
    const record = await base(tables.connections).update(id, fields);
    return {
      id: record.id,
      fields: record.fields
    } as ConnectionRecord;
  } catch (error) {
    console.error('Error updating connection:', error);
    throw error;
  }
}

// Helper function to delete a connection
export async function deleteConnection(id: string) {
  try {
    await base(tables.connections).destroy(id);
    return true;
  } catch (error) {
    console.error('Error deleting connection:', error);
    throw error;
  }
}