import { ipcMain, clipboard } from 'electron';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { introspect, loadCache, saveCache, detectVersion, generateAIPrompt } from './introspector.js';

/**
 * Command Palette backend module.
 * Auto-discovered by electron/module-loader.js
 */
export function register({ configDir, mainWindow }) {
  const paletteDir = path.join(configDir, 'command-palette');
  const cacheDir = path.join(paletteDir, 'cache');
  const configFile = path.join(paletteDir, 'commands.yaml');

  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  // Self-initialize: copy template if config doesn't exist
  if (!fs.existsSync(configFile)) {
    const templateFile = path.join(process.cwd(), 'config.templates', 'command-palette', 'commands.yaml');
    if (fs.existsSync(templateFile)) {
      fs.copyFileSync(templateFile, configFile);
    }
  }

  function loadConfig() {
    if (!fs.existsSync(configFile)) return { commands: [], templates: [] };
    return yaml.load(fs.readFileSync(configFile, 'utf8')) || { commands: [], templates: [] };
  }

  // Watch config file for changes and notify frontend
  let debounceTimer = null;
  fs.watch(paletteDir, { recursive: true }, (eventType, filename) => {
    if (!filename?.endsWith('.yaml')) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('commandPalette:configChanged');
      }
    }, 300);
  });

  ipcMain.handle('commandPalette:getConfig', () => loadConfig());

  ipcMain.handle('commandPalette:getCachedTree', (_, binary) => loadCache(cacheDir, binary));

  ipcMain.handle('commandPalette:introspect', async (_, binary) => {
    const config = loadConfig();
    const cmd = config.commands?.find(c => c.binary === binary);
    const helpFlag = cmd?.helpFlag || '--help';
    const versionFlag = cmd?.versionFlag || '--version';
    const parser = cmd?.parser || null;

    const sendProgress = (msg) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('commandPalette:introspectProgress', msg);
      }
    };

    const tree = await introspect(binary, helpFlag, versionFlag, parser, sendProgress);
    saveCache(cacheDir, tree);
    return tree;
  });

  ipcMain.handle('commandPalette:checkVersion', async (_, binary) => {
    const config = loadConfig();
    const cmd = config.commands?.find(c => c.binary === binary);
    const versionFlag = cmd?.versionFlag || '--version';

    const current = await detectVersion(binary, versionFlag);
    const cached = loadCache(cacheDir, binary);
    return { current, cached: cached?.version || null, stale: current !== cached?.version };
  });

  ipcMain.handle('commandPalette:execute', async (_, command) => {
    // Execution is handled by the InteractiveTerminal component
    // via the existing PTY IPC (pty:spawn / pty:write).
    // This handler exists for future non-interactive execution if needed.
    return { success: true };
  });

  ipcMain.handle('commandPalette:copyIntrospectPrompt', (_, binary) => {
    const config = loadConfig();
    const cmd = config.commands?.find(c => c.binary === binary);
    const helpFlag = cmd?.helpFlag || '--help';
    const versionFlag = cmd?.versionFlag || '--version';

    const prompt = generateAIPrompt(binary, helpFlag, versionFlag, cacheDir);
    clipboard.writeText(prompt);
    return { copied: true };
  });

  ipcMain.handle('commandPalette:saveTemplate', (_, { name, command }) => {
    const config = loadConfig();
    if (!config.templates) config.templates = [];
    config.templates.push({ name, command });
    fs.writeFileSync(configFile, yaml.dump(config, { lineWidth: 120 }));
    return { success: true };
  });

  ipcMain.handle('commandPalette:createTemplate', (_, { name, command }) => {
    const config = loadConfig();
    if (!config.templates) config.templates = [];
    // Auto-detect variables from ${VAR} patterns
    const varMatches = [...command.matchAll(/\$\{(\w+)(?:\s+(\w+))?\}/g)];
    const variables = {};
    for (const m of varMatches) {
      const varName = m[1];
      const modifier = m[2]; // e.g. "repeat"
      if (!variables[varName]) {
        variables[varName] = { prompt: varName, default: '', ...(modifier === 'repeat' ? { repeat: true } : {}) };
      }
    }
    // Clean command: remove modifiers from placeholders
    const cleanCommand = command.replace(/\$\{(\w+)\s+\w+\}/g, '${$1}');
    const id = name.toLowerCase().replace(/\s+/g, '-');
    config.templates.push({ id, name, command: cleanCommand, ...(Object.keys(variables).length ? { variables } : {}) });
    fs.writeFileSync(configFile, yaml.dump(config, { lineWidth: 120 }));
    return { success: true };
  });

  ipcMain.handle('commandPalette:addCommand', (_, { binary }) => {
    const config = loadConfig();
    if (!config.commands) config.commands = [];
    if (config.commands.find(c => c.binary === binary)) return { success: false, error: 'Already registered' };
    config.commands.push({ binary, helpFlag: '--help', versionFlag: '--version' });
    fs.writeFileSync(configFile, yaml.dump(config, { lineWidth: 120 }));
    return { success: true };
  });

  ipcMain.handle('commandPalette:removeCommand', (_, { binary }) => {
    const config = loadConfig();
    if (!config.commands) return { success: false };
    config.commands = config.commands.filter(c => c.binary !== binary);
    fs.writeFileSync(configFile, yaml.dump(config, { lineWidth: 120 }));
    // Also remove cache
    const files = fs.existsSync(cacheDir) ? fs.readdirSync(cacheDir) : [];
    for (const f of files) {
      if (f.startsWith(`${binary}@`)) fs.unlinkSync(path.join(cacheDir, f));
    }
    return { success: true };
  });

  ipcMain.handle('commandPalette:saveTemplateVersion', (_, { templateId, version }) => {
    const config = loadConfig();
    const tpl = config.templates?.find(t => t.id === templateId || t.name === templateId);
    if (!tpl) return { success: false, error: 'Template not found' };
    if (!tpl.versions) tpl.versions = [];
    // Replace if same name exists
    tpl.versions = tpl.versions.filter(v => v.name !== version.name);
    tpl.versions.push(version);
    fs.writeFileSync(configFile, yaml.dump(config, { lineWidth: 120 }));
    return { success: true };
  });

  ipcMain.handle('commandPalette:deleteTemplateVersion', (_, { templateId, versionName }) => {
    const config = loadConfig();
    const tpl = config.templates?.find(t => t.id === templateId || t.name === templateId);
    if (!tpl || !tpl.versions) return { success: false };
    tpl.versions = tpl.versions.filter(v => v.name !== versionName);
    fs.writeFileSync(configFile, yaml.dump(config, { lineWidth: 120 }));
    return { success: true };
  });

  ipcMain.handle('commandPalette:deleteTemplate', (_, { templateId }) => {
    const config = loadConfig();
    if (!config.templates) return { success: false };
    config.templates = config.templates.filter(t => (t.id || t.name) !== templateId);
    fs.writeFileSync(configFile, yaml.dump(config, { lineWidth: 120 }));
    return { success: true };
  });
}
