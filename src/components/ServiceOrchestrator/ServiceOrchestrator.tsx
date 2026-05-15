/**
 * Service Orchestrator - Refactored with clean architecture
 * Manages service orchestration with database persistence
 */

import React, { useState, useEffect } from 'react';
import { Box, Dialog, DialogTitle, DialogContent, Typography, IconButton } from '@mui/material';
import { Close, Minimize } from '@mui/icons-material';
import { ServiceOrchestratorProps, Service } from './types';
import ServiceOrchestratorHeader from './ServiceOrchestratorHeader';
import ServiceOrchestratorContent from './ServiceOrchestratorContent';
import ServiceConfigDialog from './ServiceConfigDialog';
import ServiceLogsDialog from './ServiceLogsDialog';
import RoutinesDialog from './RoutinesDialog';
import InteractiveTerminal from './InteractiveTerminal';
import RoutineProgress from './RoutineProgress';
import { ServiceManager } from '../../services/service-orchestrator/ServiceManager';
import { useDbAppStore as useAppStore } from '../../stores/dbAppStore';
import { useServiceOrchestration } from '../../hooks/service-orchestrator/useServiceOrchestration';
import { useServiceActions } from '../../hooks/service-orchestrator/useServiceActions';
import { useServiceStatusMonitoring } from '../../hooks/service-orchestrator/useServiceStatusMonitoring';
import { useServiceLogs } from '../../hooks/service-orchestrator/useServiceLogs';
import { useServiceStats } from '../../hooks/service-orchestrator/useServiceStats';
import { useServiceBranches } from '../../hooks/service-orchestrator/useServiceBranches';
import { useRoutineTerminals } from '../../hooks/service-orchestrator/useRoutineTerminals';

const ServiceOrchestrator: React.FC<ServiceOrchestratorProps> = ({ viewId }) => {
  const { selectedTeam, getTeamConfig } = useAppStore();
  const teamConfig = getTeamConfig(selectedTeam);

  // Log level state
  const [logLevel, setLogLevel] = useState<'error' | 'warn' | 'info' | 'debug' | 'verbose'>('info');

  // Service configuration dialog
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showRoutinesDialog, setShowRoutinesDialog] = useState(false);
  const [serviceCommands, setServiceCommands] = useState<Record<string, unknown>>({});

  // Routine terminals (managed by hook)
  const rt = useRoutineTerminals();

  // Service orchestration state (with DB persistence)
  const {
    orchestratedServices,
    addService,
    removeFromOrchestration,
    clearOrchestration,
    updateServiceStatus,
    toggleDetached,
  } = useServiceOrchestration(viewId);

  // Service actions (start, stop, restart)
  const {
    startService,
    stopService,
    forceStopService,
    restartService,
    startAllServices,
    stopAllServices,
  } = useServiceActions({
    updateServiceStatus,
  });

  // Status monitoring (syncs with DB)
  const { manualRefresh: refreshServiceStatuses } = useServiceStatusMonitoring({
    services: orchestratedServices,
    updateServiceStatus,
    enabled: orchestratedServices.length > 0,
  });

  // Process stats (CPU/memory)
  const serviceStats = useServiceStats(orchestratedServices.length > 0);
  const serviceBranches = useServiceBranches(orchestratedServices.length > 0);

  // Log management
  const {
    showLogsDialog,
    selectedService: selectedServiceForLogs,
    initialMode,
    pendingCommand,
    consumePendingCommand,
    viewLogs,
    openInteractive,
    closeLogs,
  } = useServiceLogs();

  /**
   * Load service commands and log level on mount
   */
  useEffect(() => {
    const loadCommands = async () => {
      const commands = await ServiceManager.loadServiceCommands();
      setServiceCommands(commands);
    };

    const loadLogLevel = async () => {
      if (window.electronAPI) {
        try {
          const result = await window.electronAPI.getLogLevel();
          if (result.success) {
            setLogLevel(result.level);
          }
        } catch (error) {
          console.error('Failed to get log level:', error);
        }
      }
    };

    // Initialize team configs
    const { initializeTeamConfigs } = useAppStore.getState();
    initializeTeamConfigs();

    loadCommands();
    loadLogLevel();
  }, []);

  /**
   * Reload service commands
   */
  const handleReloadCommands = async () => {
    const result = await ServiceManager.reloadServiceCommands();
    if (result.success && result.commands) {
      setServiceCommands(result.commands);
    }
    return result;
  };

  /**
   * Execute orchestration (start all services)
   */
  const handleExecuteOrchestration = async () => {
    await startAllServices(orchestratedServices);
  };

  /**
   * Stop all services
   */
  const handleStopAll = async () => {
    await stopAllServices(orchestratedServices);
  };

  /**
   * Handle service click
   */
  const handleServiceClick = async (service: Service) => {
    if (service.status === 'running') {
      await viewLogs(service);
    }
  };

  /**
   * Handle log level change
   */
  const handleLogLevelChange = async (level: 'error' | 'warn' | 'info' | 'debug' | 'verbose') => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.setLogLevel(level);
        if (result.success) {
          setLogLevel(level);
          console.log(`Log level changed to: ${level}`);
        }
      } catch (error) {
        console.error('Failed to set log level:', error);
      }
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ServiceOrchestratorHeader
        onShowConfig={() => setShowConfigDialog(true)}
        onShowRoutines={() => setShowRoutinesDialog(true)}
        onLogLevelChange={handleLogLevelChange}
        logLevel={logLevel}
        activeRoutineNames={rt.activeNames}
        onShowActiveRoutine={(id) => rt.show(id)}
      />

      <ServiceOrchestratorContent
        availableServices={teamConfig.services || []}
        orchestratedServices={orchestratedServices}
        onAddService={addService}
        onRemoveService={removeFromOrchestration}
        onServiceClick={handleServiceClick}
        onViewLogs={viewLogs}
        onClearAll={clearOrchestration}
        onStartAll={handleExecuteOrchestration}
        onStopAll={handleStopAll}
        onStartService={startService}
        onStopService={stopService}
        onForceStopService={forceStopService}
        onRestartService={restartService}
        onRefreshStatuses={refreshServiceStatuses}
        onToggleDetached={toggleDetached}
        onQuickCommand={(service, command) => openInteractive(service, command)}
        onOpenTerminal={(service) => openInteractive(service)}
        onRunRoutine={(service, _actionKey, command) => openInteractive(service, command)}
        serviceStats={serviceStats}
        serviceBranches={serviceBranches}
      />

      <ServiceConfigDialog
        open={showConfigDialog}
        onClose={() => setShowConfigDialog(false)}
        serviceCommands={serviceCommands}
        onReloadConfig={handleReloadCommands}
      />

      <ServiceLogsDialog
        open={showLogsDialog}
        onClose={closeLogs}
        service={selectedServiceForLogs}
        initialMode={initialMode}
        pendingCommand={pendingCommand}
        consumePendingCommand={consumePendingCommand}
      />

      <RoutinesDialog
        open={showRoutinesDialog}
        onClose={() => setShowRoutinesDialog(false)}
        onOpenTerminal={(routineId, script, commands, logFile) => {
          setShowRoutinesDialog(false);
          rt.open({ id: routineId, name: routineId, script, commands: commands || [], logFile });
        }}
      />

      {/* Persistent routine terminals — each stays mounted when dialog is closed */}
      {Array.from(rt.terminals.values()).map(term => (
        <Dialog
          key={term.id}
          open={rt.visibleId === term.id}
          onClose={rt.minimize}
          maxWidth="lg"
          fullWidth
          disableEnforceFocus
          keepMounted
          PaperProps={{ sx: { height: '80vh' } }}
          slotProps={{ transition: { unmountOnExit: false } }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
            <Typography variant="h6">Routine: {term.name}</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton onClick={rt.minimize} size="small" title="Minimize — keep running in background">
                <Minimize />
              </IconButton>
              <IconButton onClick={() => rt.close(term.id)} size="small" title="Close — stop routine">
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 0, display: 'flex' }}>
            {term.commands.length > 0 && (
              <RoutineProgress
                commands={term.commands}
                statuses={rt.stepStatuses[term.id] || []}
                done={!!rt.doneMap[term.id]}
              />
            )}
            <Box sx={{ flex: 1, display: 'flex', minWidth: 0 }}>
              <InteractiveTerminal
                serviceId={`routine:${term.id}`}
                serviceName={term.name}
                visible={rt.visibleId === term.id}
                pendingCommand={term.script}
                consumePendingCommand={() => rt.consumeScript(term.id)}
                keepAlive
                onData={(data) => rt.parseMarkers(term.id, data)}
                logFile={term.logFile}
              />
            </Box>
          </DialogContent>
        </Dialog>
      ))}
    </Box>
  );
};

export default ServiceOrchestrator;