import { useMemo, useEffect, useState } from 'react';
import { configManager, type AppConfig, type EnvironmentConfig } from '../../lib/loaders/config';
import { useDbAppStore as useAppStore } from '../../stores/dbAppStore';

export const useConfig = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    const initConfig = async () => {
      try {
        // Add a small delay to ensure Electron API is available
        if (typeof window !== 'undefined' && window.electronAPI) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        await configManager.initialize();
        setIsInitialized(true);
        // Initialize team configs after configuration is ready
        try {
          const store = useAppStore.getState();
          if (store?.initializeTeamConfigs) {
            store.initializeTeamConfigs();
          }
        } catch (storeError) {
          console.warn('Failed to initialize team configs:', storeError);
        }
      } catch (err) {
        console.error('Configuration initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize configuration');
        // Still mark as initialized to prevent infinite loading
        setIsInitialized(true);
      }
    };

    initConfig();
  }, [reloadTrigger]);

  return useMemo(() => {
    if (!isInitialized) {
      return {
        isLoading: true,
        error,
        config: null,
      };
    }

    try {
      const config = configManager.getConfig();
      
      return {
        isLoading: false,
        error: null,
        config: {
          // App info
          appName: config.app.name,
          appVersion: config.app.version,
          environment: config.app.environment,
          
          // Environment configs
          environments: config.environments,
          getEnvironment: (envName: string): EnvironmentConfig | undefined => 
            configManager.getEnvironment(envName),
          getCurrentEnvironment: (envName: string): EnvironmentConfig =>
            configManager.getCurrentEnvironmentConfig(envName),

          // Other services
          teamspace: config.otherServices.teamspace,
          
          // Feature flags
          features: config.features,
          
          // UI settings
          ui: config.ui,
          
          // Security settings
          security: config.security,
          
          // Helper methods
          isDevelopment: () => configManager.isDevelopment(),
          isProduction: () => configManager.isProduction(),
          getTeamspaceUrl: () => configManager.getTeamspaceUrl(),
          
          // Full config access
          getFullConfig: (): AppConfig => config,
          
          // Update methods
          updateConfig: async (updates: Partial<AppConfig>) => {
            await configManager.updateConfig(updates);
          },
          reloadConfig: async () => {
            await configManager.reloadConfig();
            // Trigger a re-render by updating the reload trigger
            setReloadTrigger(prev => prev + 1);
          },
        },
      };
    } catch (err) {
      return {
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load configuration',
        config: null,
      };
    }
  }, [isInitialized, error, reloadTrigger]);
}; 