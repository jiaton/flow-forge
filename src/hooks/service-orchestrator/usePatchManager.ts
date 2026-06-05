/**
 * usePatchManager - Hook for managing git patches per service
 */

import { useState, useEffect, useCallback } from 'react';
import { teamConfigLoader } from '../../lib/loaders/team-config';

export interface PatchInfo {
  name: string;
  source: 'personal' | 'team';
  path: string;
  description?: string;
  active: boolean;
  skipWorktree: boolean;
  appliedAt?: string;
  created?: string;
}

interface PatchState {
  name: string;
  source: 'personal' | 'team';
  active: boolean;
  skipWorktree: boolean;
  appliedAt?: string;
}

const DB_KEY = (serviceId: string) => `patchState:${serviceId}`;

export function usePatchManager(serviceId: string) {
  const [patches, setPatches] = useState<PatchInfo[]>([]);
  const [modifiedFiles, setModifiedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const servicePath = teamConfigLoader.getServicePath(serviceId);

  // Load persisted patch state from DB
  const loadPatchState = useCallback(async (): Promise<PatchState[]> => {
    const raw = await window.electronAPI?.db?.appSettings?.get(DB_KEY(serviceId));
    return raw || [];
  }, [serviceId]);

  // Save patch state to DB
  const savePatchState = useCallback(async (states: PatchState[]) => {
    await window.electronAPI?.db?.appSettings?.set(DB_KEY(serviceId), states);
  }, [serviceId]);

  // Load all patches (personal + team) and merge with persisted state
  const loadPatches = useCallback(async () => {
    if (!window.electronAPI?.patches) return;
    setLoading(true);
    try {
      const [personalResult, savedState] = await Promise.all([
        window.electronAPI.patches.list(serviceId),
        loadPatchState(),
      ]);

      const personalPatches: PatchInfo[] = (personalResult?.patches || []).map(
        (p: { name: string; path: string; created: string }) => {
          const state = savedState.find(s => s.name === p.name && s.source === 'personal');
          return {
            name: p.name,
            source: 'personal' as const,
            path: p.path,
            active: state?.active || false,
            skipWorktree: state?.skipWorktree || false,
            appliedAt: state?.appliedAt,
            created: p.created,
          };
        }
      );

      // Team patches from service config (loaded via teamConfigLoader)
      const serviceConfig = teamConfigLoader.getService(serviceId);
      const teamPatchDefs = serviceConfig?.patches;
      const teamPatches: PatchInfo[] = (teamPatchDefs || []).map(def => {
        const state = savedState.find(s => s.name === def.name && s.source === 'team');
        return {
          name: def.name,
          source: 'team' as const,
          path: def.file,
          description: def.description,
          active: state?.active || false,
          skipWorktree: state?.skipWorktree || false,
          appliedAt: state?.appliedAt,
        };
      });

      setPatches([...teamPatches, ...personalPatches]);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [serviceId, loadPatchState]);

  // Load modified files for the file picker
  const loadModifiedFiles = useCallback(async () => {
    if (!servicePath || !window.electronAPI?.patches) return;
    try {
      const result = await window.electronAPI.patches.getModifiedFiles(servicePath);
      setModifiedFiles(result?.files || []);
    } catch { /* silent */ }
  }, [servicePath]);

  useEffect(() => { loadPatches(); }, [loadPatches]);

  // Create a new personal patch
  const createPatch = useCallback(async (
    name: string,
    files?: string[],
    content?: string,
  ) => {
    if (!servicePath) return { success: false, error: 'No service path' };
    const result = await window.electronAPI.patches.create(servicePath, serviceId, name, files, content);
    if (result.success) await loadPatches();
    return result;
  }, [servicePath, serviceId, loadPatches]);

  // Apply a patch
  const applyPatch = useCallback(async (patch: PatchInfo) => {
    if (!servicePath) return { success: false, error: 'No service path configured for this service' };
    try {
      const result = await window.electronAPI.patches.apply(servicePath, patch.path);
      if (result.success) {
        const states = await loadPatchState();
        const existing = states.find(s => s.name === patch.name && s.source === patch.source);
        const updated = existing
          ? states.map(s => s === existing ? { ...s, active: true, appliedAt: new Date().toISOString() } : s)
          : [...states, { name: patch.name, source: patch.source, active: true, skipWorktree: false, appliedAt: new Date().toISOString() }];
        await savePatchState(updated);
        await loadPatches();
      }
      return result;
    } catch (err) {
      return { success: false, error: `IPC error: ${(err as Error).message}` };
    }
  }, [servicePath, loadPatchState, savePatchState, loadPatches]);

  // Unapply a patch
  const unapplyPatch = useCallback(async (patch: PatchInfo) => {
    if (!servicePath) return { success: false, error: 'No service path configured for this service' };
    try {
      // Clear skip-worktree BEFORE unapplying — otherwise git can't see the files to reverse
      if (patch.skipWorktree) {
        const content = await window.electronAPI.patches.read(patch.path);
        const affectedFiles = parseFilesFromPatch(content?.content || '');
        if (affectedFiles.length) {
          await window.electronAPI.patches.setSkipWorktree(servicePath, affectedFiles, false);
        }
      }
      const result = await window.electronAPI.patches.unapply(servicePath, patch.path);
      if (result.success) {
        const states = await loadPatchState();
        const updated = states.map(s =>
          s.name === patch.name && s.source === patch.source
            ? { ...s, active: false, skipWorktree: false, appliedAt: undefined }
            : s
        );
        await savePatchState(updated);
        await loadPatches();
      } else if (patch.skipWorktree) {
        // Re-set skip-worktree if unapply failed
        const content = await window.electronAPI.patches.read(patch.path);
        const affectedFiles = parseFilesFromPatch(content?.content || '');
        if (affectedFiles.length) {
          await window.electronAPI.patches.setSkipWorktree(servicePath, affectedFiles, true);
        }
      }
      return result;
    } catch (err) {
      return { success: false, error: `IPC error: ${(err as Error).message}` };
    }
  }, [servicePath, loadPatchState, savePatchState, loadPatches]);

  // Delete a personal patch
  const deletePatch = useCallback(async (patch: PatchInfo) => {
    if (patch.source !== 'personal') return;
    await window.electronAPI.patches.delete(serviceId, patch.name);
    const states = await loadPatchState();
    await savePatchState(states.filter(s => !(s.name === patch.name && s.source === 'personal')));
    await loadPatches();
  }, [serviceId, loadPatchState, savePatchState, loadPatches]);

  // Toggle skip-worktree for a patch
  const toggleSkipWorktree = useCallback(async (patch: PatchInfo) => {
    if (!servicePath || !patch.active) return;
    const content = await window.electronAPI.patches.read(patch.path);
    const affectedFiles = parseFilesFromPatch(content?.content || '');
    if (!affectedFiles.length) return;
    const newValue = !patch.skipWorktree;
    await window.electronAPI.patches.setSkipWorktree(servicePath, affectedFiles, newValue);
    const states = await loadPatchState();
    const updated = states.map(s =>
      s.name === patch.name && s.source === patch.source ? { ...s, skipWorktree: newValue } : s
    );
    await savePatchState(updated);
    await loadPatches();
  }, [servicePath, loadPatchState, savePatchState, loadPatches]);

  // Read patch content for viewing
  const readPatchContent = useCallback(async (patch: PatchInfo): Promise<string> => {
    const result = await window.electronAPI.patches.read(patch.path);
    return result?.content || '';
  }, []);

  return {
    patches,
    modifiedFiles,
    loading,
    error,
    servicePath,
    loadModifiedFiles,
    createPatch,
    applyPatch,
    unapplyPatch,
    deletePatch,
    toggleSkipWorktree,
    readPatchContent,
    refresh: loadPatches,
  };
}

/** Extract file paths from a unified diff */
function parseFilesFromPatch(content: string): string[] {
  const files: string[] = [];
  for (const line of content.split('\n')) {
    if (line.startsWith('+++ b/')) {
      files.push(line.slice(6));
    }
  }
  return files;
}
