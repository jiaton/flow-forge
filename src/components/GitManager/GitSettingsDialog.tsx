import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Visibility, VisibilityOff, CheckCircle, Error as ErrorIcon, Info } from '@mui/icons-material';
import { GitSettings } from '../../hooks/git-manager/useGit';

interface GitSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  settings: GitSettings | null;
  onSave: (settings: GitSettings) => Promise<{ success: boolean; error?: string }>;
  onValidateToken: () => Promise<{ success: boolean; valid: boolean; error?: string }>;
}

const GitSettingsDialog: React.FC<GitSettingsDialogProps> = ({
  open,
  onClose,
  settings,
  onSave,
  onValidateToken,
}) => {
  const [formData, setFormData] = useState<GitSettings>(() => ({
    gitUrl: settings?.gitUrl || 'https://gitlab.example.com',
    apiUrl: settings?.apiUrl || 'https://gitlab.example.com/api/v4',
    accessToken: settings?.accessToken || '',
    refreshInterval: settings?.refreshInterval || 300,
  }));

  const [showToken, setShowToken] = useState(false);
  const [validating, setValidating] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [serviceConfigs, setServiceConfigs] = useState<Record<string, unknown>>({});
  const [loadingConfigs, setLoadingConfigs] = useState(false);

  // Load service configs
  useEffect(() => {
    if (open) {
      loadServiceConfigs();
    }
  }, [open]);

  const loadServiceConfigs = async () => {
    setLoadingConfigs(true);
    try {
      const result = await window.electronAPI.gitlab.serviceConfig.getAll();
      if (result.success && result.configs) {
        setServiceConfigs(result.configs);
      }
    } catch (err) {
      console.error('Failed to load service configs:', err);
    } finally {
      setLoadingConfigs(false);
    }
  };

  const handleValidateToken = async () => {
    setValidating(true);
    setTokenValid(null);
    setError(null);

    // Save current settings temporarily to validate
    await onSave(formData);

    const result = await onValidateToken();
    setValidating(false);

    if (result.success) {
      setTokenValid(result.valid);
      if (!result.valid) {
        setError('Token is invalid or does not have sufficient permissions');
      }
    } else {
      setTokenValid(false);
      setError(result.error || 'Failed to validate token');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const result = await onSave(formData);
    setSaving(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to save settings');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>GitLab Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Alert severity="info">
            Configure your GitLab connection to track merge requests. You'll need a Personal Access Token with
            <code style={{ margin: '0 4px' }}>read_api</code> scope.
          </Alert>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="GitLab URL"
            fullWidth
            value={formData.gitUrl}
            onChange={(e) => setFormData({ ...formData, gitUrl: e.target.value })}
            helperText="Your GitLab instance URL (e.g., https://gitlab.example.com)"
          />

          <TextField
            label="API URL"
            fullWidth
            value={formData.apiUrl}
            onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
            helperText="GitLab API endpoint (usually {git_url}/api/v4)"
          />

          <TextField
            label="Personal Access Token"
            fullWidth
            type={showToken ? 'text' : 'password'}
            value={formData.accessToken}
            onChange={(e) => {
              setFormData({ ...formData, accessToken: e.target.value });
              setTokenValid(null);
            }}
            helperText="GitLab Personal Access Token with read_api scope"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowToken(!showToken)}
                    edge="end"
                  >
                    {showToken ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="outlined"
              onClick={handleValidateToken}
              disabled={!formData.accessToken || validating}
              startIcon={validating ? <CircularProgress size={16} /> : null}
            >
              {validating ? 'Validating...' : 'Validate Token'}
            </Button>
            {tokenValid === true && (
              <Chip
                icon={<CheckCircle />}
                label="Token Valid"
                color="success"
                size="small"
              />
            )}
            {tokenValid === false && (
              <Chip
                icon={<ErrorIcon />}
                label="Token Invalid"
                color="error"
                size="small"
              />
            )}
          </Box>

          <TextField
            label="Auto-refresh Interval (seconds)"
            fullWidth
            type="number"
            value={formData.refreshInterval}
            onChange={(e) => setFormData({ ...formData, refreshInterval: parseInt(e.target.value) || 300 })}
            helperText="How often to automatically refresh MR data (minimum 60 seconds)"
            inputProps={{ min: 60 }}
          />

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle2">
                Service-specific GitLab Configuration
              </Typography>
              <Info fontSize="small" color="action" />
            </Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Each service can have its own GitLab Project ID and default reviewers. 
              Configure these in <code>config/services/&lt;service&gt;.yaml</code>.
            </Alert>
            
            {loadingConfigs ? (
              <CircularProgress size={24} />
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Service</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Project ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Default Reviewers</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(serviceConfigs).map(([serviceName, config]) => (
                      <TableRow key={serviceName}>
                        <TableCell>
                          <Chip label={serviceName} size="small" />
                        </TableCell>
                        <TableCell>
                          {config.projectId ? (
                            <code>{config.projectId}</code>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              Not configured
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {config.defaultReviewers?.length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {config.defaultReviewers.slice(0, 3).map((reviewer: string) => (
                                <Chip key={reviewer} label={reviewer} size="small" variant="outlined" />
                              ))}
                              {config.defaultReviewers.length > 3 && (
                                <Chip label={`+${config.defaultReviewers.length - 3}`} size="small" variant="outlined" />
                              )}
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              Using global
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !formData.accessToken}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GitSettingsDialog;
