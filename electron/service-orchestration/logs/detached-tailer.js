/**
 * Log Tailer - File-based log tailing for detached processes
 * Uses fs.watch for event-driven file change detection.
 * On start, reads the last portion of the existing log file to populate the buffer.
 */

import fs from 'fs';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('DetachedTailer');

const watchers = new Map();

// How many bytes to read from the end of an existing log file on startup
const INITIAL_READ_BYTES = 256 * 1024; // 256 KB

/**
 * Start tailing a log file for a detached process using fs.watch.
 * Reads existing content first, then watches for new data.
 */
export function startLogFileTailing(serviceId, logFilePath, addLog) {
  if (!logFilePath) return;

  // Stop existing tailer if any (prevents duplicates on restart)
  stopLogFileTailing(serviceId);

  if (!fs.existsSync(logFilePath)) {
    try {
      fs.writeFileSync(logFilePath, '', { flag: 'wx' });
    } catch { /* file may already exist */ }
  }

  let fileSize = 0;
  try {
    fileSize = fs.statSync(logFilePath).size;
  } catch { /* start from 0 */ }

  // Read existing content (last INITIAL_READ_BYTES) to populate the log buffer
  if (fileSize > 0) {
    const readStart = Math.max(0, fileSize - INITIAL_READ_BYTES);
    try {
      const buf = Buffer.alloc(fileSize - readStart);
      const fd = fs.openSync(logFilePath, 'r');
      fs.readSync(fd, buf, 0, buf.length, readStart);
      fs.closeSync(fd);

      let content = buf.toString();
      // If we started mid-file, skip the first partial line
      if (readStart > 0) {
        const firstNewline = content.indexOf('\n');
        if (firstNewline !== -1) {
          content = content.slice(firstNewline + 1);
        }
      }

      const lines = content.split('\n').filter(l => l.trim());
      for (const line of lines) {
        addLog('INFO', line.trim(), 'file');
      }
    } catch (error) {
      logger.warn(`Failed to read existing log for ${serviceId}:`, error.message);
    }
  }

  // Now watch for new content from the current end of file
  let lastSize = fileSize;

  const readNewContent = () => {
    try {
      const currentSize = fs.statSync(logFilePath).size;
      if (currentSize <= lastSize) return;

      const buf = Buffer.alloc(currentSize - lastSize);
      const fd = fs.openSync(logFilePath, 'r');
      fs.readSync(fd, buf, 0, buf.length, lastSize);
      fs.closeSync(fd);
      lastSize = currentSize;

      const lines = buf.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        addLog('INFO', line.trim(), 'file');
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error(`Error reading ${serviceId} log:`, error);
      }
    }
  };

  try {
    const watcher = fs.watch(logFilePath, { persistent: false }, (eventType) => {
      if (eventType === 'change') {
        readNewContent();
      }
    });

    watcher.on('error', (err) => {
      logger.warn(`Watcher error for ${serviceId}:`, err.message);
    });

    watchers.set(serviceId, watcher);
  } catch (error) {
    logger.error(`Failed to start watcher for ${serviceId}:`, error);
  }
}

/**
 * Stop log file tailing for a service
 */
export function stopLogFileTailing(serviceId) {
  const watcher = watchers.get(serviceId);
  if (watcher) {
    watcher.close();
    watchers.delete(serviceId);
    logger.debug(`Stopped log file tailing for ${serviceId}`);
  }
}
