
// Team configuration interfaces matching YAML structure
export interface TeamMenuItem {
  id: string;
  label: string;
  icon: string;
}

export interface TeamJSONTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface TeamPreset {
  name: string;
  description: string;
  color: string;
  icon: string;
  presetServices: string[];
  menuItems: TeamMenuItem[];
  jsonTemplates: TeamJSONTemplate[];
}

export interface ServiceCommands {
  start: string;
  openIDE?: string | Array<{ name: string; command: string }>;
}

export interface ServiceDefinition {
  name: string;
  type: string;
  mode?: ServiceMode;
  description: string;
  port: number;
  path?: string;
  commands?: ServiceCommands;
  environments?: Record<string, string>;
}

export interface GlobalSettings {
  ide?: {
    command: string;
    args: string;
  };
  terminal?: {
    command: string;
    args: string;
  };
  fileManager?: {
    command: string;
    args: string;
  };
}

export interface ServiceCommandsConfig {
  globalSettings?: GlobalSettings;
  services: Record<string, ServiceDefinition>;
}

export interface TeamPresetsConfig {
  teams: Record<string, TeamPreset>;
  baseMenuItems: TeamMenuItem[];
  services?: Record<string, ServiceDefinition>; // Optional - populated from config/services/ (IPC)
}

// Icon mapping from string names to Material-UI components
import {
  Receipt,
  Payment,
  AccountBalance,
  Business,
  CloudSync,
  Settings,
  Code,
  CloudQueue,
  Group,
  Timeline,
} from '@mui/icons-material';
import { getEnvironmentShortName, ENVIRONMENT_SHORT_NAMES } from '../constants/environment';
import { SERVICE_STATUS, type ServiceMode } from '../../shared/constants/service';
import { type Team } from '../constants/service';
import { CONFIG_FILES } from '../constants/api';

const ICON_MAP: Record<string, React.ComponentType> = {
  Receipt,
  Payment,
  AccountBalance,
  Business,
  CloudSync,
  Settings,
  Code,
  CloudQueue,
  Group,
  Timeline,
};

class TeamConfigLoader {
  private teamConfig: TeamPresetsConfig;
  private serviceCommandsConfig: ServiceCommandsConfig;

  constructor() {
    // Initialize with default configuration immediately
    this.teamConfig = this.getDefaultTeamConfig();
    this.serviceCommandsConfig = { services: {} };
  }

  async initialize(): Promise<void> {
    try {
      // Check if we're in Electron environment
      if (typeof window !== 'undefined' && window.electronAPI) {
        // In Electron, try to load config via Electron API
        try {
          // Load team presets (for team-specific configs)
          const teamPresetsResult = await window.electronAPI.readConfigFile(CONFIG_FILES.TEAM_PRESETS);
          if (teamPresetsResult.success) {
            this.teamConfig = teamPresetsResult.config;
            console.log('Team configuration loaded from YAML successfully');
          } else {
            throw new Error(teamPresetsResult.error);
          }

          // Load service commands (from modular services/ directory via backend loader)
          const serviceCommandsResult = await window.electronAPI.getServiceCommands();
          if (serviceCommandsResult.success) {
            // getServiceCommands returns { success: true, commands: { serviceId: {...}, ... } }
            this.serviceCommandsConfig = {
              services: serviceCommandsResult.commands || {},
              globalSettings: serviceCommandsResult.globalSettings
            };
            console.log('Service commands configuration loaded successfully');

            // Use service definitions from backend's dynamic loader
            if (this.serviceCommandsConfig.services) {
              this.teamConfig.services = this.serviceCommandsConfig.services;
            } else {
              console.warn('No services found');
              this.teamConfig.services = {};
            }
          } else {
            console.warn('Failed to load service commands:', serviceCommandsResult.error);
          }
        } catch (electronError) {
          console.warn('Failed to load config via Electron API, using default config:', electronError);
        }
      } else {
        // In browser, use default config (YAML loading in browser is complex)
        console.warn('Browser environment detected, using default team configuration');
      }
    } catch (error) {
      console.warn('Failed to load team presets YAML file, using default config:', error);
    }
  }

  getTeamConfig(): TeamPresetsConfig {
    return this.teamConfig;
  }

  getTeam(teamId: Team): TeamPreset | undefined {
    return this.getTeamConfig().teams[teamId];
  }

  getAllTeams(): Record<string, TeamPreset> {
    return this.getTeamConfig().teams;
  }

  getBaseMenuItems(): TeamMenuItem[] {
    return this.getTeamConfig().baseMenuItems;
  }

  getTeamMenuItems(teamId: Team): TeamMenuItem[] {
    const baseItems = this.getBaseMenuItems();
    const teamConfig = this.getTeam(teamId);
    const teamItems = teamConfig?.menuItems || [];
    return [...baseItems, ...teamItems];
  }

  getServices(): Record<string, ServiceDefinition> {
    return this.getTeamConfig().services || {};
  }

  getService(serviceId: string): ServiceDefinition | undefined {
    return this.getServices()[serviceId];
  }

  getServiceCommands(serviceId: string): ServiceCommands | undefined {
    return this.getService(serviceId)?.commands;
  }

  getServicePath(serviceId: string): string | undefined {
    return this.getService(serviceId)?.path;
  }

  getGlobalSettings(): GlobalSettings | undefined {
    return this.serviceCommandsConfig.globalSettings;
  }

  // Get IDE command for a service (first available option)
  getOpenIDECommand(serviceId: string): string | undefined {
    const options = this.getIDEOptions(serviceId);
    return options.length > 0 ? options[0].command : undefined;
  }

  // Get all IDE options for a service
  // Priority: service yaml openIDE > global ide setting
  // Both support single string or list format
  getIDEOptions(serviceId: string): Array<{ name: string; command: string }> {
    const service = this.getService(serviceId);
    const globalSettings = this.getGlobalSettings();
    const servicePath = service?.path || '';

    // Service-level override
    const serviceIDE = service?.commands?.openIDE;
    if (serviceIDE) {
      // Single string: "idea ."
      if (typeof serviceIDE === 'string') {
        return [{ name: serviceIDE.split(' ')[0], command: serviceIDE }];
      }
      // List: [{name: "IntelliJ", command: "idea ."}]
      return serviceIDE;
    }

    // Global fallback
    if (!globalSettings?.ide || !servicePath) return [];

    const ide = globalSettings.ide;
    // Single: {command: "code-insiders"}
    if (!Array.isArray(ide)) {
      return [{ name: ide.command, command: `${ide.command} ${servicePath}` }];
    }
    // List: [{command: "code-insiders"}, {command: "idea"}]
    return ide.map((tool: { command: string; args?: string }) => ({
      name: tool.command,
      command: `${tool.command} ${servicePath}`,
    }));
  }

  getServiceEnvironmentUrl(serviceId: string, environment: string): string {
    const service = this.getServices()[serviceId];
    if (service?.environments && service.environments[environment]) {
      return service.environments[environment];
    }
    // Fallback to local URL
    return `http://localhost:${service?.port || 8080}`;
  }

  getTeamPresetServices(teamId: Team): string[] {
    const teamConfig = this.getTeam(teamId);
    return teamConfig?.presetServices || [];
  }

  // Convert icon string to Material-UI component
  getIconComponent(iconName: string): React.ComponentType {
    return ICON_MAP[iconName] || Business;
  }

  // Get team display configuration
  getTeamDisplay(teamId: Team) {
    const teamConfig = this.getTeam(teamId);
    if (!teamConfig) return undefined;

    return {
      id: teamId,
      name: teamConfig.name,
      color: teamConfig.color,
      icon: this.getIconComponent(teamConfig.icon),
      description: teamConfig.description,
    };
  }

  // Get all team displays
  getAllTeamDisplays() {
    const teams = this.getAllTeams();
    return Object.keys(teams).map(teamId => this.getTeamDisplay(teamId as Team)).filter(Boolean);
  }

  // Generate team configurations compatible with app store
  generateTeamConfigs(configManager?: { getConfig: () => { app: { environment: string }; otherServices?: Record<string, unknown> } }): Record<Team, Record<string, unknown>> {

    let config;
    try {
      config = configManager?.getConfig();
    } catch {
      console.warn('Configuration not ready, using default config for team configs');
      config = null;
    }

    // Generate services from YAML configuration
    const yamlServices = this.getServices();
    const baseServices: Record<string, unknown>[] = Object.entries(yamlServices).map(([id, service]) => ({
      id,
      name: service.name,
      type: service.type,
      mode: service.mode || 'process',
      status: SERVICE_STATUS.IDLE,
      description: service.description,
      port: service.port,
      path: service.path,
      quickCommands: service.quickCommands,
      routines: service.routines,
      detached: true,
    }));

    const currentEnv = config ? getEnvironmentShortName(config.app.environment) : ENVIRONMENT_SHORT_NAMES.LOCAL;

    const services: Record<string, unknown>[] = baseServices.map(service => ({
      ...service,
      endpoint: this.getServiceEnvironmentUrl(service.id, ENVIRONMENT_SHORT_NAMES.LOCAL),
    }));

    // Build defaultEndpoints dynamically from service definitions in YAML
    // This ensures we don't have hardcoded service-specific URLs
    const defaultEndpoints: Record<string, string> = {};
    Object.keys(yamlServices).forEach((serviceId) => {
      const urlKey = `${serviceId}-url`;
      defaultEndpoints[urlKey] = this.getServiceEnvironmentUrl(serviceId, currentEnv);
    });

    // Generate team configurations from YAML
    const yamlTeams = this.getAllTeams();
    const teamConfigs: Record<Team, Record<string, unknown>> = {} as Record<Team, Record<string, unknown>>;

    Object.entries(yamlTeams).forEach(([teamId, teamData]) => {
      const team = teamId as Team;
      teamConfigs[team] = {
        services,
        jsonTemplates: (teamData.jsonTemplates || []).map(template => ({
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          team,
          structure: {}, // Default empty structure
        })),
        defaultEndpoints,
        teamspaceBaseUrl: config?.otherServices?.teamspace?.baseUrl || 'https://example.com/teamspace',
        presetServices: teamData.presetServices,
      };
    });

    return teamConfigs;
  }

  private getDefaultTeamConfig(): TeamPresetsConfig {
    // Minimal fallback configuration - teams should be defined in config/team-presets.yaml
    return {
      teams: {
        DEFAULT: {
          name: "Default Team",
          description: "Default team configuration (Please configure teams in config/team-presets.yaml)",
          color: "#9e9e9e",
          icon: "Business",
          presetServices: [],
          menuItems: [],
          jsonTemplates: [],
        },
      },
      baseMenuItems: [],
      services: {},
    };
  }
}

// Export singleton instance
export const teamConfigLoader = new TeamConfigLoader();
