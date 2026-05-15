import path from 'path';
import { resolveConfigPath } from '../../utils/configPaths.js';
import { CONFIG_FILES } from '../../constants.js';
import { createLogger } from '../../utils/logger.js';
import { createServiceLoader } from './service-loader.js';

const logger = createLogger('ConfigLoader');

// Service command configurations - loaded dynamically from services/ directory
// Type definition available in src/config/teamConfigLoader.ts: ServiceCommandsConfig interface
export let serviceCommands = {};

// Global settings - loaded from YAML file
export let globalSettings = {};

// Service port configurations - extracted from service definitions
export let servicePorts = {};

// Service loader instance
let serviceLoader = null;

/**
 * Load service commands using dynamic service loader
 * Recursively scans config/services/ directory for service definitions
 * Each service must have a 'serviceId' field
 */
export function loadServiceCommands() {
  try {
    // Get config directory (parent of GLOBAL_SETTINGS path)
    const configPath = resolveConfigPath(CONFIG_FILES.GLOBAL_SETTINGS);
    const configDir = path.dirname(configPath);

    logger.debug(`Loading services from directory: ${configDir}`);

    // Initialize service loader
    if (!serviceLoader) {
      serviceLoader = createServiceLoader(configDir);
    }

    // Load all services dynamically
    const config = serviceLoader.load();

    globalSettings = config.globalSettings || {};
    serviceCommands = config.services || {};

    logger.info(`Loaded ${Object.keys(serviceCommands).length} service definitions`);
    logger.debug(`Available services:`, Object.keys(serviceCommands));
    logger.debug(`Global settings loaded:`, Object.keys(globalSettings));

  } catch (error) {
    logger.error('Failed to load service commands:', error);
    serviceCommands = {};
    globalSettings = {};
  }
}

// Load service ports from service definitions
// Ports are extracted from dynamically loaded service configurations
export function loadServicePorts() {
  // Extract ports from already-loaded serviceCommands
  servicePorts = {};

  if (serviceCommands && typeof serviceCommands === 'object') {
    Object.entries(serviceCommands).forEach(([serviceId, serviceConfig]) => {
      if (serviceConfig && serviceConfig.port) {
        servicePorts[serviceId] = serviceConfig.port;
      }
    });
    logger.debug(`Extracted ${Object.keys(servicePorts).length} service ports from service definitions`);
    logger.debug(`Service ports:`, servicePorts);
  } else {
    logger.warn(`No service commands available to extract ports from`);
  }
}

// Initialize service commands and ports on module load
loadServiceCommands();
loadServicePorts();