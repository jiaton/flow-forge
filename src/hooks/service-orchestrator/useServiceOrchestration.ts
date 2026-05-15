/**
 * Custom hook for service orchestration logic
 * Manages service state with database persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { Service } from '../../components/ServiceOrchestrator/types';
import { ServiceManager } from '../../services/service-orchestrator/ServiceManager';
import { SERVICE_STATUS, type ServiceStatus } from '../../shared/constants/service';
import { useDbAppStore as useAppStore } from '../../stores/dbAppStore';

export const useServiceOrchestration = (_viewId: string) => {
  const { selectedTeam, getTeamConfig } = useAppStore();
  const teamConfig = getTeamConfig(selectedTeam);

  const [orchestratedServices, setOrchestratedServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load services from database on mount and when team changes
   */
  useEffect(() => {
    const loadPersistedServices = async () => {
      // Skip if no services available yet (loader not ready)
      if (teamConfig.services.length === 0) return;

      setIsLoading(true);
      try {
        // Load service states, detached preferences, and orchestration list in parallel
        const [dbStates, detachedPref, orchestrationPref] = await Promise.all([
          ServiceManager.loadTeamServiceStates(selectedTeam),
          window.electronAPI?.db?.appSettings?.get('detachedServices'),
          window.electronAPI?.db?.appSettings?.get(`orchestratedServices:${selectedTeam}`),
        ]);

        const detachedMap: Record<string, boolean> = detachedPref
          ? JSON.parse(detachedPref)
          : {};

        // Restore orchestration list from persisted IDs
        const orchestratedIds: string[] = orchestrationPref
          ? JSON.parse(orchestrationPref)
          : [];

        if (orchestratedIds.length > 0) {
          const servicesWithState = teamConfig.services
            .filter(service => orchestratedIds.includes(service.id))
            .map(service => {
              const dbState = dbStates.find(s => s.id === service.id);
              return {
                ...service,
                status: dbState ? mapStateToStatus(dbState.state) : service.status,
                detached: detachedMap[service.id] ?? true,
              };
            });

          if (servicesWithState.length > 0) {
            setOrchestratedServices(servicesWithState);
            setSelectedServices(new Set(servicesWithState.map(s => s.id)));
          }
        } else if (dbStates.length > 0) {
          const servicesWithState = teamConfig.services
            .map(service => {
              const dbState = dbStates.find(s => s.id === service.id);
              if (dbState) {
                return {
                  ...service,
                  status: mapStateToStatus(dbState.state),
                  detached: detachedMap[service.id] ?? true,
                };
              }
              return service;
            })
            .filter(service => dbStates.some(s => s.id === service.id));

          if (servicesWithState.length > 0) {
            setOrchestratedServices(servicesWithState);
            setSelectedServices(new Set(servicesWithState.map(s => s.id)));
          } else if (teamConfig.presetServices && teamConfig.presetServices.length > 0) {
            const presetServices = teamConfig.services
              .filter(service => teamConfig.presetServices?.includes(service.id))
              .map(service => ({
                ...service,
                detached: detachedMap[service.id] ?? true,
              }));
            setOrchestratedServices(presetServices);
            setSelectedServices(new Set(teamConfig.presetServices));
          }
        } else if (teamConfig.presetServices && teamConfig.presetServices.length > 0 && teamConfig.services.length > 0) {
          const presetServices = teamConfig.services
            .filter(service => teamConfig.presetServices?.includes(service.id))
            .map(service => ({
              ...service,
              detached: detachedMap[service.id] ?? true,
            }));
          if (presetServices.length > 0) {
            setOrchestratedServices(presetServices);
            setSelectedServices(new Set(teamConfig.presetServices));
          }
        }
      } catch (error) {
        console.error('Failed to load persisted services:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPersistedServices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeam, teamConfig.services.length]);

  /**
   * Toggle service selection
   */
  const toggleService = useCallback((serviceId: string) => {
    setSelectedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  }, []);

  /**
   * Persist orchestrated service IDs to DB
   */
  const persistOrchestrationList = useCallback(async (services: Service[]) => {
    try {
      const ids = services.map(s => s.id);
      await window.electronAPI?.db?.appSettings?.set(
        `orchestratedServices:${selectedTeam}`,
        JSON.stringify(ids)
      );
    } catch (error) {
      console.error('Failed to persist orchestration list:', error);
    }
  }, [selectedTeam]);

  /**
   * Add single service directly to orchestration (for drag-and-drop)
   */
  const addService = useCallback((service: Service) => {
    if (!orchestratedServices.find(s => s.id === service.id)) {
      const updated = [...orchestratedServices, service];
      setOrchestratedServices(updated);
      persistOrchestrationList(updated);
    }
  }, [orchestratedServices, persistOrchestrationList]);

  /**
   * Add selected services to orchestration (legacy - kept for backward compatibility)
   */
  const addSelectedToOrchestration = useCallback(() => {
    const servicesToAdd = teamConfig.services.filter(
      service =>
        selectedServices.has(service.id) &&
        !orchestratedServices.find(s => s.id === service.id)
    );
    const updated = [...orchestratedServices, ...servicesToAdd];
    setOrchestratedServices(updated);
    persistOrchestrationList(updated);
    setSelectedServices(new Set());
  }, [selectedServices, orchestratedServices, teamConfig.services, persistOrchestrationList]);

  /**
   * Remove service from orchestration
   */
  const removeFromOrchestration = useCallback((serviceId: string) => {
    const updated = orchestratedServices.filter(s => s.id !== serviceId);
    setOrchestratedServices(updated);
    persistOrchestrationList(updated);
    setSelectedServices(prev => {
      const newSet = new Set(prev);
      newSet.delete(serviceId);
      return newSet;
    });
  }, [orchestratedServices, persistOrchestrationList]);

  /**
   * Clear all orchestrated services
   */
  const clearOrchestration = useCallback(() => {
    setOrchestratedServices([]);
    persistOrchestrationList([]);
    setSelectedServices(new Set());
  }, []);

  /**
   * Update service status in state
   */
  const updateServiceStatus = useCallback((
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
  ) => {
    setOrchestratedServices(prev =>
      prev.map(s =>
        s.id === serviceId
          ? { ...s, status, ...diagnostics }
          : s
      )
    );
  }, []);

  /**
   * Toggle detached mode for a service
   */
  const toggleDetached = useCallback(async (serviceId: string, detached: boolean) => {
    setOrchestratedServices(prev =>
      prev.map(s => (s.id === serviceId ? { ...s, detached } : s))
    );

    // Persist to app_settings (frontend-owned preference, not service_state)
    if (window.electronAPI?.db) {
      try {
        const existing = await window.electronAPI.db.appSettings.get('detachedServices');
        const map: Record<string, boolean> = existing ? JSON.parse(existing) : {};
        map[serviceId] = detached;
        await window.electronAPI.db.appSettings.set('detachedServices', JSON.stringify(map));
      } catch (error) {
        console.error('Failed to persist detached state:', error);
      }
    }
  }, []);

  return {
    orchestratedServices,
    selectedServices,
    isLoading,
    toggleService,
    addService,
    addSelectedToOrchestration,
    removeFromOrchestration,
    clearOrchestration,
    updateServiceStatus,
    toggleDetached,
    setOrchestratedServices,
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
