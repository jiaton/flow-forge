/**
 * Dashboard Module
 *
 * Overview of services, activities, and quick actions
 */

import { Module } from '../core/module-system/types';
import Dashboard from '../components/Dashboard/Dashboard';

export const dashboardModule: Module = {
  metadata: {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Overview of services, activities, and quick actions',
    version: '1.0.0',
    icon: 'Dashboard',
    route: 'dashboard',
    enabled: true,
    order: 10,
    teamSpecific: false,
    dependencies: [],
  },

  lifecycle: {
    onLoad: async () => {
      console.log('[Dashboard] Module loaded');
    },

    onUnload: async () => {
      console.log('[Dashboard] Module unloaded');
    },

    onTeamChange: async (team: string) => {
      console.log(`[Dashboard] Team changed to: ${team}`);
    },
  },

  component: Dashboard,

  getBadge: () => null,
};
