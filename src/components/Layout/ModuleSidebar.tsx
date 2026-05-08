/**
 * Module-based Sidebar with Drag-and-Drop Reordering
 *
 * Displays modules from the module registry with support for:
 * - Team-specific module filtering
 * - Drag-and-drop reordering (using react-dnd)
 * - Badge indicators
 * - Collapsible/expandable state
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  IconButton,
  Typography,
  InputAdornment,
  Tooltip,
  Divider,
  Chip,
  Avatar,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search,
  Menu,
  FlashOn,
  DragIndicator,
} from '@mui/icons-material';
import * as MuiIcons from '@mui/icons-material';
import { processColors } from '../../theme/theme';
import { useDrag, useDrop } from 'react-dnd';
import { useDbAppStore as useAppStore } from '../../stores/dbAppStore';
import type { Team } from '../../lib/constants/team';
import { getTeamDisplay } from '../../lib/constants/team';
import { teamConfigLoader } from '../../lib/loaders/team-config';
import { moduleRegistry } from '../../core/module-system';

const ITEM_TYPE = 'MODULE_MENU_ITEM';

// Helper to get MUI icon component from string name
const getIconComponent = (iconName: string): React.ComponentType<Record<string, unknown>> => {
  const IconComponent = (MuiIcons as Record<string, React.ComponentType<Record<string, unknown>>>)[iconName];
  return IconComponent || MuiIcons.Extension; // Fallback icon
};

interface DraggableMenuItemProps {
  item: Record<string, unknown>;
  index: number;
  currentView: string;
  onMoveItem: (dragIndex: number, hoverIndex: number) => void;
  onMenuItemClick: (item: Record<string, unknown>) => void;
  onDragEnd: () => void;
}

const DraggableMenuItem: React.FC<DraggableMenuItemProps> = ({
  item,
  index,
  currentView,
  onMoveItem,
  onMenuItemClick,
  onDragEnd,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useTheme();

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { index, moduleId: item.moduleId },
    end: () => {
      onDragEnd();
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover: (draggedItem: { index: number; moduleId: string }, monitor) => {
      if (!ref.current) {
        return;
      }

      const dragIndex = draggedItem.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) {
        return;
      }

      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      onMoveItem(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      draggedItem.index = hoverIndex;
    },
  });

  // Combine drag and drop refs
  drag(drop(ref));

  const IconComponent = getIconComponent(item.icon);
  const badgeContent = item.badge?.();

  return (
    <ListItem
      ref={ref}
      sx={{
        px: 0,
        py: 0.25,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    >
      <ListItemButton
        onClick={() => onMenuItemClick(item)}
        selected={currentView === item.moduleId}
        className="card-hover"
        sx={{
          borderRadius: 1,
          mx: 2,
          py: 1,
        }}
      >
        <ListItemIcon sx={{ minWidth: 32, cursor: 'grab' }}>
          <DragIndicator fontSize="small" />
        </ListItemIcon>
        <ListItemIcon sx={{ minWidth: 36 }}>
          {badgeContent ? (
            <Badge badgeContent={badgeContent} color="error" max={99}>
              <IconComponent />
            </Badge>
          ) : (
            <IconComponent />
          )}
        </ListItemIcon>
        <ListItemText primary={item.label} />
      </ListItemButton>
    </ListItem>
  );
};

const ModuleSidebar: React.FC = () => {
  const theme = useTheme();
  const {
    sidebarCollapsed,
    toggleSidebar,
    selectedTeam,
    setSelectedTeam,
    setCurrentView,
    currentView,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [menuItems, setMenuItems] = useState<Record<string, unknown>[]>([]);
  const [teamDisplays, setTeamDisplays] = useState<Record<string, unknown>[]>([]);

  // Load team displays from YAML configuration
  useEffect(() => {
    const loadTeamDisplays = async () => {
      try {
        await teamConfigLoader.initialize();
      } catch (error) {
        console.warn('Team config loader initialization failed, using current state:', error);
      }

      const displays = teamConfigLoader.getAllTeamDisplays();
      setTeamDisplays(displays.filter(Boolean));

      // Re-initialize team configs now that loader is ready
      const { initializeTeamConfigs } = useAppStore.getState();
      initializeTeamConfigs();
    };

    loadTeamDisplays();
  }, []);

  // Load menu items from module registry
  useEffect(() => {
    const items = moduleRegistry.getMenuItems();
    setMenuItems(items);
  }, [selectedTeam]);

  const currentTeam = getTeamDisplay(selectedTeam);

  const handleTeamSelect = async (team: Team) => {
    setSelectedTeam(team);
    await moduleRegistry.setCurrentTeam(team);
    const items = moduleRegistry.getMenuItems();
    setMenuItems(items);
  };

  const handleMenuItemClick = (item: Record<string, unknown>) => {
    setCurrentView(item.moduleId as string);
  };

  const moveMenuItem = (dragIndex: number, hoverIndex: number) => {
    const newItems = [...menuItems];
    const [draggedItem] = newItems.splice(dragIndex, 1);
    newItems.splice(hoverIndex, 0, draggedItem);
    setMenuItems(newItems);
  };

  const handleDragEnd = async () => {
    // Save new order to module registry and database
    const newOrder = menuItems.map((item) => item.moduleId);
    moduleRegistry.setModuleOrder(newOrder);

    try {
      await window.electronAPI.db.appSettings.set('moduleOrder', newOrder);
    } catch (error) {
      console.error('Failed to save module order:', error);
    }
  };

  // Filter menu items
  const filteredMenuItems = React.useMemo(() => {
    return menuItems.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [menuItems, searchQuery]);

  // Collapsed sidebar view
  if (sidebarCollapsed) {
    return (
      <Drawer
        variant="permanent"
        sx={{
          width: 60,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 60,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            transition: 'width 0.3s ease',
            overflowX: 'hidden',
          },
        }}
      >
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
          <IconButton onClick={toggleSidebar} size="small">
            <Menu />
          </IconButton>
        </Box>

        <List>
          {/* Team Selector - Collapsed */}
          <Tooltip title={`Current Team: ${currentTeam?.name}`} placement="right">
            <ListItem sx={{ px: 1, justifyContent: 'center' }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: currentTeam?.color,
                }}
              >
                {selectedTeam}
              </Avatar>
            </ListItem>
          </Tooltip>

          <Divider sx={{ my: 1 }} />

          {/* Module Menu Items */}
          {filteredMenuItems.map((item) => {
            const IconComponent = getIconComponent(item.icon);
            const badgeContent = item.badge?.();

            return (
              <Tooltip key={item.moduleId} title={item.label} placement="right">
                <ListItem sx={{ px: 1, justifyContent: 'center' }}>
                  <ListItemButton
                    onClick={() => handleMenuItemClick(item)}
                    selected={currentView === item.moduleId}
                    className="card-hover"
                    sx={{ minWidth: 'auto', borderRadius: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 'auto' }}>
                      {badgeContent ? (
                        <Badge
                          badgeContent={badgeContent}
                          color="error"
                          max={99}
                        >
                          <IconComponent />
                        </Badge>
                      ) : (
                        <IconComponent />
                      )}
                    </ListItemIcon>
                  </ListItemButton>
                </ListItem>
              </Tooltip>
            );
          })}
        </List>
      </Drawer>
    );
  }

  // Expanded sidebar view
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 320,
        flexShrink: 0,
        '& .MuiPaper-root': {
          background: processColors.primary.gradient,
          backdropFilter: 'blur(10px)',
        },
        '& .MuiDrawer-paper': {
          width: 320,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
          background: processColors.primary.gradient,
          backdropFilter: 'blur(10px)',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.primary.main, 0.08),
        }}
      >
        <IconButton onClick={toggleSidebar} size="small">
          <Menu />
        </IconButton>
        <Avatar
          sx={{
            width: 28,
            height: 28,
            bgcolor: 'primary.main',
          }}
        >
          <FlashOn sx={{ fontSize: 16 }} />
        </Avatar>
        <Typography
          variant="h6"
          component="div"
          className="gradient-text"
          sx={{ fontWeight: 'bold' }}
        >
          FlowForge
        </Typography>
      </Box>

      {/* Team Selector */}
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Select Team
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 1.5,
            mt: 1,
          }}
        >
          {teamDisplays.map((team) => (
            <Chip
              key={team.id}
              label={team.id}
              icon={<team.icon />}
              onClick={() => handleTeamSelect(team.id)}
              color={selectedTeam === team.id ? 'primary' : 'default'}
              variant={selectedTeam === team.id ? 'filled' : 'outlined'}
              size="medium"
              className="card-hover"
              sx={{
                fontWeight: 600,
                ...(selectedTeam === team.id && {
                  bgcolor: team.color,
                  color: 'white',
                  '& .MuiChip-icon': { color: 'white' },
                }),
              }}
            />
          ))}
        </Box>

        {currentTeam && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 1,
              bgcolor: alpha(currentTeam.color, 0.08),
              border: 1,
              borderColor: alpha(currentTeam.color, 0.2),
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                color: currentTeam.color,
                fontWeight: 600,
                mb: 0.5,
              }}
            >
              {currentTeam.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentTeam.description}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Search */}
      <Box sx={{ px: 2, py: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search modules..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Draggable Module Menu Items */}
      <Box sx={{ flex: 1, overflow: 'auto', pt: 0 }}>
        <Typography
          variant="overline"
          sx={{ px: 2, py: 1, color: 'text.secondary', display: 'block' }}
        >
          Modules (drag to reorder)
        </Typography>

        {filteredMenuItems.length === 0 ? (
          <Box sx={{ px: 2, py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {menuItems.length === 0 ? 'Loading modules...' : 'No modules match your search'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ pt: 0 }}>
            {filteredMenuItems.map((item, index) => (
              <DraggableMenuItem
                key={item.moduleId}
                item={item}
                index={index}
                currentView={currentView}
                onMoveItem={moveMenuItem}
                onMenuItemClick={handleMenuItemClick}
                onDragEnd={handleDragEnd}
              />
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  );
};

export default ModuleSidebar;
