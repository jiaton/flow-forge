/**
 * IPC Handlers for Git Provider operations
 * Supports GitLab, GitHub, Bitbucket, and other git hosting providers
 */

import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('GitIPC');
import { CONFIG_FILES } from '../constants.js';
import { gitSettingsRepo, mergeRequestsRepo } from '../database/repositories/git/index.js';
import { GitService } from './gitService.js';
import { handleGetServiceCommands } from '../service-orchestration/commands.js';
import { resolveConfigPath } from '../utils/configPaths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get service configurations including git settings
 */
const getServiceConfig = async () => {
  try {
    const result = await handleGetServiceCommands();
    return result.success ? result.commands : null;
  } catch (error) {
    logger.error('Failed to load service config:', error);
    return null;
  }
};

/**
 * Load git provider configuration from app.config.yaml
 */
const loadGitAppConfig = () => {
  try {
    const configPath = resolveConfigPath(CONFIG_FILES.APP_CONFIG);
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(content);
      return config?.otherServices?.git || {};
    }
  } catch (error) {
    logger.error('Failed to load git app config:', error);
  }
  return {};
};

/**
 * Create GitService with full configuration
 */
const createGitService = async (settings) => {
  const serviceConfig = await getServiceConfig();
  const appConfig = loadGitAppConfig();

  // Merge settings with app config
  const fullConfig = {
    ...settings,
    serviceMapping: appConfig.serviceMapping || {},
    fallbackToBranchDetection: appConfig.fallbackToBranchDetection !== false,
  };

  return new GitService(fullConfig, serviceConfig);
};

/**
 * Setup all Git Provider IPC handlers
 */
export const setupGitIpcHandlers = () => {
  // ============================================
  // Git Settings Handlers
  // ============================================

  ipcMain.handle('git:settings:get', async () => {
    try {
      return { success: true, settings: gitSettingsRepo.get() };
    } catch (error) {
      logger.error('Error getting git settings:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('git:settings:save', async (event, settings) => {
    try {
      gitSettingsRepo.save(settings);
      return { success: true };
    } catch (error) {
      logger.error('Error saving git settings:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('git:settings:validateToken', async () => {
    try {
      const settings = gitSettingsRepo.get();
      if (!settings.accessToken) {
        return { success: false, valid: false, error: 'No access token configured' };
      }

      const gitService = await createGitService(settings);
      const isValid = await gitService.validateToken();
      return { success: true, valid: isValid };
    } catch (error) {
      logger.error('Error validating token:', error);
      return { success: false, valid: false, error: error.message };
    }
  });

  // ============================================
  // Service Configuration Handlers
  // ============================================

  ipcMain.handle('git:getServiceConfig', async (event, serviceName) => {
    try {
      const serviceConfig = await getServiceConfig();
      if (!serviceConfig) {
        return { success: false, error: 'Failed to load service configuration' };
      }

      const settings = gitSettingsRepo.get();
      const gitService = await createGitService(settings);

      return {
        success: true,
        config: {
          projectId: gitService.getProjectId(serviceName),
          defaultReviewers: gitService.getDefaultReviewers(serviceName),
        },
      };
    } catch (error) {
      logger.error('Error getting service git config:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('git:getAllServiceConfigs', async () => {
    try {
      const serviceConfig = await getServiceConfig();
      if (!serviceConfig) {
        return { success: false, error: 'Failed to load service configuration' };
      }

      const settings = gitSettingsRepo.get();
      const gitService = await createGitService(settings);

      const configs = {};
      const services = serviceConfig.services || {};

      for (const serviceName of Object.keys(services)) {
        configs[serviceName] = {
          projectId: gitService.getProjectId(serviceName),
          defaultReviewers: gitService.getDefaultReviewers(serviceName),
        };
      }

      return { success: true, configs };
    } catch (error) {
      logger.error('Failed to get service configs:', error);
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // Merge Request Handlers
  // ============================================

  ipcMain.handle('mr:getAll', async () => {
    try {
      return { success: true, mergeRequests: mergeRequestsRepo.getAll() };
    } catch (error) {
      logger.error('Error getting all merge requests:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mr:getByService', async (event, serviceName) => {
    try {
      return { success: true, mergeRequests: mergeRequestsRepo.getByService(serviceName) };
    } catch (error) {
      logger.error('Error getting merge requests by service:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mr:track', async (event, mrUrl, serviceName = null) => {
    try {
      const settings = gitSettingsRepo.get();
      if (!settings.accessToken) {
        return { success: false, error: 'Git provider access token not configured. Please configure it in settings.' };
      }

      const gitService = await createGitService(settings);
      const mrData = await gitService.fetchCompleteMRData(mrUrl);

      // Auto-detect service name from URL path or branch if not provided
      if (!serviceName) {
        const { projectId } = gitService.parseMRUrl(mrUrl);
        serviceName = gitService.extractServiceName(projectId, mrData.sourceBranch);
      }

      mrData.serviceName = serviceName;

      mergeRequestsRepo.save(mrData);
      return { success: true, mergeRequest: mrData };
    } catch (error) {
      logger.error('Error tracking merge request:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mr:refresh', async (event, mrId) => {
    try {
      const settings = gitSettingsRepo.get();
      if (!settings.accessToken) {
        return { success: false, error: 'Git provider access token not configured' };
      }

      const existingMr = mergeRequestsRepo.get(mrId);
      if (!existingMr) {
        return { success: false, error: 'Merge request not found' };
      }

      const gitService = await createGitService(settings);
      const mrUrl = existingMr.webUrl;
      const mrData = await gitService.fetchCompleteMRData(mrUrl);

      // Preserve local data
      mrData.serviceName = existingMr.serviceName;
      mrData.localNotes = existingMr.localNotes;
      mrData.customTags = existingMr.customTags;

      mergeRequestsRepo.save(mrData);
      return { success: true, mergeRequest: mergeRequestsRepo.get(mrId) };
    } catch (error) {
      logger.error('Error refreshing merge request:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mr:refreshAll', async () => {
    try {
      const settings = gitSettingsRepo.get();
      if (!settings.accessToken) {
        return { success: false, error: 'Git provider access token not configured' };
      }

      const allMrs = mergeRequestsRepo.getAll();
      const gitService = await createGitService(settings);

      const results = await Promise.allSettled(
        allMrs.map(async (mr) => {
          const mrData = await gitService.fetchCompleteMRData(mr.webUrl);
          mrData.serviceName = mr.serviceName;
          mrData.localNotes = mr.localNotes;
          mrData.customTags = mr.customTags;
          mergeRequestsRepo.save(mrData);
          return mrData;
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return {
        success: true,
        results: { successful, failed, total: allMrs.length },
        mergeRequests: mergeRequestsRepo.getAll(),
      };
    } catch (error) {
      logger.error('Error refreshing all merge requests:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mr:updateLocalData', async (event, mrId, data) => {
    try {
      mergeRequestsRepo.updateLocalData(mrId, data);
      return { success: true, mergeRequest: mergeRequestsRepo.get(mrId) };
    } catch (error) {
      logger.error('Error updating MR local data:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mr:delete', async (event, mrId) => {
    try {
      const deleted = mergeRequestsRepo.delete(mrId);
      return { success: deleted };
    } catch (error) {
      logger.error('Error deleting merge request:', error);
      return { success: false, error: error.message };
    }
  });

  logger.info('Git provider IPC handlers registered');
};
