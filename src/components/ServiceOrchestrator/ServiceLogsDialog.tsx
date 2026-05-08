import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Select,
  MenuItem as MuiMenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Close, Terminal, ViewList } from '@mui/icons-material';
import { Service } from './types';
import { SERVICE_STATUS, SERVICE_MODE } from '../../shared/constants/service';
import { useDbAppStore as useAppStore } from '../../stores/dbAppStore';
import VirtualTerminal from './VirtualTerminal';
import InteractiveTerminal from './InteractiveTerminal';

interface ServiceLogsDialogProps {
  open: boolean;
  onClose: () => void;
  service: Service | null;
  initialMode?: 'logs' | 'interactive';
  pendingCommand?: string | null;
  consumePendingCommand?: () => string | null;
}

const ServiceLogsDialog: React.FC<ServiceLogsDialogProps> = ({
  open,
  onClose,
  service,
  initialMode = 'logs',
  pendingCommand,
  consumePendingCommand,
}) => {
  const [mode, setMode] = useState<'logs' | 'interactive'>(initialMode);
  const [interactiveUsed, setInteractiveUsed] = useState(false);
  const [containerFilter, setContainerFilter] = useState<string | null>(null);
  const [containers, setContainers] = useState<string[]>([]);
  const { selectedTeam } = useAppStore();

  // Sync mode when initialMode changes (e.g., opened via quick command)
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      if (initialMode === 'interactive') setInteractiveUsed(true);
    }
  }, [open, initialMode]);

  // Discover container names for Docker services
  useEffect(() => {
    if (!open || !service || service.mode !== SERVICE_MODE.DOCKER) {
      setContainers([]);
      setContainerFilter(null);
      return;
    }
    // Fetch logs and extract unique container names
    window.electronAPI?.getServiceLogs({ serviceId: service.id, team: selectedTeam }).then(
      (res: { success: boolean; logs?: Array<{ details?: { container?: string } }> }) => {
        if (!res.success || !res.logs) return;
        const names = [...new Set(
          res.logs
            .map(l => (l.details as { container?: string })?.container)
            .filter((c): c is string => !!c)
        )];
        setContainers(names);
      }
    );
  }, [open, service?.id]);

  const handleModeChange = (_: unknown, v: 'logs' | 'interactive' | null) => {
    if (!v) return;
    setMode(v);
    if (v === 'interactive') setInteractiveUsed(true);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      disableEnforceFocus
      PaperProps={{ sx: { height: '80vh' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="h6">
            {mode === 'logs' ? 'Service Logs' : 'Interactive Terminal'}: {service?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {service?.id} • {service?.type}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {containers.length > 1 && mode === 'logs' && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Container</InputLabel>
              <Select
                value={containerFilter || ''}
                label="Container"
                onChange={(e) => setContainerFilter(e.target.value || null)}
              >
                <MuiMenuItem value="">All containers</MuiMenuItem>
                {containers.map(c => (
                  <MuiMenuItem key={c} value={c}>{c}</MuiMenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            size="small"
          >
            <ToggleButton value="logs">
              <Tooltip title="Service Logs">
                <ViewList fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="interactive">
              <Tooltip title="Interactive Terminal">
                <Terminal fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          <Button onClick={onClose} startIcon={<Close />} size="small">
            Close
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0, height: 'calc(80vh - 140px)' }}>
        {service && (
          <Box sx={{ display: mode === 'logs' ? 'flex' : 'none', height: '100%', width: '100%' }}>
            <VirtualTerminal
              serviceId={service.id}
              serviceName={service.name}
              serviceStatus={service.status}
              containerFilter={containerFilter}
            />
          </Box>
        )}
        {service && interactiveUsed && (
          <Box sx={{ display: mode === 'interactive' ? 'flex' : 'none', height: '100%', width: '100%' }}>
            <InteractiveTerminal
              serviceId={service.id}
              serviceName={service.name}
              cwd={service.path}
              visible={mode === 'interactive'}
              pendingCommand={pendingCommand}
              consumePendingCommand={consumePendingCommand}
              quickCommands={service.quickCommands}
              keepAlive={service.id.startsWith('routine:')}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Box>
          {mode === 'logs' && service?.status === SERVICE_STATUS.RUNNING && (
            <Chip
              size="small"
              color="success"
              label="Live • Real-time streaming"
              sx={{ fontSize: '0.75rem' }}
            />
          )}
          {mode === 'interactive' && (
            <Chip
              size="small"
              color="info"
              label={`Interactive shell • ${service?.path || 'home'} • Session resets on close`}
              sx={{ fontSize: '0.75rem' }}
            />
          )}
        </Box>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ServiceLogsDialog;
