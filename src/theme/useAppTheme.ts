import { useTheme } from '@mui/material';
import { processColors, statusColors, customShadows } from './theme';

/**
 * Custom hook for accessing theme utilities and helpers
 * Provides convenient access to theme values and common patterns
 */
export const useAppTheme = () => {
  const theme = useTheme();

  return {
    // Standard MUI theme
    theme,

    // Custom shadows
    shadows: customShadows,

    // Service-specific colors
    processColors,

    // Status colors for service orchestrator
    statusColors,

    // Helper functions
    spacing: (multiplier: number) => theme.spacing(multiplier),

    // Common palette shortcuts
    palette: {
      primary: theme.palette.primary,
      secondary: theme.palette.secondary,
      success: theme.palette.success,
      error: theme.palette.error,
      warning: theme.palette.warning,
      info: theme.palette.info,
      text: theme.palette.text,
      background: theme.palette.background,
      divider: theme.palette.divider,
    },

    // Breakpoints helpers
    breakpoints: {
      up: (key: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => theme.breakpoints.up(key),
      down: (key: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => theme.breakpoints.down(key),
      between: (start: 'xs' | 'sm' | 'md' | 'lg' | 'xl', end: 'xs' | 'sm' | 'md' | 'lg' | 'xl') =>
        theme.breakpoints.between(start, end),
      only: (key: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => theme.breakpoints.only(key),
    },

    // Typography shortcuts
    typography: theme.typography,

    // Transitions
    transitions: theme.transitions,

    // Shape (border radius)
    shape: theme.shape,
  };
};
