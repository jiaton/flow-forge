/**
 * Teamspace Manager Module
 *
 * Manage team deployments and environments
 */

import { Module } from '../core/module-system/types';
import TeamspaceManager from '../components/Teamspace/TeamspaceManager';

export const teamspaceManagerModule: Module = {
  metadata: {
    id: 'teamspace-manager',
    name: 'Teamspace',
    description: 'Manage team deployments and environments',
    version: '1.0.0',
    icon: 'Groups',
    route: 'teamspace-manager',
    enabled: true,
    order: 60,
    teamSpecific: true,
    dependencies: [],
  },

  lifecycle: {
    onLoad: async () => {
      console.log('[TeamspaceManager] Module loaded');
    },

    onUnload: async () => {
      console.log('[TeamspaceManager] Module unloaded');
    },

    onTeamChange: async (team: string) => {
      console.log(`[TeamspaceManager] Team changed to: ${team}`);
    },
  },

  component: TeamspaceManager,

  getBadge: () => null,
};
