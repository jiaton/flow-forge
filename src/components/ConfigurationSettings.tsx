import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Chip,
} from '@mui/material';
import {
  ExpandMore,
  Save,
  Refresh,
  Download,
  Settings,
  Code,
} from '@mui/icons-material';
import { useConfig } from '../../hooks/shared/useConfig';
import { teamConfigLoader } from '../../lib/loaders/team-config';
import { getEnvironmentShortName, getEnvironmentColor } from '../../lib/constants/environment';

const ConfigurationSettings: React.FC = () => {
  const { isLoading, error, config } = useConfig();
  const [yamlConfig, setYamlConfig] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading configuration...</Typography>
      </Box>
    );
  }

  if (error || !config) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load configuration: {error}
      </Alert>
    );
  }

  const handleEditConfig = () => {
    // Convert current config to YAML format
    const currentConfig = config.getFullConfig();
    const yamlString = JSON.stringify(currentConfig, null, 2);
    setYamlConfig(yamlString);
    setIsEditing(true);
  };

  const handleSaveConfig = async () => {
    try {
      setSaveError(null);
      setSaveSuccess(false);

      // Parse the YAML/JSON input
      let parsedConfig;
      try {
        parsedConfig = JSON.parse(yamlConfig);
      } catch {
        setSaveError('Invalid JSON format. Please check your configuration.');
        return;
      }

      // Update the configuration
      await config.updateConfig(parsedConfig);
      setSaveSuccess(true);
      setIsEditing(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save configuration');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setYamlConfig('');
    setSaveError(null);
  };

  const handleReloadConfig = async () => {
    try {
      await config.reloadConfig();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to reload configuration');
    }
  };

  const handleDownloadConfig = async () => {
    const currentConfig = config.getFullConfig();
    const yamlString = JSON.stringify(currentConfig, null, 2);
    
    // Check if we're in Electron
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const result = await window.electronAPI.showSaveDialog();
        if (!result.canceled && result.filePath) {
          const saveResult = await window.electronAPI.writeConfigFile(result.filePath, currentConfig);
          if (saveResult.success) {
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
          } else {
            setSaveError(saveResult.error);
          }
        }
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Failed to save configuration');
      }
    } else {
      // Fallback to browser download
      const blob = new Blob([yamlString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'app.config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Settings sx={{ mr: 2, fontSize: 32 }} />
        <Typography variant="h4">Configuration Settings</Typography>
      </Box>

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Configuration saved successfully!
        </Alert>
      )}

      {saveError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {saveError}
        </Alert>
      )}

      {/* Action Buttons */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<Code />}
              onClick={handleEditConfig}
              disabled={isEditing}
            >
              Edit Configuration
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleReloadConfig}
            >
              Reload from File
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleDownloadConfig}
            >
              Download Config
            </Button>
          </Box>
        </CardContent>
      </Card>

      {isEditing ? (
        /* Edit Mode */
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Edit Configuration (JSON Format)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Edit the configuration below. The format should be valid JSON.
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={20}
              value={yamlConfig}
              onChange={(e) => setYamlConfig(e.target.value)}
              sx={{ fontFamily: 'monospace', mb: 2 }}
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveConfig}
              >
                Save Configuration
              </Button>
              <Button
                variant="outlined"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        /* View Mode */
        <Grid container spacing={3}>
          {/* App Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Application Info
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Name:</Typography>
                    <Typography variant="body2">{config.appName}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Version:</Typography>
                    <Typography variant="body2">{config.appVersion}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Environment:</Typography>
                    <Chip 
                      label={config.environment} 
                      size="small"
                      color={getEnvironmentColor(getEnvironmentShortName(config.environment))}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Feature Flags */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Feature Flags
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Notifications:</Typography>
                    <Chip 
                      label={config.features.notifications?.enabled ? 'ON' : 'OFF'} 
                      size="small"
                      color={config.features.notifications?.enabled ? 'success' : 'default'}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Analytics:</Typography>
                    <Chip 
                      label={config.features.analytics?.enabled ? 'ON' : 'OFF'} 
                      size="small"
                      color={config.features.analytics?.enabled ? 'success' : 'default'}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Debug Mode:</Typography>
                    <Chip 
                      label={config.features.debug?.enabled ? 'ON' : 'OFF'} 
                      size="small"
                      color={config.features.debug?.enabled ? 'warning' : 'default'}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Auto Save:</Typography>
                    <Chip 
                      label={config.features.autoSave?.enabled ? 'ON' : 'OFF'} 
                      size="small"
                      color={config.features.autoSave?.enabled ? 'success' : 'default'}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Environment Configurations */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Environment Configurations
                </Typography>
                {Object.entries(config.environments).map(([envName, envConfig]) => (
                  <Accordion key={envName} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="subtitle1">{envConfig.name}</Typography>
                        <Chip 
                          label={envName} 
                          size="small" 
                          variant="outlined"
                          color={getEnvironmentColor(envName)}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary">backend-api (Backend)</Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {teamConfigLoader.getServiceEnvironmentUrl('backend-api', envName)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary">GraphQL API</Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {teamConfigLoader.getServiceEnvironmentUrl('graphql-api', envName)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary">Gateway</Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {teamConfigLoader.getServiceEnvironmentUrl('api-gateway', envName)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary">Web App (Frontend)</Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {teamConfigLoader.getServiceEnvironmentUrl('web-app', envName)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary">Template Service</Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {teamConfigLoader.getServiceEnvironmentUrl('template-service', envName)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* External Services */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  External Services
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {config.gitlab.name || 'GitLab'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                        {config.getGitlabUrl()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Project ID: {config.gitlab.projectId}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {config.teamspace.name || 'Teamspace'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {config.getTeamspaceUrl()}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ConfigurationSettings; 