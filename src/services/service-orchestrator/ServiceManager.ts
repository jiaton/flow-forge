/**
 * Service Manager - Business logic layer for service orchestration
 * Handles all service-related operations with database persistence
 */

import { Service, ServiceLog } from '../../components/ServiceOrchestrator/types';
import { logger } from '../../lib/logger';

const log = logger.namespace('ServiceManager');

export class ServiceManager {
  /**
   * Start a service via Electron backend
   */
  static async startService(
    service: Service,
    team: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const response = await window.electronAPI.startService({
        serviceId: service.id,
        serviceName: service.name,
        serviceType: service.type,
        port: service.port,
        endpoint: service.endpoint,
        team,
        executionMode: 'internal',
        detached: service.detached ?? true, // Default to true (detached mode)
      });

      // Persist to database after successful start
      if (response.success) {
        await this.persistServiceState(service.id, {
          ...service,
          state: 'running',
          team,
        });
      }

      return response;
    } catch (error) {
      log.error('Start service failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Stop a service via Electron backend
   */
  static async stopService(
    service: Service,
    team: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const response = await window.electronAPI.stopService({
        serviceId: service.id,
        team,
      });

      // Update database state
      if (response.success) {
        await this.persistServiceState(service.id, {
          ...service,
          state: 'idle',
          team,
        });
      }

      return response;
    } catch (error) {
      log.error('Stop service failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Force stop a service with SIGKILL
   */
  static async forceStopService(serviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!window.electronAPI) throw new Error('Electron API not available');
      return await window.electronAPI.forceStopService(serviceId);
    } catch (error) {
      log.error('Force stop service failed', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get service logs from backend
   */
  static async getServiceLogs(serviceId: string, team: string): Promise<ServiceLog[]> {
    try {
      if (!window.electronAPI) {
        return [];
      }

      const response = await window.electronAPI.getServiceLogs({
        serviceId,
        team,
      });

      return response.success ? response.logs : [];
    } catch (error) {
      log.error('Get logs failed', error);
      return [];
    }
  }

  /**
   * Check status of multiple services
   */
  static async checkServiceStatuses(
    serviceIds: string[]
  ): Promise<Record<string, unknown>> {
    try {
      if (!window.electronAPI || serviceIds.length === 0) {
        return {};
      }

      const response = await window.electronAPI.checkServiceStatus(serviceIds);
      return response.success ? response.results : {};
    } catch (error) {
      log.error('Status check failed', error);
      return {};
    }
  }

  /**
   * Load service commands configuration
   */
  static async loadServiceCommands(): Promise<Record<string, unknown>> {
    try {
      if (!window.electronAPI) {
        return {};
      }

      const response = await window.electronAPI.getServiceCommands();
      return response.success ? response.commands : {};
    } catch (error) {
      log.error('Failed to load commands', error);
      return {};
    }
  }

  /**
   * Reload service commands from disk
   */
  static async reloadServiceCommands(): Promise<{
    success: boolean;
    commands?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' };
      }

      const response = await window.electronAPI.reloadServiceCommands();
      return response;
    } catch (error) {
      log.error('Failed to reload commands', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Persist service state to database
   */
  private static async persistServiceState(
    serviceId: string,
    serviceData: Partial<Service & { state: string; team: string }>
  ): Promise<void> {
    try {
      if (!window.electronAPI?.db) {
        return;
      }

      await window.electronAPI.db.serviceState.save(serviceId, {
        name: serviceData.name || '',
        type: serviceData.type || '',
        port: serviceData.port,
        endpoint: serviceData.endpoint,
        team: serviceData.team || '',
        state: serviceData.state || 'idle',
        processType: 'internal',
        detached: serviceData.detached ?? true,
        startTime: new Date().toISOString(),
      });
    } catch (error) {
      log.error('Failed to persist service state', error);
    }
  }

  /**
   * Load all service states from database
   */
  static async loadServiceStatesFromDB(): Promise<Record<string, unknown>> {
    try {
      if (!window.electronAPI?.db) {
        return {};
      }

      const states = await window.electronAPI.db.serviceState.getAllAsObject();
      return states || {};
    } catch (error) {
      log.error('Failed to load service states from DB', error);
      return {};
    }
  }

  /**
   * Load service states for a specific team
   */
  static async loadTeamServiceStates(team: string): Promise<Record<string, unknown>[]> {
    try {
      if (!window.electronAPI?.db) {
        return [];
      }

      const states = await window.electronAPI.db.serviceState.getByTeam(team);
      return states || [];
    } catch (error) {
      log.error('Failed to load team service states', error);
      return [];
    }
  }
}
