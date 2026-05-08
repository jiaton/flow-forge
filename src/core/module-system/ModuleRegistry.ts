/**
 * Module Registry
 *
 * Central registry for all application modules.
 * Manages module registration, loading, unloading, and state.
 */

import { Module, ModuleConfig, ModuleLoadError, MenuItem } from './types';

class ModuleRegistry {
  private modules = new Map<string, Module>();
  private moduleConfigs = new Map<string, ModuleConfig>();
  private loadedModules = new Set<string>();
  private loadErrors: ModuleLoadError[] = [];
  private moduleOrder: string[] = []; // User's custom order

  /**
   * Register a module
   */
  register(module: Module): void {
    if (this.modules.has(module.metadata.id)) {
      console.warn(`Module ${module.metadata.id} already registered`);
      return;
    }
    this.modules.set(module.metadata.id, module);
    console.log(`Module registered: ${module.metadata.id}`);
  }

  /**
   * Register multiple modules at once
   */
  registerAll(modules: Module[]): void {
    modules.forEach((module) => this.register(module));
  }

  /**
   * Set module configurations (merged from app.config.yaml + team overrides)
   */
  setModuleConfigs(configs: Record<string, ModuleConfig>): void {
    this.moduleConfigs.clear();
    Object.entries(configs).forEach(([id, config]) => {
      this.moduleConfigs.set(id, config);
    });
  }

  /**
   * Load a module
   */
  async loadModule(moduleId: string): Promise<void> {
    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error(`Module ${moduleId} not found in registry`);
    }

    const config = this.moduleConfigs.get(moduleId);
    if (!config) {
      console.warn(`No configuration found for module ${moduleId}`);
    }

    // Check if module is enabled
    const isEnabled = this.isModuleEnabled(moduleId);
    if (!isEnabled) {
      console.log(`Module ${moduleId} is disabled, skipping load`);
      return;
    }

    // Check if already loaded
    if (this.loadedModules.has(moduleId)) {
      console.log(`Module ${moduleId} already loaded`);
      return;
    }

    // Check dependencies
    if (module.metadata.dependencies) {
      for (const dep of module.metadata.dependencies) {
        if (!this.isLoaded(dep)) {
          throw new Error(
            `Module ${moduleId} depends on ${dep}, which is not loaded`
          );
        }
      }
    }

    try {
      // Call lifecycle hook
      await module.lifecycle?.onLoad?.();
      this.loadedModules.add(moduleId);
      console.log(`Module loaded: ${moduleId}`);
    } catch (error) {
      const loadError: ModuleLoadError = {
        moduleId,
        error: error as Error,
        timestamp: new Date(),
      };
      this.loadErrors.push(loadError);
      console.error(`Failed to load module ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Load all enabled modules
   */
  async loadAllModules(): Promise<void> {
    console.log('[ModuleRegistry] loadAllModules: checking enabled modules...');
    console.log('[ModuleRegistry] Total registered modules:', this.modules.size);
    console.log('[ModuleRegistry] Module configs set:', this.moduleConfigs.size);

    const enabledModules = this.getEnabledModules();
    console.log('[ModuleRegistry] Enabled modules count:', enabledModules.length);
    console.log('[ModuleRegistry] Enabled module IDs:', enabledModules.map(m => m.metadata.id));

    // Sort by dependencies (simple topological sort)
    const sorted = this.topologicalSort(enabledModules);

    for (const module of sorted) {
      try {
        await this.loadModule(module.metadata.id);
      } catch (error) {
        console.error(`Error loading module ${module.metadata.id}:`, error);
      }
    }
  }

  /**
   * Unload a module
   */
  async unloadModule(moduleId: string): Promise<void> {
    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error(`Module ${moduleId} not found`);
    }

    if (!this.loadedModules.has(moduleId)) {
      console.log(`Module ${moduleId} not loaded`);
      return;
    }

    try {
      await module.lifecycle?.onUnload?.();
      this.loadedModules.delete(moduleId);
      console.log(`Module unloaded: ${moduleId}`);
    } catch (error) {
      console.error(`Failed to unload module ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Set current team and notify modules
   */
  async setCurrentTeam(team: string): Promise<void> {
    // Notify loaded modules of team change
    const loadedModules = Array.from(this.loadedModules)
      .map((id) => this.modules.get(id))
      .filter((m): m is Module => m !== undefined);

    for (const module of loadedModules) {
      try {
        await module.lifecycle?.onTeamChange?.(team);
      } catch (error) {
        console.error(
          `Error in onTeamChange for module ${module.metadata.id}:`,
          error
        );
      }
    }
  }

  /**
   * Check if module is enabled (considering team overrides)
   */
  isModuleEnabled(moduleId: string): boolean {
    const config = this.moduleConfigs.get(moduleId);
    if (!config) {
      console.warn(`[ModuleRegistry] No config found for module: ${moduleId}`);
      return false;
    }

    // Team override takes precedence
    if (config.teamOverride?.enabled !== undefined) {
      console.log(`[ModuleRegistry] Module ${moduleId} enabled via team override: ${config.teamOverride.enabled}`);
      return config.teamOverride.enabled;
    }

    console.log(`[ModuleRegistry] Module ${moduleId} enabled via config: ${config.enabled}`);
    return config.enabled;
  }

  /**
   * Check if module is loaded
   */
  isLoaded(moduleId: string): boolean {
    return this.loadedModules.has(moduleId);
  }

  /**
   * Get all registered modules
   */
  getAllModules(): Module[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get all enabled modules
   */
  getEnabledModules(): Module[] {
    return this.getAllModules().filter((m) =>
      this.isModuleEnabled(m.metadata.id)
    );
  }

  /**
   * Get module by ID
   */
  getModule(moduleId: string): Module | undefined {
    return this.modules.get(moduleId);
  }

  /**
   * Get module configuration
   */
  getModuleConfig(moduleId: string): ModuleConfig | undefined {
    return this.moduleConfigs.get(moduleId);
  }

  /**
   * Get module component for rendering
   */
  getModuleComponent(moduleId: string): React.ComponentType | null {
    const module = this.modules.get(moduleId);
    if (!module) {
      console.warn(`[ModuleRegistry] Module not found: ${moduleId}`);
      return null;
    }

    if (!this.isModuleEnabled(moduleId)) {
      console.warn(`[ModuleRegistry] Module not enabled: ${moduleId}`);
      return null;
    }

    console.log(`[ModuleRegistry] Returning component for module: ${moduleId}`);
    return module.component;
  }

  /**
   * Get menu items for sidebar (sorted by order)
   */
  getMenuItems(): MenuItem[] {
    const enabledModules = this.getEnabledModules();

    // If custom order exists, use it; otherwise use config order
    const orderedModules = this.moduleOrder.length > 0
      ? this.sortByCustomOrder(enabledModules)
      : this.sortByConfigOrder(enabledModules);

    return orderedModules.map((module) => {
      const config = this.moduleConfigs.get(module.metadata.id);
      const order = config?.teamOverride?.order ?? config?.order ?? 999;

      return {
        moduleId: module.metadata.id,
        label: module.metadata.name,
        icon: module.metadata.icon,
        order,
        badge: module.getBadge,
      };
    });
  }

  /**
   * Set custom module order (from user drag-drop)
   */
  setModuleOrder(order: string[]): void {
    this.moduleOrder = order;
  }

  /**
   * Get custom module order
   */
  getModuleOrder(): string[] {
    return this.moduleOrder;
  }

  /**
   * Reset to default order (from config)
   */
  resetModuleOrder(): void {
    this.moduleOrder = [];
  }

  /**
   * Get load errors
   */
  getLoadErrors(): ModuleLoadError[] {
    return this.loadErrors;
  }

  /**
   * Clear load errors
   */
  clearLoadErrors(): void {
    this.loadErrors = [];
  }

  // --- Private helper methods ---

  private sortByConfigOrder(modules: Module[]): Module[] {
    return modules.sort((a, b) => {
      const configA = this.moduleConfigs.get(a.metadata.id);
      const configB = this.moduleConfigs.get(b.metadata.id);

      const orderA = configA?.teamOverride?.order ?? configA?.order ?? 999;
      const orderB = configB?.teamOverride?.order ?? configB?.order ?? 999;

      return orderA - orderB;
    });
  }

  private sortByCustomOrder(modules: Module[]): Module[] {
    const orderMap = new Map(this.moduleOrder.map((id, idx) => [id, idx]));

    return modules.sort((a, b) => {
      const orderA = orderMap.get(a.metadata.id) ?? 999;
      const orderB = orderMap.get(b.metadata.id) ?? 999;
      return orderA - orderB;
    });
  }

  private topologicalSort(modules: Module[]): Module[] {
    const sorted: Module[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (module: Module): void => {
      if (temp.has(module.metadata.id)) {
        throw new Error(
          `Circular dependency detected: ${module.metadata.id}`
        );
      }
      if (visited.has(module.metadata.id)) {
        return;
      }

      temp.add(module.metadata.id);

      // Visit dependencies first
      if (module.metadata.dependencies) {
        for (const depId of module.metadata.dependencies) {
          const depModule = this.modules.get(depId);
          if (depModule) {
            visit(depModule);
          }
        }
      }

      temp.delete(module.metadata.id);
      visited.add(module.metadata.id);
      sorted.push(module);
    };

    modules.forEach((module) => visit(module));
    return sorted;
  }
}

// Singleton instance
export const moduleRegistry = new ModuleRegistry();

/**
 * Utility function to check if a module ID is valid and enabled
 */
export function isValidModuleId(moduleId: string): boolean {
  return moduleRegistry.isModuleEnabled(moduleId);
}

/**
 * Utility function to get the first enabled module
 */
export function getFirstEnabledModule(): string {
  const menuItems = moduleRegistry.getMenuItems();
  if (menuItems.length === 0) {
    console.warn('[ModuleRegistry] No enabled modules found, defaulting to dashboard');
    return 'dashboard';
  }
  return menuItems[0].moduleId;
}
