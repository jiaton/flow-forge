import { serviceStateManager } from './state-manager.js';
import { serviceCommands, servicePorts } from './config/microservice-config.js';
import { readPidFile, writePidFile, findPidByPort, removePidFile } from './utils/pid-manager.js';
import { logBufferManager } from './logs/buffer.js';
import { createLogger } from '../utils/logger.js';
import { SERVICE_STATUS } from '../../src/shared/constants/service.ts';
import { dockerGetStatus } from './docker/docker-lifecycle.js';

const logger = createLogger('RuntimeMonitor');
const serviceStatusCache = new Map();

export async function isServiceActuallyRunning(serviceId) {
  const port = servicePorts[serviceId] || serviceStateManager.getService(serviceId)?.port;
  if (!port) return false;
  return !!await findPidByPort(port);
}

export async function getServiceStatus(serviceId, autoUpdate = false) {
  const service = serviceStateManager.getService(serviceId);
  const port = service?.port || servicePorts[serviceId];

  // Docker mode: use container state instead of PID/port detection
  const serviceConfig = serviceCommands[serviceId];
  if (serviceConfig?.mode === 'docker') {
    const { status, containers } = await dockerGetStatus(serviceId, serviceConfig);
    const diagnostics = {
      serviceId,
      status,
      state: status,
      isRunning: status === SERVICE_STATUS.RUNNING,
      process: { running: status === SERVICE_STATUS.RUNNING, pid: null, method: 'docker' },
      port: { listening: status === SERVICE_STATUS.RUNNING, number: port || null },
      diagnosticMessage: containers.length ? `${containers.length} container(s): ${containers.map(c => `${c.name}[${c.state}${c.health ? ':' + c.health : ''}]`).join(', ')}` : 'No containers',
      reason: status === SERVICE_STATUS.RUNNING ? 'Containers healthy'
        : status === SERVICE_STATUS.STARTING ? 'Waiting for healthcheck'
        : status === SERVICE_STATUS.ERROR ? 'Container unhealthy or exited'
        : 'Containers not running',
      lastChecked: new Date().toISOString(),
    };
    if (autoUpdate && service && status !== service.state) {
      serviceStateManager.updateServiceState(serviceId, { state: status, reason: diagnostics.reason, detectionMethod: 'docker' });
    }
    return diagnostics;
  }

  const diagnostics = {
    status: SERVICE_STATUS.UNKNOWN,
    process: { running: false, pid: null, method: null, lastChecked: new Date().toISOString() },
    port: { listening: false, number: port || null, checkResult: null },
    diagnosticMessage: '',
    reason: '',
  };

  // Check PID file
  const pidFileData = readPidFile(serviceId);
  if (pidFileData) {
    try {
      process.kill(pidFileData.pid, 0);
      diagnostics.process.running = true;
      diagnostics.process.pid = pidFileData.pid;
      diagnostics.process.method = 'pid-file';
    } catch {
      removePidFile(serviceId);
    }
  }

  // Check port
  if (port) {
    const portPid = await findPidByPort(port);
    if (portPid) {
      diagnostics.port.listening = true;
      diagnostics.port.checkResult = `Port ${port} listening`;
      diagnostics.process.running = true;
      diagnostics.process.pid = portPid;
      diagnostics.process.method = diagnostics.process.method || 'port-based';
      // Self-heal: write PID file if missing
      const workingDir = service?.workingDir || serviceCommands[serviceId]?.path;
      if (workingDir && !pidFileData) {
        writePidFile(serviceId, portPid, workingDir);
      }
    } else {
      diagnostics.port.checkResult = `Port ${port} not listening`;
    }
  }

  // Determine status
  if (diagnostics.port.listening) {
    diagnostics.status = SERVICE_STATUS.RUNNING;
    diagnostics.reason = 'Port listening';
    diagnostics.diagnosticMessage = `Running on port ${port} (PID ${diagnostics.process.pid})`;
  } else if (service?.state === SERVICE_STATUS.STARTING && diagnostics.process.running) {
    // If stuck in STARTING for >2 min with process alive but no port, mark as error
    const startTime = service.startTime ? new Date(service.startTime).getTime() : 0;
    const elapsed = Date.now() - startTime;
    if (port && elapsed > 120_000) {
      diagnostics.status = SERVICE_STATUS.ERROR;
      diagnostics.reason = 'Startup timeout';
      diagnostics.diagnosticMessage = `Process alive (PID ${diagnostics.process.pid}) but port ${port} not listening after ${Math.round(elapsed / 1000)}s — check logs for build errors`;
    } else {
      diagnostics.status = SERVICE_STATUS.STARTING;
      diagnostics.reason = 'Port not ready';
      diagnostics.diagnosticMessage = `Process running (PID ${diagnostics.process.pid}), waiting for port ${port}`;
    }
  } else {
    diagnostics.status = SERVICE_STATUS.IDLE;
    diagnostics.reason = 'Not running';
    diagnostics.diagnosticMessage = port ? `Port ${port} not listening` : 'No port configured';
  }

  // Auto-update state manager
  if (autoUpdate && service) {
    const metadata = {
      reason: diagnostics.reason,
      lastChecked: diagnostics.process.lastChecked,
      pid: diagnostics.process.pid,
      diagnosticMessage: diagnostics.diagnosticMessage,
      detectionMethod: diagnostics.process.method,
    };
    if (diagnostics.status !== service.state) {
      serviceStateManager.updateServiceState(serviceId, { state: diagnostics.status, ...metadata });
    } else {
      Object.assign(service, {
        lastChecked: diagnostics.process.lastChecked,
        pid: diagnostics.process.pid,
        diagnosticMessage: diagnostics.diagnosticMessage,
        detectionMethod: diagnostics.process.method,
      });
    }
  }

  diagnostics.serviceId = serviceId;
  diagnostics.state = diagnostics.status;
  diagnostics.isRunning = diagnostics.status === SERVICE_STATUS.RUNNING;
  diagnostics.lastChecked = diagnostics.process.lastChecked;
  return diagnostics;
}

export async function handleCheckServiceStatus(serviceIds) {
  try {
    const results = {};
    for (const serviceId of serviceIds) {
      results[serviceId] = await getServiceStatus(serviceId, true);
    }
    return { success: true, results };
  } catch (error) {
    logger.error('Failed to check service statuses:', error);
    return { success: false, error: error.message };
  }
}

export async function handleGetRunningServices() {
  const services = serviceStateManager.getAllServices();
  const running = services.filter(s => s.state === SERVICE_STATUS.RUNNING);
  return { success: true, services: running };
}

export async function handleDebugServiceProcess(serviceId) {
  const service = serviceStateManager.getService(serviceId);
  const status = await getServiceStatus(serviceId);
  return { success: true, service, status };
}

function clearLogCaches() {
  serviceStatusCache.clear();
}
setInterval(clearLogCaches, 5 * 60 * 1000);

export { clearLogCaches };

// Legacy stubs — referenced by index.js but no longer used
export function checkAllServiceStatus() {}
export function startStatusMonitoring() {}
export function stopStatusMonitoring() {}
