import { BrowserWindow, shell, app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from './utils/logger.js';

const logger = createLogger('WindowManager');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use app.isPackaged to reliably detect production build
// isPackaged is false when running from source, true when running from built app
const isDev = !app.isPackaged;

// Window creation and configuration functions
export function createBrowserWindow() {
  return new BrowserWindow({
    width: 1800,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, '../preload/preload.js')
    },
    icon: path.join(__dirname, '../public/icon.png'), // You'll need to add an icon
    show: false, // Don't show until ready
    titleBarStyle: 'default',
    title: 'FlowForge - Modular Development Workflow Manager'
  });
}

export function loadApplication(window) {
  if (isDev) {
    // In development, electron-vite sets this env var to the Vite dev server URL
    const devServerUrl = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL || 'http://localhost:5173';
    logger.info(`Loading from Vite dev server: ${devServerUrl}`);
    window.loadURL(devServerUrl).catch(err => {
      logger.error('Failed to load from dev server:', err);
    });
    // Open DevTools in development
    window.webContents.openDevTools();
  } else {
    // In production, load from the bundled renderer output
    logger.info('Loading from built files');
    window.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

export function setupWindowEventHandlers(window, onWindowClosed) {
  // Add error handling for failed loads
  window.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    logger.error('Failed to load:', errorDescription, 'URL:', validatedURL);
  });

  // Show window when ready to prevent visual flash
  window.once('ready-to-show', () => {
    window.show();
    logger.info('Electron window is ready and shown');
  });

  // Handle window closed
  window.on('closed', () => {
    if (onWindowClosed) {
      onWindowClosed();
    }
  });

  // Handle external links
  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

export function createWindow(onWindowClosed) {
  // Create the browser window
  const window = createBrowserWindow();
  
  // Load the application
  loadApplication(window);
  
  // Setup event handlers
  setupWindowEventHandlers(window, onWindowClosed);
  
  return window;
}