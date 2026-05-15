import React from 'react';
import { Box, Typography } from '@mui/material';
import ServiceActions from './ServiceActions';

interface ServiceOrchestratorHeaderProps {
  onShowConfig: () => void;
  onShowRoutines: () => void;
  onLogLevelChange: (level: 'error' | 'warn' | 'info' | 'debug' | 'verbose') => void;
  logLevel: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  activeRoutineNames?: string[] | null;
  onShowActiveRoutine?: (id: string) => void;
}

const ServiceOrchestratorHeader: React.FC<ServiceOrchestratorHeaderProps> = ({
  onShowConfig,
  onShowRoutines,
  onLogLevelChange,
  logLevel,
  activeRoutineNames,
  onShowActiveRoutine,
}) => {
  return (
    <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
          Service Orchestrator
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <ServiceActions
            onShowConfig={onShowConfig}
            onShowRoutines={onShowRoutines}
            onLogLevelChange={onLogLevelChange}
            logLevel={logLevel}
            activeRoutineNames={activeRoutineNames}
            onShowActiveRoutine={onShowActiveRoutine}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default ServiceOrchestratorHeader;
