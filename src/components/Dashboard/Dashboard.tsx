import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
} from '@mui/material';
import {
  CloudQueue,
} from '@mui/icons-material';
import { useDbAppStore as useAppStore } from '../../stores/dbAppStore';
import { VIEWS } from '../../lib/constants/ui';

const Dashboard: React.FC = () => {
  const { setCurrentView } = useAppStore();

  const quickActions = [
    {
      title: 'Service Orchestrator',
      description: 'Arrange and manage backend REST API services',
      icon: <CloudQueue />,
      action: () => setCurrentView(VIEWS.SERVICE_ORCHESTRATOR),
    },
  ];

  return (
    <Box sx={{ 
      p: { xs: 2, md: 3 }, 
      height: '100%', 
      overflow: 'auto',
      backgroundColor: 'background.default'
    }} className="page-transition">
      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ 
          mb: 4, 
          fontWeight: 700,
          color: 'text.primary',
          letterSpacing: '-0.02em'
        }}
      >
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
            {quickActions.map((action, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    transform: 'translateY(-2px)'
                  }
                }}>
                  <CardContent sx={{ 
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    p: 3
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ 
                        color: 'primary.main',
                        mr: 2,
                        '& svg': { fontSize: '1.5rem' }
                      }}>
                        {action.icon}
                      </Box>
                      <Typography variant="h6" sx={{ 
                        fontWeight: 600,
                        fontSize: '1rem',
                        color: 'text.primary'
                      }}>
                        {action.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ 
                      mb: 3, 
                      flex: 1,
                      fontSize: '0.875rem',
                      lineHeight: 1.5
                    }}>
                      {action.description}
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={action.action}
                      sx={{
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText',
                        fontWeight: 500,
                        textTransform: 'none',
                        borderRadius: 1.5,
                        py: 1,
                        '&:hover': { 
                          backgroundColor: 'primary.dark',
                          transform: 'none'
                        }
                      }}
                    >
                      Open
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

      </Grid>
    </Box>
  );
};

export default Dashboard;