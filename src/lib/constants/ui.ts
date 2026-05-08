// UI and navigation constants for consistent usage across the application

// Application Views/Pages Constants
export const VIEWS = {
  DASHBOARD: 'dashboard',
  JSON_EDITOR: 'json-editor',
  VISUAL_JSON_EDITOR: 'visual-json-editor',
  INVOICE_BUILDER: 'invoice-builder',
  SERVICE_ORCHESTRATOR: 'service-orchestrator',
  TEAMSPACE: 'teamspace',
  FLOW_VISUALIZER: 'flow-visualizer',
  GIT_MANAGER: 'git-manager',
  CONFIG_SETTINGS: 'config-settings',
} as const;

// Notification Types Constants
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;

// Alert/Status Message Types (for dialogs, forms, etc.)
export const MESSAGE_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;

// TypeScript types derived from constants
export type ViewType = typeof VIEWS[keyof typeof VIEWS];
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];
export type { Team } from './service';

// UI State Constants
export const UI_STATES = {
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
  EMPTY: 'empty',
} as const;

export type UIState = typeof UI_STATES[keyof typeof UI_STATES];

// Navigation Menu Item Types
export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  view?: ViewType;
}

// Default Menu Items (can be overridden by team configs)
export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  { id: VIEWS.DASHBOARD, label: 'Dashboard', icon: 'Dashboard', view: VIEWS.DASHBOARD },
  { id: VIEWS.SERVICE_ORCHESTRATOR, label: 'Service Orchestrator', icon: 'CloudQueue', view: VIEWS.SERVICE_ORCHESTRATOR },
  { id: VIEWS.JSON_EDITOR, label: 'JSON Editor', icon: 'Code', view: VIEWS.JSON_EDITOR },
  { id: VIEWS.TEAMSPACE, label: 'Teamspace', icon: 'Group', view: VIEWS.TEAMSPACE },
  { id: VIEWS.FLOW_VISUALIZER, label: 'Flow Visualizer', icon: 'Timeline', view: VIEWS.FLOW_VISUALIZER },
];

// Notification Icon Mapping Helper
export const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case NOTIFICATION_TYPES.SUCCESS:
      return 'CheckCircle';
    case NOTIFICATION_TYPES.ERROR:
      return 'Error';
    case NOTIFICATION_TYPES.WARNING:
      return 'Warning';
    case NOTIFICATION_TYPES.INFO:
      return 'Info';
    default:
      return 'Info';
  }
};