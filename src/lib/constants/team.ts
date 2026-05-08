import { teamConfigLoader } from '../loaders/team-config';
import { isValidTeam, type Team } from '../../core/constants/app.constants';

// Re-export Team type and utilities from centralized constants
export type { Team };
export { isValidTeam };

// Team display configurations interface
export interface TeamDisplay {
  id: Team;
  name: string;
  color: string;
  icon: React.ComponentType;
  description: string;
}

// Team menu item interface
export interface TeamMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType;
}

// Initialize with default configuration immediately
const initializeWithDefaults = () => {
  const defaultDisplays = teamConfigLoader.getAllTeamDisplays() as TeamDisplay[];
  return defaultDisplays;
};

// Get team displays from YAML configuration (synchronous with fallback)
export const TEAM_DISPLAYS: TeamDisplay[] = initializeWithDefaults();

// Get team display configuration
export const getTeamDisplay = (teamId: Team): TeamDisplay | undefined => {
  return teamConfigLoader.getTeamDisplay(teamId) as TeamDisplay | undefined;
};

// Get team menu items
export const getTeamMenuItems = (teamId: Team): TeamMenuItem[] => {
  const items = teamConfigLoader.getTeamMenuItems(teamId);
  return items.map(item => ({
    id: item.id,
    label: item.label,
    icon: teamConfigLoader.getIconComponent(item.icon),
  }));
};

// isValidTeam is now re-exported from serviceConstants above

// Initialize team configuration asynchronously in the background
teamConfigLoader.initialize().catch(error => {
  console.warn('Failed to initialize team configuration from YAML:', error);
});