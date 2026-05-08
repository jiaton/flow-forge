/**
 * Database-persisted version of the app store
 * This store automatically syncs state with SQLite database
 */

import { create } from 'zustand';
import { teamConfigLoader } from '../lib/loaders/team-config';
import { configManager } from '../lib/loaders/config';
import type { Team } from '../lib/constants/team';
import { logger } from '../lib/logger';

const log = logger.namespace('DbAppStore');

import type { UIEnvironment } from '../lib/constants/environment';
import { ENVIRONMENT_SHORT_NAMES } from '../lib/constants/environment';
import { VIEWS, type ViewType, type NotificationType } from '../lib/constants/ui';
import { type ServiceStatus, type ServiceMode, type PipelineStatus, type MRStatus, type EnvironmentStatus } from '../shared/constants/service';

export type Environment = UIEnvironment;
export type { Team };

export interface TeamService {
  id: string;
  name: string;
  type: string;
  mode?: ServiceMode;
  status: ServiceStatus;
  description: string;
  endpoint?: string;
  port?: number;
}

export interface TeamspaceEnvironment {
  id: string;
  name: string;
  url: string;
  branches: Record<string, string>;
  status: EnvironmentStatus;
  createdAt: string;
}

export interface MergeRequest {
  id: string;
  title: string;
  branch: string;
  targetBranch: string;
  status: MRStatus;
  pipelineStatus: PipelineStatus;
  url: string;
  author: string;
  assignee?: string;
  createdAt: string;
  updatedAt: string;
  comments: number;
  approvals: number;
  requiredApprovals: number;
}

export interface TeamJSONTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  structure: Record<string, unknown>;
  team: Team;
}

export interface TeamConfig {
  services: TeamService[];
  jsonTemplates: TeamJSONTemplate[];
  defaultEndpoints: Record<string, string>;
  teamspaceBaseUrl?: string;
  gitlabProjectId?: string;
  presetServices?: string[];
}

export interface Tab {
  id: string;
  title: string;
  type: ViewType;
  content?: unknown;
  modified?: boolean;
  team?: Team;
}

export interface ViewState {
  [key: string]: unknown;
}

interface AppState {
  // Persisted state
  sidebarCollapsed: boolean;
  selectedTeam: Team;
  currentEnvironment: Environment;
  currentView: string;

  // Non-persisted state (loaded on demand)
  viewStates: ViewState;
  teamConfigs: Record<Team, TeamConfig>;
  notifications: Array<{
    id: string;
    message: string;
    type: NotificationType;
    timestamp: number;
  }>;

  // Actions
  toggleSidebar: () => void;
  setSelectedTeam: (team: Team) => void;
  setEnvironment: (env: Environment) => void;
  setCurrentView: (viewId: string) => void;
  updateViewState: (viewId: string, state: Record<string, unknown>) => void;
  addNotification: (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  getTeamConfig: (team: Team) => TeamConfig;
  updateTeamConfig: (team: Team, config: Partial<TeamConfig>) => void;
  initializeTeamConfigs: () => void;

  // Database-specific actions
  loadFromDatabase: () => Promise<void>;
  saveToDatabase: () => Promise<void>;
}

/**
 * Check if running in Electron environment
 */
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI?.db;
};

/**
 * Database-enabled app store
 * Automatically loads initial state from database and persists changes
 */
export const useDbAppStore = create<AppState>((set, get) => ({
  // Default state
  sidebarCollapsed: false,
  selectedTeam: '' as Team, // Will be set by initializeTeamConfigs to first available team from YAML
  currentEnvironment: ENVIRONMENT_SHORT_NAMES.LOCAL,
  currentView: VIEWS.DASHBOARD,
  viewStates: {},
  teamConfigs: {} as Record<Team, TeamConfig>,
  notifications: [],

  // Actions with automatic database persistence
  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
    // Persist to database
    if (isElectron()) {
      const newValue = !get().sidebarCollapsed;
      window.electronAPI.db.appSettings.set('sidebarCollapsed', newValue);
    }
  },

  setSelectedTeam: (team) => {
    set({ selectedTeam: team });
    if (isElectron()) {
      window.electronAPI.db.appSettings.set('selectedTeam', team);
    }
  },

  setEnvironment: (env) => {
    set({ currentEnvironment: env });
    if (isElectron()) {
      window.electronAPI.db.appSettings.set('currentEnvironment', env);
    }
  },

  setCurrentView: (viewId) => {
    set({ currentView: viewId });
    if (isElectron()) {
      window.electronAPI.db.appSettings.set('currentView', viewId);
    }
  },

  updateViewState: (viewId, state) => {
    set((currentState) => ({
      viewStates: {
        ...currentState.viewStates,
        [viewId]: { ...currentState.viewStates[viewId], ...state },
      },
    }));

    // Persist view state to database
    if (isElectron()) {
      const viewStates = get().viewStates;
      window.electronAPI.db.viewStates.save(viewId, viewStates[viewId]);
    }
  },

  addNotification: (notification) => {
    const newNotification = {
      ...notification,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: Date.now(),
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // Persist to database
    if (isElectron()) {
      window.electronAPI.db.notifications.save(newNotification);
    }
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id),
    }));

    // Mark as dismissed in database
    if (isElectron()) {
      window.electronAPI.db.notifications.dismiss(id);
    }
  },

  clearAllNotifications: () => {
    const notificationIds = get().notifications.map(n => n.id);
    set({ notifications: [] });

    // Dismiss all in database
    if (isElectron()) {
      notificationIds.forEach(id => {
        window.electronAPI.db.notifications.dismiss(id);
      });
    }
  },

  getTeamConfig: (team) => {
    const state = get();
    if (!state.teamConfigs[team] || state.teamConfigs[team].services?.length === 0) {
      try {
        const configs = teamConfigLoader.generateTeamConfigs(configManager);
        // Only cache if we actually have services (loader is ready)
        const hasServices = Object.values(configs).some((c: Record<string, unknown>) => (c.services as unknown[])?.length > 0);
        if (hasServices) {
          set({ teamConfigs: configs });
        }

        return configs[team] || {
          services: [],
          jsonTemplates: [],
          defaultEndpoints: {},
        };
      } catch (error) {
        log.warn('Failed to generate team configs', error);
        return {
          services: [],
          jsonTemplates: [],
          defaultEndpoints: {},
        };
      }
    }
    return state.teamConfigs[team];
  },

  updateTeamConfig: (team, config) => {
    set((state) => ({
      teamConfigs: {
        ...state.teamConfigs,
        [team]: {
          ...state.teamConfigs[team],
          ...config,
        },
      },
    }));

    // Team configs are loaded from YAML, runtime changes are kept in memory only
    // To persist changes, users should edit the YAML files
  },

  initializeTeamConfigs: () => {
    try {
      const configs = teamConfigLoader.generateTeamConfigs(configManager);
      set({ teamConfigs: configs });

      // Set default team if none selected or current doesn't exist
      const currentTeam = get().selectedTeam;
      if (!currentTeam || !configs[currentTeam as Team]) {
        const availableTeams = Object.keys(configs);
        if (availableTeams.length > 0) {
          const firstTeam = availableTeams[0] as Team;
          set({ selectedTeam: firstTeam });
          if (isElectron()) {
            window.electronAPI.db.appSettings.set('selectedTeam', firstTeam);
          }
        }
      }
    } catch (error) {
      log.warn('Failed to initialize team configs', error);
    }
  },

  // Database-specific methods
  loadFromDatabase: async () => {
    if (!isElectron()) {
      log.debug('Not in Electron environment, skipping database load');
      return;
    }

    try {
      // Load app settings
      const dbSettings = await window.electronAPI.db.appSettings.getAll();

      if (dbSettings && Object.keys(dbSettings).length > 0) {
        const updates: Partial<AppState> = {};

        if (dbSettings.sidebarCollapsed !== undefined) {
          updates.sidebarCollapsed = dbSettings.sidebarCollapsed;
        }
        if (dbSettings.selectedTeam !== undefined) {
          updates.selectedTeam = dbSettings.selectedTeam;
        }
        if (dbSettings.currentEnvironment !== undefined) {
          updates.currentEnvironment = dbSettings.currentEnvironment;
        }
        if (dbSettings.currentView !== undefined) {
          updates.currentView = dbSettings.currentView;
        }

        set(updates);
        log.debug('App state loaded from database', updates);
      }

      // Load view states
      const viewStates = await window.electronAPI.db.viewStates.getAll();
      if (viewStates && Object.keys(viewStates).length > 0) {
        set({ viewStates });
        log.debug('View states loaded from database');
      }

      // Load active notifications
      const activeNotifications = await window.electronAPI.db.notifications.getActive();
      if (activeNotifications && activeNotifications.length > 0) {
        set({ notifications: activeNotifications });
        log.debug('Active notifications loaded from database');
      }

      // NOTE: Team configs are NOT loaded from database
      // They are loaded from YAML files via initializeTeamConfigs()
    } catch (error) {
      log.error('Failed to load state from database', error);
    }
  },

  saveToDatabase: async () => {
    if (!isElectron()) {
      return;
    }

    try {
      const state = get();

      // Save app settings
      await window.electronAPI.db.appSettings.setMany({
        sidebarCollapsed: state.sidebarCollapsed,
        selectedTeam: state.selectedTeam,
        currentEnvironment: state.currentEnvironment,
        currentView: state.currentView,
      });

      log.debug('App state saved to database');
    } catch (error) {
      log.error('Failed to save state to database', error);
    }
  },
}));

// Initialize store from database when module loads
if (isElectron()) {
  useDbAppStore.getState().loadFromDatabase();
}
