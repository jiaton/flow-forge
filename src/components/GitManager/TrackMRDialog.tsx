import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';

interface TrackMRDialogProps {
  open: boolean;
  onClose: () => void;
  onTrack: (mrUrl: string, serviceName?: string) => Promise<{ success: boolean; error?: string }>;
  availableServices: string[];
  defaultService?: string;
}

const TrackMRDialog: React.FC<TrackMRDialogProps> = ({
  open,
  onClose,
  onTrack,
  availableServices,
  defaultService,
}) => {
  const [mrUrl, setMrUrl] = useState('');
  const [serviceName, setServiceName] = useState(defaultService || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMrUrl('');
      setServiceName(defaultService || '');
      setError(null);
    }
  }, [open, defaultService]);

  const handleTrack = async () => {
    if (!mrUrl.trim()) {
      setError('Please enter a GitLab MR URL');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await onTrack(mrUrl.trim(), serviceName || undefined);
    setLoading(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to track merge request');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Track New Merge Request</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="GitLab MR URL"
            fullWidth
            value={mrUrl}
            onChange={(e) => setMrUrl(e.target.value)}
            placeholder="https://gitlab.example.com/project/-/merge_requests/123"
            helperText="Paste the GitLab merge request URL to automatically fetch details"
            autoFocus
          />

          <FormControl fullWidth>
            <InputLabel>Service (Optional)</InputLabel>
            <Select
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              label="Service (Optional)"
            >
              <MenuItem value="">
                <em>Auto-detect</em>
              </MenuItem>
              {availableServices.map((service) => (
                <MenuItem key={service} value={service}>
                  {service}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Alert severity="info">
            The service will be auto-detected from the GitLab URL path or branch name if not specified.
            <br />
            Example: <code>https://gitlab.example.com/team/project/service/-/merge_requests/123</code> → service
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleTrack}
          disabled={loading || !mrUrl.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? 'Tracking...' : 'Track MR'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TrackMRDialog;
