/**
 * Patch Manager - Content-based 3-way merge for service repo customizations.
 *
 * Strategy: store (mine, base) per file. On apply, run `git merge-file`
 * against current upstream - purely content-based, survives branch updates.
 *
 * Storage layout per override:
 *   ~/.flowforge/patches/<serviceId>/<patchName>/<file>.mine   - your version
 *   ~/.flowforge/patches/<serviceId>/<patchName>/<file>.base   - upstream when you saved
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execDirect } from '../execution/shell.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('PatchManager');

// Git command constants
const GIT = 'git';

const GIT_CMDS = {
  diffNameOnly:       ['diff', '--name-only'],
  diffNameOnlyCached: ['diff', '--name-only', '--cached'],
  show:               (ref) => ['show', ref],
  mergeFile:          (current, base, other) => ['merge-file', '--diff3', current, base, other],
  checkoutHead:       (files) => ['checkout', 'HEAD', '--', ...files],
  stashPush:          (msg, files) => ['stash', 'push', '-m', msg, '--', ...files],
  stashApply:         (ref) => ['stash', 'apply', ref],
  stashDrop:          (ref) => ['stash', 'drop', ref],
  stashList:          ['stash', 'list', '--format=%gd %s'],
  lsFiles:            ['ls-files', '-v'],
  updateIndexSkip:    (file) => ['update-index', '--skip-worktree', file],
  updateIndexNoSkip:  (file) => ['update-index', '--no-skip-worktree', file],
};

// Path helpers

function resolvePath(p) {
  if (!p) return p;
  return p.replace(/^\$HOME|^~/g, os.homedir()).replace(/\$HOME/g, os.homedir());
}

function git(args, options = {}) {
  return execDirect(GIT, args, { timeout: 30000, maxBuffer: 10 * 1024 * 1024, ...options });
}

// Public API

/**
 * Get list of modified files (staged + unstaged) in a git repo.
 * @param {string} servicePath
 * @returns {Promise<string[]>}
 */
export async function getModifiedFiles(servicePath) {
  const cwd = resolvePath(servicePath);
  const [unstaged, staged] = await Promise.all([
    git(GIT_CMDS.diffNameOnly, { cwd }),
    git(GIT_CMDS.diffNameOnlyCached, { cwd }),
  ]);
  const files = new Set([
    ...unstaged.stdout.trim().split('\n').filter(Boolean),
    ...staged.stdout.trim().split('\n').filter(Boolean),
  ]);
  return [...files];
}

/**
 * Read the current content of a file in the repo (HEAD version = upstream base).
 * Uses a temp file to avoid stdout buffer limits on large files.
 * @param {string} servicePath
 * @param {string} relativeFile
 * @returns {Promise<string>}
 */
export async function readHeadFile(servicePath, relativeFile) {
  const cwd = resolvePath(servicePath);
  try {
    const { stdout } = await git(GIT_CMDS.show(`HEAD:${relativeFile}`), { cwd });
    return stdout;
  } catch {
    // File does not exist in HEAD (new untracked file) — base is empty
    return '';
  }
}

/**
 * Parse file paths from a unified diff (e.g. IntelliJ "Copy as Patch").
 * Extracts +++ b/<file> lines — these are the files modified by the patch.
 * @param {string} diffContent
 * @returns {string[]} relative file paths
 */
export function parseFilesFromDiff(diffContent) {
  return [...diffContent.matchAll(/^\+\+\+ b\/(.+)$/gm)].map(m => m[1].trim());
}


 /** Reads the live file (mine) and HEAD version (base) for each.
 * @param {string} servicePath
 * @param {string[]} relPaths
 * @returns {Promise<string[]>} resolves to array of override objects
 */
export async function captureOverrides(servicePath, relPaths) {
  const cwd = resolvePath(servicePath);
  return Promise.all(relPaths.map(async relPath => {
    const mine = fs.readFileSync(path.join(cwd, relPath), 'utf8');
    const base = await readHeadFile(servicePath, relPath);
    return { relPath, mine, base };
  }));
}


/* Apply a set of file overrides using 3-way merge.
 * Clean merges are applied directly via git merge-file.
 * Conflicted files go through a temporary stash so git marks them as
 * conflicted in the index - IDE (IntelliJ, VS Code) will show the merge UI.
 * The stash is dropped immediately after apply; it is only a transit mechanism.
 *
 * @param {string} servicePath
 * @param {Array} overrides - objects with { relPath, mine, base }
 * @returns {Promise<Array>} per-file results with { relPath, success, hasConflicts }
 */
export async function applyOverrides(servicePath, overrides) {
  const cwd = resolvePath(servicePath);
  const clean = [];
  const conflicted = [];

  // Phase 1: attempt merge-file for each file
  for (const { relPath, mine, base } of overrides) {
    const absPath = path.join(cwd, relPath);
    const tmpMine = `${absPath}.ff-mine`;
    const tmpBase = `${absPath}.ff-base`;
    try {
      fs.writeFileSync(tmpMine, mine, 'utf8');
      fs.writeFileSync(tmpBase, base, 'utf8');
      try {
        await git(GIT_CMDS.mergeFile(absPath, tmpBase, tmpMine), { cwd });
        clean.push({ relPath, success: true, hasConflicts: false });
      } catch {
        // Conflict - restore file to HEAD, handle via stash in phase 2
        await git(GIT_CMDS.checkoutHead([relPath]), { cwd });
        conflicted.push({ relPath, mine });
      }
    } catch (err) {
      logger.error(`applyOverrides failed for ${relPath}:`, err.message);
      clean.push({ relPath, success: false, hasConflicts: false, error: err.message });
    } finally {
      if (fs.existsSync(tmpMine)) fs.unlinkSync(tmpMine);
      if (fs.existsSync(tmpBase)) fs.unlinkSync(tmpBase);
    }
  }

  if (!conflicted.length) return clean;

  // Phase 2: for conflicted files, write mine into working tree, stash, apply back.
  // This makes git mark them as conflicted in the index so IDEs show the merge UI.
  // The stash is a transit mechanism only — dropped immediately after apply.
  const stashMsg = `ff-patch-conflict-${Date.now()}`;
  const realConflicts = [];
  try {
    for (const { relPath, mine } of conflicted) {
      fs.writeFileSync(path.join(cwd, relPath), mine, 'utf8');
    }
    await git(GIT_CMDS.stashPush(stashMsg, conflicted.map(f => f.relPath)), { cwd });

    const { stdout } = await git(GIT_CMDS.stashList, { cwd });
    const stashRef = stdout.split('\n').find(l => l.includes(stashMsg))?.split(' ')[0];

    if (stashRef) {
      await git(GIT_CMDS.stashApply(stashRef), { cwd }).catch(() => {});
      await git(GIT_CMDS.stashDrop(stashRef), { cwd });

      // Only report conflict if file actually contains conflict markers
      for (const { relPath } of conflicted) {
        const content = fs.readFileSync(path.join(cwd, relPath), 'utf8');
        if (content.includes('<<<<<<<')) realConflicts.push(relPath);
      }
    }
  } catch (err) {
    logger.error('stash conflict flow failed:', err.message);
  }

  return [
    ...clean,
    ...conflicted.map(({ relPath }) => ({
      relPath,
      success: true,
      hasConflicts: realConflicts.includes(relPath),
    })),
  ];
}

/**
 * Reset files to HEAD version (discard working tree changes).
 * @param {string} servicePath
 * @param {string[]} relPaths
 */
export async function resetFilesToHead(servicePath, relPaths) {
  const cwd = resolvePath(servicePath);
  await git(GIT_CMDS.checkoutHead(relPaths), { cwd });
}
/** * @param {string} servicePath
 * @param {string[]} files
 * @param {boolean} enable
 */
export async function setSkipWorktree(servicePath, files, enable) {
  const cwd = resolvePath(servicePath);
  const buildArgs = enable ? GIT_CMDS.updateIndexSkip : GIT_CMDS.updateIndexNoSkip;
  for (const file of files) {
    await git(buildArgs(file), { cwd });
  }
}

/**
 * Get files with --skip-worktree flag set.
 * @param {string} servicePath
 * @returns {Promise<string[]>}
 */
export async function getSkipWorktreeFiles(servicePath) {
  const cwd = resolvePath(servicePath);
  const { stdout } = await git(GIT_CMDS.lsFiles, { cwd, timeout: 10000 });
  return stdout.split('\n')
    .filter(line => line.startsWith('S '))
    .map(line => line.slice(2));
}
