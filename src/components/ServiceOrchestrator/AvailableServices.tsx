import React, { useState } from 'react';
import {
  Box,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import { useDrag } from 'react-dnd';
import { Service } from './types';
import ServiceContextMenu from './ServiceContextMenu';

interface AvailableServicesProps {
  services: Service[];
  orchestratedServiceIds: Set<string>;
  onQuickCommand?: (service: Service, command: string) => void;
  onOpenPatchManager?: (service: Service) => void;
}

interface DraggableServiceCardProps {
  service: Service;
  isAlreadyAdded: boolean;
  onContextMenu: (event: React.MouseEvent, service: Service) => void;
}

const DRAG_TYPE = 'SERVICE';

const DraggableServiceCard: React.FC<DraggableServiceCardProps> = ({ service, isAlreadyAdded, onContextMenu }) => {
  const theme = useTheme();

  const [{ isDragging }, drag] = useDrag(() => ({
    type: DRAG_TYPE,
    item: { service },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [service]);

  return (
    <Box
      ref={drag}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, service); }}
      sx={{
        px: 1.5,
        py: 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.4 : isAlreadyAdded ? 0.5 : 1,
        borderLeft: `3px solid ${isAlreadyAdded ? 'transparent' : alpha(theme.palette.primary.main, 0.4)}`,
        '&:hover': {
          bgcolor: 'action.hover',
          borderLeftColor: isAlreadyAdded ? 'transparent' : theme.palette.primary.main,
        },
        transition: 'all 0.15s ease',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="body2" noWrap sx={{
          fontWeight: 500,
          textDecoration: isAlreadyAdded ? 'line-through' : 'none',
          color: isAlreadyAdded ? 'text.disabled' : 'text.primary',
        }}>
          {service.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          {service.port && (
            <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
              :{service.port}
            </Typography>
          )}
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mt: 0.25 }}>
        {service.type}
      </Typography>
    </Box>
  );
};

const AvailableServices: React.FC<AvailableServicesProps> = ({
  services,
  orchestratedServiceIds,
  onQuickCommand,
  onOpenPatchManager,
}) => {
  const [contextMenu, setContextMenu] = useState<{
    service: Service;
    position: { top: number; left: number };
  } | null>(null);

  const added = services.filter(s => orchestratedServiceIds.has(s.id));
  const available = services.filter(s => !orchestratedServiceIds.has(s.id));

  return (
    <Box sx={{ width: 260, display: 'flex', flexDirection: 'column', minHeight: 0,
      borderRight: 1, borderColor: 'divider' }}>
      <Box sx={{ px: 1.5, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Services
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Drag to orchestrate · Right-click for actions
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {available.length > 0 && (
          <>
            {available.map(service => (
              <DraggableServiceCard
                key={service.id}
                service={service}
                isAlreadyAdded={false}
                onContextMenu={(e, s) => setContextMenu({ service: s, position: { top: e.clientY, left: e.clientX } })}
              />
            ))}
          </>
        )}

        {added.length > 0 && (
          <>
            <Box sx={{ px: 1.5, pt: 1.5, pb: 0.5 }}>
              <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5 }}>
                In orchestration
              </Typography>
            </Box>
            {added.map(service => (
              <DraggableServiceCard
                key={service.id}
                service={service}
                isAlreadyAdded={true}
                onContextMenu={(e, s) => setContextMenu({ service: s, position: { top: e.clientY, left: e.clientX } })}
              />
            ))}
          </>
        )}
      </Box>

      <ServiceContextMenu
        service={contextMenu?.service || null}
        anchorPosition={contextMenu?.position || null}
        onClose={() => setContextMenu(null)}
        isOrchestrated={false}
        onQuickCommand={onQuickCommand}
        onOpenPatchManager={onOpenPatchManager}
      />
    </Box>
  );
};

export default AvailableServices;
export { DRAG_TYPE };
