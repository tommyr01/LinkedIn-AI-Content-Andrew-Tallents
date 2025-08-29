#!/usr/bin/env python3
from supabase_utils import SupabaseClient
import json

def main():
    # Initialize client using config file
    client = SupabaseClient(config_file='supabase_config.json')
    
    # List all tables
    print("Listing all tables in the database:")
    tables = client.list_tables()
    print(json.dumps(tables, indent=2))
    
    # Optionally, get schema for a specific table
    if tables:
        sample_table = tables[0]
        print(f"\nGetting schema for table '{sample_table}':")
        try:
            schema = client.get_table_schema(sample_table)
            print(json.dumps(schema, indent=2))
        except Exception as e:
            print(f"Error getting schema: {str(e)}")
    
    # Optionally, query data from a table (using anon key for safety)
    if tables:
        sample_table = tables[0]
        print(f"\nQuerying data from table '{sample_table}' (limited to 5 rows):")
        try:
            data = client.query_table(sample_table, limit=5, use_service_role=False)
            print(json.dumps(data, indent=2))
        except Exception as e:
            print(f"Error querying data: {str(e)}")

if __name__ == "__main__":
    main()
