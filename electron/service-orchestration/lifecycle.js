import { serviceStateManager } from './state-manager.js';
import { getServiceStatus } from './runtime-monitor.js';
import { logBufferManager } from './logs/buffer.js';
import { serviceCommands, loadServiceCommands } from './config/microservice-config.js';
import { startServiceProcess } from './execution/index.js';
import { createLogger } from '../utils/logger.js';
import { writePidFile, removePidFile, readPidFile } from './utils/pid-manager.js';
import { SERVICE_STATUS, PROCESS_TYPE } from '../../src/shared/constants/service.ts';
import { dockerStart, dockerStop, dockerForceStop } from './docker/docker-lifecycle.js';

const log = createLogger('ServiceLifecycle');

export const SERVICE_STATES = SERVICE_STATUS;
export const PROCESS_TYPES = PROCESS_TYPE;

export async function handleStartService(serviceId, serviceName, serviceType, port, endpoint, team, _executionMode = null, detached = true) {
  try {
    loadServiceCommands();
    log.info('Starting service', { serviceName, serviceId });

    // Route to Docker lifecycle if mode is docker
    const serviceConfig = serviceCommands[serviceId];
    if (serviceConfig?.mode === 'docker') {
      log.info('Using Docker lifecycle', { serviceId });
      return await dockerStart(serviceId, serviceConfig);
    }

    const statusInfo = await getServiceStatus(serviceId);
    log.debug('Current status', { serviceId, statusInfo });
    const existingService = serviceStateManager.getService(serviceId);

    if (statusInfo.status === SERVICE_STATUS.RUNNING) {
      log.info('Service already running', { serviceId });
      return { success: true, message: 'Service is already running', state: SERVICE_STATUS.RUNNING };
    }
    if (statusInfo.status === SERVICE_STATUS.STARTING || (existingService && existingService.state === SERVICE_STATUS.STARTING)) {
      log.info('Service already starting', { serviceId });
      return { success: true, message: 'Service is already starting', state: SERVICE_STATUS.STARTING };
    }

    const startCommand = serviceCommands[serviceId]?.commands?.start;
    const checkCommand = serviceCommands[serviceId]?.commands?.check;
    if (!startCommand) {
      log.warn('No start command configured', { serviceId, availableServices: Object.keys(serviceCommands), config: serviceCommands[serviceId] });
      throw new Error(`No start command configured for service: ${serviceId}`);
    }

    let workingDir;
    const configuredPath = serviceCommands[serviceId]?.path;
    if (configuredPath) {
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      workingDir = configuredPath.replace(/~/g, homeDir).replace(/\$HOME/g, homeDir);
    }

    const serviceInfo = { name: serviceName, type: serviceType, port, endpoint, team, command: startCommand, checkCommand, workingDir, processType: PROCESS_TYPE.INTERNAL };
    serviceStateManager.registerService(serviceId, serviceInfo);
    serviceStateManager.markServiceStarting(serviceId, { processType: PROCESS_TYPE.INTERNAL });

    log.info('Starting service with internal process capture', { serviceId });
    const result = await startServiceProcess(serviceId, startCommand, { cwd: workingDir, detached });

    serviceStateManager.markServiceStarting(serviceId, { processType: PROCESS_TYPE.INTERNAL, process: result.process, pid: result.pid });

    if (result.pid && workingDir) {
      writePidFile(serviceId, result.pid, workingDir);
      log.debug('Wrote PID file', { serviceId, pid: result.pid, workingDir });
    }

    log.info('Service started successfully', { serviceName });
    return { success: true, message: `Service ${serviceName} started successfully`, stdout: result.stdout || result.message, stderr: result.stderr || '', state: SERVICE_STATUS.STARTING };
  } catch (error) {
    log.error('Failed to start service', error, { serviceId });
    serviceStateManager.updateServiceState(serviceId, { state: SERVICE_STATUS.ERROR, reason: 'Service start failed', error: error.message });
    return { success: false, error: error.message || 'Failed to start service', stderr: error.stderr || '', state: SERVICE_STATUS.ERROR };
  }
}

function killProcessTree(pid, signal = 'SIGTERM') {
  try {
    process.kill(-pid, signal);
  } catch {
    try { process.kill(pid, signal); } catch { /* already dead */ }
  }
}

export async function handleStopService(serviceId, _team) {
  try {
    log.info('Stopping service', { serviceId });

    // Route to Docker lifecycle if mode is docker
    const serviceConfig = serviceCommands[serviceId];
    if (serviceConfig?.mode === 'docker') {
      log.info('Using Docker lifecycle for stop', { serviceId });
      return await dockerStop(serviceId, serviceConfig);
    }

    const managedService = serviceStateManager.getService(serviceId);

    if (managedService) {
      serviceStateManager.updateServiceState(serviceId, { state: SERVICE_STATUS.STOPPING, reason: 'Stop requested via UI' });
    }
    logBufferManager.add(serviceId, 'INFO', 'Service stop requested via UI', 'system');

    let result = null;
    let processKilled = false;

    // Priority 1: Kill direct process reference
    if (managedService && managedService.process) {
      try {
        log.info('Killing internal process', { serviceId, pid: managedService.process.pid });
        killProcessTree(managedService.process.pid, 'SIGTERM');
        processKilled = true;
        result = { stdout: 'Internal process terminated', stderr: '' };
      } catch (processError) {
        log.error('Failed to kill internal process', processError, { serviceId });
      }
    }

    // Priority 2: Kill by stored PID file
    if (!processKilled) {
      const pidData = readPidFile(serviceId);
      const storedPid = pidData?.pid;
      if (storedPid) {
        try {
          log.info('Killing stored PID process group', { serviceId, pid: storedPid });
          killProcessTree(storedPid, 'SIGTERM');
          processKilled = true;
          result = { stdout: 'Stored PID process terminated', stderr: '' };
        } catch (pidError) {
          log.error('Failed to kill stored PID', pidError, { serviceId });
        }
      }
    }

    // Priority 3: Kill by port
    if (!processKilled) {
      const port = serviceCommands[serviceId]?.port;
      if (port) {
        try {
          const { execSync } = await import('child_process');
          const pids = execSync(`lsof -ti:${port}`, { encoding: 'utf8', timeout: 5000 }).trim();
          if (pids) {
            log.info('Killing by port', { serviceId, port, pids });
            for (const pid of pids.split('\n')) {
              killProcessTree(parseInt(pid), 'SIGTERM');
            }
            processKilled = true;
            result = { stdout: `Killed processes on port ${port}`, stderr: '' };
          }
        } catch {
          log.warn('No process found on port', { serviceId, port });
        }
      }
      if (!processKilled) {
        log.warn('No PID or port to kill, service may already be stopped', { serviceId });
        result = { stdout: 'No process found to kill', stderr: '' };
      }
    }

    if (managedService) {
      serviceStateManager.updateServiceState(serviceId, { state: SERVICE_STATUS.IDLE, reason: 'Stop command executed', processKilled });
      removePidFile(serviceId);
      log.debug('Removed PID file', { serviceId });
      // Stop log file tailing
      const { stopLogFileTailing } = await import('./logs/detached-tailer.js');
      stopLogFileTailing(serviceId);
      // Verify stop after delay
      setTimeout(async () => {
        const { getServiceStatus: checkStatus } = await import('./runtime-monitor.js');
        checkStatus(serviceId, true);
      }, 2000);
    }

    log.info('Stop command completed', { serviceId });
    return { success: true, message: `Service ${serviceId} stop initiated successfully`, stdout: result?.stdout || 'Stop command executed', stderr: result?.stderr || '', state: SERVICE_STATUS.STOPPING };
  } catch (error) {
    log.error('Failed to stop service', error, { serviceId });
    const managedService = serviceStateManager.getService(serviceId);
    if (managedService) {
      serviceStateManager.updateServiceState(serviceId, { state: SERVICE_STATUS.ERROR, reason: 'Service stop failed', error: error.message });
    }
    return { success: false, error: error.message || 'Failed to stop service', stderr: error.stderr || '', state: SERVICE_STATUS.ERROR };
  }
}

export async function handleForceStopService(serviceId) {
  log.info('Force stopping service', { serviceId });

  // Route to Docker lifecycle if mode is docker
  const serviceConfig = serviceCommands[serviceId];
  if (serviceConfig?.mode === 'docker') {
    return await dockerForceStop(serviceId, serviceConfig);
  }

  const managedService = serviceStateManager.getService(serviceId);
  const pid = managedService?.process?.pid;
  if (pid) {
    killProcessTree(pid, 'SIGKILL');
    log.info('Sent SIGKILL to process group', { serviceId, pid });
  }
  const pidData = readPidFile(serviceId);
  const storedPid = pidData?.pid;
  if (storedPid && storedPid !== pid) {
    killProcessTree(storedPid, 'SIGKILL');
    log.info('Sent SIGKILL to stored PID group', { serviceId, pid: storedPid });
  }
  if (managedService) {
    serviceStateManager.updateServiceState(serviceId, { state: SERVICE_STATUS.IDLE, reason: 'Force stopped' });
  }
  removePidFile(serviceId);
  logBufferManager.add(serviceId, 'WARN', 'Service force stopped (SIGKILL)', 'system');
  return { success: true, message: `Service ${serviceId} force stopped` };
}
