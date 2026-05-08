/**
 * Internal Process Execution - Windows Implementation
 *
 * TODO: Implement Windows-specific process spawning and management
 *
 * Windows support is deferred for future development.
 * When implementing, consider:
 * - Using 'cmd.exe' or 'powershell.exe' as the shell
 * - Windows-specific path handling (backslashes, drive letters)
 * - Different environment variable handling (%VAR% vs $VAR)
 * - Process termination differences (no SIGTERM)
 * - Windows-specific log file locations (APPDATA)
 */

import { createLogger } from '../../utils/logger.js';

const logger = createLogger('InternalWindows');

export function startServiceProcess(_serviceId, _command, _options = {}) {
  return new Promise((_resolve, reject) => {
    reject(new Error('Windows support not yet implemented. Please use macOS or Linux.'));
  });
}

export async function recoverDetachedServices() {
  logger.warn('[WINDOWS] Detached service recovery not yet implemented');
  return { total: 0, recovered: 0 };
}

export function stopLogFileTailing(_serviceId) {
  // Stub for Windows - will implement when Windows support is added
}
