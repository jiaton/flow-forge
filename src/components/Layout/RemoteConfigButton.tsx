import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  Divider,
} from '@mui/material';
import { CloudOff, CloudDone } from '@mui/icons-material';

type SyncState = 'unconfigured' | 'ready' | 'updateDue' | 'syncing' | 'error';

const RemoteConfigButton: React.FC = () => {
  const [state, setState] = useState<SyncState>('unconfigured');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.remoteConfigStatus();
    if (!result.configured && !result.hasConfig) {
      setState('unconfigured');
      setDialogOpen(true);
    } else if (!result.configured) {
      // Has config (from templates) but no remote — just show the icon
      setState('ready');
    } else if (result.updateDue) {
      setState('updateDue');
    } else {
      setState('ready');
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleClone = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    const result = await window.electronAPI.remoteConfigClone(url.trim(), branch || undefined);
    if (result.success) {
      window.electronAPI.reloadConfig();
      setState('ready');
      setDialogOpen(false);
    } else {
      setError(result.error || 'Clone failed');
    }
    setLoading(false);
  };

  const handleTryExamples = async () => {
    setLoading(true);
    setError('');
    const result = await window.electronAPI.remoteConfigApplyTemplates();
    if (result.success) {
      window.electronAPI.reloadConfig();
      setState('ready');
      setDialogOpen(false);
    } else {
      setError(result.error || 'Failed to apply templates');
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setState('syncing');
    const result = await window.electronAPI.remoteConfigRefresh();
    if (result.success) {
      if (!result.upToDate) {
        window.electronAPI.reloadConfig();
      }
      setState('ready');
    } else if (result.needsManualResolve) {
      setState('error');
      setError('Conflict or error — open the repo in your IDE to resolve.');
    } else {
      setState('error');
      setError(result.error || 'Refresh failed');
    }
  };

  const handleClick = () => {
    if (state === 'unconfigured' || state === 'error') {
      setDialogOpen(true);
    } else {
      handleRefresh();
    }
  };

  const getIcon = () => {
    if (state === 'syncing') return <CircularProgress size={20} color="inherit" />;
    if (state === 'unconfigured' || state === 'error') return <CloudOff />;
    return <CloudDone />;
  };

  const getTooltip = () => {
    switch (state) {
      case 'unconfigured': return 'Set up config source';
      case 'ready': return 'Config synced — click to refresh';
      case 'updateDue': return 'Update available — click to sync';
      case 'syncing': return 'Syncing...';
      case 'error': return 'Sync error — click for details';
    }
  };

  return (
    <>
      <Tooltip title={getTooltip()}>
        <IconButton onClick={handleClick} color="inherit">
          <Badge variant="dot" color="warning" invisible={state !== 'updateDue'}>
            {getIcon()}
          </Badge>
        </IconButton>
      </Tooltip>

      <Dialog open={dialogOpen} onClose={() => !loading && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configure FlowForge</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Load config from a team git repo, or try with built-in examples.
            </Typography>
            <TextField
              label="Git URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="git@github.com:my-org/flowforge-configs.git"
              fullWidth
              disabled={loading}
            />
            <TextField
              label="Branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              size="small"
              sx={{ maxWidth: 200 }}
              disabled={loading}
            />
            <Button onClick={handleClone} variant="contained" disabled={loading || !url.trim()}>
              {loading ? 'Cloning...' : 'Clone & Apply'}
            </Button>

            <Divider sx={{ my: 1 }}>or</Divider>

            <Button onClick={handleTryExamples} variant="outlined" disabled={loading}>
              Try with example config
            </Button>

            {error && <Typography color="error" variant="body2">{error}</Typography>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RemoteConfigButton;
