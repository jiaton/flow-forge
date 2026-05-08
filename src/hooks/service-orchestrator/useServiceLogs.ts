/**
 * Hook for service log dialog state management.
 * Does NOT hold log data — xterm owns the log buffer directly.
 */

import { useState, useCallback } from 'react';
import { Service } from '../../components/ServiceOrchestrator/types';

export const useServiceLogs = () => {
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [initialMode, setInitialMode] = useState<'logs' | 'interactive'>('logs');
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);

  const viewLogs = useCallback((service: Service) => {
    setSelectedService(service);
    setInitialMode('logs');
    setPendingCommand(null);
    setShowLogsDialog(true);
  }, []);

  const openInteractive = useCallback((service: Service, command?: string) => {
    setSelectedService(service);
    setInitialMode('interactive');
    setPendingCommand(command || null);
    setShowLogsDialog(true);
  }, []);

  const consumePendingCommand = useCallback(() => {
    const cmd = pendingCommand;
    setPendingCommand(null);
    return cmd;
  }, [pendingCommand]);

  const closeLogs = useCallback(() => {
    setShowLogsDialog(false);
    setSelectedService(null);
    setPendingCommand(null);
  }, []);

  return {
    showLogsDialog,
    selectedService,
    initialMode,
    pendingCommand,
    consumePendingCommand,
    viewLogs,
    openInteractive,
    closeLogs,
  };
};
