/**
 * Centralized logging utility using electron-log
 * Provides consistent logging across the application with automatic file output
 * 
 * IMPORTANT: Lazy initialization to avoid accessing electron app before it's ready
 */

import log from 'electron-log';
import path from 'path';
import { APP_DIRS, APP_FILES } from '../constants.js';

let _initialized = false;

// Set safe defaults immediately (before async init)
log.transports.file.level = 'info';
log.transports.console.level = 'info';
log.transports.file.maxSize = 5 * 1024 * 1024;

/**
 * Initialize logger configuration
 * Called automatically on first use, or can be called explicitly
 */
async function initializeLogger() {
  if (_initialized) return;

  // Only access electron app if it's available
  try {
    // Use dynamic import for ES modules
    const electron = await import('electron');
    const { app } = electron;
    
    // Configure log file location
    const isDev = !app.isPackaged;
    let logDir;
    if (isDev) {
      logDir = path.join(process.cwd(), APP_DIRS.LOGS);
    } else {
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      logDir = path.join(homeDir, APP_DIRS.HOME_DIR, APP_DIRS.LOGS);
    }
    log.transports.file.resolvePathFn = () => {
      return path.join(logDir, APP_FILES.LOG);
    };

    // Configure log levels based on environment
    log.transports.file.level = isDev ? 'debug' : 'info';
    log.transports.console.level = 'info';

    // Configure format (keep console/file plain to avoid style transform issues)
    log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
    log.transports.console.useStyles = false;
    log.transports.console.format = '[{h}:{i}:{s}.{ms}] [{level}] {scope} {text}';

    // Max file size: 5MB
    log.transports.file.maxSize = 5 * 1024 * 1024;

    // Catch errors automatically
    log.errorHandler.startCatching({
      showDialog: false,
      onError(error) {
        log.error('Unhandled error:', error);
      }
    });

    _initialized = true;
  } catch (error) {
    // If electron app is not available yet, use console-only logging
    console.warn('[Logger] Electron app not ready, using console-only logging');
    log.transports.file.level = false;
    log.transports.console.level = 'debug';
    _initialized = true;
  }
}

// Export default logger
export default log;

const levelEmoji = {
  warn: '⚠️',
  error: '❌',
};

// Export convenience methods with module prefixing
export const createLogger = (moduleName) => {
  // Lazy initialize on first logger creation (sync for convenience)
  // Note: This means first log might not have file logging configured yet
  // Call initLogger() explicitly in main.js if you need guaranteed initialization
  if (!_initialized) {
    // Start async init but don't wait
    initializeLogger().catch(err => console.error('Failed to init logger:', err));
  }

  return {
    info: (...args) => log.info(`[${moduleName}]`, ...args),
    warn: (...args) => log.warn(levelEmoji.warn, `[${moduleName}]`, ...args),
    error: (...args) => log.error(levelEmoji.error, `[${moduleName}]`, ...args),
    debug: (...args) => log.debug(`[${moduleName}]`, ...args),
    verbose: (...args) => log.verbose(`[${moduleName}]`, ...args),
  };
};

// Export methods to control log levels
export const setLogLevel = (level) => {
  const validLevels = ['error', 'warn', 'info', 'debug', 'verbose'];
  if (!validLevels.includes(level)) {
    log.warn(`Invalid log level: ${level}. Using 'info' instead.`);
    level = 'info';
  }

  log.transports.console.level = level;
  log.transports.file.level = level;
  log.info(`Log level changed to: ${level}`);

  return level;
};

export const getLogLevel = () => {
  return log.transports.console.level;
};

// Export explicit initialize function for app startup
export const initLogger = initializeLogger;
