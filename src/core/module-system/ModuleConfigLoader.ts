/**
 * Module Configuration Loader
 *
 * Loads module configurations from app.config.yaml and merges with
 * team-specific overrides from team-presets.yaml.
 */

import { ModuleConfig, ModuleMetadata, TeamModuleOverride } from './types';
import { CONFIG_FILES } from '../constants';

export class ModuleConfigLoader {
  private appConfig: unknown = null;
  private teamPresets: unknown = null;

  /**
   * Load configurations from YAML files
   */
  async loadConfigs(): Promise<void> {
    try {
      // Load app.config.yaml
      const appConfigResult = await window.electronAPI.readConfigFile(
        CONFIG_FILES.APP_CONFIG
      );
      this.appConfig = appConfigResult.success ? appConfigResult.config : null;

      // Load team-presets.yaml
      const teamPresetsResult = await window.electronAPI.readConfigFile(
        CONFIG_FILES.TEAM_PRESETS
      );
      this.teamPresets = teamPresetsResult.success ? teamPresetsResult.config : null;

      console.log('[ModuleConfigLoader] Module configurations loaded successfully');
      console.log('[ModuleConfigLoader] App config has modules:', !!this.appConfig?.modules);
      console.log('[ModuleConfigLoader] Team presets loaded:', !!this.teamPresets?.teams);
    } catch (error) {
      console.error('[ModuleConfigLoader] Failed to load module configurations:', error);
      throw error;
    }
  }

  /**
   * Get merged module configurations for a specific team
   */
  getModuleConfigs(team: string): Record<string, ModuleConfig> {
    console.log(`[ModuleConfigLoader] Getting module configs for team: ${team}`);

    if (!this.appConfig?.modules) {
      console.warn('[ModuleConfigLoader] No modules defined in app.config.yaml');
      return {};
    }

    console.log(`[ModuleConfigLoader] Found ${Object.keys(this.appConfig.modules).length} modules in config`);

    const configs: Record<string, ModuleConfig> = {};

    // Process each module from app.config.yaml
    Object.entries((this.appConfig as { modules: Record<string, Record<string, unknown>> }).modules).forEach(([moduleId, moduleData]) => {
      // Get base configuration from app.config.yaml
      const baseConfig: ModuleMetadata = {
        id: moduleId,
        name: moduleData.name || moduleId,
        description: moduleData.description || '',
        version: moduleData.version || '1.0.0',
        icon: moduleData.icon || 'Extension',
        route: moduleData.route || moduleId,
        enabled: moduleData.enabled ?? true,
        order: moduleData.order ?? 999,
        teamSpecific: moduleData.teamSpecific ?? false,
        dependencies: moduleData.dependencies,
        permissions: moduleData.permissions,
        badge: moduleData.badge,
      };

      // Get team-specific override
      const teamOverride = this.getTeamModuleOverride(team, moduleId);

      // Merge configurations
      configs[moduleId] = {
        ...baseConfig,
        teamOverride,
        config: moduleData.config,
      };

      console.log(`[ModuleConfigLoader] Module ${moduleId}: enabled=${configs[moduleId].enabled}, teamOverride=${JSON.stringify(teamOverride)}`);
    });

    console.log(`[ModuleConfigLoader] Returning ${Object.keys(configs).length} module configs`);
    return configs;
  }

  /**
   * Get team-specific module override
   */
  private getTeamModuleOverride(
    team: string,
    moduleId: string
  ): TeamModuleOverride | undefined {
    const teamConfig = this.teamPresets?.teams?.[team];
    if (!teamConfig?.modules) {
      return undefined;
    }

    const override = teamConfig.modules[moduleId];
    if (!override) {
      return undefined;
    }

    return {
      enabled: override.enabled,
      order: override.order,
      config: override.config,
    };
  }

  /**
   * Get all available modules (regardless of enabled state)
   */
  getAllModuleIds(): string[] {
    if (!this.appConfig?.modules) {
      return [];
    }
    return Object.keys(this.appConfig.modules);
  }

  /**
   * Get team list
   */
  getTeams(): string[] {
    if (!this.teamPresets?.teams) {
      return [];
    }
    return Object.keys(this.teamPresets.teams);
  }

  /**
   * Reload configurations
   */
  async reload(): Promise<void> {
    await this.loadConfigs();
  }
}

// Singleton instance
export const moduleConfigLoader = new ModuleConfigLoader();
