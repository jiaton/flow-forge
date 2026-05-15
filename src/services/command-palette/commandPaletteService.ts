import { CommandCache, CommandPaletteConfig, AutocompleteOption, CommandEntry, CommandFlag } from '../../components/CommandPalette/types';

export class CommandPaletteService {
  static async getConfig(): Promise<CommandPaletteConfig> {
    return await window.electronAPI.commandPalette.getConfig();
  }

  static async getCachedTree(binary: string): Promise<CommandCache | null> {
    return await window.electronAPI.commandPalette.getCachedTree(binary);
  }

  static async introspect(binary: string): Promise<CommandCache> {
    return await window.electronAPI.commandPalette.introspect(binary);
  }

  static async checkVersion(binary: string): Promise<{ current: string; cached: string | null; stale: boolean }> {
    return await window.electronAPI.commandPalette.checkVersion(binary);
  }

  static async executeCommand(command: string): Promise<void> {
    return await window.electronAPI.commandPalette.execute(command);
  }

  static async copyIntrospectPrompt(binary: string): Promise<void> {
    return await window.electronAPI.commandPalette.copyIntrospectPrompt(binary);
  }

  static async saveTemplate(name: string, command: string): Promise<void> {
    return await window.electronAPI.modules.invoke('commandPalette:saveTemplate', { name, command });
  }

  static async createTemplate(name: string, command: string): Promise<void> {
    return await window.electronAPI.modules.invoke('commandPalette:createTemplate', { name, command });
  }

  static async deleteTemplate(templateId: string): Promise<void> {
    return await window.electronAPI.modules.invoke('commandPalette:deleteTemplate', { templateId });
  }

  static async addCommand(binary: string): Promise<void> {
    return await window.electronAPI.modules.invoke('commandPalette:addCommand', { binary });
  }

  static async removeCommand(binary: string): Promise<void> {
    return await window.electronAPI.modules.invoke('commandPalette:removeCommand', { binary });
  }

  static async saveTemplateVersion(templateId: string, version: { name: string; values: Record<string, string | string[]> }): Promise<void> {
    return await window.electronAPI.modules.invoke('commandPalette:saveTemplateVersion', { templateId, version });
  }

  static async deleteTemplateVersion(templateId: string, versionName: string): Promise<void> {
    return await window.electronAPI.modules.invoke('commandPalette:deleteTemplateVersion', { templateId, versionName });
  }

  /** Client-side autocomplete from cached tree */
  static buildAutocomplete(tree: CommandCache, completedPath: string[], prefix: string): AutocompleteOption[] {
    let commands = tree.commands;
    const path: string[] = [tree.binary];

    // Navigate into completed subcommands
    let lastMatch: CommandEntry | null = null;
    for (const token of completedPath) {
      const match = commands.find(c => c.name === token);
      if (!match) return [];
      lastMatch = match;
      if (match.subcommands) {
        path.push(match.name);
        commands = match.subcommands;
      } else {
        // Leaf command — show flags
        path.push(match.name);
        commands = [];
        break;
      }
    }

    // If at a leaf (no subcommands) or prefix starts with -, show flags
    if (commands.length === 0 || prefix.startsWith('-')) {
      const flags = lastMatch?.flags || [];
      const lowerPrefix = prefix.toLowerCase();
      return flags
        .filter((f: CommandFlag) => !lowerPrefix || f.name.startsWith(lowerPrefix) || (f.shortFlag && f.shortFlag.startsWith(lowerPrefix)))
        .map((f: CommandFlag) => ({
          label: f.shortFlag ? `${f.name} (${f.shortFlag})` : f.name,
          description: f.description,
          path: [...path, f.name],
        }));
    }

    // Filter subcommands by prefix
    const lowerPrefix = prefix.toLowerCase();
    return commands
      .filter(cmd => !lowerPrefix || cmd.name.toLowerCase().startsWith(lowerPrefix))
      .map(cmd => ({
        label: cmd.name,
        description: cmd.description,
        path: [...path, cmd.name],
      }));
  }
}
