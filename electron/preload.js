const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration management
  readConfigFile: (filePath) => ipcRenderer.invoke('read-config-file', filePath),
  writeConfigFile: (filePath, config) => ipcRenderer.invoke('write-config-file', { filePath, config }),
  showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
  
  // Configuration events
  onConfigLoaded: (callback) => ipcRenderer.on('config-loaded', callback),
  onSaveConfigRequested: (callback) => ipcRenderer.on('save-config-requested', callback),
  onConfigSaved: (callback) => ipcRenderer.on('config-saved', callback),
  onConfigReloaded: (callback) => ipcRenderer.on('config-reloaded', callback),
  
  // Send configuration data
  saveConfig: (config) => ipcRenderer.send('save-config', config),
  reloadConfig: () => ipcRenderer.send('reload-config'),
  
  // Service management
  startService: (serviceData) => ipcRenderer.invoke('start-service', serviceData),
  stopService: (serviceData) => ipcRenderer.invoke('stop-service', serviceData),
  forceStopService: (serviceId) => ipcRenderer.invoke('force-stop-service', { serviceId }),
  dockerPull: (serviceId) => ipcRenderer.invoke('docker:pull', { serviceId }),
  dockerRebuild: (serviceId) => ipcRenderer.invoke('docker:rebuild', { serviceId }),
  getServiceStats: () => ipcRenderer.invoke('get-service-stats'),
  getServiceBranches: () => ipcRenderer.invoke('get-service-branches'),
  onServiceBranchChanged: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('service-branch-changed', listener);
    return () => ipcRenderer.removeListener('service-branch-changed', listener);
  },
  getServiceLogs: (serviceData) => ipcRenderer.invoke('get-service-logs', serviceData),
  getServiceCommands: () => ipcRenderer.invoke('get-service-commands'),
  reloadServiceCommands: () => ipcRenderer.invoke('reload-service-commands'),
  getRunningServices: () => ipcRenderer.invoke('get-running-services'),
  checkServiceStatus: (serviceIds) => ipcRenderer.invoke('check-service-status', { serviceIds }),
  debugServiceState: () => ipcRenderer.invoke('debug-service-state'),

  // Log streaming
  subscribeServiceLogs: (serviceId) => ipcRenderer.invoke('subscribe-service-logs', { serviceId }),
  unsubscribeServiceLogs: (serviceId) => ipcRenderer.invoke('unsubscribe-service-logs', { serviceId }),
  onServiceLogsUpdate: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('service-logs-update', listener);
    // Return cleanup function
    return () => ipcRenderer.removeListener('service-logs-update', listener);
  },

  // Interactive terminal (PTY)
  ptySpawn: (serviceId, cwd, logFile) => ipcRenderer.invoke('pty-spawn', { serviceId, cwd, logFile }),
  ptyWrite: (serviceId, data) => ipcRenderer.send('pty-write', { serviceId, data }),
  ptyResize: (serviceId, cols, rows) => ipcRenderer.send('pty-resize', { serviceId, cols, rows }),
  ptyKill: (serviceId) => ipcRenderer.invoke('pty-kill', { serviceId }),
  onPtyData: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('pty-data', listener);
    return () => ipcRenderer.removeListener('pty-data', listener);
  },
  onPtyExit: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('pty-exit', listener);
    return () => ipcRenderer.removeListener('pty-exit', listener);
  },

  // Execute custom commands (IDE, terminal, folder opening, etc.)
  executeCommand: (command) => ipcRenderer.invoke('execute-command', { command }),

  // Remote config sync
  remoteConfigStatus: () => ipcRenderer.invoke('remote-config:status'),
  remoteConfigClone: (url, branch) => ipcRenderer.invoke('remote-config:clone', { url, branch }),
  remoteConfigRefresh: () => ipcRenderer.invoke('remote-config:refresh'),
  remoteConfigRemove: () => ipcRenderer.invoke('remote-config:remove'),
  remoteConfigApplyTemplates: () => ipcRenderer.invoke('remote-config:apply-templates'),

  // Log level control
  getLogLevel: () => ipcRenderer.invoke('get-log-level'),
  setLogLevel: (level) => ipcRenderer.invoke('set-log-level', level),

  // Remove event listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // Platform information
  platform: process.platform,

  // App information
  appVersion: process.env.npm_package_version || '1.0.0',

  // Development mode - use Electron's built-in process.defaultApp
  // This is true when running 'electron .' and false when packaged (equivalent to !app.isPackaged)
  isDev: process.defaultApp ?? false,

  // Database API
  db: {
    appSettings: {
      get: (key) => ipcRenderer.invoke('db:appSettings:get', key),
      getAll: () => ipcRenderer.invoke('db:appSettings:getAll'),
      set: (key, value) => ipcRenderer.invoke('db:appSettings:set', key, value),
      setMany: (settings) => ipcRenderer.invoke('db:appSettings:setMany', settings),
    },
    teamConfigs: {
      get: (team) => ipcRenderer.invoke('db:teamConfigs:get', team),
      getAll: () => ipcRenderer.invoke('db:teamConfigs:getAll'),
      save: (team, config) => ipcRenderer.invoke('db:teamConfigs:save', team, config),
    },
    viewStates: {
      get: (viewId) => ipcRenderer.invoke('db:viewStates:get', viewId),
      getAll: () => ipcRenderer.invoke('db:viewStates:getAll'),
      save: (viewId, state) => ipcRenderer.invoke('db:viewStates:save', viewId, state),
    },
    notifications: {
      get: (id) => ipcRenderer.invoke('db:notifications:get', id),
      getAll: (options) => ipcRenderer.invoke('db:notifications:getAll', options),
      getActive: () => ipcRenderer.invoke('db:notifications:getActive'),
      save: (notification) => ipcRenderer.invoke('db:notifications:save', notification),
      dismiss: (id) => ipcRenderer.invoke('db:notifications:dismiss', id),
      deleteOld: (daysToKeep) => ipcRenderer.invoke('db:notifications:deleteOld', daysToKeep),
    },
    serviceState: {
      get: (id) => ipcRenderer.invoke('db:serviceState:get', id),
      getAll: () => ipcRenderer.invoke('db:serviceState:getAll'),
      getAllAsObject: () => ipcRenderer.invoke('db:serviceState:getAllAsObject'),
      getByTeam: (team) => ipcRenderer.invoke('db:serviceState:getByTeam', team),
      save: (id, serviceData) => ipcRenderer.invoke('db:serviceState:save', id, serviceData),
      saveAll: (servicesObject) => ipcRenderer.invoke('db:serviceState:saveAll', servicesObject),
      updateState: (id, state) => ipcRenderer.invoke('db:serviceState:updateState', id, state),
    },
  },

  // Routines API
  openConfigFolder: () => ipcRenderer.invoke('open-config-folder'),
  routines: {
    list: () => ipcRenderer.invoke('routines:list'),
    run: (routineId, selectedSteps) => ipcRenderer.invoke('routines:run', { routineId, selectedSteps }),
    saveSchedule: (data) => ipcRenderer.invoke('routines:save-schedule', data),
    getRuns: (routineId, limit) => ipcRenderer.invoke('routines:get-runs', { routineId, limit }),
    getRunLog: (logFile) => ipcRenderer.invoke('routines:get-run-log', { logFile }),
  },

  // GitLab API
  gitlab: {
    settings: {
      get: () => ipcRenderer.invoke('gitlab:settings:get'),
      save: (settings) => ipcRenderer.invoke('gitlab:settings:save', settings),
      validateToken: () => ipcRenderer.invoke('gitlab:settings:validateToken'),
    },
    serviceConfig: {
      get: (serviceName) => ipcRenderer.invoke('gitlab:getServiceConfig', serviceName),
      getAll: () => ipcRenderer.invoke('gitlab:getAllServiceConfigs'),
    },
    mergeRequests: {
      getAll: () => ipcRenderer.invoke('mr:getAll'),
      getByStatus: (status) => ipcRenderer.invoke('mr:getByStatus', status),
      getByService: (serviceName) => ipcRenderer.invoke('mr:getByService', serviceName),
      track: (mrUrl, serviceName) => ipcRenderer.invoke('mr:track', mrUrl, serviceName),
      refresh: (mrId) => ipcRenderer.invoke('mr:refresh', mrId),
      refreshAll: () => ipcRenderer.invoke('mr:refreshAll'),
      updateLocalData: (mrId, data) => ipcRenderer.invoke('mr:updateLocalData', mrId, data),
      delete: (mrId) => ipcRenderer.invoke('mr:delete', mrId),
    },
  },
}); 