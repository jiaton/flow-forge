/**
 * Docker Actions — Pull and Rebuild
 * Triggered from context menu via IPC
 */

import { spawn } from 'child_process';
import { logBufferManager } from '../logs/buffer.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('DockerActions');

function resolveWorkingDir(serviceConfig) {
  const configPath = serviceConfig.path || '';
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  return configPath.replace(/~/g, homeDir).replace(/\$HOME/g, homeDir);
}

function getComposeFile(serviceConfig) {
  return serviceConfig.docker?.composePath || 'docker-compose.yml';
}

/**
 * Spawn a compose command and stream output line-by-line to the log buffer.
 * Returns a promise that resolves on exit code 0, rejects otherwise.
 */
function spawnStreaming(serviceId, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn('docker', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, COMPOSE_ANSI: 'never' },
    });

    let stderr = '';

    proc.stdout.on('data', (data) => {
      data.toString().split('\n').filter(l => l.trim()).forEach(line => {
        logBufferManager.add(serviceId, 'INFO', line, 'docker');
      });
    });

    proc.stderr.on('data', (data) => {
      // docker compose writes progress to stderr
      data.toString().split('\n').filter(l => l.trim()).forEach(line => {
        logBufferManager.add(serviceId, 'INFO', line, 'docker');
        stderr += line + '\n';
      });
    });

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `Exit code ${code}`));
    });

    proc.on('error', reject);
  });
}

export async function dockerPull(serviceId, serviceConfig) {
  const cwd = resolveWorkingDir(serviceConfig);
  const file = getComposeFile(serviceConfig);

  try {
    logBufferManager.add(serviceId, 'INFO', 'Pulling images...', 'docker');
    await spawnStreaming(serviceId, ['compose', '-f', file, 'pull'], cwd);
    logBufferManager.add(serviceId, 'INFO', 'Pull complete', 'docker');
    return { success: true, message: 'Images pulled' };
  } catch (error) {
    logBufferManager.add(serviceId, 'ERROR', `Pull failed: ${error.message}`, 'docker');
    return { success: false, error: error.message };
  }
}

export async function dockerRebuild(serviceId, serviceConfig) {
  const cwd = resolveWorkingDir(serviceConfig);
  const file = getComposeFile(serviceConfig);

  try {
    logBufferManager.add(serviceId, 'INFO', 'Rebuilding containers...', 'docker');
    await spawnStreaming(serviceId, ['compose', '-f', file, 'up', '-d', '--build', '--remove-orphans'], cwd);
    logBufferManager.add(serviceId, 'INFO', 'Rebuild complete', 'docker');
    return { success: true, message: 'Containers rebuilt' };
  } catch (error) {
    logBufferManager.add(serviceId, 'ERROR', `Rebuild failed: ${error.message}`, 'docker');
    return { success: false, error: error.message };
  }
}
