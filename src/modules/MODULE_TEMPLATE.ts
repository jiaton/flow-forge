/**
 * Module Template
 *
 * Copy this file to create a new module.
 * Replace "template" with your module name throughout.
 */

import { Module } from '../core/module-system/types';
// Import your component here
// import TemplateComponent from '../components/Template/Template';

export const templateModule: Module = {
  metadata: {
    // Unique ID (kebab-case, used in routes and config)
    id: 'template',

    // Display name (shown in sidebar)
    name: 'Template',

    // Short description
    description: 'Template module description',

    // Semantic version
    version: '1.0.0',

    // Material-UI icon name (see https://mui.com/material-ui/material-icons/)
    icon: 'Extension',

    // Route/view ID (usually same as id)
    route: 'template',

    // Default enabled state (can be overridden in config)
    enabled: true,

    // Display order in sidebar (lower = higher in list)
    // Typical ranges: 10-20 (core), 20-50 (common), 50+ (specialized)
    order: 100,

    // Whether this module's behavior changes based on selected team
    teamSpecific: false,

    // Core service dependencies (ensures load order)
    // Available: 'database', 'serviceManager', 'notifications'
    dependencies: [],

    // Optional: permissions required to use this module (future feature)
    // permissions: ['admin', 'developer'],
  },

  /**
   * Lifecycle hooks (all optional)
   */
  lifecycle: {
    /**
     * Called when module is loaded
     */
    onLoad: async () => {
      console.log('[Template] Module loaded');

      // Example: Load initial data from database
      // try {
      //   const data = await window.electronAPI.db.someTable.getAll();
      //   console.log('[Template] Loaded data:', data);
      // } catch (error) {
      //   console.error('[Template] Failed to load data:', error);
      // }
    },

    /**
     * Called when module is unloaded (cleanup)
     */
    onUnload: async () => {
      console.log('[Template] Module unloaded');

      // Example: Clean up resources
      // clearInterval(someInterval);
      // unsubscribeFromEvents();
    },

    /**
     * Called when user switches teams
     */
    onTeamChange: async (team: string) => {
      console.log(`[Template] Team changed to: ${team}`);

      // Example: Reload team-specific data
      // const teamConfig = await loadTeamConfig(team);
    },

    /**
     * Called when environment changes
     */
    onEnvironmentChange: async (env: string) => {
      console.log(`[Template] Environment changed to: ${env}`);

      // Example: Update API endpoints
      // updateApiEndpoint(env);
    },
  },

  /**
   * The React component to render for this module
   * Can use React.lazy() for code splitting:
   * component: React.lazy(() => import('../components/Template/Template'))
   */
  component: () => null, // Replace with: TemplateComponent

  /**
   * Optional: Badge display in sidebar
   * Return a number, string, or null
   */
  getBadge: () => {
    // Example: Show count of items
    // return itemCount;

    // Example: Show status text
    // return 'NEW';

    // No badge
    return null;
  },
};

/**
 * Configuration in app.config.yaml:
 *
 * modules:
 *   template:
 *     name: "Template"
 *     description: "Template module description"
 *     version: "1.0.0"
 *     icon: "Extension"
 *     route: "template"
 *     enabled: true
 *     order: 100
 *     teamSpecific: false
 *     dependencies: []
 *     config:
 *       # Module-specific configuration
 *       someOption: true
 *       refreshInterval: 60000
 */

/**
 * Team override in team-presets.yaml:
 *
 * teams:
 *   backend-team:
 *     modules:
 *       template:
 *         enabled: true
 *         order: 50
 */

/**
 * Registration:
 *
 * No manual registration needed. Any *.ts file in src/modules/ that exports
 * an object with `metadata` and `component` fields is auto-discovered at
 * build time via import.meta.glob in src/modules/index.ts.
 *
 * Simply create your file and it will appear in the app on next run.
 */
