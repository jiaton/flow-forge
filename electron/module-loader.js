/**
 * Backend Module Auto-Discovery (Build-time)
 *
 * Uses import.meta.glob to discover module handlers at build time.
 * This works with electron-vite's bundling (unlike runtime fs.readdirSync).
 *
 * Convention:
 *   electron/<module-name>/ipc-handlers.js must export:
 *     register(context: { mainWindow, configDir, app })
 *
 * To add a new backend module:
 *   1. Create electron/<module-name>/ipc-handlers.js
 *   2. Export a `register` function
 *   3. Done — no edits to main.js or ipcHandlers.js needed
 */

import { createLogger } from './utils/logger.js';

const logger = createLogger('ModuleLoader');

// Vite discovers these at build time — no runtime fs scanning needed
const moduleHandlers = import.meta.glob('./*/ipc-handlers.js', { eager: true });

// Directories that are existing infra (not auto-loadable modules)
const EXCLUDED_DIRS = new Set([
  'database',
  'service-orchestration',
  'utils',
  'schemas',
]);

/**
 * Register all discovered backend module IPC handlers.
 */
export async function loadModuleHandlers(context) {
  const loaded = [];

  for (const [path, mod] of Object.entries(moduleHandlers)) {
    // Extract module name from path: ./command-palette/ipc-handlers.js → command-palette
    const moduleName = path.split('/')[1];

    if (EXCLUDED_DIRS.has(moduleName)) continue;

    if (typeof mod.register === 'function') {
      try {
        await mod.register(context);
        loaded.push(moduleName);
        logger.info(`Loaded module handlers: ${moduleName}`);
      } catch (err) {
        logger.error(`Failed to load module ${moduleName}: ${err.message}`);
      }
    } else {
      logger.warn(`Module ${moduleName}/ipc-handlers.js has no register() export, skipping`);
    }
  }

  logger.info(`Module handler discovery complete: ${loaded.length} modules loaded`);
  return loaded;
}
