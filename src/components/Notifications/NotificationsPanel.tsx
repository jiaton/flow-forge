import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Divider,
  Button,
} from '@mui/material';
import { Close, CheckCircle, Error, Warning, Info, DoneAll } from '@mui/icons-material';
import { useDbAppStore as useAppStore } from '../../stores/dbAppStore';

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ open, onClose }) => {
  const { notifications, removeNotification, clearAllNotifications } = useAppStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle color="success" />;
      case 'error': return <Error color="error" />;
      case 'warning': return <Warning color="warning" />;
      case 'info': return <Info color="info" />;
      default: return <Info />;
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes === 0) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
          sx: { 
            width: 400,
            backgroundColor: 'background.paper',
            borderLeft: '1px solid',
            borderColor: 'divider',
          },
      }}
    >
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        backgroundColor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
          Notifications
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {notifications.length > 0 && (
            <Button
              size="small"
              startIcon={<DoneAll />}
              onClick={clearAllNotifications}
              sx={{ 
                color: 'text.secondary',
                '&:hover': { backgroundColor: 'action.hover' }
              }}
            >
              Read All
            </Button>
          )}
          <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
            <Close />
          </IconButton>
        </Box>
      </Box>
      
      <Divider />
      
      {notifications.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center', backgroundColor: 'background.paper' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            No notifications
          </Typography>
        </Box>
      ) : (
        <List sx={{ backgroundColor: 'background.paper' }}>
          {notifications.map((notification) => (
            <ListItem
              key={notification.id}
              secondaryAction={
                <IconButton
                  edge="end"
                  onClick={() => removeNotification(notification.id)}
                  sx={{ color: 'text.secondary' }}
                >
                  <Close />
                </IconButton>
              }
              className="card-hover"
              sx={{ 
                color: 'text.primary',
                '&:hover': { backgroundColor: 'action.hover' }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, width: '100%' }}>
                {getIcon(notification.type)}
                <Box sx={{ flex: 1 }}>
                  <ListItemText
                    primary={notification.message}
                    secondary={formatTime(notification.timestamp)}
                    sx={{
                      '& .MuiListItemText-primary': {
                        color: 'text.primary',
                        fontWeight: 500
                      },
                      '& .MuiListItemText-secondary': {
                        color: 'text.secondary'
                      }
                    }}
                  />
                  <Chip
                    label={notification.type}
                    size="small"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    color={notification.type as any}
                    sx={{ mt: 0.5 }}
                    className={`status-indicator ${notification.type}`}
                  />
                </Box>
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </Drawer>
  );
};

export default NotificationsPanel;