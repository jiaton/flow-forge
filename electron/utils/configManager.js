/**
 * Centralized Configuration Manager
 *
 * Implements a layered configuration system with three tiers:
 * 1. BUNDLED TEMPLATES (in app bundle, read-only) - Shipped with the app
 * 2. USER CONFIG (macOS user directory, read-write) - User's runtime configuration
 * 3. DEV CONFIG (project directory, gitignored) - Developer's local settings
 *
 * Resolution Strategy:
 * - Development: Use project config/ → fallback to config.templates/
 * - Production: Use user config → fallback to bundled templates
 *
 * Features:
 * - Smart first-run initialization (copies templates to user directory)
 * - Never overwrites existing user configs
 * - Layered fallback for missing files
 * - Environment-aware path resolution
 */

import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { APP_DIRS, CONFIG_DIRS } from '../constants.js';

// Lazy logger - only create when needed to avoid circular dependencies
let logger = null;
const getLogger = async () => {
  if (!logger) {
    // Use dynamic import instead of require for ES modules
    const { createLogger } = await import('./logger.js');
    logger = createLogger('ConfigManager');
  }
  return logger;
};

export class ConfigManager {
  constructor() {
    this.initialized = false;
    this.pathsInitialized = false;
    // Don't access app.isPackaged here - defer until initialize() is called
  }

  /**
   * Initialize all configuration paths based on environment
   */
  async initializePaths() {
    if (this.pathsInitialized) return;

    this.isDev = !app.isPackaged;
    const log = await getLogger();

    if (this.isDev) {
      this.projectRoot = process.cwd();
      this.userConfigDir = path.join(this.projectRoot, APP_DIRS.CONFIG);
      this.templatesDir = path.join(this.projectRoot, CONFIG_DIRS.TEMPLATES);

      log.info('[ConfigManager] Running in DEVELOPMENT mode');
      log.info(`  Project root: ${this.projectRoot}`);
      log.info(`  User config: ${this.userConfigDir}`);
      log.info(`  Templates: ${this.templatesDir}`);
    } else {
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      const flowforgeDir = path.join(homeDir, APP_DIRS.HOME_DIR);
      this.userConfigDir = path.join(flowforgeDir, APP_DIRS.CONFIG);
      this.templatesDir = path.join(process.resourcesPath, CONFIG_DIRS.TEMPLATES);

      log.info('[ConfigManager] Running in PRODUCTION mode');
      log.info(`  User config: ${this.userConfigDir}`);
      log.info(`  Bundled templates: ${this.templatesDir}`);
    }

    this.pathsInitialized = true;
  }

  /**
   * Initialize configuration system
   * - Creates user config directory if needed
   * - Copies templates on first run
   * - Never overwrites existing user configs
   */
  async initialize() {
    if (this.initialized) {
      const log = await getLogger();
      log.debug('ConfigManager already initialized');
      return;
    }

    // Initialize paths first
    await this.initializePaths();

    const log = await getLogger();
    log.info('[ConfigManager] Initializing configuration system...');

    // Create user config directory if it doesn't exist
    if (!fs.existsSync(this.userConfigDir)) {
      log.info(`Creating user config directory: ${this.userConfigDir}`);
      fs.mkdirSync(this.userConfigDir, { recursive: true });
    }

    // In production, only copy docs and config.examples (reference material).
    // Config files are set up via UI (remote clone or "try examples").
    if (!this.isDev) {
      await this.initializeReferenceDocs();
    }

    this.initialized = true;
    log.info('[ConfigManager] ✓ Configuration system initialized');
  }

  /**
   * Copy only reference docs (docs/ and config.examples/) — runs every launch.
   */
  async initializeReferenceDocs() {
    const log = await getLogger();

    // Copy docs directory (reference for AI agents and users)
    const userDocsDir = path.join(this.userConfigDir, 'docs');
    const templateDocsDir = path.join(this.templatesDir, 'docs');

    if (fs.existsSync(templateDocsDir)) {
      this.copyDirectoryRecursive(templateDocsDir, userDocsDir);
      log.info(`✓ Updated docs/ from templates`);
    }

    // Copy full templates to config.examples/ as reference (always overwrite)
    const examplesDir = path.join(this.userConfigDir, '..', APP_DIRS.CONFIG_EXAMPLES);
    this.copyDirectoryRecursive(this.templatesDir, examplesDir);
    log.info(`✓ Updated config.examples/ from templates`);
  }

  /**
   * Copy templates to user config directory (called on demand from UI "Try examples")
   * Only runs in production mode on first run
   */
  async initializeUserConfigFromTemplates() {
    const log = await getLogger();
    const templateFiles = [
      'app.config.yaml',
      'team-presets.yaml',
      'global-settings.yaml'
    ];

    for (const filename of templateFiles) {
      const userFilePath = path.join(this.userConfigDir, filename);
      const templateFilePath = path.join(this.templatesDir, filename);

      // Only copy if user file doesn't exist
      if (!fs.existsSync(userFilePath)) {
        if (fs.existsSync(templateFilePath)) {
          log.info(`✓ Creating ${filename} from template`);
          fs.copyFileSync(templateFilePath, userFilePath);
        } else {
          log.warn(`⚠ Template file not found: ${templateFilePath}`);
        }
      } else {
        log.debug(`${filename} already exists, skipping`);
      }
    }

    // Copy services directory structure from templates if it doesn't exist
    const userServicesDir = path.join(this.userConfigDir, 'services');
    const templateServicesDir = path.join(this.templatesDir, 'services');

    if (!fs.existsSync(userServicesDir)) {
      if (fs.existsSync(templateServicesDir)) {
        log.info(`✓ Creating services/ directory from templates`);
        this.copyDirectoryRecursive(templateServicesDir, userServicesDir);
      } else {
        log.warn(`⚠ Template services directory not found: ${templateServicesDir}`);
      }
    } else {
      log.debug('services/ directory already exists, skipping');
    }
  }

  /**
   * Recursively copy directory
   * @param {string} src - Source directory
   * @param {string} dest - Destination directory
   */
  copyDirectoryRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectoryRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Resolve configuration file path with layered fallback
   *
   * Strategy:
   * - Try user config first
   * - Fall back to templates if file doesn't exist
   * - Throw error if neither exists
   *
   * @param {string} filename - Config filename (e.g., 'app.config.yaml')
   * @returns {string} Absolute path to config file
   */
  resolveConfigPath(filename) {
    // Ensure paths are initialized (sync version for compatibility)
    if (!this.pathsInitialized) {
      // Sync initialization for resolveConfigPath
      this.isDev = !app.isPackaged;
      
      if (this.isDev) {
        this.projectRoot = process.cwd();
        this.userConfigDir = path.join(this.projectRoot, APP_DIRS.CONFIG);
        this.templatesDir = path.join(this.projectRoot, CONFIG_DIRS.TEMPLATES);
      } else {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        this.userConfigDir = path.join(homeDir, APP_DIRS.HOME_DIR, APP_DIRS.CONFIG);
        this.templatesDir = path.join(process.resourcesPath, CONFIG_DIRS.TEMPLATES);
      }
      
      this.pathsInitialized = true;
    }

    // If it's already an absolute path, use it as-is
    if (path.isAbsolute(filename)) {
      return filename;
    }

    const userConfigPath = path.join(this.userConfigDir, filename);
    const templatePath = path.join(this.templatesDir, filename);

    // Try user config first
    if (fs.existsSync(userConfigPath)) {
      return userConfigPath;
    }

    // Fall back to template
    if (fs.existsSync(templatePath)) {
      return templatePath;
    }

    // Neither exists - throw error
    console.error(`Config file not found: ${filename}`);
    console.error(`  Tried user config: ${userConfigPath}`);
    console.error(`  Tried template: ${templatePath}`);
    throw new Error(`Configuration file not found: ${filename}`);
  }

  /**
   * Get user config directory path
   * @returns {string} Absolute path to user config directory
   */
  getUserConfigDir() {
    if (!this.pathsInitialized) {
      this.resolveConfigPath('_dummy'); // Trigger sync init
    }
    return this.userConfigDir;
  }

  /**
   * Get templates directory path
   * @returns {string} Absolute path to templates directory
   */
  getTemplatesDir() {
    if (!this.pathsInitialized) {
      this.resolveConfigPath('_dummy'); // Trigger sync init
    }
    return this.templatesDir;
  }

  /**
   * Check if running in development mode
   * @returns {boolean} True if development mode
   */
  isDevelopment() {
    return !app.isPackaged;
  }

  /**
   * Check if running in production mode
   * @returns {boolean} True if production mode
   */
  isProduction() {
    return app.isPackaged;
  }

  /**
   * Check if a config file exists in user directory
   * @param {string} filename - Config filename
   * @returns {boolean} True if file exists
   */
  userConfigExists(filename) {
    if (!this.pathsInitialized) {
      this.resolveConfigPath('_dummy'); // Trigger sync init
    }
    const filePath = path.join(this.userConfigDir, filename);
    return fs.existsSync(filePath);
  }

  /**
   * Reset a config file to template default
   * Copies template over user config
   *
   * @param {string} filename - Config filename to reset
   */
  async resetToTemplate(filename) {
    if (!this.pathsInitialized) {
      await this.initializePaths();
    }

    const log = await getLogger();
    const userConfigPath = path.join(this.userConfigDir, filename);
    const templatePath = path.join(this.templatesDir, filename);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${filename}`);
    }

    log.info(`Resetting ${filename} to template default`);
    fs.copyFileSync(templatePath, userConfigPath);
  }

  /**
   * Open user config directory in file manager
   * Platform-specific implementation
   */
  async openConfigDirectory() {
    if (!this.pathsInitialized) {
      await this.initializePaths();
    }
    const { shell } = await import('electron');
    await shell.openPath(this.userConfigDir);
  }
}

// Export singleton instance
const _configManagerInstance = new ConfigManager();
export const configManager = _configManagerInstance;

/**
 * Legacy compatibility wrapper for resolveConfigPath
 * Maintains backward compatibility with existing code
 *
 * @param {string} filename - Config filename
 * @returns {string} Absolute path to config file
 */
export const resolveConfigPath = (filename) => {
  return configManager.resolveConfigPath(filename);
};
