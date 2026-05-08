import { create } from 'zustand';
import { teamConfigLoader } from '../lib/loaders/team-config';
import { configManager } from '../lib/loaders/config';
import type { Team } from '../lib/constants/team';

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
  branches: Record<string, string>; // service -> branch mapping
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
  presetServices?: string[]; // Service IDs to pre-select for this team
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
  sidebarCollapsed: boolean;
  selectedTeam: Team;
  currentEnvironment: Environment;
  currentView: string;
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
}

export const useAppStore = create<AppState>((set, get) => ({
  sidebarCollapsed: false,
  selectedTeam: 'DEFAULT',
  currentEnvironment: ENVIRONMENT_SHORT_NAMES.LOCAL,
  currentView: VIEWS.DASHBOARD,
  viewStates: {},
  teamConfigs: {} as Record<Team, TeamConfig>,
  notifications: [],

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  setSelectedTeam: (team) => set({ selectedTeam: team }),
  
  setEnvironment: (env) => set({ currentEnvironment: env }),
  
  setCurrentView: (viewId) => set({ currentView: viewId }),
  
  updateViewState: (viewId, state) => set((currentState) => ({
    viewStates: {
      ...currentState.viewStates,
      [viewId]: { ...currentState.viewStates[viewId], ...state },
    },
  })),
  
  addNotification: (notification) => set((state) => ({
    notifications: [
      ...state.notifications,
      {
        ...notification,
        id: Math.random().toString(36).substring(2, 11),
        timestamp: Date.now(),
      },
    ],
  })),
  
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id),
  })),
  
  clearAllNotifications: () => set({ notifications: [] }),
  
  getTeamConfig: (team) => {
    const state = get();
    if (!state.teamConfigs[team]) {
      // Lazy load team configs if not already loaded
      try {
        const configs = teamConfigLoader.generateTeamConfigs(configManager);
        set({ teamConfigs: configs });
        return configs[team];
      } catch (error) {
        console.warn('Failed to generate team configs:', error);
        // Return a default config
        return {
          services: [],
          jsonTemplates: [],
          defaultEndpoints: {},
        };
      }
    }
    return state.teamConfigs[team];
  },
  
  updateTeamConfig: (team, config) => set((state) => ({
    teamConfigs: {
      ...state.teamConfigs,
      [team]: {
        ...state.teamConfigs[team],
        ...config,
      },
    },
  })),
  
  initializeTeamConfigs: () => {
    try {
      const configs = teamConfigLoader.generateTeamConfigs(configManager);
      set({ teamConfigs: configs });
    } catch (error) {
      console.warn('Failed to initialize team configs:', error);
    }
  },
}));