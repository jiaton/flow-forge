import React, { useEffect } from 'react';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import { Home } from '@mui/icons-material';
import { useDbAppStore as useAppStore } from '../../stores/dbAppStore';
import { moduleRegistry } from '../../core/module-system';
import { isValidModuleId, getFirstEnabledModule } from '../../core/module-system';

const MainContent: React.FC = () => {
  const { currentView, setCurrentView } = useAppStore();

  // Validate current view on mount and when it changes
  useEffect(() => {
    if (!currentView || !isValidModuleId(currentView)) {
      const defaultView = getFirstEnabledModule();
      setCurrentView(defaultView);
    }
  }, [currentView, setCurrentView]);

  const renderContent = () => {
    // Try to get module component from registry
    const ModuleComponent = moduleRegistry.getModuleComponent(currentView);

    if (ModuleComponent) {
      // Module found and enabled - render it
      return (
        <React.Suspense
          fallback={
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircularProgress />
            </Box>
          }
        >
          <ModuleComponent />
        </React.Suspense>
      );
    }

    // Module not found - show error with option to go home
    const handleGoHome = () => {
      const defaultView = getFirstEnabledModule();
      setCurrentView(defaultView);
    };

    return (
      <Box
        sx={{
          p: 3,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ textAlign: 'center', maxWidth: 500 }}>
          <Typography variant="h4" gutterBottom>
            Module Not Found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            The module "{currentView}" could not be loaded. It may be disabled or not available for your current team.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Home />}
            onClick={handleGoHome}
          >
            Go to Home
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100%', overflow: 'hidden' }}>
      {renderContent()}
    </Box>
  );
};

export default MainContent;