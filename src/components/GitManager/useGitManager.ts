/**
 * MR Manager Hook
 * Encapsulates MR Manager business logic and state management
 */

import { useState, useEffect } from 'react';
import { useDbAppStore as useAppStore } from '../../stores/dbAppStore';
import { useGit } from "../../hooks/git-manager/useGit";

export const useGitManager = () => {
  const { addNotification } = useAppStore();
  const {
    mergeRequests,
    settings,
    loading,
    error,
    trackMR,
    refreshAllMRs,
    deleteMR,
    saveSettings,
    validateToken,
    updateMRLocalData,
  } = useGit();

  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMR, setSelectedMR] = useState<Record<string, unknown> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuMR, setMenuMR] = useState<Record<string, unknown> | null>(null);
  const [availableServices, setAvailableServices] = useState<string[]>([]);

  // Load available services from service commands
  useEffect(() => {
    const loadServices = async () => {
      try {
        const result = await window.electronAPI.getServiceCommands();
        if (result.success && result.commands) {
          setAvailableServices(Object.keys(result.commands));
        }
      } catch (err) {
        console.error('Failed to load services:', err);
      }
    };
    loadServices();
  }, []);

  // Auto-refresh based on settings
  useEffect(() => {
    if (!settings?.refreshInterval) return;

    const interval = setInterval(() => {
      handleRefreshAll(true); // Silent refresh
    }, settings.refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [settings?.refreshInterval]);

  const handleRefreshAll = async (silent = false) => {
    if (!silent) setRefreshing(true);
    
    const result = await refreshAllMRs();
    
    if (!silent) {
      setRefreshing(false);
      if (result.success) {
        addNotification({
          message: `Refreshed ${result.results?.successful || 0} MRs successfully`,
          type: 'success',
        });
      } else {
        addNotification({
          message: result.error || 'Failed to refresh MRs',
          type: 'error',
        });
      }
    }
  };

  const handleTrackMR = async (mrUrl: string, serviceName?: string) => {
    const result = await trackMR(mrUrl, serviceName);
    if (result.success) {
      addNotification({
        message: 'Merge request tracked successfully',
        type: 'success',
      });
    }
    return result;
  };

  const handleDeleteMR = async (mr: Record<string, unknown>) => {
    const result = await deleteMR(mr.id);
    if (result.success) {
      addNotification({
        message: 'MR removed from tracking',
        type: 'info',
      });
    } else {
      addNotification({
        message: result.error || 'Failed to remove MR',
        type: 'error',
      });
    }
    handleMenuClose();
  };

  const handleEditMR = (mr: Record<string, unknown>) => {
    setSelectedMR(mr);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleUpdateMR = async (data: { notes?: string; tags?: string[]; serviceName?: string }) => {
    if (!selectedMR) return { success: false };
    
    const result = await updateMRLocalData(selectedMR.id, data);
    if (result.success) {
      addNotification({
        message: 'MR updated successfully',
        type: 'success',
      });
    }
    return result;
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, mr: Record<string, unknown>) => {
    setAnchorEl(event.currentTarget);
    setMenuMR(mr);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuMR(null);
  };

  return {
    // State
    mergeRequests,
    settings,
    loading,
    error,
    refreshing,
    availableServices,
    settingsDialogOpen,
    trackDialogOpen,
    editDialogOpen,
    selectedMR,
    anchorEl,
    menuMR,

    // Actions
    setSettingsDialogOpen,
    setTrackDialogOpen,
    setEditDialogOpen,
    handleRefreshAll,
    handleTrackMR,
    handleDeleteMR,
    handleEditMR,
    handleUpdateMR,
    handleMenuOpen,
    handleMenuClose,
    saveSettings,
    validateToken,
  };
};
