declare global {
  interface Window {
    electronAPI: {
      // Configuration management
      readConfigFile: (filePath: string) => Promise<{ success: boolean; config?: any; error?: string }>;
      writeConfigFile: (filePath: string, config: any) => Promise<{ success: boolean; error?: string }>;
      showSaveDialog: () => Promise<{ canceled: boolean; filePath?: string }>;
      showOpenDialog: () => Promise<{ canceled: boolean; filePaths?: string[] }>;

      // Configuration events
      onConfigLoaded: (callback: (event: any, data: any) => void) => void;
      onSaveConfigRequested: (callback: (event: any) => void) => void;
      onConfigSaved: (callback: (event: any, data: any) => void) => void;
      onConfigReloaded: (callback: (event: any, data: any) => void) => void;

      // Send configuration data
      saveConfig: (config: any) => void;
      reloadConfig: () => void;

      // Service management
      startService: (serviceData: {
        serviceId: string;
        serviceName: string;
        serviceType: string;
        port?: number;
        endpoint?: string;
        team: string;
        executionMode?: 'internal';
        detached?: boolean;
      }) => Promise<{
        success: boolean;
        message?: string;
        error?: string;
        stdout?: string;
        stderr?: string;
        executionMode?: string;
      }>;

      stopService: (serviceData: {
        serviceId: string;
        team: string;
      }) => Promise<{
        success: boolean;
        message?: string;
        error?: string;
        stdout?: string;
        stderr?: string;
      }>;

      forceStopService: (serviceId: string) => Promise<{
        success: boolean;
        message?: string;
        error?: string;
      }>;

      getServiceStats: () => Promise<Record<string, { cpu: number; memory: number }>>;

      getServiceLogs: (serviceData: {
        serviceId: string;
        team: string;
      }) => Promise<{
        success: boolean;
        logs: Array<{
          timestamp: string;
          level: string;
          message: string;
          details: any;
        }>;
        error?: string;
      }>;

      getServiceCommands: () => Promise<{
        success: boolean;
        commands: Record<string, {
          start?: string;
          stop?: string;
          check?: string;
        }>;
      }>;

      reloadServiceCommands: () => Promise<{
        success: boolean;
        message?: string;
        error?: string;
        commands?: Record<string, {
          start?: string;
          stop?: string;
          check?: string;
        }>;
      }>;

      getRunningServices: () => Promise<{
        success: boolean;
        services: Array<{
          serviceId: string;
          name: string;
          type: string;
          port?: number;
          endpoint?: string;
          team: string;
          startTime: string;
          command: string;
        }>;
      }>;

      checkServiceStatus: (serviceIds: string[]) => Promise<{
        success: boolean;
        results: Record<string, {
          isRunning: boolean;
          state: string;
          processType?: string;
          lastChecked?: string;
          checkCommand?: string;
          hasProcessInfo: boolean;
          isManaged: boolean;
          startTime?: string;
          stateHistory?: Array<{
            state: string;
            timestamp: string;
            reason?: string;
          }>;
          detailedStatus?: {
            status: string;
            processRunning: boolean;
            portListening: boolean;
          };
        }>;
        error?: string;
      }>;

      debugServiceState: () => Promise<{
        success: boolean;
        debug: {
          runningServicesKeys: string[];
          serviceLogsKeys: string[];
          runningServicesData: Array<{
            id: string;
            name: string;
            pid?: number;
            processKilled?: boolean;
            processExitCode?: number | null;
            logCount: number;
          }>;
        };
      }>;

      // Log streaming - subscribe/unsubscribe
      subscribeServiceLogs: (serviceId: string) => Promise<{ success: boolean }>;
      unsubscribeServiceLogs: (serviceId: string) => Promise<{ success: boolean }>;

      // Log streaming - event listeners
      onServiceLogsUpdate: (callback: (data: {
        serviceId: string;
        logs: Array<{
          timestamp: string;
          level: string;
          message: string;
          source?: string;
          details?: any;
        }>;
      }) => void) => () => void;

      // Execute custom commands (IDE, terminal, folder opening, etc.)
      executeCommand: (command: string) => Promise<{
        success: boolean;
        stdout?: string;
        stderr?: string;
        error?: string;
      }>;

      // Remote config sync
      remoteConfigStatus: () => Promise<{
        configured: boolean;
        hasConfig: boolean;
        source: { url: string; branch: string; lastSync: string } | null;
        updateDue: boolean;
      }>;
      remoteConfigClone: (url: string, branch?: string) => Promise<{ success: boolean; error?: string }>;
      remoteConfigRefresh: () => Promise<{ success: boolean; error?: string; upToDate?: boolean; needsManualResolve?: boolean }>;
      remoteConfigRemove: () => Promise<{ success: boolean }>;
      remoteConfigApplyTemplates: () => Promise<{ success: boolean; error?: string }>;

      // Log level control
      getLogLevel: () => Promise<{
        success: boolean;
        level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
      }>;

      setLogLevel: (level: 'error' | 'warn' | 'info' | 'debug' | 'verbose') => Promise<{
        success: boolean;
        level?: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
        error?: string;
      }>;

      // Remove event listeners
      removeAllListeners: (channel: string) => void;

      // Platform information
      platform: string;

      // App information
      appVersion: string;

      // Development mode
      isDev: boolean;

      // Database API
      db: {
        appSettings: {
          get: (key: string) => Promise<any>;
          getAll: () => Promise<Record<string, any>>;
          set: (key: string, value: any) => Promise<boolean>;
          setMany: (settings: Record<string, any>) => Promise<boolean>;
        };
        teamConfigs: {
          get: (team: string) => Promise<any>;
          getAll: () => Promise<Record<string, any>>;
          save: (team: string, config: any) => Promise<boolean>;
        };
        viewStates: {
          get: (viewId: string) => Promise<any>;
          getAll: () => Promise<Record<string, any>>;
          save: (viewId: string, state: any) => Promise<boolean>;
        };
        notifications: {
          get: (id: string) => Promise<any>;
          getAll: (options?: { dismissed?: boolean; limit?: number }) => Promise<any[]>;
          getActive: () => Promise<any[]>;
          save: (notification: any) => Promise<boolean>;
          dismiss: (id: string) => Promise<boolean>;
          deleteOld: (daysToKeep?: number) => Promise<number>;
        };
        serviceState: {
          get: (id: string) => Promise<any>;
          getAll: () => Promise<any[]>;
          getAllAsObject: () => Promise<Record<string, any>>;
          getByTeam: (team: string) => Promise<any[]>;
          save: (id: string, serviceData: any) => Promise<boolean>;
          saveAll: (servicesObject: Record<string, any>) => Promise<boolean>;
          updateState: (id: string, state: string) => Promise<boolean>;
        };
      };

      // Routines API
      openConfigFolder: () => Promise<{ success: boolean }>;
      routines: {
        list: () => Promise<{
          success: boolean;
          routines: Array<{
            id: string;
            name: string;
            description?: string;
            notify: boolean;
            steps: Array<
              | { action: string; services: string[] | 'all'; resolvedServices?: Array<{ id: string; name: string; command: string }> }
              | { run: string; dir: string }
            >;
            schedule: {
              routineId: string;
              cronExpression: string | null;
              enabled: number;
              notify: number;
              lastRunAt: string | null;
              lastRunStatus: string | null;
            } | null;
          }>;
        }>;
        run: (routineId: string, selectedSteps?: number[]) => Promise<{
          success: boolean;
          script?: string;
          name?: string;
          error?: string;
          commands?: Array<{ label: string; detail: string }>;
        }>;
        saveSchedule: (data: {
          routineId: string;
          cronExpression?: string | null;
          enabled?: boolean;
          notify?: boolean;
        }) => Promise<{ success: boolean }>;
        getRuns: (routineId?: string, limit?: number) => Promise<{
          success: boolean;
          runs: Array<{
            id: number;
            routineId: string;
            trigger: 'manual' | 'cron';
            status: 'running' | 'success' | 'failed';
            logFile: string | null;
            startedAt: string;
            finishedAt: string | null;
          }>;
        }>;
        getRunLog: (logFile: string) => Promise<{ success: boolean; content?: string; error?: string }>;
      };

      // GitLab API
      gitlab: {
        settings: {
          get: () => Promise<{
            success: boolean;
            settings?: {
              gitUrl: string;
              apiUrl: string;
              accessToken: string;
              refreshInterval: number;
            };
            error?: string;
          }>;
          save: (settings: {
            gitUrl: string;
            apiUrl: string;
            accessToken: string;
            refreshInterval: number;
          }) => Promise<{ success: boolean; error?: string }>;
          validateToken: () => Promise<{ success: boolean; valid: boolean; error?: string }>;
        };
        serviceConfig: {
          get: (serviceName: string) => Promise<{
            success: boolean;
            config?: {
              projectId: string | null;
              defaultReviewers: string[];
            };
            error?: string;
          }>;
          getAll: () => Promise<{
            success: boolean;
            configs?: Record<string, {
              projectId: string | null;
              defaultReviewers: string[];
            }>;
            error?: string;
          }>;
        };
        mergeRequests: {
          getAll: () => Promise<{
            success: boolean;
            mergeRequests?: any[];
            error?: string;
          }>;
          getByStatus: (status: string) => Promise<{
            success: boolean;
            mergeRequests?: any[];
            error?: string;
          }>;
          getByService: (serviceName: string) => Promise<{
            success: boolean;
            mergeRequests?: any[];
            error?: string;
          }>;
          track: (mrUrl: string, serviceName?: string) => Promise<{
            success: boolean;
            mergeRequest?: any;
            error?: string;
          }>;
          refresh: (mrId: number) => Promise<{
            success: boolean;
            mergeRequest?: any;
            error?: string;
          }>;
          refreshAll: () => Promise<{
            success: boolean;
            results?: { successful: number; failed: number; total: number };
            mergeRequests?: any[];
            error?: string;
          }>;
          updateLocalData: (mrId: number, data: {
            notes?: string;
            tags?: string[];
            serviceName?: string;
          }) => Promise<{
            success: boolean;
            mergeRequest?: any;
            error?: string;
          }>;
          delete: (mrId: number) => Promise<{ success: boolean; error?: string }>;
        };
      };
    };
  }
}

export { }; 