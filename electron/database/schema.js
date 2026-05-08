/**
 * Database schema initialization for FlowForge
 *
 * Strategy: version-check + drop-and-recreate (NO migrations).
 * The DB stores only disposable user preferences. On schema mismatch
 * the DB file is deleted and recreated from the current Drizzle schema.
 * Bump SCHEMA_VERSION in schema/meta.js whenever any table changes.
 */

import { sql } from 'drizzle-orm';
import { createLogger } from '../utils/logger.js';
import { appSettings, schemaInfo, SCHEMA_VERSION } from './schema/index.js';

const logger = createLogger('DBSchema');

/**
 * Read the stored schema version from the database.
 * Returns null if the table doesn't exist or has no row.
 */
export const getStoredSchemaVersion = (sqliteDb) => {
  try {
    const row = sqliteDb.prepare('SELECT version FROM schema_info WHERE id = 1').get();
    return row ? row.version : null;
  } catch {
    // Table doesn't exist yet
    return null;
  }
};

/**
 * Check if the database schema is current.
 * Returns true if the stored version matches SCHEMA_VERSION.
 */
export const isSchemaUpToDate = (sqliteDb) => {
  return getStoredSchemaVersion(sqliteDb) === SCHEMA_VERSION;
};

/**
 * Create all tables using Drizzle's schema-push approach.
 * Reads the Drizzle schema definitions and generates CREATE TABLE statements.
 * No migration files needed.
 */
export const createTables = (sqliteDb, drizzleDb) => {
  try {
    // Use Drizzle's db.run with raw SQL generated from schema
    // SQLite CREATE TABLE IF NOT EXISTS is idempotent
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings (key);

      CREATE TABLE IF NOT EXISTS team_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        team TEXT NOT NULL UNIQUE,
        config TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_team_configs_team ON team_configs (team);

      CREATE TABLE IF NOT EXISTS view_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        view_id TEXT NOT NULL UNIQUE,
        state TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_view_states_view_id ON view_states (view_id);

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        dismissed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications (timestamp);
      CREATE INDEX IF NOT EXISTS idx_notifications_dismissed ON notifications (dismissed);

      CREATE TABLE IF NOT EXISTS service_state (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        type TEXT,
        port INTEGER,
        endpoint TEXT,
        team TEXT,
        command TEXT,
        process_type TEXT,
        state TEXT,
        working_dir TEXT,
        detached INTEGER DEFAULT 1,
        start_time TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_service_state_team ON service_state (team);
      CREATE INDEX IF NOT EXISTS idx_service_state_state ON service_state (state);

      CREATE TABLE IF NOT EXISTS detached_services (
        service_id TEXT PRIMARY KEY NOT NULL,
        pid INTEGER NOT NULL,
        command TEXT NOT NULL,
        working_dir TEXT,
        log_file_path TEXT,
        start_time INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_detached_services_pid ON detached_services (pid);

      CREATE TABLE IF NOT EXISTS git_settings (
        id INTEGER PRIMARY KEY NOT NULL,
        provider TEXT DEFAULT 'gitlab',
        git_url TEXT NOT NULL DEFAULT 'https://gitlab.example.com',
        api_url TEXT NOT NULL DEFAULT 'https://gitlab.example.com/api/v4',
        access_token TEXT,
        refresh_interval INTEGER DEFAULT 300,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS merge_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        git_url TEXT NOT NULL,
        project_id TEXT NOT NULL,
        mr_iid TEXT NOT NULL,
        title TEXT,
        description TEXT,
        source_branch TEXT,
        target_branch TEXT,
        status TEXT,
        author TEXT,
        assignee TEXT,
        reviewers TEXT,
        pipeline_status TEXT,
        created_at TEXT,
        updated_at TEXT,
        merged_at TEXT,
        approvals_count INTEGER DEFAULT 0,
        required_approvals INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        changes_count INTEGER,
        web_url TEXT,
        service_name TEXT,
        local_notes TEXT,
        custom_tags TEXT,
        metadata TEXT,
        tracked_since TEXT DEFAULT CURRENT_TIMESTAMP,
        last_fetched TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_merge_requests_status ON merge_requests (status);
      CREATE INDEX IF NOT EXISTS idx_merge_requests_project ON merge_requests (project_id);
      CREATE INDEX IF NOT EXISTS idx_merge_requests_service ON merge_requests (service_name);
      CREATE INDEX IF NOT EXISTS unique_merge_request ON merge_requests (git_url, project_id, mr_iid);

      CREATE TABLE IF NOT EXISTS schema_info (
        id INTEGER PRIMARY KEY NOT NULL,
        version INTEGER NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS routine_schedules (
        routine_id TEXT PRIMARY KEY NOT NULL,
        cron_expression TEXT,
        enabled INTEGER DEFAULT 1,
        notify INTEGER DEFAULT 1,
        last_run_at TEXT,
        last_run_status TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_routine_schedules_enabled ON routine_schedules (enabled);

      CREATE TABLE IF NOT EXISTS routine_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        routine_id TEXT NOT NULL,
        trigger TEXT NOT NULL,
        status TEXT NOT NULL,
        log_file TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_routine_runs_routine ON routine_runs (routine_id);
    `);

    // Write current schema version
    drizzleDb.insert(schemaInfo)
      .values({ id: 1, version: SCHEMA_VERSION })
      .onConflictDoUpdate({ target: schemaInfo.id, set: { version: SCHEMA_VERSION } })
      .run();

    logger.info(`✓ Database tables created (schema v${SCHEMA_VERSION})`);
  } catch (error) {
    logger.error('Failed to create database tables:', error);
    throw error;
  }
};

/**
 * Seed default data
 */
export const seedDefaultData = (drizzleDb) => {
  const defaults = [
    { key: 'sidebarCollapsed', value: JSON.stringify(false) },
    { key: 'selectedTeam', value: JSON.stringify('DEFAULT') },
    { key: 'currentEnvironment', value: JSON.stringify('local') },
    { key: 'currentView', value: JSON.stringify('dashboard') },
  ];

  for (const setting of defaults) {
    drizzleDb.insert(appSettings).values(setting).onConflictDoNothing().run();
  }

  logger.info('✓ Default data seeded');
};
