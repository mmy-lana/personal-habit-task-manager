import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema/index.js';

export function createDatabaseClient(connectionString: string): NeonHttpDatabase<typeof schema> {
  const sql: NeonQueryFunction<boolean, boolean> = neon(connectionString);
  return drizzle(sql, { schema });
}

export type DatabaseClient = NeonHttpDatabase<typeof schema>;
