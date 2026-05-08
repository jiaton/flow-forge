/**
 * App-related Drizzle schemas
 * Tables: app_settings, team_configs, view_states
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// App settings table - stores global app configuration
export const appSettings = sqliteTable('app_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_app_settings_key').on(table.key),
]);

// Team configurations table - stores team-specific configs
export const teamConfigs = sqliteTable('team_configs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  team: text('team').notNull().unique(),
  config: text('config').notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_team_configs_team').on(table.team),
]);

// View states table - persists view-specific state
export const viewStates = sqliteTable('view_states', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  viewId: text('view_id').notNull().unique(),
  state: text('state').notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_view_states_view_id').on(table.viewId),
]);

// Notifications table - stores notification history
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  message: text('message').notNull(),
  type: text('type').notNull(),
  timestamp: integer('timestamp').notNull(),
  dismissed: integer('dismissed').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_notifications_timestamp').on(table.timestamp),
  index('idx_notifications_dismissed').on(table.dismissed),
]);
