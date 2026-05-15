/**
 * Configuration Loader
 *
 * Centralized configuration management for FlowForge.
 * Loads and manages app.config.yaml and team-presets.yaml, plus service definitions from config/services/.
 *
 * @module ConfigLoader
 * @example
 * ```ts
 * import { configLoader } from '@/core/config';
 *
 * await configLoader.initialize();
 * const appConfig = configLoader.getAppConfig();
 * const teams = configLoader.getAllTeams();
 * ```
 */

import type {
  AppConfig,
  TeamPresetsConfig,
  ServiceCommandsConfig,
  TeamPreset,
  ServiceDefinition,
  ServiceCommands,
  GlobalSettings,
  TeamMenuItem,
} from './config.types';
import { CONFIG_FILES, ENVIRONMENT_NAMES, type Team } from '../constants';
import { logger } from '../../lib/logger';

const log = logger.namespace('ConfigLoader');

/**
 * Main configuration loader class
 * Singleton pattern for centralized config management
 */
class ConfigLoader {
  private appConfig: AppConfig | null = null;
  private teamConfig: TeamPresetsConfig;
  private serviceCommandsConfig: ServiceCommandsConfig;
  private initialized: boolean = false;

  constructor() {
    // Initialize with default configuration immediately
    this.teamConfig = this.getDefaultTeamConfig();
    this.serviceCommandsConfig = { services: {} };
  }

  /**
   * Initialize all configuration loaders
   * Must be called before using any config methods
   */
  async initialize(): Promise<void> {
    try {
      // Load app configuration
      await this.loadAppConfig();

      // Load team and service configurations
      await this.loadTeamConfig();
      await this.loadServiceCommands();

      this.initialized = true;
      log.info('All configurations loaded successfully');
    } catch (error) {
      log.error('Failed to initialize configurations', error);
      throw error;
    }
  }

  // ============================================================================
  // App Configuration Methods
  // ============================================================================

  /**
   * Load app.config.yaml
   */
  private async loadAppConfig(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.readConfigFile(CONFIG_FILES.APP_CONFIG);
        if (result.success) {
          this.appConfig = result.config;
          log.debug('App configuration loaded from YAML');
        } else {
          log.warn('Failed to load app config', result.error);
          this.appConfig = this.getDefaultAppConfig();
        }
      } else {
        log.debug('Not in Electron environment, using default app config');
        this.appConfig = this.getDefaultAppConfig();
      }
    } catch (error) {
      log.warn('Error loading app config', error);
      this.appConfig = this.getDefaultAppConfig();
    }
  }

  /**
   * Get app configuration
   */
  getAppConfig(): AppConfig {
    if (!this.appConfig || !this.initialized) {
      throw new Error('[ConfigLoader] Configuration not initialized. Call initialize() first.');
    }
    return this.appConfig;
  }

  /**
   * Get environment configuration
   */
  getEnvironmentConfig(envName: string) {
    const config = this.getAppConfig();
    return config.environments[envName] || config.environments.local;
  }

  /**
   * Get other services configuration
   */
  getOtherServices() {
    return this.getAppConfig().otherServices;
  }

  /**
   * Get feature flags
   */
  getFeatureFlags() {
    return this.getAppConfig().features;
  }

  /**
   * Check if running in development mode
   */
  isDevelopment(): boolean {
    return this.getAppConfig().app.environment === ENVIRONMENT_NAMES.DEVELOPMENT;
  }

  /**
   * Check if running in production mode
   */
  isProduction(): boolean {
    return this.getAppConfig().app.environment === ENVIRONMENT_NAMES.PRODUCTION;
  }

  /**
   * Update app configuration
   */
  async updateAppConfig(updates: Partial<AppConfig>): Promise<void> {
    if (!this.appConfig) {
      throw new Error('[ConfigLoader] Configuration not initialized');
    }

    this.appConfig = { ...this.appConfig, ...updates };

    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const result = await window.electronAPI.writeConfigFile(CONFIG_FILES.APP_CONFIG, this.appConfig);
        if (!result.success) {
          log.warn('Failed to save app config', result.error);
        }
      } catch (error) {
        log.warn('Error saving app config', error);
      }
    }
  }

  // ============================================================================
  // Team Configuration Methods
  // ============================================================================

  /**
   * Load team-presets.yaml
   */
  private async loadTeamConfig(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.readConfigFile(CONFIG_FILES.TEAM_PRESETS);
        if (result.success) {
          this.teamConfig = result.config;
          log.debug('Team configuration loaded from YAML');
        } else {
          log.warn('Failed to load team config', result.error);
        }
      } else {
        log.debug('Not in Electron environment, using default team config');
      }
    } catch (error) {
      log.warn('Error loading team config', error);
    }
  }

  /**
   * Get all teams
   */
  getAllTeams(): Record<string, TeamPreset> {
    return this.teamConfig.teams;
  }

  /**
   * Get specific team configuration
   */
  getTeam(teamId: Team): TeamPreset | undefined {
    return this.teamConfig.teams[teamId];
  }

  /**
   * Get base menu items (common across all teams)
   */
  getBaseMenuItems(): TeamMenuItem[] {
    return this.teamConfig.baseMenuItems;
  }

  /**
   * Get team-specific menu items (merged with base items)
   */
  getTeamMenuItems(teamId: Team): TeamMenuItem[] {
    const baseItems = this.getBaseMenuItems();
    const teamConfig = this.getTeam(teamId);
    const teamItems = teamConfig?.menuItems || [];
    return [...baseItems, ...teamItems];
  }

  /**
   * Get preset services for a team
   */
  getTeamPresetServices(teamId: Team): string[] {
    const teamConfig = this.getTeam(teamId);
    return teamConfig?.presetServices || [];
  }

  // ============================================================================
  // Service Configuration Methods
  // ============================================================================

  /**
   * Load service commands from modular services/ directory via backend loader
   */
  private async loadServiceCommands(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getServiceCommands();
        if (result.success) {
          // getServiceCommands returns { success: true, commands: { serviceId: {...}, ... } }
          this.serviceCommandsConfig = {
            services: result.commands || {},
            globalSettings: result.globalSettings
          };
          log.debug('Service commands loaded successfully');

          // Merge services into team config
          if (this.serviceCommandsConfig.services) {
            this.teamConfig.services = this.serviceCommandsConfig.services;
          }
        } else {
          log.warn('Failed to load service commands', result.error);
        }
      }
    } catch (error) {
      log.warn('Error loading service commands', error);
    }
  }

  /**
   * Get all service definitions
   */
  getServices(): Record<string, ServiceDefinition> {
    return this.teamConfig.services || {};
  }

  /**
   * Get specific service definition
   */
  getService(serviceId: string): ServiceDefinition | undefined {
    return this.getServices()[serviceId];
  }

  /**
   * Get service commands
   */
  getServiceCommands(serviceId: string): ServiceCommands | undefined {
    return this.getService(serviceId)?.commands;
  }

  /**
   * Get service path
   */
  getServicePath(serviceId: string): string | undefined {
    return this.getService(serviceId)?.path;
  }

  /**
   * Get global settings (IDE, terminal, file manager)
   */
  getGlobalSettings(): GlobalSettings | undefined {
    return this.serviceCommandsConfig.globalSettings;
  }

  /**
   * Get IDE open command for a service
   */
  getOpenIDECommand(serviceId: string): string | undefined {
    const service = this.getService(serviceId);
    const globalSettings = this.getGlobalSettings();

    if (service?.commands?.openIDE) {
      return service.commands.openIDE;
    }

    if (globalSettings?.ide && service?.path) {
      return `${globalSettings.ide.command} ${service.path}`;
    }

    return undefined;
  }

  /**
   * Get service URL for specific environment
   */
  getServiceEnvironmentUrl(serviceId: string, environment: string): string {
    const service = this.getService(serviceId);
    if (service?.environments && service.environments[environment]) {
      return service.environments[environment];
    }
    return `http://localhost:${service?.port || 8080}`;
  }

  // ============================================================================
  // Reload Methods
  // ============================================================================

  /**
   * Reload all configurations from YAML files
   */
  async reload(): Promise<void> {
    await this.initialize();
  }

  /**
   * Reload only app configuration
   */
  async reloadAppConfig(): Promise<void> {
    await this.loadAppConfig();
  }

  /**
   * Reload only team configuration
   */
  async reloadTeamConfig(): Promise<void> {
    await this.loadTeamConfig();
  }

  /**
   * Reload only service commands
   */
  async reloadServiceCommands(): Promise<void> {
    await this.loadServiceCommands();
  }

  // ============================================================================
  // Default Configuration Providers
  // ============================================================================

  /**
   * Get default app configuration (fallback)
   */
  private getDefaultAppConfig(): AppConfig {
    return {
      app: {
        name: 'FlowForge',
        version: '1.0.0',
        environment: ENVIRONMENT_NAMES.DEVELOPMENT,
        description: 'Process Orchestration Platform',
      },
      environments: {
        local: {
          name: 'Local Development',
          description: 'Local development environment',
        },
        dev: {
          name: 'Development',
          description: 'Development environment',
        },
        test: {
          name: 'Testing',
          description: 'Testing environment',
        },
        stage: {
          name: 'Staging',
          description: 'Staging environment',
        },
        prod: {
          name: 'Production',
          description: 'Production environment',
        },
      },
      otherServices: {},
      features: {
        notifications: {
          enabled: true,
          position: 'top-right',
          duration: 5000,
          maxVisible: 5,
        },
        debug: {
          enabled: true,
          logLevel: 'info',
          showDevTools: true,
        },
        autoSave: {
          enabled: true,
          interval: 30000,
        },
      },
      ui: {
        theme: {
          default: 'light',
          allowUserOverride: true,
        },
        sidebar: {
          defaultCollapsed: false,
          width: 320,
          collapsedWidth: 60,
        },
        notifications: {
          maxCount: 10,
          position: 'top-right',
        },
      },
    };
  }

  /**
   * Get default team configuration (fallback)
   */
  private getDefaultTeamConfig(): TeamPresetsConfig {
    return {
      teams: {
        DEFAULT: {
          name: 'Default Team',
          description: 'Default team configuration',
          color: '#9e9e9e',
          icon: 'Business',
          presetServices: [],
          menuItems: [],
          jsonTemplates: [],
        },
      },
      baseMenuItems: [],
      services: {},
    };
  }
}

// Export singleton instance
export const configLoader = new ConfigLoader();
