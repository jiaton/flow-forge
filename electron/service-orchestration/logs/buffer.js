import { MAX_LOG_ENTRIES, MAX_LOG_BYTES, MAX_LINE_LENGTH, RATE_LIMIT_LINES_PER_SEC, estimateEntryBytes } from './constants.js';

// Per-service in-memory ring buffers with size limits and rate limiting
class ServiceLogBuffer {
  constructor(serviceId) {
    this.serviceId = serviceId;
    this.entries = [];
    this.totalBytes = 0;
    this.lastSecond = 0;
    this.linesThisSecond = 0;
    this.suppressedThisSecond = 0;
  }

  add(level, message, source = 'system', details) {
    // Truncate long lines
    if (typeof message === 'string' && message.length > MAX_LINE_LENGTH) {
      message = message.slice(0, MAX_LINE_LENGTH) + ` … [truncated ${message.length - MAX_LINE_LENGTH} chars]`;
    }

    // Rate limit per second
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec !== this.lastSecond) {
      // flush a summary log if we suppressed in the previous second
      if (this.suppressedThisSecond > 0) {
        this._push({
          timestamp: new Date().toISOString(),
          level: 'WARN',
          message: `Suppressed ${this.suppressedThisSecond} log lines due to rate limit`,
          source: 'system',
        });
      }
      this.lastSecond = nowSec;
      this.linesThisSecond = 0;
      this.suppressedThisSecond = 0;
    }

    if (this.linesThisSecond >= RATE_LIMIT_LINES_PER_SEC) {
      this.suppressedThisSecond += 1;
      return;
    }
    this.linesThisSecond += 1;

    this._push({
      timestamp: new Date().toISOString(),
      level,
      message,
      source,
      details
    });
  }

  _push(entry) {
    const entryBytes = estimateEntryBytes(entry);
    this.entries.push(entry);
    this.totalBytes += entryBytes;

    // Trim by entry count
    while (this.entries.length > MAX_LOG_ENTRIES) {
      const removed = this.entries.shift();
      this.totalBytes -= estimateEntryBytes(removed);
    }
    // Trim by bytes
    while (this.totalBytes > MAX_LOG_BYTES && this.entries.length > 0) {
      const removed = this.entries.shift();
      this.totalBytes -= estimateEntryBytes(removed);
    }
  }

  clear() {
    this.entries = [];
    this.totalBytes = 0;
    this.lastSecond = 0;
    this.linesThisSecond = 0;
    this.suppressedThisSecond = 0;
  }

  getAll() {
    return this.entries;
  }
}

// Manager for multiple services
export class LogBufferManager {
  constructor() {
    this.buffers = new Map();
    this.mainWindow = null;
    this.listeners = new Set(); // Track active listeners
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  // Register a frontend listener for a specific service
  registerListener(serviceId) {
    this.listeners.add(serviceId);
  }

  // Unregister a frontend listener
  unregisterListener(serviceId) {
    this.listeners.delete(serviceId);
  }

  get(serviceId) {
    if (!this.buffers.has(serviceId)) {
      this.buffers.set(serviceId, new ServiceLogBuffer(serviceId));
    }
    return this.buffers.get(serviceId);
  }

  add(serviceId, level, message, source = 'system', details) {
    const buffer = this.get(serviceId);
    const beforeCount = buffer.entries.length;

    buffer.add(level, message, source, details);

    // Only emit if new entries were actually added and someone is listening
    const afterCount = buffer.entries.length;
    if (afterCount > beforeCount && this.listeners.has(serviceId)) {
      this._emitLogUpdate(serviceId, buffer.entries.slice(beforeCount));
    }
  }

  _emitLogUpdate(serviceId, newLogs) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('service-logs-update', {
        serviceId,
        logs: newLogs
      });
    }
  }

  getAll(serviceId) {
    return this.get(serviceId).getAll();
  }

  clear(serviceId) {
    this.get(serviceId).clear();
  }
}

export const logBufferManager = new LogBufferManager();
