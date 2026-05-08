import { useState, useEffect, useCallback } from 'react';

export interface GitSettings {
  gitUrl: string;
  apiUrl: string;
  accessToken: string;
  refreshInterval: number;
}

export interface MergeRequest {
  id: number;
  gitUrl: string;
  projectId: string;
  mrIid: string;
  title: string;
  description?: string;
  sourceBranch: string;
  targetBranch: string;
  status: 'draft' | 'open' | 'merged' | 'closed';
  author: string;
  assignee?: string;
  reviewers: string[];
  pipelineStatus: 'pending' | 'running' | 'passed' | 'failed' | 'canceled';
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
  approvalsCount: number;
  requiredApprovals: number;
  commentsCount: number;
  changesCount?: number;
  webUrl: string;
  serviceName?: string;
  localNotes?: string;
  customTags: string[];
  trackedSince: string;
  lastFetched?: string;
}

export const useGit = () => {
  const [mergeRequests, setMergeRequests] = useState<MergeRequest[]>([]);
  const [settings, setSettings] = useState<GitSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load GitLab settings
  const loadSettings = useCallback(async () => {
    try {
      const result = await window.electronAPI.gitlab.settings.get();
      if (result.success && result.settings) {
        setSettings(result.settings);
      }
    } catch (err) {
      console.error('Failed to load GitLab settings:', err);
    }
  }, []);

  // Load all merge requests
  const loadMergeRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.gitlab.mergeRequests.getAll();
      if (result.success && result.mergeRequests) {
        setMergeRequests(result.mergeRequests);
      } else {
        setError(result.error || 'Failed to load merge requests');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Track a new MR
  const trackMR = useCallback(async (mrUrl: string, serviceName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.gitlab.mergeRequests.track(mrUrl, serviceName);
      if (result.success) {
        await loadMergeRequests();
        return { success: true };
      } else {
        setError(result.error || 'Failed to track merge request');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [loadMergeRequests]);

  // Refresh a single MR
  const refreshMR = useCallback(async (mrId: number) => {
    setError(null);
    try {
      const result = await window.electronAPI.gitlab.mergeRequests.refresh(mrId);
      if (result.success) {
        await loadMergeRequests();
        return { success: true };
      } else {
        setError(result.error || 'Failed to refresh merge request');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [loadMergeRequests]);

  // Refresh all MRs
  const refreshAllMRs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.gitlab.mergeRequests.refreshAll();
      if (result.success) {
        await loadMergeRequests();
        return { success: true, results: result.results };
      } else {
        setError(result.error || 'Failed to refresh merge requests');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [loadMergeRequests]);

  // Update local MR data
  const updateMRLocalData = useCallback(async (
    mrId: number,
    data: { notes?: string; tags?: string[]; serviceName?: string }
  ) => {
    setError(null);
    try {
      const result = await window.electronAPI.gitlab.mergeRequests.updateLocalData(mrId, data);
      if (result.success) {
        await loadMergeRequests();
        return { success: true };
      } else {
        setError(result.error || 'Failed to update merge request');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [loadMergeRequests]);

  // Delete MR
  const deleteMR = useCallback(async (mrId: number) => {
    setError(null);
    try {
      const result = await window.electronAPI.gitlab.mergeRequests.delete(mrId);
      if (result.success) {
        await loadMergeRequests();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [loadMergeRequests]);

  // Save settings
  const saveSettings = useCallback(async (newSettings: GitSettings) => {
    setError(null);
    try {
      const result = await window.electronAPI.gitlab.settings.save(newSettings);
      if (result.success) {
        setSettings(newSettings);
        return { success: true };
      } else {
        setError(result.error || 'Failed to save settings');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, []);

  // Validate token
  const validateToken = useCallback(async () => {
    try {
      const result = await window.electronAPI.gitlab.settings.validateToken();
      return result;
    } catch (err) {
      return { success: false, valid: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, []);

  // Load initial data
  useEffect(() => {
    loadSettings();
    loadMergeRequests();
  }, [loadSettings, loadMergeRequests]);

  return {
    mergeRequests,
    settings,
    loading,
    error,
    trackMR,
    refreshMR,
    refreshAllMRs,
    updateMRLocalData,
    deleteMR,
    saveSettings,
    validateToken,
    reload: loadMergeRequests,
  };
};
