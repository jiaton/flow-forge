/**
 * Centralized logging utility for FlowForge
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('Message', { data });
 *   logger.debug('Debug info');
 *   logger.error('Error occurred', error);
 *   logger.warn('Warning', error); // Supports error as second param
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDev: boolean;
  private minLevel: LogLevel;
  private levelEmoji: Record<LogLevel, string>;
  private levelStyle: Record<LogLevel, string>;

  constructor() {
    // Check if running in development mode
    this.isDev = window.electronAPI?.isDev || false;
    // Set minimum log level based on environment
    this.minLevel = this.isDev ? 'debug' : 'info';
    this.levelEmoji = {
      debug: '',
      info: '',
      warn: '⚠️',
      error: '❌',
    };
    // Styles only affect console output; safe for FE
    this.levelStyle = {
      debug: 'color:#b26bff',
      info: 'color:#2f81f7',
      warn: 'color:#d29922;font-weight:bold',
      error: 'color:#f85149;font-weight:bold',
    };
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  /**
   * Debug logging (development only)
   * Supports multiple arguments like console.log
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`%c[DEBUG]%c ${message}`, this.levelStyle.debug, '', ...args);
    }
  }

  /**
   * Info logging
   * Supports multiple arguments like console.log
   */
  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(`%c[INFO]%c ${message}`, this.levelStyle.info, '', ...args);
    }
  }

  /**
   * Warning logging
   * Supports error object or context as second parameter
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(
        `${this.levelEmoji.warn || ''}%c[WARN]%c ${message}`,
        this.levelStyle.warn,
        '',
        ...args
      );
    }
  }

  /**
   * Error logging
   * Supports error object and additional context
   */
  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(
        `${this.levelEmoji.error || ''}%c[ERROR]%c ${message}`,
        this.levelStyle.error,
        '',
        ...args
      );
    }
  }

  /**
   * Create a namespaced logger for a specific module/component
   */
  namespace(name: string) {
    return {
      debug: (message: string, ...args: unknown[]) =>
        this.debug(`[${name}] ${message}`, ...args),
      info: (message: string, ...args: unknown[]) =>
        this.info(`[${name}] ${message}`, ...args),
      warn: (message: string, ...args: unknown[]) =>
        this.warn(`[${name}] ${message}`, ...args),
      error: (message: string, ...args: unknown[]) =>
        this.error(`[${name}] ${message}`, ...args),
    };
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for namespace loggers
export type NamespacedLogger = ReturnType<typeof logger.namespace>;
