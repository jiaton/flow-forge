import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import { useDrop } from 'react-dnd';
import { Remove, Visibility, Clear, PlayArrow, Stop, Refresh, Terminal, Code } from '@mui/icons-material';
import { Service } from './types';
import { SERVICE_STATUS, SERVICE_MODE } from '../../shared/constants/service';
import { teamConfigLoader } from '../../lib/loaders/team-config';

/** Compact Docker whale icon (16px) */
const DockerIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.7 }}>
    <path d="M13.98 11.08h2.12a.19.19 0 0 0 .19-.19V9.01a.19.19 0 0 0-.19-.19h-2.12a.19.19 0 0 0-.19.19v1.88c0 .1.09.19.19.19m-2.95-5.43h2.12a.19.19 0 0 0 .19-.19V3.58a.19.19 0 0 0-.19-.19h-2.12a.19.19 0 0 0-.19.19v1.88c0 .1.09.19.19.19m0 2.71h2.12a.19.19 0 0 0 .19-.19V6.29a.19.19 0 0 0-.19-.19h-2.12a.19.19 0 0 0-.19.19v1.88c0 .1.09.19.19.19m-2.93 0h2.12a.19.19 0 0 0 .19-.19V6.29a.19.19 0 0 0-.19-.19H8.1a.19.19 0 0 0-.19.19v1.88c0 .1.08.19.19.19m-2.96 0h2.12a.19.19 0 0 0 .19-.19V6.29a.19.19 0 0 0-.19-.19H5.14a.19.19 0 0 0-.19.19v1.88c0 .1.09.19.19.19m5.89 2.72h2.12a.19.19 0 0 0 .19-.19V9.01a.19.19 0 0 0-.19-.19h-2.12a.19.19 0 0 0-.19.19v1.88c0 .1.09.19.19.19m-2.93 0h2.12a.19.19 0 0 0 .19-.19V9.01a.19.19 0 0 0-.19-.19H8.1a.19.19 0 0 0-.19.19v1.88c0 .1.08.19.19.19m-2.96 0h2.12a.19.19 0 0 0 .19-.19V9.01a.19.19 0 0 0-.19-.19H5.14a.19.19 0 0 0-.19.19v1.88c0 .1.09.19.19.19m-2.92 0h2.12a.19.19 0 0 0 .19-.19V9.01a.19.19 0 0 0-.19-.19H2.22a.19.19 0 0 0-.19.19v1.88c0 .1.08.19.19.19M23.7 11.59c-.23-.16-.76-.36-1.42-.33-.13-1-.68-1.87-1.34-2.53l-.27-.27-.28.26c-.56.53-.72 1.4-.67 2.07.04.49.19.99.49 1.39-.22.13-.47.24-.7.33a4.6 4.6 0 0 1-1.39.2H.59l-.04.37c-.1 1.13.07 2.27.5 3.32l.02.05c.84 1.8 2.34 2.63 4.04 3.08 1.9.5 3.97.56 5.92.14 1.53-.33 2.94-.95 4.13-1.92 1-.81 1.89-1.86 2.55-3.16.68.03 2.14.04 2.88-1.4l.02-.04-.21-.14z" />
  </svg>
);
import { processColors, statusColors } from '../../theme/theme';
import { DRAG_TYPE } from './AvailableServices';
import ServiceContextMenu from './ServiceContextMenu';

interface OrchestratedServicesProps {
  services: Service[];
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
  onAddService: (service: Service) => void;
  onRefreshStatuses: () => void;
  onToggleDetached: (serviceId: string, detached: boolean) => void;
  onQuickCommand?: (service: Service, command: string) => void;
  onOpenTerminal?: (service: Service) => void;
  onRunRoutine?: (service: Service, actionKey: string, command: string) => void;
  onOpenPatchManager?: (service: Service) => void;
  serviceStats?: Record<string, { cpu: number; memory: number }>;
  serviceBranches?: Record<string, string>;
}

const OrchestratedServices: React.FC<OrchestratedServicesProps> = ({
  services,
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
  onAddService,
  onRefreshStatuses,
  onToggleDetached,
  onQuickCommand,
  onOpenTerminal,
  onRunRoutine,
  onOpenPatchManager,
  serviceStats,
  serviceBranches,
}) => {
  const theme = useTheme();
  const [contextMenu, setContextMenu] = useState<{
    service: Service;
    position: { top: number; left: number };
  } | null>(null);

  const [contextMenuPatches, setContextMenuPatches] = useState<{ name: string; active: boolean }[]>([]);

  // Load patches when context menu opens for a service
  useEffect(() => {
    if (!contextMenu) { setContextMenuPatches([]); return; }
    const serviceId = contextMenu.service.id;
    (async () => {
      try {
        const [listResult, stateRaw] = await Promise.all([
          window.electronAPI?.patches?.list(serviceId),
          window.electronAPI?.db?.appSettings?.get(`patchState:${serviceId}`),
        ]);
        const states: { name: string; active: boolean }[] = stateRaw || [];
        const serviceConfig = teamConfigLoader.getService(serviceId);
        const teamDefs = (serviceConfig?.patches || []) as { name: string }[];
        const personal = (listResult?.patches || []) as { name: string }[];
        const all = [
          ...teamDefs.map(d => ({ name: d.name, active: states.find(s => s.name === d.name)?.active || false })),
          ...personal.map(p => ({ name: p.name, active: states.find(s => s.name === p.name)?.active || false })),
        ];
        setContextMenuPatches(all);
      } catch { setContextMenuPatches([]); }
    })();
  }, [contextMenu]);

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: DRAG_TYPE,
    drop: (item: { service: Service }) => {
      onAddService(item.service);
    },
    canDrop: (item: { service: Service }) => {
      // Can drop if service is not already in orchestration
      return !services.some(s => s.id === item.service.id);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [services, onAddService]);

  const dropZoneActive = isOver && canDrop;

  const handleContextMenu = (event: React.MouseEvent, service: Service) => {
    event.preventDefault();
    setContextMenu({
      service,
      position: { top: event.clientY, left: event.clientX },
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, p: 2 }}>
      <Paper sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: processColors.primary.gradient,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${processColors.primary.border}`,
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
          <Box>
            <Typography variant="h6" sx={{
              fontWeight: 600,
              color: theme.palette.primary.main,
            }}>
              Orchestration Flow ({services.length})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Drop services here to add them
            </Typography>
          </Box>
          {services.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<PlayArrow />}
                variant="contained"
                color="success"
                size="small"
                onClick={onStartAll}
              >
                Start All ({services.length})
              </Button>
              <Button
                startIcon={<Stop />}
                variant="outlined"
                color="error"
                size="small"
                onClick={onStopAll}
                disabled={services.filter(s => s.status === SERVICE_STATUS.RUNNING).length === 0}
              >
                Stop All
              </Button>
              <Button
                startIcon={<Refresh />}
                variant="outlined"
                size="small"
                onClick={onRefreshStatuses}
                color="primary"
              >
                Refresh
              </Button>
              <Button
                startIcon={<Clear />}
                variant="outlined"
                size="small"
                onClick={onClearAll}
                color="error"
              >
                Clear
              </Button>
            </Box>
          )}
        </Box>

        <Box
          ref={drop}
          sx={{
            flex: 1,
            minHeight: 200,
            border: dropZoneActive
              ? `2px solid ${theme.palette.primary.main}`
              : `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
            borderRadius: 1,
            p: 1,
            backgroundColor: dropZoneActive
              ? alpha(theme.palette.primary.main, 0.08)
              : 'transparent',
            overflow: 'auto',
            transition: 'border-color 0.15s ease, background-color 0.15s ease',
          }}
        >
          {services.length === 0 && !dropZoneActive && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: 'center', mt: 4 }}
            >
              Drag services from the left to add to orchestration flow
            </Typography>
          )}
          {services.length === 0 && dropZoneActive && (
            <Typography
              variant="body2"
              color="primary.main"
              sx={{ textAlign: 'center', mt: 4, fontWeight: 600 }}
            >
              Drop service here to add it
            </Typography>
          )}

          {services.map((service, _index) => {
            const isRunning = service.status === SERVICE_STATUS.RUNNING;
            const isTransitioning = service.status === SERVICE_STATUS.STARTING || service.status === SERVICE_STATUS.RESTARTING;
            return (
            <Card
              key={service.id}
              onClick={() => onServiceClick(service)}
              onContextMenu={(e) => handleContextMenu(e, service)}
              sx={{
                mb: 2,
                cursor: service.status === SERVICE_STATUS.RUNNING ? 'pointer' : 'default',
                position: 'relative',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                border: '1px solid transparent',
              }}
            >
              <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ flex: 1, minWidth: 0, pr: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Tooltip
                        title={
                          <Box sx={{ p: 0.5 }}>
                            <Typography variant="caption" display="block" sx={{ fontWeight: 600, mb: 0.5 }}>
                              {service.status}
                            </Typography>
                            {service.mode === SERVICE_MODE.DOCKER && (
                              <Typography variant="caption" display="block" sx={{ color: 'info.light', mb: 0.5 }}>
                                Docker Compose
                              </Typography>
                            )}
                            {service.diagnosticMessage && (
                              <Typography variant="caption" display="block">{service.diagnosticMessage}</Typography>
                            )}
                            {service.detectionMethod && (
                              <Typography variant="caption" display="block">Method: {service.detectionMethod}</Typography>
                            )}
                            {service.lastChecked && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                Checked: {new Date(service.lastChecked).toLocaleTimeString()}
                              </Typography>
                            )}
                          </Box>
                        }
                        placement="top"
                      >
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            flexShrink: 0,
                            backgroundColor:
                              service.status === SERVICE_STATUS.RUNNING ? statusColors.running :
                                service.status === SERVICE_STATUS.STARTING ? statusColors.starting :
                                  service.status === SERVICE_STATUS.RESTARTING ? statusColors.restarting :
                                    service.status === SERVICE_STATUS.ERROR ? statusColors.error :
                                      statusColors.idle,
                            cursor: 'help',
                          }}
                        />
                      </Tooltip>
                      <Typography
                        variant="subtitle2"
                        sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        {service.name}
                      </Typography>
                      {service.mode === SERVICE_MODE.DOCKER && (
                        <Tooltip title="Docker container" placement="top">
                          <Box sx={{ display: 'flex', alignItems: 'center', color: 'info.main', flexShrink: 0 }}>
                            <DockerIcon />
                          </Box>
                        </Tooltip>
                      )}
                      {serviceBranches?.[service.id] && (
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.disabled', fontSize: '0.7rem', ml: 0.5, flexShrink: 0 }}>
                          {serviceBranches[service.id]}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {service.pid ? `PID ${service.pid}` : ''}
                      {serviceStats?.[service.id] && (
                        <> · {serviceStats[service.id].cpu}% · {serviceStats[service.id].memory} MB</>
                      )}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    <Tooltip title="Open in IDE">
                      <IconButton size="small" onClick={(e) => {
                        e.stopPropagation();
                        const options = teamConfigLoader.getIDEOptions(service.id);
                        if (options.length === 0) return;
                        const lastKey = `ide-last-${service.id}`;
                        const lastUsed = localStorage.getItem(lastKey);
                        const option = options.find(o => o.name === lastUsed) || options[0];
                        localStorage.setItem(lastKey, option.name);
                        window.electronAPI?.executeCommand(option.command);
                      }}>
                        <Code fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Logs">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); onViewLogs(service); }}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Terminal">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); onOpenTerminal?.(service); }}>
                        <Terminal fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {/* Fixed button order: Start | Restart | Stop | Remove — always same positions */}
                    <Tooltip title="Start">
                      <span>
                        <IconButton
                          size="small"
                          color="success"
                          disabled={isRunning || isTransitioning}
                          onClick={(e) => { e.stopPropagation(); onStartService(service); }}
                        >
                          <PlayArrow fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Restart">
                      <span>
                        <IconButton
                          size="small"
                          disabled={!isRunning}
                          onClick={(e) => { e.stopPropagation(); onRestartService?.(service); }}
                        >
                          <Refresh fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Stop">
                      <span>
                        <IconButton
                          size="small"
                          color="warning"
                          disabled={!isRunning && !isTransitioning}
                          onClick={(e) => { e.stopPropagation(); onStopService(service); }}
                        >
                          <Stop fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Remove">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); onRemoveService(service.id); }}>
                        <Remove fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
          })}
        </Box>
      </Paper>

      <ServiceContextMenu
        service={contextMenu?.service || null}
        anchorPosition={contextMenu?.position || null}
        onClose={handleCloseContextMenu}
        isOrchestrated={true}
        onQuickCommand={onQuickCommand}
        onForceStop={onForceStopService}
        onToggleDetached={onToggleDetached}
        onRunRoutine={onRunRoutine}
        onOpenPatchManager={onOpenPatchManager}
        patches={contextMenuPatches}
        onDockerAction={(service, action) => {
          if (window.electronAPI) {
            if (action === 'pull') window.electronAPI.dockerPull(service.id);
            else if (action === 'rebuild') window.electronAPI.dockerRebuild(service.id);
          }
        }}
      />
    </Box>
  );
};

export default OrchestratedServices;