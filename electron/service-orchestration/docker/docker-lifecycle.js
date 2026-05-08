/**
 * Docker Lifecycle Manager
 *
 * Manages Docker Compose services: start, stop, status, and log streaming.
 * Used when a service has mode: 'docker' in its YAML config.
 */

import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { createLogger } from '../../utils/logger.js';
import { logBufferManager } from '../logs/buffer.js';
import { serviceStateManager } from '../state-manager.js';
import { SERVICE_STATUS } from '../../../src/shared/constants/service.ts';
import { dockerPull } from './docker-actions.js';

const execFileAsync = promisify(execFile);
const logger = createLogger('DockerLifecycle');

/** Track log-follow processes per service */
const logProcesses = new Map();

/**
 * Resolve compose command — prefer `docker compose` (V2), fallback to `docker-compose`
 */
let composeCmd = null;
async function getComposeCommand() {
  if (composeCmd) return composeCmd;
  try {
    await execFileAsync('docker', ['compose', 'version'], { timeout: 5000 });
    composeCmd = { bin: 'docker', prefix: ['compose'] };
  } catch {
    composeCmd = { bin: 'docker-compose', prefix: [] };
  }
  return composeCmd;
}

/**
 * Build compose args for a service config
 */
function buildComposeArgs(serviceConfig, subcommand) {
  const docker = serviceConfig.docker || {};
  const composePath = docker.composePath || 'docker-compose.yml';
  const args = ['-f', composePath, ...subcommand];
  if (docker.service) args.push(docker.service);
  return args;
}

/**
 * Resolve working directory from service config path
 */
function resolveWorkingDir(serviceConfig) {
  const configPath = serviceConfig.path || '';
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  return configPath.replace(/~/g, homeDir).replace(/\$HOME/g, homeDir);
}

/**
 * Execute a compose command and return stdout
 */
async function runCompose(serviceConfig, subcommand, opts = {}) {
  const cmd = await getComposeCommand();
  const args = [...cmd.prefix, ...buildComposeArgs(serviceConfig, subcommand)];
  const cwd = resolveWorkingDir(serviceConfig);

  logger.debug('Running compose', { bin: cmd.bin, args, cwd });
  const { stdout, stderr } = await execFileAsync(cmd.bin, args, {
    cwd,
    timeout: opts.timeout || 60000,
    env: { ...process.env, COMPOSE_ANSI: 'never' },
  });
  if (stderr && opts.logStderr !== false) {
    logger.debug('Compose stderr', { stderr: stderr.trim() });
  }
  return stdout.trim();
}

/**
 * Start a Docker service
 */
export async function dockerStart(serviceId, serviceConfig) {
  const addLog = (level, msg) => logBufferManager.add(serviceId, level, msg, 'docker');

  try {
    addLog('INFO', 'Starting Docker containers...');
    serviceStateManager.updateServiceState(serviceId, { state: SERVICE_STATUS.STARTING, processType: 'docker' });

    // Pull if configured
    const pull = serviceConfig.docker?.pull || 'auto';
    if (pull === 'always') {
      await dockerPull(serviceId, serviceConfig);
    }

    // Start containers
    await runCompose(serviceConfig, ['up', '-d', '--remove-orphans'], { timeout: 120000 });
    addLog('INFO', 'Containers started');

    // Attach log stream
    attachLogStream(serviceId, serviceConfig);

    // Check status after brief delay
    setTimeout(async () => {
      const status = await dockerGetStatus(serviceId, serviceConfig);
      serviceStateManager.updateServiceState(serviceId, { state: status.status, processType: 'docker' });
    }, 2000);

    return { success: true, message: `Docker service ${serviceId} started`, state: SERVICE_STATUS.STARTING };
  } catch (error) {
    addLog('ERROR', `Failed to start: ${error.message}`);
    serviceStateManager.updateServiceState(serviceId, { state: SERVICE_STATUS.ERROR, error: error.message });
    return { success: false, error: error.message, state: SERVICE_STATUS.ERROR };
  }
}

/**
 * Stop a Docker service
 */
export async function dockerStop(serviceId, serviceConfig) {
  const addLog = (level, msg) => logBufferManager.add(serviceId, level, msg, 'docker');

  try {
    addLog('INFO', 'Stopping Docker containers...');
    serviceStateManager.updateServiceState(serviceId, { state: SERVICE_STATUS.STOPPING });

    // Kill log stream first
    detachLogStream(serviceId);

    await runCompose(serviceConfig, ['down', '--remove-orphans'], { timeout: 30000 });
    addLog('INFO', 'Containers stopped');

    serviceStateManager.updateServiceState(serviceId, { state: SERVICE_STATUS.IDLE });
    return { success: true, message: `Docker service ${serviceId} stopped`, state: SERVICE_STATUS.IDLE };
  } catch (error) {
    addLog('ERROR', `Failed to stop: ${error.message}`);
    serviceStateManager.updateServiceState(serviceId, { state: SERVICE_STATUS.ERROR, error: error.message });
    return { success: false, error: error.message, state: SERVICE_STATUS.ERROR };
  }
}

/**
 * Force stop a Docker service
 */
export async function dockerForceStop(serviceId, serviceConfig) {
  const addLog = (level, msg) => logBufferManager.add(serviceId, level, msg, 'docker');

  try {
    detachLogStream(serviceId);
    await runCompose(serviceConfig, ['kill']);
    await runCompose(serviceConfig, ['down', '--remove-orphans', '-v']);
    addLog('WARN', 'Containers force stopped');
    serviceStateManager.updateServiceState(serviceId, { state: SERVICE_STATUS.IDLE });
    return { success: true, message: `Docker service ${serviceId} force stopped` };
  } catch (error) {
    addLog('ERROR', `Force stop failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get Docker service status by parsing container states
 */
export async function dockerGetStatus(serviceId, serviceConfig) {
  try {
    const output = await runCompose(serviceConfig, ['ps', '--format', 'json', '-a'], { logStderr: false });
    if (!output) {
      return { status: SERVICE_STATUS.IDLE, containers: [] };
    }

    // docker compose ps --format json outputs one JSON object per line
    const containers = output.split('\n')
      .filter(line => line.trim().startsWith('{'))
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);

    if (containers.length === 0) {
      return { status: SERVICE_STATUS.IDLE, containers: [] };
    }

    // Map container states to FlowForge status
    const states = containers.map(c => {
      const state = (c.State || c.state || '').toLowerCase();
      const health = (c.Health || c.health || '').toLowerCase();
      if (state === 'running' && health === 'unhealthy') return SERVICE_STATUS.ERROR;
      if (state === 'running' && health === 'starting') return SERVICE_STATUS.STARTING;
      if (state === 'running') return SERVICE_STATUS.RUNNING;
      if (state === 'created') return SERVICE_STATUS.STARTING;
      if (state === 'restarting') return SERVICE_STATUS.RESTARTING;
      if (state === 'exited') {
        const code = c.ExitCode ?? c.exitCode ?? -1;
        return code === 0 ? SERVICE_STATUS.IDLE : SERVICE_STATUS.ERROR;
      }
      return SERVICE_STATUS.IDLE;
    });

    // Aggregate: any error = ERROR, all running = RUNNING, any starting = STARTING
    let status;
    if (states.includes(SERVICE_STATUS.ERROR)) status = SERVICE_STATUS.ERROR;
    else if (states.includes(SERVICE_STATUS.RESTARTING)) status = SERVICE_STATUS.RESTARTING;
    else if (states.every(s => s === SERVICE_STATUS.RUNNING)) status = SERVICE_STATUS.RUNNING;
    else if (states.includes(SERVICE_STATUS.STARTING)) status = SERVICE_STATUS.STARTING;
    else status = SERVICE_STATUS.IDLE;

    const containerInfo = containers.map(c => {
      const health = (c.Health || c.health || '').toLowerCase();
      return {
        name: c.Name || c.name,
        state: c.State || c.state,
        health: health || null,
      };
    });

    return { status, containers: containerInfo };
  } catch (error) {
    logger.debug('Status check failed (containers likely not created)', { serviceId, error: error.message });
    return { status: SERVICE_STATUS.IDLE, containers: [] };
  }
}

/**
 * Attach a log-follow process for streaming container logs
 */
function attachLogStream(serviceId, serviceConfig) {
  detachLogStream(serviceId); // Kill existing if any

  const cmd = composeCmd || { bin: 'docker', prefix: ['compose'] };
  const args = [...cmd.prefix, ...buildComposeArgs(serviceConfig, ['logs', '-f', '--tail=50'])];
  const cwd = resolveWorkingDir(serviceConfig);

  const proc = spawn(cmd.bin, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });

  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => {
      const { container, message } = parseContainerPrefix(line);
      logBufferManager.add(serviceId, 'INFO', message, 'docker', container ? { container } : undefined);
    });
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => {
      if (!line.includes('level=warning')) {
        const { container, message } = parseContainerPrefix(line);
        logBufferManager.add(serviceId, 'ERROR', message, 'docker', container ? { container } : undefined);
      }
    });
  });

  proc.on('close', () => {
    logProcesses.delete(serviceId);
  });

  logProcesses.set(serviceId, proc);
  logger.debug('Attached log stream', { serviceId, pid: proc.pid });
}

/**
 * Parse container name prefix from docker compose log lines.
 * Format: "container-name-1  | actual log message"
 */
function parseContainerPrefix(line) {
  const match = line.match(/^([a-zA-Z0-9_-]+)\s+\|\s+(.*)$/);
  if (match) {
    return { container: match[1], message: match[2] };
  }
  return { container: null, message: line };
}

/**
 * Detach (kill) the log-follow process
 */
function detachLogStream(serviceId) {
  const proc = logProcesses.get(serviceId);
  if (proc) {
    try { proc.kill('SIGTERM'); } catch { /* already dead */ }
    logProcesses.delete(serviceId);
    logger.debug('Detached log stream', { serviceId });
  }
}

/**
 * Check if Docker is available on this system
 */
export async function isDockerAvailable() {
  try {
    await execFileAsync('docker', ['info'], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Re-attach to running Docker services (called on app startup)
 */
export async function recoverDockerServices(dockerServices) {
  const recovered = [];
  for (const [serviceId, serviceConfig] of Object.entries(dockerServices)) {
    try {
      const { status, containers } = await dockerGetStatus(serviceId, serviceConfig);
      if (status === SERVICE_STATUS.RUNNING || status === SERVICE_STATUS.STARTING) {
        serviceStateManager.updateServiceState(serviceId, { state: status, processType: 'docker' });
        attachLogStream(serviceId, serviceConfig);
        recovered.push(serviceId);
        logger.info('Recovered Docker service', { serviceId, containers: containers.length });
      }
    } catch (error) {
      logger.debug('Failed to recover Docker service', { serviceId, error: error.message });
    }
  }
  return recovered;
}
