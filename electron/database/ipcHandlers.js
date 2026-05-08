/**
 * IPC handlers for database operations
 * Exposes database functionality to the renderer process
 */

import { ipcMain } from 'electron';
import {
  appSettingsRepo,
  teamConfigsRepo,
  viewStatesRepo,
  notificationsRepo,
  gitSettingsRepo,
  serviceStateRepo
} from './repositories/index.js';
import { serviceStateManager } from '../service-orchestration/state-manager.js';
import { setupGitIpcHandlers } from '../git/ipcHandlers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('DBIPC');

/**
 * Setup all database IPC handlers
 */
export const setupDatabaseIpcHandlers = () => {
  // ============================================
  // App Settings Handlers
  // ============================================

  ipcMain.handle('db:appSettings:get', async (event, key) => {
    return appSettingsRepo.get(key);
  });

  ipcMain.handle('db:appSettings:getAll', async () => {
    return appSettingsRepo.getAll();
  });

  ipcMain.handle('db:appSettings:set', async (event, key, value) => {
    appSettingsRepo.set(key, value);
    return true;
  });

  ipcMain.handle('db:appSettings:setMany', async (event, settings) => {
    appSettingsRepo.setMany(settings);
    return true;
  });

  // ============================================
  // Team Configs Handlers
  // ============================================

  ipcMain.handle('db:teamConfigs:get', async (event, team) => {
    return teamConfigsRepo.get(team);
  });

  ipcMain.handle('db:teamConfigs:getAll', async () => {
    return teamConfigsRepo.getAll();
  });

  ipcMain.handle('db:teamConfigs:save', async (event, team, config) => {
    teamConfigsRepo.save(team, config);
    return true;
  });

  // ============================================
  // View States Handlers
  // ============================================

  ipcMain.handle('db:viewStates:get', async (event, viewId) => {
    return viewStatesRepo.get(viewId);
  });

  ipcMain.handle('db:viewStates:getAll', async () => {
    return viewStatesRepo.getAll();
  });

  ipcMain.handle('db:viewStates:save', async (event, viewId, state) => {
    viewStatesRepo.save(viewId, state);
    return true;
  });

  // ============================================
  // Notifications Handlers
  // ============================================

  ipcMain.handle('db:notifications:get', async (event, id) => {
    return notificationsRepo.get(id);
  });

  ipcMain.handle('db:notifications:getAll', async (event, options) => {
    return notificationsRepo.getAll(options);
  });

  ipcMain.handle('db:notifications:getActive', async () => {
    return notificationsRepo.getActive();
  });

  ipcMain.handle('db:notifications:save', async (event, notification) => {
    notificationsRepo.save(notification);
    return true;
  });

  ipcMain.handle('db:notifications:dismiss', async (event, id) => {
    notificationsRepo.dismiss(id);
    return true;
  });

  ipcMain.handle('db:notifications:deleteOld', async (event, daysToKeep) => {
    return notificationsRepo.deleteOld(daysToKeep);
  });

  // ============================================
  // Service State Handlers
  // ============================================

  ipcMain.handle('db:serviceState:get', async (event, id) => {
    return serviceStateRepo.get(id);
  });

  ipcMain.handle('db:serviceState:getAll', async () => {
    return serviceStateRepo.getAll();
  });

  ipcMain.handle('db:serviceState:getAllAsObject', async () => {
    return serviceStateRepo.getAllAsObject();
  });

  ipcMain.handle('db:serviceState:getByTeam', async (event, team) => {
    return serviceStateRepo.getByTeam(team);
  });

  ipcMain.handle('db:serviceState:save', async (event, id, serviceData) => {
    serviceStateRepo.save(id, serviceData);
    return true;
  });

  ipcMain.handle('db:serviceState:saveAll', async (event, servicesObject) => {
    serviceStateRepo.saveAll(servicesObject);
    return true;
  });

  ipcMain.handle('db:serviceState:updateState', async (event, id, state) => {
    serviceStateRepo.updateState(id, state);
    return true;
  });

  // ============================================
  // Git Settings Handlers
  // ============================================

  ipcMain.handle('db:gitSettings:get', async () => {
    return gitSettingsRepo.get();
  });

  ipcMain.handle('db:gitSettings:save', async (event, settings) => {
    gitSettingsRepo.save(settings);
    return true;
  });

  // Setup Git provider IPC handlers
  setupGitIpcHandlers();

  logger.info('✓ Database IPC handlers registered');
};
