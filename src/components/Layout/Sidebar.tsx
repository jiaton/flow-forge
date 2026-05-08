import React, { useState } from 'react';
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
  Collapse,
  Avatar,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Dashboard,
  Settings,
  Search,
  Menu,
  FlashOn,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { processColors } from '../../theme/theme';
import { useDbAppStore as useAppStore } from '../../stores/dbAppStore';
import type { Team } from '../../lib/constants/team';
import { 
  TEAM_DISPLAYS, 
  getTeamDisplay, 
  getTeamMenuItems 
} from '../../lib/constants/team';
import { VIEWS } from '../../lib/constants/ui';

// Use centralized team configurations
const teams = TEAM_DISPLAYS;

// Global menu items (not team-specific)
const globalMenuItems = [
  { id: VIEWS.DASHBOARD, label: 'Dashboard', icon: Dashboard },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Team-specific menu items now come from centralized configuration

const Sidebar: React.FC = () => {
  const theme = useTheme();
  const { sidebarCollapsed, toggleSidebar, selectedTeam, setSelectedTeam, setCurrentView, currentView } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [teamMenuExpanded, setTeamMenuExpanded] = useState(true);

  const currentTeam = getTeamDisplay(selectedTeam);
  const teamMenuItems = getTeamMenuItems(selectedTeam);

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
  };

  const handleMenuItemClick = (item: { id: string }, _isGlobal = false) => {
    setCurrentView(item.id);
  };

  const filteredGlobalItems = globalMenuItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeamItems = teamMenuItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

          {/* Global Items */}
          {filteredGlobalItems.map((item) => (
            <Tooltip key={item.id} title={item.label} placement="right">
              <ListItem sx={{ px: 1, justifyContent: 'center' }}>
                <ListItemButton
                  onClick={() => handleMenuItemClick(item, true)}
                  selected={currentView === item.id}
                  className="card-hover"
                  sx={{ minWidth: 'auto', borderRadius: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 'auto' }}>
                    <item.icon />
                  </ListItemIcon>
                </ListItemButton>
              </ListItem>
            </Tooltip>
          ))}

          <Divider sx={{ my: 1 }} />

          {/* Team Items */}
          {filteredTeamItems.map((item) => (
            <Tooltip key={item.id} title={item.label} placement="right">
              <ListItem sx={{ px: 1, justifyContent: 'center' }}>
                <ListItemButton
                  onClick={() => handleMenuItemClick(item)}
                  selected={currentView === item.id}
                  className="card-hover"
                  sx={{ minWidth: 'auto', borderRadius: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 'auto' }}>
                    <item.icon />
                  </ListItemIcon>
                </ListItemButton>
              </ListItem>
            </Tooltip>
          ))}
        </List>
      </Drawer>
    );
  }

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
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: alpha(theme.palette.primary.main, 0.08),
      }}>
        <IconButton onClick={toggleSidebar} size="small">
          <Menu />
        </IconButton>
        <Avatar sx={{ 
          width: 28, 
          height: 28, 
          bgcolor: 'primary.main',
        }}>
          <FlashOn sx={{ fontSize: 16 }} />
        </Avatar>
        <Typography variant="h6" component="div" className="gradient-text" sx={{ fontWeight: 'bold' }}>
          FlowForge
        </Typography>
      </Box>

      {/* Team Selector */}
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Select Team
        </Typography>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
          gap: 1.5,
          mt: 1
        }}>
          {teams.map((team) => (
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
          <Box sx={{ 
            mt: 2, 
            p: 1.5, 
            borderRadius: 1, 
            bgcolor: alpha(currentTeam.color, 0.08),
            border: 1,
            borderColor: alpha(currentTeam.color, 0.2),
          }}>
            <Typography variant="subtitle2" sx={{ 
              color: currentTeam.color, 
              fontWeight: 600,
              mb: 0.5 
            }}>
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
          placeholder="Search..."
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

      <List sx={{ flex: 1, overflow: 'auto', pt: 0 }}>
        {/* Global Menu Items */}
        <Typography variant="overline" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
          Global
        </Typography>
        {filteredGlobalItems.map((item) => (
          <ListItem key={item.id} sx={{ px: 0, py: 0.25 }}>
            <ListItemButton
              onClick={() => handleMenuItemClick(item, true)}
              selected={currentView === item.id}
              className="card-hover"
              sx={{ borderRadius: 1, mx: 2, py: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <item.icon />
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}

        <Divider sx={{ my: 0.5 }} />

        {/* Team-Specific Menu Items */}
        <ListItem sx={{ px: 0, py: 0.25 }}>
          <ListItemButton
            onClick={() => setTeamMenuExpanded(!teamMenuExpanded)}
            className="card-hover"
            sx={{ borderRadius: 1, mx: 2, py: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {currentTeam && <currentTeam.icon sx={{ color: currentTeam.color }} />}
            </ListItemIcon>
            <ListItemText 
              primary={`${currentTeam?.name} Tools`}
              secondary={`${filteredTeamItems.length} tools available`}
            />
            {teamMenuExpanded ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        <Collapse in={teamMenuExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {filteredTeamItems.map((item) => (
              <ListItem key={item.id} sx={{ px: 0, py: 0.25 }}>
                <ListItemButton
                  onClick={() => handleMenuItemClick(item)}
                  selected={currentView === item.id}
                  className="card-hover"
                  sx={{ pl: 4, borderRadius: 1, mx: 2, py: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <item.icon />
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Collapse>
      </List>
    </Drawer>
  );
};

export default Sidebar;