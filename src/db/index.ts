import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { config } from '../config/index.js';
import * as schema from './schema/index.js';

// Create the neon client
const sql = neon(config.databaseUrl);

// Create the drizzle instance with schema for type-safe queries
export const db = drizzle(sql, { schema });

// Export schema for use in other files
export { schema };

// Export for raw queries if needed
export { sql };

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    await sql`SELECT 1`;
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};
