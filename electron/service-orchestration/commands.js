import {
  serviceCommands,
  globalSettings,
  servicePorts,
  loadServiceCommands,
  loadServicePorts,
} from './config/microservice-config.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Commands');

// Service Command Configuration Management - Get and reload commands

export async function handleGetServiceCommands() {
  return {
    success: true,
    commands: serviceCommands,
    globalSettings: globalSettings
  };
}

export async function handleReloadServiceCommands() {
  try {
    logger.info('[RELOAD-SERVICE-COMMANDS] Reloading service commands and ports from YAML files...');

    // Reload from files
    loadServiceCommands();
    loadServicePorts();

    logger.info('[RELOAD-SERVICE-COMMANDS] Service commands and ports reloaded successfully');
    logger.info('[RELOAD-SERVICE-COMMANDS] Available services:', Object.keys(serviceCommands));
    logger.info('[RELOAD-SERVICE-COMMANDS] Available ports:', servicePorts);

    return {
      success: true,
      message: 'Service commands and ports reloaded successfully',
      commands: serviceCommands,
      ports: servicePorts
    };
  } catch (error) {
    logger.error('[RELOAD-SERVICE-COMMANDS] Failed to reload service commands:', error);
    return {
      success: false,
      error: error.message || 'Failed to reload service commands'
    };
  }
}