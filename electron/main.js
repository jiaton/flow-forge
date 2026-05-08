import { app, BrowserWindow } from 'electron';
import { createWindow } from './windowManager.js';
import { createMenu } from './menuManager.js';
import { setupIpcHandlers } from './ipcHandlers.js';
import { logBufferManager } from './service-orchestration/logs/buffer.js';
import { serviceCommands, loadServiceCommands } from './service-orchestration/config/microservice-config.js';
import { initializeDatabase, closeDatabase } from './database/index.js';
import { initializeConfigFiles } from './utils/configInitializer.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('Main');

// Keep a global reference of the window object
let mainWindow;

// App event handlers
app.whenReady().then(() => {
  // Initialize config files first (copy examples to user data if needed)
  initializeConfigFiles();

  // Initialize database
  try {
    initializeDatabase();
    logger.info('✓ Database initialized');

    // Recover detached services from previous sessions
    import('./service-orchestration/execution/index.js').then(({ recoverDetachedServices }) => {
      recoverDetachedServices().then((result) => {
        logger.debug(`✓ Service recovery complete: ${result.recovered}/${result.total} services recovered`);
      }).catch(err => {
        logger.error('Failed to recover detached services:', err);
      });
    });

    // Recover Docker services (containers persist across app restarts)
    import('./service-orchestration/execution/detached-recovery.js').then(({ recoverDetachedDockerServices }) => {
      import('./service-orchestration/config/microservice-config.js').then(({ serviceCommands }) => {
        const dockerServices = Object.fromEntries(
          Object.entries(serviceCommands).filter(([, cfg]) => cfg.mode === 'docker')
        );
        if (Object.keys(dockerServices).length > 0) {
          recoverDetachedDockerServices(dockerServices).then((recovered) => {
            if (recovered.length > 0) logger.debug(`✓ Docker recovery: ${recovered.join(', ')}`);
          }).catch(err => logger.error('Docker recovery failed:', err));
        }
      });
    });
  } catch (error) {
    logger.error('Failed to initialize database:', error);
  }

  // Create the main window
  mainWindow = createWindow(() => {
    mainWindow = null;
  });

  // Set main window for log streaming
  logBufferManager.setMainWindow(mainWindow);

  // Create the application menu
  createMenu(mainWindow);

  // Setup IPC handlers
  setupIpcHandlers(mainWindow);

  // Load service commands on app start
  loadServiceCommands();

  // Start routine cron scheduler
  import('./service-orchestration/routines/routine-scheduler.js')
    .then(({ startScheduler }) => startScheduler())
    .catch(err => console.error('Failed to start routine scheduler:', err));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow(() => {
        mainWindow = null;
      });
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Close database connection when app quits
app.on('before-quit', () => {
  closeDatabase();
});