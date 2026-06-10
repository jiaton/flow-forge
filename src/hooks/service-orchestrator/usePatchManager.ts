/**
 * usePatchManager - Hook for managing file overrides per service.
 *
 * Uses 3-way merge strategy: each patch stores (mine + base) per file,
 * so it survives upstream branch updates without context-line failures.
 */

import { useState, useEffect, useCallback } from 'react';
import { teamConfigLoader } from '../../lib/loaders/team-config';
import { PATCH_SOURCE, PatchSource } from '../../shared/constants/patch';

export interface PatchInfo {
  name: string;
  source: PatchSource;
  files: string[];
  description?: string;
  active: boolean;
  appliedAt?: string;
  created?: string;
}

interface PatchState {
  name: string;
  source: PatchSource;
  active: boolean;
  appliedAt?: string;
}

const DB_KEY = (serviceId: string) => `patchState:${serviceId}`;

export function usePatchManager(serviceId: string) {
  const [patches, setPatches] = useState<PatchInfo[]>([]);
  const [modifiedFiles, setModifiedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const servicePath = teamConfigLoader.getServicePath(serviceId);

  const loadPatchState = useCallback(async (): Promise<PatchState[]> => {
    const raw = await window.electronAPI?.db?.appSettings?.get(DB_KEY(serviceId));
    return raw || [];
  }, [serviceId]);

  const savePatchState = useCallback(async (states: PatchState[]) => {
    await window.electronAPI?.db?.appSettings?.set(DB_KEY(serviceId), states);
  }, [serviceId]);

  const loadPatches = useCallback(async () => {
    if (!window.electronAPI?.patches) return;
    setLoading(true);
    try {
      const [personalResult, savedState] = await Promise.all([
        window.electronAPI.patches.list(serviceId),
        loadPatchState(),
      ]);

      const personalPatches: PatchInfo[] = (personalResult?.patches || []).map(
        (p: { name: string; files: string[]; created: string }) => {
          const state = savedState.find(s => s.name === p.name && s.source === PATCH_SOURCE.PERSONAL);
          return {
            name: p.name,
            source: PATCH_SOURCE.PERSONAL as const,
            files: p.files,
            active: state?.active || false,
            appliedAt: state?.appliedAt,
            created: p.created,
          };
        }
      );

      const serviceConfig = teamConfigLoader.getService(serviceId);
      const teamPatches: PatchInfo[] = (serviceConfig?.patches || []).map(def => {
        const state = savedState.find(s => s.name === def.name && s.source === PATCH_SOURCE.TEAM);
        return {
          name: def.name,
          source: PATCH_SOURCE.TEAM as const,
          files: [],
          description: def.description,
          active: state?.active || false,
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

  const loadModifiedFiles = useCallback(async () => {
    if (!servicePath || !window.electronAPI?.patches) return;
    try {
      const result = await window.electronAPI.patches.getModifiedFiles(servicePath);
      setModifiedFiles(result?.files || []);
    } catch (err) {
      console.warn('loadModifiedFiles failed:', (err as Error).message);
    }
  }, [servicePath]);

  useEffect(() => { loadPatches(); }, [loadPatches]);

  // Capture current working tree changes as a named override set.
  const createPatch = useCallback(async (name: string, files?: string[], content?: string) => {
    if (!servicePath) return { success: false, error: 'No service path' };
    const result = await window.electronAPI.patches.create(servicePath, serviceId, name, files, content);
    if (result.success) await loadPatches();
    return result;
  }, [servicePath, serviceId, loadPatches]);

  // Apply using 3-way merge — survives upstream changes.
  const applyPatch = useCallback(async (patch: PatchInfo) => {
    if (!servicePath) return { success: false, error: 'No service path configured' };
    try {
      const result = await window.electronAPI.patches.apply(servicePath, serviceId, patch.name);
      const fullyApplied = result.success && !result.conflicts?.length;
      if (fullyApplied) {
        const states = await loadPatchState();
        const existing = states.find(s => s.name === patch.name && s.source === patch.source);
        const entry = { name: patch.name, source: patch.source, active: true, appliedAt: new Date().toISOString() };
        const updated = existing
          ? states.map(s => s === existing ? entry : s)
          : [...states, entry];
        await savePatchState(updated);
        await loadPatches();
      }
      return result;
    } catch (err) {
      return { success: false, error: `IPC error: ${(err as Error).message}` };
    }
  }, [servicePath, serviceId, loadPatchState, savePatchState, loadPatches]);

  const resetToHead = useCallback(async (patch: PatchInfo) => {
    if (!servicePath) return { success: false, error: 'No service path configured' };
    try {
      const result = await window.electronAPI.patches.resetToHead(servicePath, serviceId, patch.name);
      if (result.success) {
        const states = await loadPatchState();
        await savePatchState(states.map(s =>
          s.name === patch.name && s.source === patch.source ? { ...s, active: false, appliedAt: undefined } : s
        ));
        await loadPatches();
      }
      return result;
    } catch (err) {
      return { success: false, error: `IPC error: ${(err as Error).message}` };
    }
  }, [servicePath, serviceId, loadPatchState, savePatchState, loadPatches]);

  const deletePatch = useCallback(async (patch: PatchInfo) => {
    if (patch.source !== PATCH_SOURCE.PERSONAL) return;
    await window.electronAPI.patches.delete(serviceId, patch.name);
    const states = await loadPatchState();
    await savePatchState(states.filter(s => !(s.name === patch.name && s.source === PATCH_SOURCE.PERSONAL)));
    await loadPatches();
  }, [serviceId, loadPatchState, savePatchState, loadPatches]);

  return {
    patches,
    modifiedFiles,
    loading,
    error,
    servicePath,
    loadModifiedFiles,
    createPatch,
    applyPatch,
    resetToHead,
    deletePatch,
    refresh: loadPatches,
  };
}
