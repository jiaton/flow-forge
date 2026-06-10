/**
 * Patch Storage - Persist file overrides for 3-way merge on re-apply.
 *
 * Layout: ~/.flowforge/patches/<serviceId>/<patchName>/
 *   <original/dir/structure/file>.mine  - your customized file content
 *   <original/dir/structure/file>.base  - upstream content when override was saved
 *   manifest.json                       - list of tracked relative paths
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('PatchStorage');

const PATCHES_DIR = path.join(os.homedir(), '.flowforge', 'patches');
const MANIFEST_FILE = 'manifest.json';

// Path helpers

function getPatchDir(serviceId, patchName) {
  return path.join(PATCHES_DIR, serviceId, patchName);
}

// Public API

/**
 * Save a set of file overrides as a named patch.
 * @param {string} serviceId
 * @param {string} patchName
 * @param {Array} overrides - objects with { relPath, mine, base }
 */
export function savePatch(serviceId, patchName, overrides) {
  const dir = getPatchDir(serviceId, patchName);

  for (const { relPath, mine, base } of overrides) {
    const fileDir = path.join(dir, path.dirname(relPath));
    fs.mkdirSync(fileDir, { recursive: true });
    const base_ = path.join(dir, relPath);
    fs.writeFileSync(`${base_}.mine`, mine, 'utf8');
    fs.writeFileSync(`${base_}.base`, base, 'utf8');
  }

  fs.writeFileSync(path.join(dir, MANIFEST_FILE), JSON.stringify(overrides.map(o => o.relPath), null, 2), 'utf8');
  logger.info(`Saved patch "${patchName}" for ${serviceId} (${overrides.length} files)`);
}

/**
 * Load a named patch as override objects ready for applyOverrides().
 * @param {string} serviceId
 * @param {string} patchName
 * @returns {Array} objects with { relPath, mine, base }
 */
export function loadPatch(serviceId, patchName) {
  const dir = getPatchDir(serviceId, patchName);
  const manifestPath = path.join(dir, MANIFEST_FILE);
  if (!fs.existsSync(manifestPath)) throw new Error(`Patch not found: ${patchName}`);

  const relPaths = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return relPaths.map(relPath => {
    const base_ = path.join(dir, relPath);
    return {
      relPath,
      mine: fs.readFileSync(`${base_}.mine`, 'utf8'),
      base: fs.readFileSync(`${base_}.base`, 'utf8'),
    };
  });
}

/**
 * List saved patches for a service.
 * @param {string} serviceId
 * @returns {object} name: string, files: string[], created: string }[]}
 */
export function listPatches(serviceId) {
  const serviceDir = path.join(PATCHES_DIR, serviceId);
  if (!fs.existsSync(serviceDir)) return [];

  return fs.readdirSync(serviceDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const manifestPath = path.join(serviceDir, d.name, MANIFEST_FILE);
      const files = fs.existsSync(manifestPath)
        ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
        : [];
      const stat = fs.statSync(path.join(serviceDir, d.name));
      return { name: d.name, files, created: stat.birthtime.toISOString() };
    });
}

/**
 * Delete a named patch.
 * @param {string} serviceId
 * @param {string} patchName
 */
export function deletePatch(serviceId, patchName) {
  const dir = getPatchDir(serviceId, patchName);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    logger.info(`Deleted patch "${patchName}" for ${serviceId}`);
  }
}

/**
 * Resolve team patch definitions from service config.
 * Team patches are stored as pre-built override directories.
 * @param {object} name: string, description?: string, path: string }[]} patchDefs
 * @returns {object} name: string, description: string, dir: string }[]}
 */
export function resolveTeamPatches(patchDefs) {
  if (!patchDefs?.length) return [];
  return patchDefs
    .map(def => {
      if (!fs.existsSync(def.path)) {
        logger.warn(`Team patch not found: ${def.path}`);
        return null;
      }
      return { name: def.name, description: def.description || '', dir: def.path };
    })
    .filter(Boolean);
}
