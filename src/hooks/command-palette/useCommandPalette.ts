import { useState, useEffect, useCallback, useMemo } from 'react';
import { CommandPaletteService } from '../../services/command-palette/commandPaletteService';
import { CommandCache, CommandPaletteConfig, AutocompleteOption } from '../../components/CommandPalette/types';

/**
 * Input state machine:
 *
 * IDLE              → empty input, show all registered binaries
 * SELECTING_BINARY  → typing first token, filter binaries by prefix
 * NAVIGATING        → binary matched, navigating subcommand tree
 * LEAF              → reached a leaf command (no more subcommands)
 */
type InputState = 'IDLE' | 'SELECTING_BINARY' | 'NAVIGATING' | 'LEAF';

interface ParsedInput {
  state: InputState;
  binary: string | null;
  completedPath: string[];  // fully typed subcommands (tokens followed by space)
  prefix: string;           // partial token being typed (no trailing space)
}

function parseInput(input: string, registeredBinaries: string[]): ParsedInput {
  if (!input) {
    return { state: 'IDLE', binary: null, completedPath: [], prefix: '' };
  }

  const endsWithSpace = input.endsWith(' ');
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  const firstToken = tokens[0] || '';

  // Is first token a known binary?
  const binaryMatch = registeredBinaries.find(b => b === firstToken);

  if (!binaryMatch) {
    return { state: 'SELECTING_BINARY', binary: null, completedPath: [], prefix: firstToken };
  }

  const subTokens = tokens.slice(1);

  if (subTokens.length === 0 && !endsWithSpace) {
    // Just typed the binary name exactly, no space yet — still selecting
    return { state: 'SELECTING_BINARY', binary: null, completedPath: [], prefix: firstToken };
  }

  // Binary confirmed (space after it)
  const completedPath = endsWithSpace ? subTokens : subTokens.slice(0, -1);
  const prefix = endsWithSpace ? '' : (subTokens[subTokens.length - 1] || '');

  return { state: 'NAVIGATING', binary: binaryMatch, completedPath, prefix };
}

export const useCommandPalette = () => {
  const [config, setConfig] = useState<CommandPaletteConfig | null>(null);
  const [trees, setTrees] = useState<Map<string, CommandCache>>(new Map());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [introspectLog, setIntrospectLog] = useState<string[]>([]);

  useEffect(() => {
    CommandPaletteService.getConfig().then(setConfig).catch(err => setError(err.message));
  }, []);

  // Listen for introspection progress events
  useEffect(() => {
    window.electronAPI.commandPalette.onIntrospectProgress((msg: string) => {
      setIntrospectLog(prev => [...prev, msg]);
    });
    return () => { window.electronAPI.commandPalette.offIntrospectProgress(); };
  }, []);

  // Auto-reload config when YAML files change on disk
  useEffect(() => {
    window.electronAPI.commandPalette.onConfigChanged(async () => {
      const updated = await CommandPaletteService.getConfig();
      setConfig(updated);
      // Reload trees in case cache files changed
      if (updated?.commands) {
        const loaded = new Map<string, CommandCache>();
        for (const cmd of updated.commands) {
          const tree = await CommandPaletteService.getCachedTree(cmd.binary);
          if (tree) loaded.set(cmd.binary, tree);
        }
        setTrees(loaded);
      }
    });
    return () => { window.electronAPI.commandPalette.offConfigChanged(); };
  }, []);

  useEffect(() => {
    if (!config?.commands?.length) return;
    const loadTrees = async () => {
      const loaded = new Map<string, CommandCache>();
      const stale: string[] = [];
      for (const cmd of config.commands) {
        const tree = await CommandPaletteService.getCachedTree(cmd.binary);
        if (tree) {
          loaded.set(cmd.binary, tree);
          const check = await CommandPaletteService.checkVersion(cmd.binary);
          if (check.stale) stale.push(cmd.binary);
        }
      }
      setTrees(loaded);
      if (stale.length > 0) {
        setError(`Stale cache: ${stale.join(', ')} — click 🔄 to re-introspect`);
      }
    };
    loadTrees();
  }, [config]);

  // Parse input into state machine
  const registeredBinaries = useMemo(
    () => config?.commands?.map(c => c.binary) || [],
    [config]
  );
  const parsed = useMemo(() => parseInput(input, registeredBinaries), [input, registeredBinaries]);

  // Derive autocomplete options from state
  const options = useMemo((): AutocompleteOption[] => {
    if (!config?.commands) return [];

    switch (parsed.state) {
      case 'IDLE':
        return config.commands.map(cmd => ({
          label: cmd.binary,
          description: trees.get(cmd.binary)?.description || '',
          path: [cmd.binary],
        }));

      case 'SELECTING_BINARY':
        return config.commands
          .filter(cmd => cmd.binary.startsWith(parsed.prefix.toLowerCase()))
          .map(cmd => ({
            label: cmd.binary,
            description: trees.get(cmd.binary)?.description || '',
            path: [cmd.binary],
          }));

      case 'NAVIGATING': {
        const tree = trees.get(parsed.binary!);
        if (!tree) return [];
        return CommandPaletteService.buildAutocomplete(tree, parsed.completedPath, parsed.prefix);
      }

      case 'LEAF':
        return [];
    }
  }, [parsed, trees, config]);

  // Status
  const activeBinary = parsed.binary;
  const cacheStatus = useMemo(() => {
    if (!activeBinary) return null;
    const tree = trees.get(activeBinary);
    if (!tree) return `No cache for "${activeBinary}" — click 🔄 to introspect or 🤖 for AI-assisted setup`;
    return `${tree.binary}@${tree.version} · ${tree.commands.length} commands cached`;
  }, [activeBinary, trees]);

  // Actions
  const [confirmIntrospect, setConfirmIntrospect] = useState<string | null>(null);

  const introspect = useCallback(async (binary: string) => {
    // Confirm if cache already exists for this version
    const existing = trees.get(binary);
    if (existing) {
      const check = await CommandPaletteService.checkVersion(binary);
      if (!check.stale) {
        setConfirmIntrospect(binary);
        return;
      }
    }
    doIntrospect(binary);
  }, [trees]);

  const doIntrospect = useCallback(async (binary: string) => {
    setConfirmIntrospect(null);
    setLoading(true);
    setError(null);
    setIntrospectLog([]);
    try {
      const tree = await CommandPaletteService.introspect(binary);
      setTrees(prev => new Map(prev).set(binary, tree));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const execute = useCallback(async (command: string) => {
    await CommandPaletteService.executeCommand(command);
  }, []);

  const copyAIPrompt = useCallback(async (binary: string) => {
    await CommandPaletteService.copyIntrospectPrompt(binary);
  }, []);

  const saveTemplate = useCallback(async (name: string) => {
    if (!input.trim()) return;
    await CommandPaletteService.saveTemplate(name, input.trim());
    const updated = await CommandPaletteService.getConfig();
    setConfig(updated);
  }, [input]);

  const createTemplate = useCallback(async (name: string, command: string) => {
    await CommandPaletteService.createTemplate(name, command);
    const updated = await CommandPaletteService.getConfig();
    setConfig(updated);
  }, []);

  const deleteTemplate = useCallback(async (templateId: string) => {
    await CommandPaletteService.deleteTemplate(templateId);
    const updated = await CommandPaletteService.getConfig();
    setConfig(updated);
  }, []);

  const addCommand = useCallback(async (binary: string) => {
    await CommandPaletteService.addCommand(binary);
    const updated = await CommandPaletteService.getConfig();
    setConfig(updated);
  }, []);

  const removeCommand = useCallback(async (binary: string) => {
    await CommandPaletteService.removeCommand(binary);
    const updated = await CommandPaletteService.getConfig();
    setConfig(updated);
    setTrees(prev => { const next = new Map(prev); next.delete(binary); return next; });
  }, []);

  const saveTemplateVersion = useCallback(async (templateId: string, version: { name: string; values: Record<string, string | string[]> }) => {
    await CommandPaletteService.saveTemplateVersion(templateId, version);
    const updated = await CommandPaletteService.getConfig();
    setConfig(updated);
  }, []);

  const deleteTemplateVersion = useCallback(async (templateId: string, versionName: string) => {
    await CommandPaletteService.deleteTemplateVersion(templateId, versionName);
    const updated = await CommandPaletteService.getConfig();
    setConfig(updated);
  }, []);

  return {
    config,
    input,
    setInput,
    options,
    loading,
    error,
    activeBinary,
    cacheStatus,
    introspectLog,
    confirmIntrospect,
    actions: { introspect, doIntrospect, execute, copyAIPrompt, saveTemplate, createTemplate, deleteTemplate, addCommand, removeCommand, saveTemplateVersion, deleteTemplateVersion, clearLog: () => setIntrospectLog([]), dismissConfirm: () => setConfirmIntrospect(null) },
  };
};
