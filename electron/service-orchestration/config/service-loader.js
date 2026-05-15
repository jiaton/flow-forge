/**
 * Dynamic Service Configuration Loader
 *
 * Features:
 * - Recursively scans config/services/ directory
 * - No hardcoded categories or file names
 * - Services declare their own serviceId
 * - Flexible folder organization (user decides)
 * - Validates service definitions
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { createLogger } from '../../utils/logger.js';
import { validateService, validateGlobalSettings } from '../../schemas/config/index.js';

const logger = createLogger('ServiceLoader');

export class ServiceLoader {
  constructor(configBaseDir) {
    this.configBaseDir = configBaseDir;
    this.servicesDir = path.join(configBaseDir, 'services');
    this.globalSettingsPath = path.join(configBaseDir, 'global-settings.yaml');
  }

  /**
   * Load complete service configuration
   * @returns {{ globalSettings: object, services: object }}
   */
  load() {
    try {
      return {
        globalSettings: this.loadGlobalSettings(),
        services: this.loadServices()
      };
    } catch (error) {
      logger.error('Failed to load service configuration:', error);
      return {
        globalSettings: {},
        services: {}
      };
    }
  }

  /**
   * Load global settings (IDE, terminal, file manager)
   * @returns {object}
   */
  loadGlobalSettings() {
    try {
      if (fs.existsSync(this.globalSettingsPath)) {
        const content = fs.readFileSync(this.globalSettingsPath, 'utf8');
        const settings = yaml.load(content);

        // Validate global settings
        const validation = validateGlobalSettings(settings);
        if (!validation.success) {
          logger.error('Global settings validation failed:', validation.error);
          if (validation.issues) {
            validation.issues.forEach(issue => {
              logger.error(`  - ${issue.path}: ${issue.message}`);
            });
          }
          logger.warn('Using defaults due to validation errors');
          return {};
        }

        logger.debug('Loaded and validated global settings');
        return validation.data;
      }

      logger.warn('Global settings file not found, using defaults');
      return {};
    } catch (error) {
      logger.error('Failed to load global settings:', error);
      return {};
    }
  }

  /**
   * Load all service definitions recursively
   * @returns {object} Map of serviceId -> service config
   */
  loadServices() {
    const services = {};

    if (!fs.existsSync(this.servicesDir)) {
      logger.warn(`Services directory not found: ${this.servicesDir}`);
      return services;
    }

    // Recursively find all YAML files
    const yamlFiles = this.findYamlFilesRecursive(this.servicesDir);
    logger.debug(`Found ${yamlFiles.length} service definition files`);

    // Load each service file
    for (const filePath of yamlFiles) {
      try {
        const service = this.loadServiceFile(filePath);

        if (service && service.serviceId) {
          // Check for duplicate serviceId
          if (services[service.serviceId]) {
            logger.warn(
              `Duplicate serviceId "${service.serviceId}" found in ${filePath}. ` +
              `Previous definition will be overwritten.`
            );
          }

          services[service.serviceId] = service;
          logger.debug(`Loaded service: ${service.serviceId} from ${path.relative(this.configBaseDir, filePath)}`);
        } else {
          logger.warn(`Service file missing 'serviceId' field: ${filePath}`);
        }
      } catch (error) {
        logger.error(`Failed to load service from ${filePath}:`, error.message);
      }
    }

    logger.info(`Loaded ${Object.keys(services).length} service definitions`);
    return services;
  }

  /**
   * Load and validate a single service file
   * @param {string} filePath - Path to service YAML file
   * @returns {object|null} Service configuration
   */
  loadServiceFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const service = yaml.load(content);

    if (!service) {
      return null;
    }

    // Validate service with Zod schema
    const relativePath = path.relative(this.configBaseDir, filePath);
    const validation = validateService(service, relativePath);

    if (!validation.success) {
      const errorMsg = validation.error || 'Service validation failed';
      logger.error(`${errorMsg} in ${relativePath}`);
      if (validation.issues) {
        validation.issues.forEach(issue => {
          logger.error(`  - ${issue.path}: ${issue.message}`);
        });
      }
      throw new Error(errorMsg);
    }

    // Use validated data
    const validatedService = validation.data;

    // Validate serviceId format (alphanumeric, dash, underscore)
    if (!/^[a-zA-Z0-9_-]+$/.test(validatedService.serviceId)) {
      throw new Error(
        `Invalid serviceId "${validatedService.serviceId}". ` +
        `Must contain only alphanumeric characters, dashes, and underscores.`
      );
    }

    // Add file path metadata (useful for debugging)
    validatedService._filePath = relativePath;
    validatedService._category = this.inferCategoryFromPath(filePath);

    return validatedService;
  }

  /**
   * Recursively find all .yaml and .yml files in directory
   * @param {string} dir - Directory to scan
   * @returns {string[]} Array of absolute file paths
   */
  findYamlFilesRecursive(dir) {
    const files = [];

    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);

        // Skip hidden files/directories
        if (item.name.startsWith('.') || item.name.startsWith('_')) {
          continue;
        }

        if (item.isDirectory()) {
          // Recurse into subdirectories
          files.push(...this.findYamlFilesRecursive(fullPath));
        } else if (item.isFile() && /\.(yaml|yml)$/i.test(item.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      logger.error(`Failed to read directory ${dir}:`, error.message);
    }

    return files;
  }

  /**
   * Infer service category from file path (for UI grouping)
   * Examples:
   *   services/backend/service-a.yaml -> "backend"
   *   services/microservices/service-b.yaml -> "microservices"
   *   services/service-c.yaml -> null
   *
   * @param {string} filePath - Full path to service file
   * @returns {string|null} Category name or null
   */
  inferCategoryFromPath(filePath) {
    const relativePath = path.relative(this.servicesDir, filePath);
    const parts = relativePath.split(path.sep);

    // If file is in a subdirectory, use first directory as category
    return parts.length > 1 ? parts[0] : null;
  }

  /**
   * Get list of all available categories (discovered from folder structure)
   * @returns {string[]} Array of category names
   */
  getAvailableCategories() {
    const categories = new Set();

    try {
      const items = fs.readdirSync(this.servicesDir, { withFileTypes: true });

      for (const item of items) {
        if (item.isDirectory() && !item.name.startsWith('.') && !item.name.startsWith('_')) {
          categories.add(item.name);
        }
      }
    } catch (error) {
      logger.error('Failed to read categories:', error);
    }

    return Array.from(categories).sort();
  }

  /**
   * Reload configuration (useful for hot-reloading)
   * @returns {{ globalSettings: object, services: object }}
   */
  reload() {
    logger.info('Reloading service configuration...');
    return this.load();
  }
}

/**
 * Factory function to create a service loader instance
 * @param {string} configBaseDir - Base configuration directory
 * @returns {ServiceLoader}
 */
export function createServiceLoader(configBaseDir) {
  return new ServiceLoader(configBaseDir);
}
