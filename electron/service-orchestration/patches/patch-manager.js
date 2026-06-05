/**
 * Patch Manager — Git patch operations for service repositories.
 *
 * Uses `shellLogin` (login shell mode) for git commands since git
 * may be installed via Homebrew/nvm and needs the user's PATH.
 */

import { shellLogin } from '../execution/shell.js';
import { createLogger } from '../../utils/logger.js';
import os from 'os';

const logger = createLogger('PatchManager');

const GIT_APPLY_FLAGS = '--whitespace=nowarn';

/** Resolve $HOME, ~, and env vars in a path */
function resolvePath(p) {
  if (!p) return p;
  return p.replace(/^\$HOME|^~/g, os.homedir()).replace(/\$HOME/g, os.homedir());
}

/**
 * Get list of modified (unstaged + staged) files in a git repo.
 * @param {string} servicePath - Absolute path to the service repo
 * @returns {Promise<string[]>} List of relative file paths
 */
export async function getModifiedFiles(servicePath) {
  const cwd = resolvePath(servicePath);
  // Include both staged and unstaged changes
  const [unstaged, staged] = await Promise.all([
    shellLogin('git diff --name-only', { cwd }),
    shellLogin('git diff --name-only --cached', { cwd }),
  ]);
  const files = new Set([
    ...unstaged.stdout.trim().split('\n').filter(Boolean),
    ...staged.stdout.trim().split('\n').filter(Boolean),
  ]);
  return [...files];
}

/**
 * Create a unified diff patch from working tree changes.
 * @param {string} servicePath - Absolute path to the service repo
 * @param {string[]} [files] - Specific files to include (all if omitted)
 * @returns {Promise<string>} Unified diff content
 */
export async function createPatch(servicePath, files) {
  const cwd = resolvePath(servicePath);
  const fileArgs = files?.length ? `-- ${files.map(f => `'${f}'`).join(' ')}` : '';
  // Capture both staged and unstaged changes
  const [unstaged, staged] = await Promise.all([
    shellLogin(`git diff ${fileArgs}`, { cwd, timeout: 30000 }),
    shellLogin(`git diff --cached ${fileArgs}`, { cwd, timeout: 30000 }),
  ]);
  return unstaged.stdout + staged.stdout;
}

/**
 * Validate that content is a valid unified diff format.
 * Checks for `diff --git` or `---`/`+++` header patterns.
 * @param {string} content - Patch content to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePatch(content) {
  if (!content || !content.trim()) {
    return { valid: false, error: 'Patch content is empty' };
  }
  const lines = content.split('\n');
  const hasDiffHeader = lines.some(l => l.startsWith('diff --git') || l.startsWith('diff --combined'));
  const hasUnifiedHeader = lines.some(l => l.startsWith('---')) && lines.some(l => l.startsWith('+++'));
  if (!hasDiffHeader && !hasUnifiedHeader) {
    return { valid: false, error: 'Not a valid unified diff — missing diff/--- /+++ headers' };
  }
  return { valid: true };
}

/**
 * Apply a patch using --reject so conflicts produce .rej files instead of failing.
 * Returns the list of .rej files created so the caller can open them in an IDE.
 */
export async function applyPatchWithReject(servicePath, patchPath) {
  const cwd = resolvePath(servicePath);
  try {
    await shellLogin(`git apply ${GIT_APPLY_FLAGS} --reject '${patchPath}'`, { cwd, timeout: 30000 });
    return { success: true, rejFiles: [] };
  } catch (err) {
    // --reject exits non-zero when there are conflicts, but still applies clean hunks
    const { stdout } = await shellLogin('git ls-files --others --exclude-standard "*.rej"', { cwd }).catch(() => ({ stdout: '' }));
    const rejFiles = stdout.trim().split('\n').filter(Boolean);
    return { success: false, partial: true, rejFiles };
  }
}

/**
 * Apply a patch file to a service repo.
 * If "does not match index", checks if patch is already applied (skip).
 * @param {string} servicePath - Absolute path to the service repo
 * @param {string} patchPath - Absolute path to the .patch file
 * @returns {Promise<{ success: boolean, error?: string, alreadyApplied?: boolean }>}
 */
export async function applyPatch(servicePath, patchPath) {
  const cwd = resolvePath(servicePath);
  try {
    await shellLogin(`git apply ${GIT_APPLY_FLAGS} '${patchPath}'`, { cwd, timeout: 30000 });
    return { success: true };
  } catch (err) {
    const msg = err.stderr || err.message || '';

    // Check if patch is already applied (reverse-apply check passes cleanly)
    if (msg.includes('does not match index') || msg.includes('patch does not apply') || msg.includes('already exists in working directory')) {
      try {
        await shellLogin(`git apply ${GIT_APPLY_FLAGS} --check -R '${patchPath}'`, { cwd, timeout: 10000 });
        logger.info('Patch already applied, skipping');
        return { success: true, alreadyApplied: true };
      } catch {
        // Not already applied — context mismatch (repo diverged from when patch was created)
      }
    }

    logger.error('applyPatch failed:', msg);
    // Extract just the "patch does not apply" lines for a cleaner error
    const failedFiles = msg.split('\n')
      .filter(l => l.startsWith('error:') && l.includes('patch does not apply') || l.includes('does not match index'))
      .map(l => l.replace(/^error:\s*/, '').replace(/: (patch does not apply|does not match index)$/, ''))
      .filter(Boolean);
    const userMsg = failedFiles.length
      ? `Patch context mismatch — repo may have diverged. Affected files:\n${failedFiles.slice(0, 5).join('\n')}${failedFiles.length > 5 ? `\n…and ${failedFiles.length - 5} more` : ''}`
      : msg;
    return { success: false, error: userMsg };
  }
}

/**
 * Unapply (reverse) a patch file from a service repo.
 * @param {string} servicePath - Absolute path to the service repo
 * @param {string} patchPath - Absolute path to the .patch file
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function unapplyPatch(servicePath, patchPath) {
  try {
    const cwd = resolvePath(servicePath);
    // Check if patch is actually applied before trying to reverse it
    try {
      await shellLogin(`git apply ${GIT_APPLY_FLAGS} --check -R '${patchPath}'`, { cwd, timeout: 10000 });
    } catch {
      // Reverse check failed — patch is not currently applied, nothing to do
      logger.info('Patch not currently applied, skipping unapply');
      return { success: true, alreadyUnapplied: true };
    }
    await shellLogin(`git apply -R ${GIT_APPLY_FLAGS} '${patchPath}'`, { cwd, timeout: 30000 });
    return { success: true };
  } catch (err) {
    const msg = err.stderr || err.message || 'Unknown error unapplying patch';
    logger.error('unapplyPatch failed:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Set or clear --skip-worktree flag on files.
 * @param {string} servicePath - Absolute path to the service repo
 * @param {string[]} files - Relative file paths
 * @param {boolean} enable - true to set, false to clear
 */
export async function setSkipWorktree(servicePath, files, enable) {
  const cwd = resolvePath(servicePath);
  const flag = enable ? '--skip-worktree' : '--no-skip-worktree';
  for (const file of files) {
    await shellLogin(`git update-index ${flag} '${file}'`, { cwd });
  }
}

/**
 * Get files with --skip-worktree flag set.
 * @param {string} servicePath - Absolute path to the service repo
 * @returns {Promise<string[]>} Files with skip-worktree flag
 */
export async function getSkipWorktreeFiles(servicePath) {
  const cwd = resolvePath(servicePath);
  const { stdout } = await shellLogin('git ls-files -v', { cwd, timeout: 10000 });
  return stdout.split('\n')
    .filter(line => line.startsWith('S '))
    .map(line => line.slice(2));
}
