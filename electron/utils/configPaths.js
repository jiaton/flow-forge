/**
 * Configuration Path Resolution
 *
 * DEPRECATED: This file is kept for backward compatibility only.
 * New code should use configManager.js instead.
 *
 * @deprecated Use configManager.resolveConfigPath() instead
 */

import { configManager } from './configManager.js';

/**
 * Resolve configuration file path based on environment
 *
 * @deprecated Use configManager.resolveConfigPath() instead
 * @param {string} filename - Config filename (e.g., 'app.config.yaml')
 * @returns {string} Absolute path to config file
 */
export const resolveConfigPath = (filename) => {
  return configManager.resolveConfigPath(filename);
};
