/**
 * Routine-related Drizzle schemas
 * Tables: routine_schedules
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Routine schedules/preferences — user-configurable via UI
export const routineSchedules = sqliteTable('routine_schedules', {
  routineId: text('routine_id').primaryKey(),
  cronExpression: text('cron_expression'),
  enabled: integer('enabled').default(1),
  notify: integer('notify').default(1),
  lastRunAt: text('last_run_at'),
  lastRunStatus: text('last_run_status'), // 'success' | 'partial' | 'failed'
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_routine_schedules_enabled').on(table.enabled),
]);

// Routine run history — one row per execution (manual or cron)
export const routineRuns = sqliteTable('routine_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  routineId: text('routine_id').notNull(),
  trigger: text('trigger').notNull(), // 'manual' | 'cron'
  status: text('status').notNull(), // 'running' | 'success' | 'failed'
  logFile: text('log_file'),
  startedAt: text('started_at').notNull(),
  finishedAt: text('finished_at'),
}, (table) => [
  index('idx_routine_runs_routine').on(table.routineId),
]);
