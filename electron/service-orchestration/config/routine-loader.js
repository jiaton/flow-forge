/**
 * Routine Configuration Loader
 * Reads routine YAML files from config/routines/
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { createLogger } from '../../utils/logger.js';
import { validateRoutine } from '../../schemas/config/routine.js';

const logger = createLogger('RoutineLoader');

/**
 * Load all routine definitions from config/routines/
 * @param {string} configBaseDir - Base config directory
 * @returns {Record<string, object>} Map of routineId -> routine config
 */
export function loadRoutines(configBaseDir) {
  const routinesDir = path.join(configBaseDir, 'routines');
  const routines = {};

  if (!fs.existsSync(routinesDir)) {
    logger.debug('No routines directory found');
    return routines;
  }

  try {
    const files = fs.readdirSync(routinesDir).filter(f => /\.(yaml|yml)$/i.test(f));

    for (const file of files) {
      const filePath = path.join(routinesDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = yaml.load(content);
        const validation = validateRoutine(data, file);

        if (!validation.success) {
          logger.error(`${validation.error}`);
          validation.issues?.forEach(i => logger.error(`  - ${i.path}: ${i.message}`));
          continue;
        }

        const id = path.basename(file, path.extname(file));
        routines[id] = { ...validation.data, id };
        logger.debug(`Loaded routine: ${id}`);
      } catch (err) {
        logger.error(`Failed to load routine ${file}:`, err.message);
      }
    }
  } catch (err) {
    logger.error('Failed to read routines directory:', err.message);
  }

  logger.info(`Loaded ${Object.keys(routines).length} routines`);
  return routines;
}
