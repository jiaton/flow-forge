import { Menu, dialog, shell, app } from 'electron';
import fs from 'fs';
import yaml from 'js-yaml';

// Menu creation functions
export function createFileMenu(mainWindow) {
  return {
    label: 'File',
    submenu: [
      {
        label: 'Open Configuration',
        accelerator: 'CmdOrCtrl+O',
        click: async () => {
          const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [
              { name: 'YAML Files', extensions: ['yaml', 'yml'] },
              { name: 'JSON Files', extensions: ['json'] },
              { name: 'All Files', extensions: ['*'] }
            ]
          });

          if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            try {
              const content = fs.readFileSync(filePath, 'utf8');
              const config = yaml.load(content);
              mainWindow.webContents.send('config-loaded', { config, filePath });
            } catch (error) {
              dialog.showErrorBox('Error', `Failed to load configuration: ${error.message}`);
            }
          }
        }
      },
      {
        label: 'Save Configuration',
        accelerator: 'CmdOrCtrl+S',
        click: async () => {
          mainWindow.webContents.send('save-config-requested');
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  };
}

export function createEditMenu() {
  return {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectall' }
    ]
  };
}

export function createViewMenu() {
  return {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  };
}

export function createWindowMenu() {
  return {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'close' }
    ]
  };
}

export function createHelpMenu(mainWindow) {
  return {
    label: 'Help',
    submenu: [
      {
        label: 'About FlowForge',
        click: () => {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'About FlowForge',
            message: 'FlowForge - Modular Development Workflow Manager',
            detail: 'Version 1.0.0\nA modular framework for managing local development services and workflows.'
          });
        }
      },
      {
        label: 'Open Documentation',
        click: () => {
          shell.openExternal('https://github.com/your-repo/flowforge');
        }
      }
    ]
  };
}

export function createMacOSMenu() {
  return {
    label: app.getName(),
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  };
}

export function buildMenuTemplate(mainWindow) {
  const template = [
    createFileMenu(mainWindow),
    createEditMenu(),
    createViewMenu(),
    createWindowMenu(),
    createHelpMenu(mainWindow)
  ];

  // Add macOS-specific menu items
  if (process.platform === 'darwin') {
    template.unshift(createMacOSMenu());
  }

  return template;
}

export function createMenu(mainWindow) {
  const template = buildMenuTemplate(mainWindow);
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}