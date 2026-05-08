import type { FullEnvironment } from '../constants/environment';
import { ENVIRONMENT_NAMES } from '../constants/environment';
import { CONFIG_FILES } from '../constants/api';

export interface EnvironmentConfig {
  name: string;
  description?: string;
}

export interface OtherServicesConfig {
  teamspace: {
    name?: string;
    description?: string;
    baseUrl: string;
    apiToken?: string;
  };
}

export interface AppConfig {
  app: {
    name: string;
    version: string;
    environment: FullEnvironment;
    description?: string;
  };
  environments: Record<string, EnvironmentConfig>;
  otherServices: OtherServicesConfig;
  features: {
    notifications?: {
      enabled: boolean;
      position?: string;
      duration?: number;
      maxVisible?: number;
    };
    analytics?: {
      enabled: boolean;
      provider?: string;
      trackingId?: string;
    };
    debug?: {
      enabled: boolean;
      logLevel?: string;
      showDevTools?: boolean;
    };
    autoSave?: {
      enabled: boolean;
      interval?: number;
    };
  };
  ui?: {
    theme?: {
      default?: string;
      allowUserOverride?: boolean;
    };
    sidebar?: {
      defaultCollapsed?: boolean;
      width?: number;
      collapsedWidth?: number;
    };
    notifications?: {
      maxCount?: number;
      position?: string;
    };
  };
  security?: {
    sessionTimeout?: number;
    maxLoginAttempts?: number;
    passwordPolicy?: {
      minLength?: number;
      requireUppercase?: boolean;
      requireLowercase?: boolean;
      requireNumbers?: boolean;
      requireSpecialChars?: boolean;
    };
  };
}

class ConfigManager {
  private config: AppConfig | null = null;
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    try {
      // Check if we're in Electron environment
      if (typeof window !== 'undefined' && window.electronAPI) {
        // In Electron, load config via Electron API
        const result = await window.electronAPI.readConfigFile(CONFIG_FILES.APP_CONFIG);
        if (result.success) {
          this.config = result.config;
        } else {
          console.warn('Failed to load config via Electron API:', result.error);
          this.config = this.getDefaultConfig();
        }
      } else {
        // Non-Electron environment - use default config
        console.warn('Not running in Electron environment, using default config');
        this.config = this.getDefaultConfig();
      }
    } catch (error) {
      console.warn('Failed to load YAML config file, using default config:', error);
      this.config = this.getDefaultConfig();
    }

    // Mark as initialized
    this.initialized = true;
  }


  getConfig(): AppConfig {
    if (!this.config || !this.initialized) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }
    return this.config;
  }

  getEnvironment(envName: string): EnvironmentConfig | undefined {
    return this.getConfig().environments[envName];
  }

  getCurrentEnvironmentConfig(envName: string): EnvironmentConfig {
    return this.getConfig().environments[envName] || this.getConfig().environments.local;
  }

  getOtherServices(): OtherServicesConfig {
    return this.getConfig().otherServices;
  }

  getFeatureFlags() {
    return this.getConfig().features;
  }

  getTeamspaceUrl(): string {
    return this.getConfig().otherServices.teamspace.baseUrl;
  }

  isDevelopment(): boolean {
    return this.getConfig().app.environment === ENVIRONMENT_NAMES.DEVELOPMENT;
  }

  isProduction(): boolean {
    return this.getConfig().app.environment === ENVIRONMENT_NAMES.PRODUCTION;
  }

  async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }

    this.config = { ...this.config, ...updates };

    // Save to YAML file via Electron API if available
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const result = await window.electronAPI.writeConfigFile(CONFIG_FILES.APP_CONFIG, this.config);
        if (!result.success) {
          console.warn('Failed to save config to file:', result.error);
        }
      } catch (error) {
        console.warn('Failed to save config to file:', error);
      }
    } else {
      console.warn('Saving config files is not supported in non-Electron environment');
    }
  }

  async reloadConfig(): Promise<void> {
    await this.initialize();
  }

  private getDefaultConfig(): AppConfig {
    return {
      app: {
        name: 'FlowForge (default-data)',
        version: '1.0.0',
        environment: ENVIRONMENT_NAMES.DEVELOPMENT,
        description: 'FlowForge - Software Local Development Flow Management System (default-data)'
      },
      environments: {
        local: {
          name: 'Local Development (default-data)',
          description: 'Local development environment (default-data)'
        }
      },
      otherServices: {
        teamspace: {
          name: 'Teamspace (default-data)',
          description: 'Team collaboration and project management (default-data)',
          baseUrl: 'https://teamspace.internal.com'
        },
      },
      features: {
        notifications: {
          enabled: true,
          position: 'top-right',
          duration: 5000,
          maxVisible: 5
        },
        analytics: {
          enabled: false,
          provider: 'google-analytics',
          trackingId: ''
        },
        debug: {
          enabled: true,
          logLevel: 'info',
          showDevTools: true
        },
        autoSave: {
          enabled: true,
          interval: 30000
        }
      },
      ui: {
        theme: {
          default: 'light',
          allowUserOverride: true
        },
        sidebar: {
          defaultCollapsed: false,
          width: 320,
          collapsedWidth: 60
        },
        notifications: {
          maxCount: 10,
          position: 'top-right'
        }
      },
      security: {
        sessionTimeout: 3600000,
        maxLoginAttempts: 5,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true
        }
      }
    };
  }
}

// Export singleton instance
export const configManager = new ConfigManager(); 