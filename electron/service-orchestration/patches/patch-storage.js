/**
 * Patch Storage — File system operations for patch files.
 *
 * Personal patches: ~/.flowforge/patches/{service-id}/{name}.patch
 * Team patches: resolved from service config `patches` field
 */

import fs from 'fs';
import path from 'path';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('PatchStorage');

const HOME = process.env.HOME || process.env.USERPROFILE || '';
const PATCHES_DIR = path.join(HOME, '.flowforge', 'patches');

function getServicePatchDir(serviceId) {
  return path.join(PATCHES_DIR, serviceId);
}

/**
 * Save a patch file for a service.
 * @param {string} serviceId
 * @param {string} name - Patch name (used as filename, .patch appended)
 * @param {string} content - Unified diff content
 * @returns {string} Absolute path to saved patch file
 */
export function savePatch(serviceId, name, content) {
  const dir = getServicePatchDir(serviceId);
  fs.mkdirSync(dir, { recursive: true });
  const filename = name.endsWith('.patch') ? name : `${name}.patch`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  logger.info(`Saved patch: ${filePath}`);
  return filePath;
}

/**
 * List personal patches for a service.
 * @param {string} serviceId
 * @returns {{ name: string, path: string, created: string }[]}
 */
export function listPersonalPatches(serviceId) {
  const dir = getServicePatchDir(serviceId);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.patch'))
    .map(f => {
      const filePath = path.join(dir, f);
      const stat = fs.statSync(filePath);
      return {
        name: f.replace(/\.patch$/, ''),
        path: filePath,
        created: stat.birthtime.toISOString(),
      };
    });
}

/**
 * Read patch file content.
 * @param {string} patchPath - Absolute path to patch file
 * @returns {string} Patch content
 */
export function readPatch(patchPath) {
  return fs.readFileSync(patchPath, 'utf8');
}

/**
 * Delete a personal patch file.
 * @param {string} serviceId
 * @param {string} name - Patch name (without .patch extension)
 */
export function deletePatch(serviceId, name) {
  const filename = name.endsWith('.patch') ? name : `${name}.patch`;
  const filePath = path.join(getServicePatchDir(serviceId), filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    logger.info(`Deleted patch: ${filePath}`);
  }
}

/**
 * Resolve team patch definitions from a service config's patches array.
 * @param {{ name: string, description?: string, file: string }[]} patchDefs - From service YAML
 * @param {string} configDir - Base config directory to resolve relative paths
 * @returns {{ name: string, description: string, path: string }[]}
 */
export function resolveTeamPatches(patchDefs, configDir) {
  if (!patchDefs?.length) return [];
  return patchDefs
    .map(def => {
      const filePath = path.resolve(configDir, def.file);
      if (!fs.existsSync(filePath)) {
        logger.warn(`Team patch file not found: ${filePath}`);
        return null;
      }
      return {
        name: def.name,
        description: def.description || '',
        path: filePath,
      };
    })
    .filter(Boolean);
}
