/**
 * Service Orchestration Drizzle schemas
 * Tables: service_state, detached_services
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Service state table - persists service orchestration state
export const serviceState = sqliteTable('service_state', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type'),
  port: integer('port'),
  endpoint: text('endpoint'),
  team: text('team'),
  command: text('command'),
  processType: text('process_type'),
  state: text('state'),
  workingDir: text('working_dir'),
  detached: integer('detached').default(1),
  startTime: text('start_time'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_service_state_team').on(table.team),
  index('idx_service_state_state').on(table.state),
]);

// Detached services table - tracks persistent background services
export const detachedServices = sqliteTable('detached_services', {
  serviceId: text('service_id').primaryKey(),
  pid: integer('pid').notNull(),
  command: text('command').notNull(),
  workingDir: text('working_dir'),
  logFilePath: text('log_file_path'),
  startTime: integer('start_time').notNull(),
  lastSeen: integer('last_seen').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pidIdx: index('idx_detached_services_pid').on(table.pid),
}));
