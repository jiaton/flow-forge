/**
 * Shell Service — single source of truth for all command execution.
 *
 * Three modes:
 *   - interactive: User-facing commands (Open IDE, quick commands).
 *                  Runs via login shell with .zshrc sourced (aliases, nvm, PATH).
 *   - service:     Service lifecycle (start/stop, docker compose).
 *                  Runs via login shell for nvm/PATH but non-interactive.
 *   - raw:         System queries (ps, lsof, docker stats).
 *                  Direct execFile, no shell wrapper.
 */

import { exec, execFile, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const USER_SHELL = process.env.SHELL || '/bin/zsh';

/**
 * Run a command in the user's interactive login shell.
 * Sources .zshrc — aliases, nvm, full PATH available.
 */
export async function shellInteractive(command, options = {}) {
  const { cwd, env, timeout = 15000 } = options;
  const wrapped = `${USER_SHELL} -ilc ${JSON.stringify(command)}`;
  const { stdout, stderr } = await execAsync(wrapped, {
    cwd,
    env: { ...process.env, ...env },
    timeout,
  });
  return { stdout, stderr };
}

/**
 * Run a command in the user's login shell (non-interactive).
 * Sources .zprofile/.zshenv — nvm and PATH available, but not aliases.
 */
export async function shellLogin(command, options = {}) {
  const { cwd, env, timeout = 60000 } = options;
  const wrapped = `${USER_SHELL} -lc ${JSON.stringify(command)}`;
  const { stdout, stderr } = await execAsync(wrapped, {
    cwd,
    env: { ...process.env, ...env },
    timeout,
  });
  return { stdout, stderr };
}

/**
 * Run a binary directly without shell interpretation.
 * For system tools (ps, lsof, docker) where no shell env is needed.
 */
export async function execDirect(bin, args = [], options = {}) {
  const { cwd, env, timeout = 10000, maxBuffer } = options;
  const { stdout, stderr } = await execFileAsync(bin, args, {
    cwd,
    env: { ...process.env, ...env },
    timeout,
    encoding: 'utf8',
    ...(maxBuffer !== undefined && { maxBuffer }),
  });
  return { stdout, stderr };
}

/**
 * Spawn a long-running process with the user's login shell env.
 * Returns the child process for attaching to stdout/stderr.
 */
export function spawnService(command, args = [], options = {}) {
  const { cwd, env } = options;
  return spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    shell: USER_SHELL,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/**
 * Spawn a process directly (no shell). For docker, system tools.
 */
export function spawnDirect(bin, args = [], options = {}) {
  const { cwd, env } = options;
  return spawn(bin, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
