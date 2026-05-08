/**
 * Notifications Module
 *
 * View system notifications and alerts
 */

import { Module } from '../core/module-system/types';
import NotificationsPanel from '../components/Notifications/NotificationsPanel';

export const notificationsModule: Module = {
  metadata: {
    id: 'notifications',
    name: 'Notifications',
    description: 'View system notifications and alerts (available in topbar)',
    version: '1.0.0',
    icon: 'Notifications',
    route: 'notifications',
    enabled: false, // Disabled - notifications are in topbar only
    order: 80,
    teamSpecific: false,
  },

  lifecycle: {
    onLoad: async () => {
      console.log('[Notifications] Module loaded');
    },

    onUnload: async () => {
      console.log('[Notifications] Module unloaded');
    },
  },

  component: NotificationsPanel,

  getBadge: () => {
    // TODO: Return count of unread notifications
    return null;
  },
};
