import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Tooltip,
  Box,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Notifications,
  AccountCircle,
  DarkMode,
  LightMode,
} from '@mui/icons-material';
import { processColors } from '../../theme/theme';
import { useDbAppStore as useAppStore } from '../../stores/dbAppStore';
import { useThemeStore } from '../../stores/themeStore';
import NotificationsPanel from '../Notifications/NotificationsPanel';
import RemoteConfigButton from './RemoteConfigButton';

const TopBar: React.FC = () => {
  useTheme();
  const { selectedTeam, notifications } = useAppStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={1}
      sx={{ 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        background: processColors.primary.gradient,
        backdropFilter: 'blur(10px)',
      }}
    >
      <Toolbar sx={{ gap: 2, py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
            <Chip 
              label={selectedTeam} 
              size="small" 
              color="primary" 
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            <Typography variant="body2" color="text.secondary">
              Team
            </Typography>
          </Box>
        </Box>

        <RemoteConfigButton />

        <Tooltip title="Toggle Dark Mode">
          <IconButton onClick={toggleTheme} color="inherit">
            {isDarkMode ? <LightMode /> : <DarkMode />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Notifications">
          <IconButton
            onClick={() => setNotificationsOpen(true)}
            color="inherit"
            className={notifications.length > 0 ? 'pulse' : ''}
          >
            <Badge 
              badgeContent={notifications.length} 
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  animation: notifications.length > 0 ? 'pulse 2s infinite' : 'none'
                }
              }}
            >
              <Notifications />
            </Badge>
          </IconButton>
        </Tooltip>

        <Tooltip title="Profile">
          <IconButton
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleMenuClose}>Profile</MenuItem>
          <MenuItem onClick={handleMenuClose}>API Keys</MenuItem>
          <MenuItem onClick={handleMenuClose}>Settings</MenuItem>
          <MenuItem onClick={handleMenuClose}>Logout</MenuItem>
        </Menu>

        <NotificationsPanel
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
        />
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;