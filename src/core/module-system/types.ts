/**
 * Module System Types
 *
 * Defines the interface for pluggable modules in the application.
 * Modules are configured in app.config.yaml and can be overridden per team.
 */

import type React from 'react';


/**
 * Module metadata - defined in app.config.yaml
 */
export interface ModuleMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  icon: string; // Material-UI icon name
  route: string; // URL route/view ID
  enabled: boolean; // Global enabled state
  order: number; // Display order in sidebar (can be overridden by user drag-drop)
  teamSpecific?: boolean; // If true, module behavior changes per team
  dependencies?: string[]; // Core service dependencies (e.g., 'database', 'serviceManager')
  permissions?: string[]; // Future: role-based access control
  badge?: {
    type: 'count' | 'text' | 'dot';
    source?: string; // Data source for badge (e.g., 'notifications', 'runningServices')
    text?: string; // Static text for 'text' type
    color?: string; // Color override
  };
}

/**
 * Team-specific module override - defined in team-presets.yaml
 */
export interface TeamModuleOverride {
  enabled?: boolean; // Override global enabled state
  order?: number; // Override display order
  config?: Record<string, unknown>; // Team-specific configuration
}

/**
 * Module configuration - merged from app.config.yaml and team overrides
 */
export interface ModuleConfig extends ModuleMetadata {
  teamOverride?: TeamModuleOverride;
  config?: Record<string, unknown>; // Module-specific configuration
}

/**
 * Module lifecycle hooks
 */
export interface ModuleLifecycle {
  onLoad?: () => Promise<void> | void;
  onUnload?: () => Promise<void> | void;
  onTeamChange?: (team: string) => Promise<void> | void;
  onEnvironmentChange?: (env: string) => Promise<void> | void;
}

/**
 * Menu item for sidebar
 */
export interface MenuItem {
  moduleId: string;
  label: string;
  icon: string;
  order: number;
  badge?: () => number | string | null;
  onClick?: () => void;
}

/**
 * Complete module definition
 */
export interface Module {
  metadata: ModuleMetadata;
  lifecycle?: ModuleLifecycle;
  component: React.ComponentType;
  getBadge?: () => number | string | null; // Optional badge calculation
}

/**
 * Module registry state
 */
export interface ModuleRegistryState {
  modules: Map<string, Module>;
  loadedModules: Set<string>;
  moduleOrder: string[]; // User's custom order
}

/**
 * Module load error
 */
export interface ModuleLoadError {
  moduleId: string;
  error: Error;
  timestamp: Date;
}
