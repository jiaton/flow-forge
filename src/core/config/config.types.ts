/**
 * Configuration Type Definitions
 *
 * Type definitions for all configuration structures used in FlowForge.
 *
 * @module config.types
 */

import type { FullEnvironment } from '../constants';

// ============================================================================
// App Configuration Types
// ============================================================================

export interface EnvironmentConfig {
  name: string;
  description?: string;
}

export interface GitProviderConfig {
  name?: string;
  description?: string;
  baseUrl: string;
  apiUrl: string;
  accessToken?: string;
  defaultReviewers?: string[];
  provider?: 'gitlab' | 'github' | 'bitbucket';
}

export interface OtherServicesConfig {
  git?: GitProviderConfig;
  [key: string]: unknown;  // Allow arbitrary service configs
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
      primaryColor?: string;  // Allow theme color override
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
  modules?: Record<string, ModuleConfigEntry>;
}

export interface ModuleConfigEntry {
  name: string;
  description?: string;
  version?: string;
  icon?: string;
  route?: string;
  enabled?: boolean;
  order?: number;
  teamSpecific?: boolean;
  dependencies?: string[];
  permissions?: string[];
  badge?: {
    type: 'count' | 'text' | 'dot';
    source?: string;  // For type: 'count' (e.g., 'runningServices', 'pendingMRs')
    text?: string;    // For type: 'text'
    color?: string;   // Color override
  };
  config?: Record<string, unknown>;
}

// ============================================================================
// Team Configuration Types
// ============================================================================

export interface TeamMenuItem {
  id: string;
  label: string;
  icon: string;
  view?: string;
}

export interface TeamJSONTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface TeamPreset {
  name: string;
  description: string;
  color: string;
  icon: string;
  presetServices: string[];
  menuItems: TeamMenuItem[];
  jsonTemplates: TeamJSONTemplate[];
  modules?: Record<string, TeamModuleOverride>;
}

export interface TeamModuleOverride {
  enabled?: boolean;
  order?: number;
  config?: Record<string, unknown>;
}

export interface TeamPresetsConfig {
  teams: Record<string, TeamPreset>;
  baseMenuItems: TeamMenuItem[];
  services?: Record<string, ServiceDefinition>;
}

// ============================================================================
// Service Configuration Types
// ============================================================================

export interface ServiceCommands {
  start: string;
  stop: string;
  check: string;
  openIDE?: string;
  openTerminal?: string;
  openFolder?: string;
  viewLogs?: string;
}

export interface ServiceDefinition {
  name: string;
  type: string;
  description: string;
  port: number;
  path?: string;
  git?: {
    projectId: string;
    defaultReviewers?: string[];
  };
  commands?: ServiceCommands;
  environments?: Record<string, string>;
}

export interface GlobalSettings {
  ide?: {
    command: string;
    args: string;
  };
  terminal?: {
    command: string;
    args: string;
  };
  fileManager?: {
    command: string;
    args: string;
  };
}

export interface ServiceCommandsConfig {
  globalSettings?: GlobalSettings;
  services: Record<string, ServiceDefinition>;
}

// ============================================================================
// Configuration Result Types
// ============================================================================

export interface ConfigLoadResult<T> {
  success: boolean;
  config?: T;
  error?: string;
}
