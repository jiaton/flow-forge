/**
 * Custom hook for service status monitoring
 * Checks service status on focus/visibility changes and manual refresh
 * Syncs status with database
 */

import { useEffect, useRef, useCallback } from 'react';
import { Service } from '../../components/ServiceOrchestrator/types';
import { ServiceManager } from '../../services/service-orchestrator/ServiceManager';
import { SERVICE_STATUS, type ServiceStatus } from '../../shared/constants/service';
import { logger } from '../../lib/logger';

const log = logger.namespace('ServiceStatusMonitoring');

interface UseServiceStatusMonitoringProps {
  services: Service[];
  updateServiceStatus: (
    serviceId: string,
    status: ServiceStatus,
    diagnostics?: {
      pid?: number;
      diagnosticMessage?: string;
      detectionMethod?: 'pid-file' | 'port-based' | 'command-check' | null;
      lastChecked?: string;
      processInfo?: Record<string, unknown>;
      portInfo?: Record<string, unknown>;
    }
  ) => void;
  enabled?: boolean;
}

export const useServiceStatusMonitoring = ({
  services,
  updateServiceStatus,
  enabled = true,
}: UseServiceStatusMonitoringProps) => {
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check service statuses
   */
  const checkStatuses = useCallback(async () => {
    if (services.length === 0) return;

    try {
      const serviceIds = services.map(s => s.id);
      const results = await ServiceManager.checkServiceStatuses(serviceIds);

      let hasChanges = false;

      services.forEach(async service => {
        const statusInfo = results[service.id];
        if (!statusInfo) return;

        const newStatus = mapStateToStatus(statusInfo.state);

        // Extract diagnostic info from detailed status
        const diagnostics = statusInfo.detailedStatus ? {
          pid: statusInfo.detailedStatus.process?.pid,
          diagnosticMessage: statusInfo.detailedStatus.diagnosticMessage,
          detectionMethod: statusInfo.detailedStatus.process?.method,
          lastChecked: statusInfo.lastChecked,
          processInfo: statusInfo.detailedStatus.process,
          portInfo: statusInfo.detailedStatus.port
        } : undefined;

        if (service.status !== newStatus) {
          hasChanges = true;
          log.info('Service status changed', {
            serviceId: service.id,
            oldStatus: service.status,
            newStatus,
            pid: diagnostics?.pid,
            method: diagnostics?.detectionMethod
          });
        }

        // Always update diagnostics (PID, detection method, etc.)
        updateServiceStatus(service.id, newStatus, diagnostics);

        if (service.status !== newStatus) {
          // Persist status change to database
          if (window.electronAPI?.db) {
            try {
              await window.electronAPI.db.serviceState.updateState(service.id, newStatus);
              log.debug('Persisted state to database', { serviceId: service.id, status: newStatus });
            } catch (dbError) {
              log.error('Failed to persist state to database', dbError, { serviceId: service.id });
            }
          }
        }
      });

      if (hasChanges) {
        log.debug('Services updated');
      }
    } catch (error) {
      log.error('Error checking service statuses', error);
    }
  }, [services, updateServiceStatus]);

  /**
   * Debounced status check
   */
  const debouncedStatusCheck = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (services.length > 0) {
        log.debug('Running debounced check');
        checkStatuses();
      }
    }, 2500);
  }, [checkStatuses, services.length]);

  /**
   * Set up monitoring on mount and when services change
   */
  useEffect(() => {
    if (!enabled || services.length === 0) {
      return;
    }

    // Initial debounced check
    debouncedStatusCheck();

    const handleFocus = () => {
      log.debug('Window focused');
      debouncedStatusCheck();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        log.debug('Tab visible');
        debouncedStatusCheck();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    enabled,
    services.length,
    debouncedStatusCheck,
  ]);

  return {
    checkStatuses,
    manualRefresh: debouncedStatusCheck,
  };
};

/**
 * Map database state to frontend status
 */
function mapStateToStatus(state: string): ServiceStatus {
  switch (state) {
    case 'running':
      return SERVICE_STATUS.RUNNING;
    case 'starting':
      return SERVICE_STATUS.STARTING;
    case 'stopping':
      return SERVICE_STATUS.STOPPING;
    case 'restarting':
      return SERVICE_STATUS.RESTARTING;
    case 'error':
      return SERVICE_STATUS.ERROR;
    default:
      return SERVICE_STATUS.IDLE;
  }
}
