import { logBufferManager } from './buffer.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('Logs');

/**
 * Return buffered logs for a service.
 * Status info is already known by the frontend — no need to re-check here.
 */
export async function handleGetServiceLogs(serviceId, team) {
  try {
    const logs = logBufferManager.getAll(serviceId) || [];
    return { success: true, logs };
  } catch (error) {
    logger.error(`Failed to get logs for ${serviceId}:`, error.message);
    return {
      success: false,
      error: error.message,
      logs: [{
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message: `Error fetching logs: ${error.message}`,
        source: 'system',
      }],
    };
  }
}
