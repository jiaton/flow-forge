import { createTheme, alpha } from '@mui/material/styles';

// ============================================================================
// THEME CONFIGURATION - Grouped by Category
// ============================================================================

// ----------------------------------------------------------------------------
// COLOR PALETTE
// ----------------------------------------------------------------------------
const lightPalette = {
  mode: 'light' as const,
  primary: {
    main: '#1976d2',
    light: '#42a5f5',
    dark: '#1565c0',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#9c27b0',
    light: '#ba68c8',
    dark: '#7b1fa2',
    contrastText: '#ffffff',
  },
  success: {
    main: '#2e7d32',
    light: '#4caf50',
    dark: '#1b5e20',
    contrastText: '#ffffff',
  },
  error: {
    main: '#d32f2f',
    light: '#f44336',
    dark: '#c62828',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#ff9800',
    light: '#ffb74d',
    dark: '#f57c00',
    contrastText: '#000000',
  },
  info: {
    main: '#0288d1',
    light: '#03a9f4',
    dark: '#01579b',
    contrastText: '#ffffff',
  },
  background: {
    default: '#f5f5f5',
    paper: '#ffffff',
  },
  text: {
    primary: 'rgba(0, 0, 0, 0.87)',
    secondary: 'rgba(0, 0, 0, 0.6)',
    disabled: 'rgba(0, 0, 0, 0.38)',
  },
  divider: 'rgba(0, 0, 0, 0.12)',
};

const darkPalette = {
  mode: 'dark' as const,
  primary: {
    main: '#42a5f5',
    light: '#64b5f6',
    dark: '#1976d2',
    contrastText: '#000000',
  },
  secondary: {
    main: '#ba68c8',
    light: '#ce93d8',
    dark: '#9c27b0',
    contrastText: '#000000',
  },
  success: {
    main: '#4caf50',
    light: '#81c784',
    dark: '#2e7d32',
    contrastText: '#000000',
  },
  error: {
    main: '#f44336',
    light: '#e57373',
    dark: '#d32f2f',
    contrastText: '#000000',
  },
  warning: {
    main: '#ffb74d',
    light: '#ffd54f',
    dark: '#ff9800',
    contrastText: '#000000',
  },
  info: {
    main: '#03a9f4',
    light: '#4fc3f7',
    dark: '#0288d1',
    contrastText: '#000000',
  },
  background: {
    default: '#0a0a0a',
    paper: '#1a1a1a',
  },
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    disabled: 'rgba(255, 255, 255, 0.5)',
  },
  divider: 'rgba(255, 255, 255, 0.12)',
};

// ----------------------------------------------------------------------------
// TYPOGRAPHY
// ----------------------------------------------------------------------------
const typography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: {
    fontWeight: 600,
    fontSize: '2.5rem',
    lineHeight: 1.2,
  },
  h2: {
    fontWeight: 600,
    fontSize: '2rem',
    lineHeight: 1.3,
  },
  h3: {
    fontWeight: 600,
    fontSize: '1.75rem',
    lineHeight: 1.4,
  },
  h4: {
    fontWeight: 600,
    fontSize: '1.5rem',
    lineHeight: 1.4,
  },
  h5: {
    fontWeight: 600,
    fontSize: '1.25rem',
    lineHeight: 1.5,
  },
  h6: {
    fontWeight: 600,
    fontSize: '1rem',
    lineHeight: 1.6,
  },
  body1: {
    fontSize: '0.875rem',
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.43,
  },
  button: {
    textTransform: 'none' as const,
    fontWeight: 500,
  },
};

// ----------------------------------------------------------------------------
// SPACING & LAYOUT
// ----------------------------------------------------------------------------
const spacing = 8; // Base spacing unit (1 = 8px)

const shape = {
  borderRadius: 8,
};

// ----------------------------------------------------------------------------
// SHADOWS & ELEVATION
// ----------------------------------------------------------------------------
const customShadows = {
  card: '0 2px 8px rgba(0, 0, 0, 0.1)',
  cardHover: '0 4px 20px rgba(0, 0, 0, 0.15)',
  dialog: '0 8px 32px rgba(0, 0, 0, 0.2)',
  glass: '0 8px 32px rgba(0, 0, 0, 0.1)',
};

// ----------------------------------------------------------------------------
// TRANSITIONS & ANIMATIONS
// ----------------------------------------------------------------------------
const transitions = {
  duration: {
    shortest: 150,
    shorter: 200,
    short: 250,
    standard: 300,
    complex: 375,
    enteringScreen: 225,
    leavingScreen: 195,
  },
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
};

// ----------------------------------------------------------------------------
// BREAKPOINTS
// ----------------------------------------------------------------------------
const breakpoints = {
  values: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
  },
};

// ============================================================================
// COMPONENT OVERRIDES - Grouped by Component Type
// ============================================================================

const getComponentOverrides = (isDarkMode: boolean) => ({
  // --------------------------------------------------------------------------
  // GLOBAL STYLES
  // --------------------------------------------------------------------------
  MuiCssBaseline: {
    styleOverrides: {
      '*': {
        boxSizing: 'border-box',
      },
      html: {
        height: '100%',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
      body: {
        height: '100%',
        margin: 0,
        padding: 0,
      },
      '#root': {
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      },
      // Use system default scrollbars (overlay on macOS, native on other platforms)
    },
  },

  // --------------------------------------------------------------------------
  // PAPER & SURFACES
  // --------------------------------------------------------------------------
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
      elevation1: {
        boxShadow: customShadows.card,
      },
      elevation2: {
        boxShadow: customShadows.cardHover,
      },
    },
    variants: [
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        props: { variant: 'glass' as any },
        style: {
          background: isDarkMode
            ? alpha('#000000', 0.3)
            : alpha('#ffffff', 0.7),
          backdropFilter: 'blur(10px) saturate(180%)',
          border: isDarkMode
            ? `1px solid ${alpha('#ffffff', 0.1)}`
            : `1px solid ${alpha('#ffffff', 0.2)}`,
          boxShadow: customShadows.glass,
        },
      },
    ],
  },

  // --------------------------------------------------------------------------
  // CARDS
  // --------------------------------------------------------------------------
  MuiCard: {
    styleOverrides: {
      root: {
        transition: 'background-color 0.1s ease, box-shadow 0.1s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: customShadows.cardHover,
        },
      },
    },
  },

  MuiCardContent: {
    styleOverrides: {
      root: {
        '&:last-child': {
          paddingBottom: 16,
        },
      },
    },
  },

  // --------------------------------------------------------------------------
  // BUTTONS
  // --------------------------------------------------------------------------
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        padding: '8px 16px',
        transition: 'background-color 0.1s ease, border-color 0.1s ease',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
          transition: 'left 0.5s',
        },
        '&:hover::before': {
          left: '100%',
        },
      },
      contained: {
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
      },
      outlined: {
        borderWidth: '2px',
        '&:hover': {
          borderWidth: '2px',
        },
      },
    },
  },

  MuiIconButton: {
    styleOverrides: {
      root: {
        transition: 'background-color 0.1s ease',
      },
    },
  },

  // --------------------------------------------------------------------------
  // CHIPS
  // --------------------------------------------------------------------------
  MuiChip: {
    styleOverrides: {
      root: {
        fontWeight: 500,
        transition: 'background-color 0.1s ease',
      },
      outlined: {
        borderWidth: '2px',
      },
    },
  },

  // --------------------------------------------------------------------------
  // INPUTS & FORMS
  // --------------------------------------------------------------------------
  MuiTextField: {
    defaultProps: {
      variant: 'outlined' as const,
    },
  },

  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderWidth: '2px',
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderWidth: '2px',
        },
      },
    },
  },

  // --------------------------------------------------------------------------
  // DIALOGS & MODALS
  // --------------------------------------------------------------------------
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 12,
        boxShadow: customShadows.dialog,
      },
    },
  },

  MuiBackdrop: {
    styleOverrides: {
      root: {
        backdropFilter: 'blur(3px)',
        backgroundColor: isDarkMode
          ? alpha('#000000', 0.4)
          : alpha('#000000', 0.2),
      },
    },
  },

  // --------------------------------------------------------------------------
  // TOOLTIPS
  // --------------------------------------------------------------------------
  MuiTooltip: {
    defaultProps: {
      enterDelay: 0,
      leaveDelay: 0,
      enterNextDelay: 0,
    },
    styleOverrides: {
      tooltip: {
        fontSize: '0.75rem',
        borderRadius: 8,
        padding: '12px 16px',
        backgroundColor: isDarkMode ? '#424242' : '#616161',
        boxShadow: isDarkMode
          ? '0 8px 32px rgba(0, 0, 0, 0.4)'
          : '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
      arrow: {
        color: isDarkMode ? '#424242' : '#616161',
      },
    },
  },

  // --------------------------------------------------------------------------
  // LISTS & MENUS
  // --------------------------------------------------------------------------
  MuiListItem: {
    styleOverrides: {
      root: {
        transition: 'background-color 0.1s ease',
        '&:hover': {
          backgroundColor: isDarkMode
            ? alpha('#ffffff', 0.08)
            : alpha('#000000', 0.04),
        },
      },
    },
  },

  MuiMenuItem: {
    styleOverrides: {
      root: {
        transition: 'background-color 0.1s ease',
        '&:hover': {
          backgroundColor: isDarkMode
            ? alpha('#ffffff', 0.08)
            : alpha('#000000', 0.04),
        },
      },
    },
  },

  // --------------------------------------------------------------------------
  // DIVIDERS
  // --------------------------------------------------------------------------
  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: isDarkMode
          ? alpha('#ffffff', 0.12)
          : alpha('#000000', 0.12),
      },
    },
  },

  // --------------------------------------------------------------------------
  // TABS
  // --------------------------------------------------------------------------
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 500,
        fontSize: '0.875rem',
        transition: 'color 0.1s ease, opacity 0.1s ease',
        '&:hover': {
          opacity: 1,
        },
      },
    },
  },
});

// ============================================================================
// THEME FACTORY
// ============================================================================

export const createAppTheme = (isDarkMode: boolean) => {
  return createTheme({
    palette: isDarkMode ? darkPalette : lightPalette,
    typography,
    spacing,
    shape,
    breakpoints,
    transitions,
    components: getComponentOverrides(isDarkMode),
    // Custom properties for reuse
    customShadows,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

// Export custom shadows for use in components
export { customShadows };

// Helper functions for common styles
export const glassEffect = (isDarkMode: boolean) => ({
  background: isDarkMode ? alpha('#000000', 0.3) : alpha('#ffffff', 0.7),
  backdropFilter: 'blur(10px) saturate(180%)',
  border: isDarkMode
    ? `1px solid ${alpha('#ffffff', 0.1)}`
    : `1px solid ${alpha('#ffffff', 0.2)}`,
  boxShadow: customShadows.glass,
});

export const statusColors = {
  running: '#4caf50',
  starting: '#ffeb3b',
  restarting: '#2196f3',
  error: '#f44336',
  idle: '#9e9e9e',
  stopped: '#9e9e9e',
};

// Process orchestrator specific colors (renamed from processColors)
export const processColors = {
  primary: {
    main: '#1976d2',
    gradient: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05), rgba(66, 165, 245, 0.02))',
    border: alpha('#1976d2', 0.1),
  },
  success: {
    main: '#4caf50',
    gradient: 'linear-gradient(135deg, rgba(76, 175, 80, 0.05), rgba(139, 195, 74, 0.02))',
    border: alpha('#4caf50', 0.1),
  },
};
