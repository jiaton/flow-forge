import React, { useState, useRef } from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Snackbar,
  Alert,
  Popper,
  Paper,
  MenuList,
  Grow,
} from '@mui/material';
import {
  Code,
  ContentCopy,
  PlayArrow,
  ChevronRight,
  Block,
  ToggleOn,
  ToggleOff,
  AutoMode,
  CloudDownload,
  BuildCircle,
  Difference,
} from '@mui/icons-material';
import { Service } from './types';
import { SERVICE_MODE, SUBMENU_TYPE, SubmenuType } from '../../shared/constants/service';
import { teamConfigLoader } from '../../lib/loaders/team-config';

interface ServiceContextMenuProps {
  service: Service | null;
  anchorPosition: { top: number; left: number } | null;
  onClose: () => void;
  isOrchestrated?: boolean;
  onQuickCommand?: (service: Service, command: string) => void;
  onForceStop?: (service: Service) => void;
  onToggleDetached?: (serviceId: string, detached: boolean) => void;
  onRunRoutine?: (service: Service, actionKey: string, command: string) => void;
  onDockerAction?: (service: Service, action: 'pull' | 'rebuild') => void;
  onOpenPatchManager?: (service: Service) => void;
}

const ServiceContextMenu: React.FC<ServiceContextMenuProps> = ({
  service,
  anchorPosition,
  onClose,
  isOrchestrated: _isOrchestrated = false,
  onQuickCommand,
  onForceStop,
  onToggleDetached,
  onRunRoutine,
  onDockerAction,
  onOpenPatchManager,
}) => {
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });
  const [activeSubmenu, setActiveSubmenu] = useState<{ type: SubmenuType; anchor: HTMLElement } | null>(null);
  const submenuTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openSubmenu = (type: SubmenuType, el: HTMLElement) => {
    if (submenuTimeout.current) clearTimeout(submenuTimeout.current);
    setActiveSubmenu({ type, anchor: el });
  };
  const closeSubmenu = () => {
    submenuTimeout.current = setTimeout(() => setActiveSubmenu(null), 150);
  };
  const keepSubmenu = () => {
    if (submenuTimeout.current) clearTimeout(submenuTimeout.current);
  };
  const clearSubmenu = () => setActiveSubmenu(null);

  if (!service) return null;

  const ideOptions = teamConfigLoader.getIDEOptions(service.id);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenIDE = async (command?: string) => {
    const cmd = command || ideOptions[0]?.command;
    if (!cmd) {
      showSnackbar('No IDE configured. Set ide in global-settings.yaml', 'error');
      onClose();
      return;
    }
    // Remember last-used IDE for this service
    const match = ideOptions.find(o => o.command === cmd);
    if (match) localStorage.setItem(`ide-last-${service.id}`, match.name);
    try {
      const result = await window.electronAPI.executeCommand(cmd);
      if (!result.success) showSnackbar(`Failed: ${result.error}`, 'error');
    } catch (error: unknown) {
      showSnackbar(`Error: ${(error as Error).message}`, 'error');
    }
    onClose();
  };

  const handleCopyPath = async () => {
    const servicePath = teamConfigLoader.getServicePath(service.id);
    if (!servicePath) {
      showSnackbar('No path configured for this service', 'error');
    } else {
      await navigator.clipboard.writeText(servicePath);
      showSnackbar('Path copied to clipboard', 'success');
    }
    onClose();
  };

  return (
    <>
    <Menu
      open={Boolean(anchorPosition)}
      onClose={() => { clearSubmenu(); onClose(); }}
      anchorReference="anchorPosition"
      anchorPosition={anchorPosition || undefined}
      transitionDuration={0}
      sx={{ '& .MuiPaper-root': { minWidth: 220, boxShadow: 4 } }}
    >
      {/* Header */}
      <MenuItem disabled sx={{ opacity: '1 !important' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {service.name}
        </Typography>
      </MenuItem>
      <Divider />

      {/* Open in IDE — single item or submenu */}
      {ideOptions.length === 1 && (
        <MenuItem onClick={() => handleOpenIDE()}>
          <ListItemIcon><Code fontSize="small" /></ListItemIcon>
          <ListItemText primary={`Open in ${ideOptions[0].name}`} />
        </MenuItem>
      )}
      {ideOptions.length > 1 && (
        <>
          <MenuItem
            onMouseEnter={(e) => openSubmenu(SUBMENU_TYPE.IDE, e.currentTarget)}
            onMouseLeave={closeSubmenu}
            selected={activeSubmenu?.type === SUBMENU_TYPE.IDE}
          >
            <ListItemIcon><Code fontSize="small" /></ListItemIcon>
            <ListItemText primary="Open in IDE" />
            <ChevronRight fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
          </MenuItem>
          <Popper
            open={activeSubmenu?.type === SUBMENU_TYPE.IDE}
            anchorEl={activeSubmenu?.type === SUBMENU_TYPE.IDE ? activeSubmenu.anchor : null}
            placement="right-start"
            transition
            sx={{ zIndex: 1400 }}
          >
            {({ TransitionProps }) => (
              <Grow {...TransitionProps}>
                <Paper elevation={8} onMouseEnter={keepSubmenu} onMouseLeave={closeSubmenu}>
                  <MenuList dense>
                    {ideOptions.map((opt) => (
                      <MenuItem key={opt.name} onClick={() => { clearSubmenu(); handleOpenIDE(opt.command); }}>
                        <ListItemText primary={opt.name} />
                      </MenuItem>
                    ))}
                  </MenuList>
                </Paper>
              </Grow>
            )}
          </Popper>
        </>
      )}

      {/* Copy Path */}
      <MenuItem onClick={handleCopyPath}>
        <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>
        <ListItemText primary="Copy Path" />
      </MenuItem>

      {/* Quick Commands */}
      {service.quickCommands && service.quickCommands.length > 0 && (
        <>
          <Divider />
          <MenuItem
            onMouseEnter={(e) => openSubmenu(SUBMENU_TYPE.QUICK_COMMANDS, e.currentTarget)}
            onMouseLeave={closeSubmenu}
            selected={activeSubmenu?.type === SUBMENU_TYPE.QUICK_COMMANDS}
          >
            <ListItemIcon><PlayArrow fontSize="small" /></ListItemIcon>
            <ListItemText primary="Quick Commands" />
            <ChevronRight fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
          </MenuItem>
          <Popper
            open={activeSubmenu?.type === SUBMENU_TYPE.QUICK_COMMANDS}
            anchorEl={activeSubmenu?.type === SUBMENU_TYPE.QUICK_COMMANDS ? activeSubmenu.anchor : null}
            placement="right-start"
            transition
            sx={{ zIndex: 1400 }}
          >
            {({ TransitionProps }) => (
              <Grow {...TransitionProps}>
                <Paper elevation={8} onMouseEnter={keepSubmenu} onMouseLeave={closeSubmenu}>
                  <MenuList dense>
                    {service.quickCommands!.map((qc, idx) => (
                      <MenuItem
                        key={idx}
                        onClick={() => { clearSubmenu(); onClose(); onQuickCommand?.(service, qc.command); }}
                      >
                        <ListItemText
                          primary={qc.name}
                          secondary={qc.command}
                          secondaryTypographyProps={{ variant: 'caption', sx: { fontFamily: 'monospace' } }}
                        />
                      </MenuItem>
                    ))}
                  </MenuList>
                </Paper>
              </Grow>
            )}
          </Popper>
        </>
      )}

      {/* Routines */}
      {service.routines && Object.keys(service.routines).length > 0 && onRunRoutine && (
        <>
          {!(service.quickCommands && service.quickCommands.length > 0) && <Divider />}
          <MenuItem
            onMouseEnter={(e) => openSubmenu(SUBMENU_TYPE.ROUTINES, e.currentTarget)}
            onMouseLeave={closeSubmenu}
            selected={activeSubmenu?.type === SUBMENU_TYPE.ROUTINES}
          >
            <ListItemIcon><AutoMode fontSize="small" /></ListItemIcon>
            <ListItemText primary="Routines" />
            <ChevronRight fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
          </MenuItem>
          <Popper
            open={activeSubmenu?.type === SUBMENU_TYPE.ROUTINES}
            anchorEl={activeSubmenu?.type === SUBMENU_TYPE.ROUTINES ? activeSubmenu.anchor : null}
            placement="right-start"
            transition
            sx={{ zIndex: 1400 }}
          >
            {({ TransitionProps }) => (
              <Grow {...TransitionProps}>
                <Paper elevation={8} onMouseEnter={keepSubmenu} onMouseLeave={closeSubmenu}>
                  <MenuList dense>
                    {Object.entries(service.routines!).map(([key, cmd]) => (
                      <MenuItem
                        key={key}
                        onClick={() => { clearSubmenu(); onClose(); onRunRoutine(service, key, cmd as string); }}
                      >
                        <ListItemText
                          primary={key}
                          secondary={cmd as string}
                          secondaryTypographyProps={{ variant: 'caption', sx: { fontFamily: 'monospace' } }}
                        />
                      </MenuItem>
                    ))}
                  </MenuList>
                </Paper>
              </Grow>
            )}
          </Popper>
        </>
      )}

      {/* Patches */}
      {onOpenPatchManager && (
        <>
          <Divider />
          <MenuItem onClick={() => { onClose(); onOpenPatchManager(service); }}>
            <ListItemIcon><Difference fontSize="small" /></ListItemIcon>
            <ListItemText primary="Patches" />
          </MenuItem>
        </>
      )}

      {/* Docker Actions */}
      {service.mode === SERVICE_MODE.DOCKER && onDockerAction && (
        <>
          <Divider />
          <MenuItem onClick={() => { onDockerAction(service, 'pull'); onClose(); }}>
            <ListItemIcon><CloudDownload fontSize="small" /></ListItemIcon>
            <ListItemText primary="Pull Images" />
          </MenuItem>
          <MenuItem onClick={() => { onDockerAction(service, 'rebuild'); onClose(); }}>
            <ListItemIcon><BuildCircle fontSize="small" /></ListItemIcon>
            <ListItemText primary="Rebuild" />
          </MenuItem>
        </>
      )}

      {/* Force Stop & Detached */}
      {(onForceStop || onToggleDetached) && <Divider />}
      {onForceStop && (
        <MenuItem onClick={() => { onForceStop(service); onClose(); }}>
          <ListItemIcon><Block fontSize="small" color="error" /></ListItemIcon>
          <ListItemText primary="Force Stop" />
        </MenuItem>
      )}
      {onToggleDetached && (
        <MenuItem onClick={() => {
          const current = service.detached !== undefined ? Boolean(service.detached) : true;
          onToggleDetached(service.id, !current);
          onClose();
        }}>
          <ListItemIcon>
            {(service.detached !== undefined ? Boolean(service.detached) : true)
              ? <ToggleOn fontSize="small" color="primary" />
              : <ToggleOff fontSize="small" />}
          </ListItemIcon>
          <ListItemText
            primary={(service.detached !== undefined ? Boolean(service.detached) : true) ? 'Detached: On' : 'Detached: Off'}
          />
        </MenuItem>
      )}
    </Menu>

    <Snackbar
      open={snackbar.open}
      autoHideDuration={3000}
      onClose={() => setSnackbar({ ...snackbar, open: false })}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
        {snackbar.message}
      </Alert>
    </Snackbar>
    </>
  );
};

export default ServiceContextMenu;
