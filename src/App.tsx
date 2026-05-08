import React, { useEffect, useState } from 'react';
import { ThemeProvider, CssBaseline, Box, CircularProgress, Typography } from '@mui/material';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useThemeStore } from './stores/themeStore';
import { useDbAppStore as useAppStore } from './stores/dbAppStore';
import { createAppTheme } from './theme/theme';
import MainLayout from './components/Layout/MainLayout';
import { moduleRegistry } from './core/module-system';
import { moduleConfigLoader } from './core/module-system';
import { allModules } from './modules';
import { logger } from './lib/logger';
import './App.css';

const log = logger.namespace('App');

function App() {
  const { isDarkMode } = useThemeStore();
  const { selectedTeam } = useAppStore();
  const [modulesLoaded, setModulesLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Use centralized theme configuration
  const theme = createAppTheme(isDarkMode);

  // Bootstrap module system
  useEffect(() => {
    const initModules = async () => {
      try {
        log.info('Initializing module system');

        // 1. Load configuration files
        await moduleConfigLoader.loadConfigs();
        log.debug('Module configurations loaded');

        // 2. Initialize team configs FIRST to ensure we have a valid team
        const { initializeTeamConfigs } = useAppStore.getState();
        initializeTeamConfigs();

        // Get the updated selected team after initialization
        let currentTeam = useAppStore.getState().selectedTeam;
        log.debug('Current team after initialization', { currentTeam });

        // Fallback: if team is still empty, get first team from YAML
        if (!currentTeam) {
          const availableTeams = Object.keys(useAppStore.getState().teamConfigs);
          if (availableTeams.length > 0) {
            currentTeam = availableTeams[0];
            useAppStore.getState().setSelectedTeam(currentTeam);
            log.info('No team selected, using first available', { currentTeam });
          } else {
            log.error('No teams available in configuration');
            throw new Error('No teams configured. Please check your team-presets.yaml file.');
          }
        }

        // 3. Register all available modules (auto-discovered from src/modules/)
        moduleRegistry.registerAll(allModules);
        log.debug('Modules registered');

        // 4. Get module configs for current team (now guaranteed to be valid)
        const moduleConfigs = moduleConfigLoader.getModuleConfigs(currentTeam);
        moduleRegistry.setModuleConfigs(moduleConfigs);
        log.debug('Module configs set', { currentTeam });

        // 5. Load all enabled modules
        await moduleRegistry.loadAllModules();
        log.info('All modules loaded successfully');

        // 6. Load saved module order from database
        try {
          const savedOrder = await window.electronAPI.db.appSettings.get('moduleOrder');
          if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
            moduleRegistry.setModuleOrder(savedOrder);
            log.debug('Restored module order from database');
          }
        } catch {
          log.debug('No saved module order found, using default');
        }

        // 7. Set current team
        await moduleRegistry.setCurrentTeam(currentTeam);

        // 8. Set current view (from DB or default to first enabled module)
        let currentView = null;
        try {
          currentView = await window.electronAPI.db.appSettings.get('currentView');
        } catch {
          log.debug('No currentView in database, using default');
        }

        if (currentView) {
          const { setCurrentView } = useAppStore.getState();
          setCurrentView(currentView);
          log.debug('Set current view from DB', { currentView });
        } else {
          // Set default view to first enabled module
          const enabledModules = moduleRegistry.getEnabledModules();
          if (enabledModules.length > 0) {
            const defaultView = enabledModules[0].metadata.id;
            const { setCurrentView } = useAppStore.getState();
            setCurrentView(defaultView);
            log.debug('Set default current view', { defaultView });
          }
        }

        log.info('Module system initialized', { currentView: useAppStore.getState().currentView });
        setModulesLoaded(true);
      } catch (error) {
        log.error('Failed to initialize module system', error);
        setLoadError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    initModules();
  }, []); // Only run once on mount

  // Update module configs when team changes
  useEffect(() => {
    if (modulesLoaded) {
      const updateTeam = async () => {
        try {
          log.info('Team changed', { selectedTeam });
          const moduleConfigs = moduleConfigLoader.getModuleConfigs(selectedTeam);
          moduleRegistry.setModuleConfigs(moduleConfigs);
          await moduleRegistry.setCurrentTeam(selectedTeam);
        } catch (error) {
          log.error('Failed to update team', error);
        }
      };
      updateTeam();
    }
  }, [selectedTeam, modulesLoaded]);

  // Show loading screen while modules initialize
  if (!modulesLoaded && !loadError) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <CircularProgress size={60} />
          <Typography variant="h6" color="text.secondary">
            Loading FlowForge...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Initializing modules
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  // Show error screen if module initialization failed
  if (loadError) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            p: 4,
          }}
        >
          <Typography variant="h4" color="error">
            Failed to Initialize Modules
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {loadError}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Check the console for more details
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DndProvider backend={HTML5Backend}>
        <MainLayout />
      </DndProvider>
    </ThemeProvider>
  );
}

export default App;