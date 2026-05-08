/**
 * Database initialization and connection management
 * Uses Drizzle ORM with better-sqlite3 for synchronous SQLite operations
 */

// Use createRequire for better-sqlite3 (native module with CJS exports)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

import { drizzle } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { CONFIG_FILES, CONFIG_DIRS, APP_DIRS, APP_FILES } from '../constants.js';
import { createTables, seedDefaultData, isSchemaUpToDate } from './schema.js';
import { createLogger } from '../utils/logger.js';
import * as schema from './schema/index.js';
import { SCHEMA_VERSION } from './schema/meta.js';

const logger = createLogger('Database');

let sqliteDb = null;
let db = null; // Drizzle instance

/**
 * Recursively copy directory
 */
const copyDirectory = (src, dest) => {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

/**
 * Copy example config files to user data directory on first run
 */
const ensureConfigFiles = () => {
  const userDataPath = app.getPath('userData');
  const configDir = path.join(userDataPath, 'config');

  // Ensure config directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Determine source path for config files
  // In production: app.asar/config or extraResources/config
  // In development: project root/config
  const isDev = !app.isPackaged;
  let sourceConfigDir;

  if (isDev) {
    // Development: use project root
    sourceConfigDir = path.join(process.cwd(), 'config');
  } else {
    // Production: try extraResources first, then app.asar
    const resourcesPath = process.resourcesPath;
    const extraResourcesConfig = path.join(resourcesPath, 'config');
    const asarConfig = path.join(resourcesPath, 'app.asar', 'config');

    sourceConfigDir = fs.existsSync(extraResourcesConfig)
      ? extraResourcesConfig
      : asarConfig;
  }

  const examplesDir = path.join(sourceConfigDir, CONFIG_DIRS.TEMPLATES);

  // Copy main config files from examples if they don't exist
  const configFiles = [
    CONFIG_FILES.APP_CONFIG,
    CONFIG_FILES.TEAM_PRESETS,
    CONFIG_FILES.GLOBAL_SETTINGS,
  ];

  configFiles.forEach(filename => {
    const exampleSource = path.join(examplesDir, filename);
    const userConfigPath = path.join(configDir, filename);

    // Only copy if user config doesn't exist (preserve user's config)
    if (!fs.existsSync(userConfigPath) && fs.existsSync(exampleSource)) {
      fs.copyFileSync(exampleSource, userConfigPath);
      logger.info(`✓ Created initial ${filename} from example`);
    }
  });

  // Copy services directory structure from examples if it doesn't exist
  const userServicesDir = path.join(configDir, CONFIG_DIRS.SERVICES);
  const exampleServicesDir = path.join(examplesDir, CONFIG_DIRS.SERVICES);

  if (!fs.existsSync(userServicesDir) && fs.existsSync(exampleServicesDir)) {
    copyDirectory(exampleServicesDir, userServicesDir);
    logger.info(`✓ Created initial services/ directory from examples`);
  }

  logger.debug(`✓ Config files ready in: ${configDir}`);
};

/**
 * Get the database file path
 * Stores the database in the app's user data directory
 */
const getDatabasePath = () => {
  let dbDir;
  if (!app.isPackaged) {
    dbDir = path.join(process.cwd(), APP_DIRS.DATA);
  } else {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    dbDir = path.join(homeDir, APP_DIRS.HOME_DIR, APP_DIRS.DATA);
  }

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return path.join(dbDir, APP_FILES.DATABASE);
};

/**
 * Initialize the database connection and schema.
 * Strategy: version-check + drop-and-recreate (no migrations).
 * If the stored schema version doesn't match the code's SCHEMA_VERSION,
 * the DB file is deleted and recreated from scratch.
 */
export const initializeDatabase = () => {
  if (db) {
    logger.info('Database already initialized');
    return db;
  }

  try {
    ensureConfigFiles();

    const dbPath = getDatabasePath();
    logger.debug(`Initializing database at: ${dbPath}`);

    const openConnection = () => {
      const connection = new Database(dbPath, {
        verbose: !app.isPackaged ? logger.debug : null,
      });
      connection.pragma('foreign_keys = ON');
      connection.pragma('journal_mode = WAL');
      return connection;
    };

    // Check if existing DB needs to be recreated due to schema change
    if (fs.existsSync(dbPath)) {
      try {
        const tempConn = openConnection();
        const upToDate = isSchemaUpToDate(tempConn);
        tempConn.close();

        if (!upToDate) {
          logger.warn(`Schema version mismatch (expected v${SCHEMA_VERSION}), recreating database`);
          fs.rmSync(dbPath, { force: true });
          // Also remove WAL/SHM files
          fs.rmSync(`${dbPath}-wal`, { force: true });
          fs.rmSync(`${dbPath}-shm`, { force: true });
        }
      } catch (checkError) {
        logger.warn('Failed to check schema version, recreating database:', checkError.message);
        fs.rmSync(dbPath, { force: true });
        fs.rmSync(`${dbPath}-wal`, { force: true });
        fs.rmSync(`${dbPath}-shm`, { force: true });
      }
    }

    sqliteDb = openConnection();
    db = drizzle(sqliteDb, { schema });
    createTables(sqliteDb, db);
    seedDefaultData(db);

    logger.info('✓ Database initialized successfully');
    return db;
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
};

/**
 * Get the database instance
 */
export const getDatabase = () => {
  if (!db) {
    return initializeDatabase();
  }
  return db;
};

/**
 * Close the database connection
 */
export const closeDatabase = () => {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
    db = null;
    logger.info('✓ Database connection closed');
  }
};

/**
 * Get the raw SQLite instance (for legacy code)
 */
export const getSqliteDb = () => {
  if (!sqliteDb) {
    initializeDatabase();
  }
  return sqliteDb;
};

/**
 * Export database instances for direct access
 */
export { db, sqliteDb };
