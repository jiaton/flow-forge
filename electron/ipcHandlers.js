import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG_FILES, IPC_REMOTE_CONFIG } from './constants.js';
import {
  validateStartServiceRequest,
  validateStopServiceRequest,
  validateGetServiceLogsRequest,
  validateCheckServiceStatusRequest
} from './schemas/ipc/service-management.js';
import {
  handleStartService,
  handleStopService,
  handleForceStopService,
  handleGetServiceLogs,
  handleGetServiceCommands,
  handleReloadServiceCommands,
  handleGetRunningServices,
  handleDebugServiceProcess,
  handleCheckServiceStatus
} from './service-orchestration/index.js';
import { serviceStateManager } from './service-orchestration/state-manager.js';
import { getServiceStatus } from './service-orchestration/runtime-monitor.js';
import { logBufferManager } from './service-orchestration/logs/buffer.js';
import { spawnPty, writePty, resizePty, killPty } from './pty-manager.js';
import { setupDatabaseIpcHandlers } from './database/ipcHandlers.js';
import { resolveConfigPath } from './utils/configPaths.js';
import { getRemoteSource, isUpdateCheckDue, cloneRemoteConfig, refreshRemoteConfig, removeRemoteSource } from './utils/remoteConfigSync.js';
import { createLogger, setLogLevel, getLogLevel } from './utils/logger.js';

const logger = createLogger('IPC');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration Management IPC Handlers
export function setupConfigurationHandlers(mainWindow) {
  // IPC handlers for configuration management
  ipcMain.handle('read-config-file', async (event, filePath) => {
    try {
      const resolvedPath = resolveConfigPath(filePath);
      const isDev = !app.isPackaged;
      logger.debug(`Reading config file: ${resolvedPath}`);
      logger.debug(`Mode: ${isDev ? 'DEVELOPMENT' : 'PRODUCTION (Built App)'}`);
      logger.debug(`User Data Path: ${app.getPath('userData')}`);

      if (!fs.existsSync(resolvedPath)) {
        logger.warn(`File not found: ${resolvedPath}`);
        return { success: false, error: `File not found: ${filePath}` };
      }

      const content = fs.readFileSync(resolvedPath, 'utf8');
      const config = yaml.load(content);

      // Log first few lines to verify correct file is loaded
      const preview = content.split('\n').slice(0, 3).join('\n');
      logger.debug(`File preview:\n${preview}\n...`);

      return { success: true, config };
    } catch (error) {
      logger.error(`Error reading config file:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('write-config-file', async (event, { filePath, config }) => {
    try {
      const content = yaml.dump(config, { indent: 2 });
      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('show-save-dialog', async (event) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [
        { name: 'YAML Files', extensions: ['yaml', 'yml'] }
      ],
      defaultPath: CONFIG_FILES.APP_CONFIG
    });

    return result;
  });

  ipcMain.handle('show-open-dialog', async (event) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'YAML Files', extensions: ['yaml', 'yml'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    return result;
  });

  // Handle configuration save from renderer
  ipcMain.on('save-config', async (event, config) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        filters: [
          { name: 'YAML Files', extensions: ['yaml', 'yml'] }
        ],
        defaultPath: CONFIG_FILES.APP_CONFIG
      });

      if (!result.canceled && result.filePath) {
        const content = yaml.dump(config, { indent: 2 });
        fs.writeFileSync(result.filePath, content, 'utf8');
        event.reply('config-saved', { success: true, filePath: result.filePath });
      }
    } catch (error) {
      event.reply('config-saved', { success: false, error: error.message });
    }
  });

  // Handle configuration reload
  ipcMain.on('reload-config', async (event) => {
    try {
      const configPath = resolveConfigPath(CONFIG_FILES.APP_CONFIG);
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        const config = yaml.load(content);
        event.reply('config-reloaded', { success: true, config });
      } else {
        event.reply('config-reloaded', { success: false, error: 'Configuration file not found' });
      }
    } catch (error) {
      event.reply('config-reloaded', { success: false, error: error.message });
    }
  });
}

// Service Management IPC Handlers
export function setupServiceHandlers() {
  ipcMain.handle('start-service', async (event, data) => {
    // Validate request data
    const validation = validateStartServiceRequest(data);
    if (!validation.success) {
      logger.error('Start service request validation failed:', validation.error);
      if (validation.issues) {
        validation.issues.forEach(issue => {
          logger.error(`  - ${issue.path}: ${issue.message}`);
        });
      }
      return {
        success: false,
        error: validation.error || 'Invalid request data'
      };
    }

    const { serviceId, serviceName, serviceType, port, endpoint, team, executionMode, detached } = validation.data;
    return await handleStartService(serviceId, serviceName, serviceType, port, endpoint, team, executionMode, detached);
  });

  ipcMain.handle('stop-service', async (event, data) => {
    // Validate request data
    const validation = validateStopServiceRequest(data);
    if (!validation.success) {
      logger.error('Stop service request validation failed:', validation.error);
      if (validation.issues) {
        validation.issues.forEach(issue => {
          logger.error(`  - ${issue.path}: ${issue.message}`);
        });
      }
      return {
        success: false,
        error: validation.error || 'Invalid request data'
      };
    }

    const { serviceId, team } = validation.data;
    return await handleStopService(serviceId, team);
  });

  ipcMain.handle('force-stop-service', async (event, { serviceId }) => {
    return await handleForceStopService(serviceId);
  });

  ipcMain.handle('docker:pull', async (event, { serviceId }) => {
    const { serviceCommands } = await import('./service-orchestration/config/microservice-config.js');
    const { dockerPull } = await import('./service-orchestration/docker/docker-actions.js');
    const serviceConfig = serviceCommands[serviceId];
    if (!serviceConfig || serviceConfig.mode !== 'docker') {
      return { success: false, error: 'Not a Docker service' };
    }
    return await dockerPull(serviceId, serviceConfig);
  });

  ipcMain.handle('docker:rebuild', async (event, { serviceId }) => {
    const { serviceCommands } = await import('./service-orchestration/config/microservice-config.js');
    const { dockerRebuild } = await import('./service-orchestration/docker/docker-actions.js');
    const serviceConfig = serviceCommands[serviceId];
    if (!serviceConfig || serviceConfig.mode !== 'docker') {
      return { success: false, error: 'Not a Docker service' };
    }
    return await dockerRebuild(serviceId, serviceConfig);
  });

  ipcMain.handle('get-service-stats', async () => {
    const { getAllServiceStats } = await import('./service-orchestration/utils/process-stats.js');
    const { serviceStateManager } = await import('./service-orchestration/state-manager.js');
    return getAllServiceStats(serviceStateManager.services);
  });

  // Git branch watching — event-driven via fs.watch on .git/HEAD files
  const branchWatchers = new Map();

  function readBranch(gitHeadPath, fs) {
    try {
      const head = fs.readFileSync(gitHeadPath, 'utf8').trim();
      return head.startsWith('ref: refs/heads/') ? head.slice(16) : head.slice(0, 8);
    } catch { return null; }
  }

  ipcMain.handle('get-service-branches', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const { serviceCommands } = await import('./service-orchestration/config/microservice-config.js');
    const home = os.homedir();
    const branches = {};
    for (const [id, cfg] of Object.entries(serviceCommands)) {
      const svcPath = cfg.path?.replace(/\$HOME/g, home).replace(/~/g, home);
      if (!svcPath) continue;
      const headPath = path.join(svcPath, '.git', 'HEAD');
      try {
        branches[id] = readBranch(headPath, fs);
      } catch { /* skip */ }

      // Start watching if not already
      if (!branchWatchers.has(id) && fs.existsSync(headPath)) {
        try {
          const watcher = fs.watch(headPath, { persistent: false }, () => {
            const branch = readBranch(headPath, fs);
            if (branch) {
              const win = BrowserWindow.getAllWindows()[0];
              if (win && !win.isDestroyed()) {
                win.webContents.send('service-branch-changed', { serviceId: id, branch });
              }
            }
          });
          watcher.on('error', () => {}); // ignore watch errors
          branchWatchers.set(id, watcher);
        } catch { /* can't watch, that's fine */ }
      }
    }
    return branches;
  });

  ipcMain.handle('get-service-logs', async (event, data) => {
    // Validate request data
    const validation = validateGetServiceLogsRequest(data);
    if (!validation.success) {
      logger.error('Get service logs request validation failed:', validation.error);
      if (validation.issues) {
        validation.issues.forEach(issue => {
          logger.error(`  - ${issue.path}: ${issue.message}`);
        });
      }
      return {
        success: false,
        error: validation.error || 'Invalid request data'
      };
    }

    const { serviceId, team } = validation.data;
    return await handleGetServiceLogs(serviceId, team);
  });

  ipcMain.handle('get-service-commands', async (event, { reload } = {}) => {
    if (reload) {
      return await handleReloadServiceCommands();
    }
    return await handleGetServiceCommands();
  });

  ipcMain.handle('reload-service-commands', async (event) => {
    return await handleReloadServiceCommands();
  });

  ipcMain.handle('get-running-services', async (event) => {
    return await handleGetRunningServices();
  });

  ipcMain.handle('debug-service-process', async (event, { serviceId }) => {
    return await handleDebugServiceProcess(serviceId);
  });

  ipcMain.handle('check-service-status', async (event, data) => {
    // Validate request data
    const validation = validateCheckServiceStatusRequest(data);
    if (!validation.success) {
      logger.error('Check service status request validation failed:', validation.error);
      if (validation.issues) {
        validation.issues.forEach(issue => {
          logger.error(`  - ${issue.path}: ${issue.message}`);
        });
      }
      return {
        success: false,
        error: validation.error || 'Invalid request data'
      };
    }

    const { serviceIds } = validation.data;
    return await handleCheckServiceStatus(serviceIds);
  });

  // Add debug handler for service state
  ipcMain.handle('debug-service-state', async (event) => {
    const { runningServices, serviceLogs } = await import('./service-orchestration/index.js');
    return {
      success: true,
      debug: {
        runningServicesKeys: Array.from(runningServices.keys()),
        serviceLogsKeys: Array.from(serviceLogs.keys()),
        runningServicesData: Array.from(runningServices.entries()).map(([id, info]) => ({
          id,
          name: info.name,
          pid: info.pid,
          processKilled: info.process?.killed,
          processExitCode: info.process?.exitCode,
          logCount: serviceLogs.get(id)?.length || 0
        }))
      }
    };
  });

  // Log streaming handlers
  ipcMain.handle('subscribe-service-logs', async (event, { serviceId }) => {
    logger.debug(`Frontend subscribing to logs for service: ${serviceId}`);
    logBufferManager.registerListener(serviceId);
    return { success: true };
  });

  ipcMain.handle('unsubscribe-service-logs', async (event, { serviceId }) => {
    logger.debug(`Frontend unsubscribing from logs for service: ${serviceId}`);
    logBufferManager.unregisterListener(serviceId);
    return { success: true };
  });

  // Execute custom commands (for IDE, terminal, folder opening, etc.)
  ipcMain.handle('execute-command', async (event, { command }) => {
    try {
      const { shellInteractive } = await import('./service-orchestration/execution/shell.js');
      logger.debug(`Running: ${command}`);
      const { stdout, stderr } = await shellInteractive(command);
      return { success: true, stdout, stderr };
    } catch (error) {
      logger.error(`Error executing command:`, error);
      return {
        success: false,
        error: error.message,
        stderr: error.stderr,
      };
    }
  });
}

// Log Level Control IPC Handlers
function setupLogLevelHandlers() {
  ipcMain.handle('get-log-level', async () => {
    return { success: true, level: getLogLevel() };
  });

  ipcMain.handle('set-log-level', async (event, level) => {
    try {
      const newLevel = setLogLevel(level);
      return { success: true, level: newLevel };
    } catch (error) {
      logger.error('Failed to set log level:', error);
      return { success: false, error: error.message };
    }
  });
}

// PTY (Interactive Terminal) IPC Handlers
function setupPtyHandlers(mainWindow) {
  ipcMain.handle('pty-spawn', async (event, { serviceId, cwd, logFile }) => {
    try {
      const result = spawnPty(serviceId, cwd, mainWindow, { logFile });
      return { success: true, ...result };
    } catch (error) {
      logger.error('Failed to spawn PTY:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.on('pty-write', (event, { serviceId, data }) => {
    writePty(serviceId, data);
  });

  ipcMain.on('pty-resize', (event, { serviceId, cols, rows }) => {
    resizePty(serviceId, cols, rows);
  });

  ipcMain.handle('pty-kill', async (event, { serviceId }) => {
    killPty(serviceId);
    return { success: true };
  });

  // Remote config sync
  ipcMain.handle(IPC_REMOTE_CONFIG.STATUS, async () => {
    const source = getRemoteSource();
    // Check if config dir has actual content (services yaml files)
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const configDir = path.join(homeDir, '.flowforge', 'config');
    const servicesDir = path.join(configDir, 'services');
    const hasConfig = fs.existsSync(servicesDir) && fs.readdirSync(servicesDir).length > 0;
    return { configured: !!source, hasConfig, source, updateDue: isUpdateCheckDue() };
  });

  ipcMain.handle(IPC_REMOTE_CONFIG.CLONE, async (event, { url, branch }) => {
    return await cloneRemoteConfig(url, branch);
  });

  ipcMain.handle(IPC_REMOTE_CONFIG.REFRESH, async () => {
    return await refreshRemoteConfig();
  });

  ipcMain.handle(IPC_REMOTE_CONFIG.REMOVE, async () => {
    return removeRemoteSource();
  });

  ipcMain.handle(IPC_REMOTE_CONFIG.APPLY_TEMPLATES, async () => {
    try {
      const { configManager } = await import('./utils/configManager.js');
      await configManager.initializeUserConfigFromTemplates();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

// Routine IPC Handlers
function setupRoutineHandlers(mainWindow) {
  ipcMain.handle('open-config-folder', async () => {
    const { shell } = await import('electron');
    const { configManager: cm } = await import('./utils/configManager.js');
    await shell.openPath(cm.getUserConfigDir());
    return { success: true };
  });

  ipcMain.handle('routines:list', async () => {
    const { getRoutinesWithSchedules, setServicesMap } = await import('./service-orchestration/routines/routine-runner.js');
    const { ServiceLoader } = await import('./service-orchestration/config/service-loader.js');
    const { configManager: cm } = await import('./utils/configManager.js');
    const loader = new ServiceLoader(cm.getUserConfigDir());
    setServicesMap(loader.loadServices());
    return { success: true, routines: getRoutinesWithSchedules() };
  });

  ipcMain.handle('routines:run', async (event, { routineId, selectedSteps }) => {
    const { getRoutineScript, setServicesMap } = await import('./service-orchestration/routines/routine-runner.js');
    const { ServiceLoader } = await import('./service-orchestration/config/service-loader.js');
    const { configManager: cm } = await import('./utils/configManager.js');
    const loader = new ServiceLoader(cm.getUserConfigDir());
    setServicesMap(loader.loadServices());
    return getRoutineScript(routineId, selectedSteps);
  });

  ipcMain.handle('routines:save-schedule', async (event, data) => {
    const { routineSchedulesRepo } = await import('./database/repositories/index.js');
    routineSchedulesRepo.save(data);
    return { success: true };
  });

  ipcMain.handle('routines:get-runs', async (event, { routineId, limit }) => {
    const { routineRunsRepo } = await import('./database/repositories/index.js');
    const runs = routineId
      ? routineRunsRepo.getByRoutine(routineId, limit || 10)
      : routineRunsRepo.getRecent(limit || 20);
    return { success: true, runs };
  });

  ipcMain.handle('routines:get-run-log', async (event, { logFile }) => {
    const fs = await import('fs');
    try {
      if (!logFile || !fs.existsSync(logFile)) return { success: false, error: 'Log file not found' };
      const content = fs.readFileSync(logFile, 'utf8');
      return { success: true, content };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

// Patch Management IPC Handlers
function setupPatchHandlers() {
  ipcMain.handle('patch:get-modified-files', async (event, { servicePath }) => {
    const { getModifiedFiles } = await import('./service-orchestration/patches/index.js');
    try {
      return { success: true, files: await getModifiedFiles(servicePath) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Save current working tree changes as a named override set (mine + base per file).
  // `files` must be an array of relative paths to include.
  ipcMain.handle('patch:create', async (event, { servicePath, serviceId, name, files, content }) => {
    const { getModifiedFiles, parseFilesFromDiff, captureOverrides, savePatch } = await import('./service-orchestration/patches/index.js');
    try {
      // If a diff is pasted, parse file list from it instead of reading modified files
      const targetFiles = content
        ? parseFilesFromDiff(content)
        : (files?.length ? files : await getModifiedFiles(servicePath));
      if (!targetFiles.length) return { success: false, error: content ? 'No files found in patch diff' : 'No modified files to save' };
      const overrides = await captureOverrides(servicePath, targetFiles);
      savePatch(serviceId, name, overrides);
      return { success: true, files: targetFiles };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Apply a named patch using 3-way merge (content-based, survives branch updates).
  ipcMain.handle('patch:apply', async (event, { servicePath, serviceId, name }) => {
    const { applyOverrides, loadPatch } = await import('./service-orchestration/patches/index.js');
    try {
      const overrides = loadPatch(serviceId, name);
      const results = await applyOverrides(servicePath, overrides);
      const conflicts = results.filter(r => r.hasConflicts).map(r => r.relPath);
      const failures  = results.filter(r => !r.success).map(r => r.relPath);
      return { success: failures.length === 0, conflicts, failures };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('patch:reset-to-head', async (event, { servicePath, serviceId, name }) => {
    const { loadPatch, resetFilesToHead } = await import('./service-orchestration/patches/index.js');
    try {
      const overrides = loadPatch(serviceId, name);
      await resetFilesToHead(servicePath, overrides.map(o => o.relPath));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('patch:list', async (event, { serviceId }) => {
    const { listPatches } = await import('./service-orchestration/patches/index.js');
    try {
      return { success: true, patches: listPatches(serviceId) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('patch:delete', async (event, { serviceId, name }) => {
    const { deletePatch } = await import('./service-orchestration/patches/index.js');
    try {
      deletePatch(serviceId, name);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('patch:skip-worktree', async (event, { servicePath, files, enable }) => {
    const { setSkipWorktree } = await import('./service-orchestration/patches/index.js');
    try {
      await setSkipWorktree(servicePath, files, enable);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

import { loadModuleHandlers } from './module-loader.js';
import { configManager } from './utils/configManager.js';

// Initialize all IPC handlers
export async function setupIpcHandlers(mainWindow) {
  setupConfigurationHandlers(mainWindow);
  setupServiceHandlers();
  setupDatabaseIpcHandlers();
  setupLogLevelHandlers();
  setupPtyHandlers(mainWindow);
  setupRoutineHandlers(mainWindow);
  setupPatchHandlers();

  // Auto-discover and load modular backend handlers
  await configManager.initializePaths();
  await loadModuleHandlers({
    mainWindow,
    configDir: configManager.userConfigDir,
  });
}