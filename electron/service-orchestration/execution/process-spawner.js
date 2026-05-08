/**
 * Process Spawner - macOS/Unix
 * Handles spawning and managing service processes
 */

import { spawn } from 'child_process';
import { logBufferManager } from '../logs/buffer.js';
import { detachedServicesRepo } from '../../database/repositories/service-orchestration/index.js';
import { startLogFileTailing } from '../logs/detached-tailer.js';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('ProcessSpawner');

/**
 * Start a long-running service process with log capture
 */
export function startServiceProcess(serviceId, command, options = {}) {
  return new Promise((resolve, reject) => {
    // Platform check: this implementation is for macOS/Unix only
    if (process.platform === 'win32') {
      const errorMsg = 'Windows is not currently supported. Please use macOS or Linux.';
      logger.error(`[${serviceId}] ${errorMsg}`);
      return reject(new Error(errorMsg));
    }

    const { cwd, env, detached = false } = options;

    // Ensure buffer exists
    logBufferManager.get(serviceId);

    logger.debug(`Starting service ${serviceId}`);
    logger.debug(`Command: ${command}`);

    // Clear any existing logs for this service to start fresh
    logBufferManager.clear(serviceId);

    // Define addLog function first
    const addLog = (level, message, source = 'system', details) => {
      logBufferManager.add(serviceId, level, message, source, details);
    };

    // Add initial startup log
    addLog('INFO', `Starting ${serviceId} with command: ${command}`, 'system');

    // Wrap command to load shell environment (for nvm, aliases, etc.)
    // Load shell environment for the spawned process.
    // Do NOT source ~/.zshrc or ~/.bashrc — they contain interactive-only code
    // (prompts, completions) that hangs in non-interactive shells.
    // Instead, source only what's needed: nvm.sh for node version management.
    const wrappedCommand = `export NVM_DIR="\${NVM_DIR:-$HOME/.nvm}"; [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"; ${command}`;

    const spawnEnv = {
      ...process.env,  // Start with current process environment
      ...env           // Apply any custom environment variables from options
    };

    // Setup logging for detached processes
    let stdioConfig = ['pipe', 'pipe', 'pipe'];
    let logFilePath = null;
    let actualCommand = wrappedCommand;

    if (detached) {
      // For detached processes, write logs to files
      const logsDir = path.join(app.getPath('userData'), 'service-logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      logFilePath = path.join(logsDir, `${serviceId}.log`);

      // Redirect output to log file within the command itself
      actualCommand = `${wrappedCommand} >> "${logFilePath}" 2>&1`;
      stdioConfig = ['ignore', 'ignore', 'ignore']; // Detached processes don't use parent's stdio

      addLog('INFO', `Detached service logging to: ${logFilePath}`, 'system');
    }

    // Use shell to execute commands
    // Note: Using shell: true lets Node.js pick the appropriate shell
    logger.info(`[${serviceId}] Spawning process with command: ${actualCommand.substring(0, 500)}...`);
    logger.info(`[${serviceId}] Working directory: ${cwd || process.cwd()}`);
    logger.info(`[${serviceId}] Detached mode: ${detached}`);

    const childProcess = spawn(actualCommand, [], {
      cwd: cwd,  // Set initial working directory (optional)
      env: spawnEnv,
      stdio: stdioConfig,
      shell: true,  // Use system default shell (more reliable than specifying path)
      detached: detached,  // If true, service survives parent process exit
      killSignal: 'SIGTERM'
    });

    // If detached, unref so parent can exit independently
    if (detached) {
      childProcess.unref();
    }

    // Capture stdout/stderr (only for non-detached processes)
    if (!detached) {
      childProcess.stdout.on('data', (data) => {
        const output = data.toString();
        const lines = output.split('\n').filter(line => line.trim());
        lines.forEach((line) => {
          if (line.trim()) {
            addLog('INFO', line.trim(), 'stdout');
          }
        });
      });

      childProcess.stderr.on('data', (data) => {
        const output = data.toString();
        const lines = output.split('\n').filter(line => line.trim());
        lines.forEach((line) => {
          if (line.trim()) {
            addLog('ERROR', line.trim(), 'stderr');
          }
        });
      });
    } else {
      // For detached processes, tail the log file periodically
      startLogFileTailing(serviceId, logFilePath, addLog);
    }

    // Monitor process state
    childProcess.on('spawn', () => {
      logger.debug(`[${serviceId}] Process spawned with PID: ${childProcess.pid}`);
      addLog('INFO', `Process spawned with PID: ${childProcess.pid}`, 'system');

      // Store PID and metadata in database for recovery (detached processes only)
      if (detached) {
        try {
          detachedServicesRepo.save(serviceId, childProcess.pid, {
            command: command,
            workingDir: cwd,
            logFilePath,
            startTime: Date.now()
          });
          logger.debug(`Stored ${serviceId} with PID ${childProcess.pid} in database`);
        } catch (err) {
          logger.error(`Failed to store PID for ${serviceId}:`, err);
        }
      }
    });

    childProcess.on('close', (code, signal) => {
      logger.debug(`[${serviceId}] Process closed with code: ${code}, signal: ${signal}`);
      addLog('INFO', `Process closed with code: ${code}, signal: ${signal}`, 'system');

      if (code !== 0) {
        addLog('ERROR', `Service exited with non-zero code: ${code}`, 'system');
      }
    });

    // Handle process events
    childProcess.on('error', (error) => {
      addLog('ERROR', `Process error: ${error.message}`, 'system');
      reject(error);
    });

    childProcess.on('exit', (code, signal) => {
      const message = signal
        ? `Process exited with signal: ${signal}`
        : `Process exited with code: ${code}`;
      addLog(code === 0 ? 'INFO' : 'ERROR', message, 'system');

      // Clean up detached service from database if it was detached
      if (detached) {
        try {
          detachedServicesRepo.delete(serviceId);
          logger.debug(`Removed ${serviceId} from database`);
        } catch (err) {
          logger.error(`Failed to remove PID for ${serviceId}:`, err);
        }
      }
    });

    // Add initial log entry
    addLog('INFO', `Starting service: ${serviceId}`, 'system');
    addLog('INFO', `Command: ${command}`, 'system');
    addLog('INFO', `Working directory: ${cwd || process.cwd()}`, 'system');

    // Give the process a moment to start and potentially fail
    setTimeout(() => {
      if (childProcess.killed) {
        addLog('ERROR', 'Process failed to start - killed', 'system');
        reject(new Error('Process failed to start - killed'));
      } else if (childProcess.exitCode !== null) {
        addLog('ERROR', `Process exited early with code: ${childProcess.exitCode}`, 'system');
        reject(new Error(`Process exited early with code: ${childProcess.exitCode}`));
      } else {
        addLog('INFO', `Service started with PID: ${childProcess.pid}`, 'system');
        addLog('DEBUG', 'Log capture initialized successfully', 'system');

        logger.debug(`[${serviceId}] Current logs count after startup:`, logBufferManager.getAll(serviceId)?.length || 0);

        resolve({
          process: childProcess,
          pid: childProcess.pid,
          stdout: 'Process started successfully',
          stderr: ''
        });
      }
    }, 2000); // Increased timeout to 2 seconds
  });
}
