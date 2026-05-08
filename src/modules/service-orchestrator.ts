/**
 * Service Orchestrator Module
 *
 * Start, stop, and manage microservices
 */

import { Module } from '../core/module-system/types';
import ServiceOrchestrator from '../components/ServiceOrchestrator/ServiceOrchestrator';

export const serviceOrchestratorModule: Module = {
  metadata: {
    id: 'service-orchestrator',
    name: 'Service Orchestrator',
    description: 'Start, stop, and manage microservices',
    version: '1.0.0',
    icon: 'Settings',
    route: 'service-orchestrator',
    enabled: true,
    order: 20,
    teamSpecific: true,
  },

  lifecycle: {
    onLoad: async () => {
      console.log('[ServiceOrchestrator] Module loaded');
    },

    onUnload: async () => {
      console.log('[ServiceOrchestrator] Module unloaded');
    },

    onTeamChange: async (team: string) => {
      console.log(`[ServiceOrchestrator] Team changed to: ${team}`);
      // Team change will trigger reload of preset services
    },
  },

  component: ServiceOrchestrator,

  getBadge: () => {
    // TODO: Return count of running services
    // This would require accessing the service state from the store
    return null;
  },
};
