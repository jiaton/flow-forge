/**
 * Remote Config Sync
 *
 * Clone a git repo directly into ~/.flowforge/config/.
 * User edits in place. Refresh = git pull. If conflict, user resolves.
 * State stored in ~/.flowforge/remote-source.json (outside config/).
 */

import fs from 'fs';
import path from 'path';
import { APP_DIRS, APP_FILES, REMOTE_CONFIG } from '../constants.js';
import { shellInteractive } from '../service-orchestration/execution/shell.js';

let logger = null;
const getLogger = async () => {
  if (!logger) {
    const { createLogger } = await import('./logger.js');
    logger = createLogger('RemoteConfigSync');
  }
  return logger;
};

function getFlowforgeDir() {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(homeDir, APP_DIRS.HOME_DIR);
}

function getMetaPath() {
  return path.join(getFlowforgeDir(), APP_FILES.REMOTE_SOURCE);
}

function getConfigDir() {
  return path.join(getFlowforgeDir(), APP_DIRS.CONFIG);
}

/**
 * Read remote-source.json (returns null if not configured)
 */
export function getRemoteSource() {
  const metaPath = getMetaPath();
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  } catch {
    return null;
  }
}

function saveRemoteSource(data) {
  const metaPath = getMetaPath();
  fs.mkdirSync(path.dirname(metaPath), { recursive: true });
  fs.writeFileSync(metaPath, JSON.stringify(data, null, 2));
}

/**
 * Check if an update check is due
 */
export function isUpdateCheckDue() {
  const meta = getRemoteSource();
  if (!meta || !meta.lastSync) return true;
  const hoursSince = (Date.now() - new Date(meta.lastSync).getTime()) / (1000 * 60 * 60);
  return hoursSince >= REMOTE_CONFIG.CHECK_INTERVAL_HOURS;
}

/**
 * Clone remote repo directly into ~/.flowforge/config/
 * Removes existing config/ first (user opted in).
 */
export async function cloneRemoteConfig(url, branch) {
  const log = await getLogger();
  const configDir = getConfigDir();
  const branchArg = branch || REMOTE_CONFIG.DEFAULT_BRANCH;

  // Remove existing config dir (user is replacing with remote)
  if (fs.existsSync(configDir)) {
    fs.rmSync(configDir, { recursive: true, force: true });
  }

  const cmd = `git clone --depth 1 --branch ${branchArg} ${url} ${configDir}`;
  log.info(`Cloning remote config: ${cmd}`);

  try {
    await shellInteractive(cmd, { timeout: 60000 });
    saveRemoteSource({ url, branch: branchArg, lastSync: new Date().toISOString() });
    log.info('Remote config cloned successfully');
    return { success: true };
  } catch (err) {
    log.error(`Clone failed: ${err.message}`);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Pull latest. Success only if git pull exits 0.
 */
export async function refreshRemoteConfig() {
  const log = await getLogger();
  const configDir = getConfigDir();

  if (!fs.existsSync(path.join(configDir, '.git'))) {
    return { success: false, error: 'Config is not a git repo.' };
  }

  try {
    const { stdout } = await shellInteractive('git pull', { cwd: configDir, timeout: 30000 });
    const upToDate = stdout.includes('Already up to date');
    saveRemoteSource({ ...getRemoteSource(), lastSync: new Date().toISOString() });
    log.info(upToDate ? 'Already up to date' : 'Config pulled successfully');
    return { success: true, upToDate };
  } catch (err) {
    log.warn(`Pull failed: ${err.message}`);
    return { success: false, error: err.message || String(err), needsManualResolve: true };
  }
}

/**
 * Remove remote config setup (delete meta file, leave config/ intact)
 */
export function removeRemoteSource() {
  const metaPath = getMetaPath();
  if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
  return { success: true };
}
