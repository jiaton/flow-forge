/**
 * Meta schemas for database versioning
 * Tables: schema_info
 */

import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Schema version tracking
export const schemaInfo = sqliteTable('schema_info', {
  id: integer('id').primaryKey(), // Singleton table (id always 1)
  version: integer('version').notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const SCHEMA_VERSION = 3;
