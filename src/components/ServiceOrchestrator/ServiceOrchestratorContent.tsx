import React from 'react';
import { Box } from '@mui/material';
import { Service } from './types';
import AvailableServices from './AvailableServices';
import OrchestratedServices from './OrchestratedServices';

interface ServiceOrchestratorContentProps {
  availableServices: Service[];
  orchestratedServices: Service[];
  onAddService: (service: Service) => void;
  onRemoveService: (serviceId: string) => void;
  onServiceClick: (service: Service) => void;
  onViewLogs: (service: Service) => void;
  onClearAll: () => void;
  onStartAll: () => void;
  onStopAll: () => void;
  onStartService: (service: Service) => void;
  onStopService: (service: Service) => void;
  onForceStopService: (service: Service) => void;
  onRestartService?: (service: Service) => void;
  onRefreshStatuses: () => void;
  onToggleDetached: (serviceId: string, detached: boolean) => void;
  onQuickCommand?: (service: Service, command: string) => void;
  onOpenTerminal?: (service: Service) => void;
  onRunRoutine?: (service: Service, actionKey: string, command: string) => void;
  serviceStats?: Record<string, { cpu: number; memory: number }>;
  serviceBranches?: Record<string, string>;
}

const ServiceOrchestratorContent: React.FC<ServiceOrchestratorContentProps> = ({
  availableServices,
  orchestratedServices,
  onAddService,
  onRemoveService,
  onServiceClick,
  onViewLogs,
  onClearAll,
  onStartAll,
  onStopAll,
  onStartService,
  onStopService,
  onForceStopService,
  onRestartService,
  onRefreshStatuses,
  onToggleDetached,
  onQuickCommand,
  onOpenTerminal,
  onRunRoutine,
  serviceStats,
  serviceBranches,
}) => {
  // Create set of orchestrated service IDs for easy lookup
  const orchestratedServiceIds = new Set(orchestratedServices.map(s => s.id));

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <AvailableServices
          services={availableServices}
          orchestratedServiceIds={orchestratedServiceIds}
          onQuickCommand={onQuickCommand}
        />

        <OrchestratedServices
          services={orchestratedServices}
          onAddService={onAddService}
          onRemoveService={onRemoveService}
          onServiceClick={onServiceClick}
          onViewLogs={onViewLogs}
          onClearAll={onClearAll}
          onStartAll={onStartAll}
          onStopAll={onStopAll}
          onStartService={onStartService}
          onStopService={onStopService}
          onForceStopService={onForceStopService}
          onRestartService={onRestartService}
          onRefreshStatuses={onRefreshStatuses}
          onToggleDetached={onToggleDetached}
          onQuickCommand={onQuickCommand}
          onOpenTerminal={onOpenTerminal}
          onRunRoutine={onRunRoutine}
          serviceStats={serviceStats}
          serviceBranches={serviceBranches}
        />
      </Box>
    </Box>
  );
};

export default ServiceOrchestratorContent;