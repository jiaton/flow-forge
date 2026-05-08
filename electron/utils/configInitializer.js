/**
 * Configuration Initializer
 *
 * DEPRECATED: This file is kept for backward compatibility only.
 * New code should use configManager.js instead.
 *
 * The centralized ConfigManager now handles:
 * - Path resolution
 * - Template initialization
 * - Layered configuration loading
 *
 * @deprecated Use configManager.js instead
 */

import { configManager } from './configManager.js';
import { createLogger } from './logger.js';

const logger = createLogger('ConfigInit');

/**
 * Initialize config files in user data directory on first launch
 *
 * @deprecated Use configManager.initialize() instead
 */
export async function initializeConfigFiles() {
  logger.info('[ConfigInit] Initializing config files (delegating to ConfigManager)...');
  await configManager.initialize();
  logger.info('[ConfigInit] ✓ Config initialization complete');
}
