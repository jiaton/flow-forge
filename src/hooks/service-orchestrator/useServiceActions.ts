/**
 * Custom hook for service actions (start, stop, restart)
 * Handles service lifecycle operations with database sync
 */

import { useCallback } from 'react';
import { Service } from '../../components/ServiceOrchestrator/types';
import { ServiceManager } from '../../services/service-orchestrator/ServiceManager';
import { SERVICE_STATUS } from '../../shared/constants/service';
import { useDbAppStore as useAppStore } from '../../stores/dbAppStore';

interface UseServiceActionsProps {
  updateServiceStatus: (serviceId: string, status: Service['status']) => void;
}

export const useServiceActions = ({
  updateServiceStatus,
}: UseServiceActionsProps) => {
  const { selectedTeam, addNotification } = useAppStore();

  /**
   * Start a service
   */
  const startService = useCallback(
    async (service: Service) => {
      try {
        updateServiceStatus(service.id, SERVICE_STATUS.STARTING);

        const response = await ServiceManager.startService(
          service,
          selectedTeam
        );

        if (!response.success) {
          throw new Error(response.error || 'Failed to start service');
        }

        updateServiceStatus(service.id, SERVICE_STATUS.RUNNING);

        addNotification({
          message: `${service.name} started successfully`,
          type: 'success',
        });

        return response;
      } catch (error) {
        console.error(`Failed to start service ${service.name}:`, error);
        updateServiceStatus(service.id, SERVICE_STATUS.ERROR);

        addNotification({
          message: `Failed to start ${service.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'error',
        });

        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    [selectedTeam, updateServiceStatus, addNotification]
  );

  /**
   * Stop a service
   */
  const stopService = useCallback(
    async (service: Service) => {
      try {
        updateServiceStatus(service.id, SERVICE_STATUS.STOPPING);

        const result = await ServiceManager.stopService(service, selectedTeam);

        if (!result.success) {
          throw new Error(result.error || 'Failed to stop service');
        }

        updateServiceStatus(service.id, SERVICE_STATUS.IDLE);

        addNotification({
          message: `${service.name} stopped successfully`,
          type: 'info',
        });

        return result;
      } catch (error) {
        console.error(`Failed to stop service ${service.name}:`, error);
        updateServiceStatus(service.id, SERVICE_STATUS.ERROR);

        addNotification({
          message: `Failed to stop ${service.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'error',
        });

        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    [selectedTeam, updateServiceStatus, addNotification]
  );

  /**
   * Restart a service
   */
  const restartService = useCallback(
    async (service: Service) => {
      try {
        updateServiceStatus(service.id, SERVICE_STATUS.RESTARTING);

        // Stop first
        await ServiceManager.stopService(service, selectedTeam);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify stopped — force-stop if still running
        const status = await window.electronAPI?.checkServiceStatus([service.id]);
        if (status?.results?.[service.id]?.state === SERVICE_STATUS.RUNNING) {
          await ServiceManager.forceStopService(service.id);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Start again
        const startResponse = await ServiceManager.startService(
          service,
          selectedTeam
        );

        if (!startResponse.success) {
          throw new Error(startResponse.error || 'Failed to start');
        }

        updateServiceStatus(service.id, SERVICE_STATUS.RUNNING);

        addNotification({
          message: `${service.name} restarted successfully`,
          type: 'success',
        });

        return { success: true };
      } catch (error) {
        console.error(`Failed to restart service ${service.name}:`, error);
        updateServiceStatus(service.id, SERVICE_STATUS.ERROR);

        addNotification({
          message: `Failed to restart ${service.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'error',
        });

        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    [selectedTeam, updateServiceStatus, addNotification]
  );

  /**
   * Force stop a service with SIGKILL
   */
  const forceStopService = useCallback(
    async (service: Service) => {
      try {
        updateServiceStatus(service.id, SERVICE_STATUS.STOPPING);
        const result = await ServiceManager.forceStopService(service.id);
        if (!result.success) throw new Error(result.error || 'Failed to force stop');
        updateServiceStatus(service.id, SERVICE_STATUS.IDLE);
        addNotification({ message: `${service.name} force stopped`, type: 'warning' });
        return result;
      } catch (error) {
        console.error(`Failed to force stop ${service.name}:`, error);
        updateServiceStatus(service.id, SERVICE_STATUS.ERROR);
        addNotification({
          message: `Failed to force stop ${service.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'error',
        });
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    [updateServiceStatus, addNotification]
  );

  /**
   * Start all orchestrated services
   */
  const startAllServices = useCallback(
    async (services: Service[]) => {
      if (services.length === 0) return;

      for (const service of services) {
        await startService(service);
      }
    },
    [startService]
  );

  /**
   * Stop all running services
   */
  const stopAllServices = useCallback(
    async (services: Service[]) => {
      const runningServices = services.filter(s => s.status === SERVICE_STATUS.RUNNING);

      for (const service of runningServices) {
        await stopService(service);
      }
    },
    [stopService]
  );

  return {
    startService,
    stopService,
    forceStopService,
    restartService,
    startAllServices,
    stopAllServices,
  };
};
