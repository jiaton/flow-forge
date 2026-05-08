/**
 * Detached Service Recovery
 * Handles recovery of detached processes after app restart
 */

import { detachedServicesRepo } from '../../database/repositories/service-orchestration/index.js';
import { logBufferManager } from '../logs/buffer.js';
import { startLogFileTailing } from '../logs/detached-tailer.js';
import { createLogger } from '../../utils/logger.js';
import { recoverDockerServices } from '../docker/docker-lifecycle.js';

const logger = createLogger('DetachedRecovery');

/**
 * Check if a process is still running
 * @param {number} pid - Process ID to check
 * @returns {boolean} True if process is running
 */
function isProcessRunning(pid) {
  try {
    // Sending signal 0 checks if process exists without killing it
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Recover detached services on app startup
 * Checks database for detached processes and reconnects to running ones
 * @returns {Promise<{total: number, recovered: number}>} Recovery statistics
 */
export async function recoverDetachedServices() {
  try {
    const { serviceStateManager, SERVICE_STATES } = await import('../state-manager.js');
    const detachedServices = detachedServicesRepo.getAll();

    logger.debug(`Found ${detachedServices.length} detached services in database`);

    for (const service of detachedServices) {
      const isRunning = isProcessRunning(service.pid);

      if (isRunning) {
        logger.debug(`Service ${service.serviceId} (PID ${service.pid}) is still running`);

        // Update service state to running
        serviceStateManager.updateServiceState(service.serviceId, {
          state: SERVICE_STATES.RUNNING,
          pid: service.pid,
          processType: 'detached',
          startedAt: service.startTime,
          detached: true,
          logFilePath: service.logFilePath
        });

        // Resume log tailing
        const addLog = (level, message, source = 'system', details) => {
          logBufferManager.add(service.serviceId, level, message, source, details);
        };
        startLogFileTailing(service.serviceId, service.logFilePath, addLog);

      } else {
        logger.debug(`Service ${service.serviceId} (PID ${service.pid}) is no longer running`);
        // Clean up database entry
        detachedServicesRepo.delete(service.serviceId);
      }
    }

    return {
      total: detachedServices.length,
      recovered: detachedServices.filter(s => isProcessRunning(s.pid)).length
    };
  } catch (error) {
    logger.error('[RECOVERY] Failed to recover detached services:', error);
    return { total: 0, recovered: 0 };
  }
}

/**
 * Recover Docker services on app startup
 * Checks running containers for services with mode: docker
 * @param {Object} dockerServices - Map of serviceId -> serviceConfig for docker-mode services
 * @returns {Promise<string[]>} List of recovered service IDs
 */
export async function recoverDetachedDockerServices(dockerServices) {
  if (!dockerServices || Object.keys(dockerServices).length === 0) return [];
  try {
    const recovered = await recoverDockerServices(dockerServices);
    if (recovered.length > 0) {
      logger.info(`Recovered ${recovered.length} Docker services: ${recovered.join(', ')}`);
    }
    return recovered;
  } catch (error) {
    logger.error('[RECOVERY] Failed to recover Docker services:', error);
    return [];
  }
}
