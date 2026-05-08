import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { useConfig } from '../../hooks/shared/useConfig';
import { teamConfigLoader } from '../../lib/loaders/team-config';
import { getEnvironmentShortName, getEnvironmentColor } from '../../lib/constants/environment';

const ConfigurationExample: React.FC = () => {
  const { isLoading, error, config } = useConfig();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading configuration...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Configuration Error: {error}
      </Alert>
    );
  }

  if (!config) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No configuration available
      </Alert>
    );
  }

  const currentEnvironment = getEnvironmentShortName(config.environment);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Configuration System Example
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        This component demonstrates how to use the YAML-based configuration system instead of hardcoded values.
      </Typography>

      {/* App Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Application Info
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip label={`Name: ${config.appName}`} color="primary" />
            <Chip label={`Version: ${config.appVersion}`} color="secondary" />
            <Chip 
              label={`Environment: ${config.environment}`} 
              color={getEnvironmentColor(currentEnvironment)} 
            />
          </Box>
        </CardContent>
      </Card>

      {/* Environment Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current Environment (Local)
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">backend-api (Backend)</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {teamConfigLoader.getServiceEnvironmentUrl('backend-api', currentEnvironment)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">GraphQL API</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {teamConfigLoader.getServiceEnvironmentUrl('graphql-api', currentEnvironment)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Gateway</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {teamConfigLoader.getServiceEnvironmentUrl('api-gateway', currentEnvironment)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Web App (Frontend)</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {teamConfigLoader.getServiceEnvironmentUrl('web-app', currentEnvironment)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Template Service</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {teamConfigLoader.getServiceEnvironmentUrl('template-service', currentEnvironment)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* External Services */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            External Services
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                {config.gitlab.name || 'GitLab'}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {config.getGitlabUrl()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Project ID: {config.gitlab.projectId}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                {config.teamspace.name || 'Teamspace'}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {config.getTeamspaceUrl()}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Feature Flags
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={`Notifications: ${config.features.notifications?.enabled ? 'ON' : 'OFF'}`}
              color={config.features.notifications?.enabled ? 'success' : 'default'}
            />
            <Chip 
              label={`Analytics: ${config.features.analytics?.enabled ? 'ON' : 'OFF'}`}
              color={config.features.analytics?.enabled ? 'success' : 'default'}
            />
            <Chip 
              label={`Debug: ${config.features.debug?.enabled ? 'ON' : 'OFF'}`}
              color={config.features.debug?.enabled ? 'warning' : 'default'}
            />
            <Chip 
              label={`Auto Save: ${config.features.autoSave?.enabled ? 'ON' : 'OFF'}`}
              color={config.features.autoSave?.enabled ? 'success' : 'default'}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Configuration Actions
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="outlined" 
              onClick={async () => {
                try {
                  await config.updateConfig({
                    features: {
                      notifications: { enabled: !config.features.notifications?.enabled }
                    }
                  });
                  // Force re-render
                  window.location.reload();
                } catch (err) {
                  console.error('Failed to update config:', err);
                }
              }}
            >
              Toggle Notifications
            </Button>
            <Button 
              variant="outlined" 
              onClick={async () => {
                try {
                  await config.reloadConfig();
                  // Force re-render
                  window.location.reload();
                } catch (err) {
                  console.error('Failed to reload config:', err);
                }
              }}
            >
              Reload Configuration
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => {
                console.log('Full Configuration:', config.getFullConfig());
              }}
            >
              Log Full Config
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ConfigurationExample; 