/**
 * PTY Manager - Manages interactive terminal sessions via node-pty.
 * Each service can have one active PTY session.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pty = require('node-pty');

import os from 'os';
import fs from 'fs';
import { createLogger } from './utils/logger.js';

const logger = createLogger('PTY');

const sessions = new Map();

/**
 * Spawn an interactive shell for a service.
 * Sources nvm.sh and cd's into the service working directory.
 */
export function spawnPty(serviceId, cwd, mainWindow, { logFile } = {}) {
  // If session already exists, return existing PID
  const existing = sessions.get(serviceId);
  if (existing) {
    logger.debug(`PTY already exists for ${serviceId}, reusing`);
    return { pid: existing.pid };
  }

  const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : '/bin/zsh');

  // Resolve shell variables in cwd (e.g., $HOME)
  const resolvedCwd = cwd
    ? cwd.replace(/\$HOME/g, os.homedir()).replace(/~(?=\/|$)/g, os.homedir())
    : os.homedir();

  const ptyProcess = pty.spawn(shell, ['-l'], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: resolvedCwd,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      NVM_DIR: process.env.NVM_DIR || `${os.homedir()}/.nvm`,
      BROWSER: process.env.BROWSER || (os.platform() === 'darwin' ? 'open' : ''),
      // Remove Electron-specific vars that confuse child processes
      ELECTRON_RUN_AS_NODE: undefined,
      ELECTRON_NO_ASAR: undefined,
    },
  });

  // Write PTY output to log file if specified (for routine runs)
  let logStream = null;
  if (logFile) {
    logStream = fs.createWriteStream(logFile, { flags: 'a' });
  }

  // Forward PTY output to renderer (only if this is still the active session)
  ptyProcess.onData((data) => {
    if (sessions.get(serviceId) !== ptyProcess) return;
    if (logStream) logStream.write(data.replace(/\x1b\[[0-9;]*m/g, '')); // strip ANSI for log
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pty-data', { serviceId, data });
    }
  });

  ptyProcess.onExit(({ exitCode }) => {
    if (sessions.get(serviceId) !== ptyProcess) return;
    if (logStream) { logStream.end(); logStream = null; }
    logger.debug(`PTY exited for ${serviceId} with code ${exitCode}`);
    sessions.delete(serviceId);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pty-exit', { serviceId, exitCode });
    }
  });

  sessions.set(serviceId, ptyProcess);

  logger.debug(`Spawned PTY for ${serviceId} (PID: ${ptyProcess.pid})`);
  return { pid: ptyProcess.pid };
}

/** Write data (keystrokes) to a PTY session */
export function writePty(serviceId, data) {
  const session = sessions.get(serviceId);
  if (session) {
    session.write(data);
  }
}

/** Resize a PTY session */
export function resizePty(serviceId, cols, rows) {
  const session = sessions.get(serviceId);
  if (session) {
    session.resize(cols, rows);
  }
}

/** Kill a PTY session */
export function killPty(serviceId) {
  const session = sessions.get(serviceId);
  if (session) {
    session.kill();
    sessions.delete(serviceId);
    logger.debug(`Killed PTY for ${serviceId}`);
  }
}

/** Kill all PTY sessions (for app shutdown) */
export function killAllPtys() {
  for (const [id, session] of sessions) {
    session.kill();
    logger.debug(`Killed PTY for ${id}`);
  }
  sessions.clear();
}
