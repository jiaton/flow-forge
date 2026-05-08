import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ExpandMore, Refresh, FolderOpen } from '@mui/icons-material';
interface ServiceConfigDialogProps {
  open: boolean;
  onClose: () => void;
  serviceCommands: Record<string, unknown>;
  onReloadConfig: () => Promise<{ success: boolean; message?: string; error?: string; }>;
}

const ServiceConfigDialog: React.FC<ServiceConfigDialogProps> = ({
  open,
  onClose,
  serviceCommands,
  onReloadConfig,
}) => {
  const [isReloading, setIsReloading] = useState(false);
  const [reloadStatus, setReloadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleReloadConfig = async () => {
    setIsReloading(true);
    setReloadStatus(null);
    
    try {
      const result = await onReloadConfig();
      if (result.success) {
        setReloadStatus({ type: 'success', message: result.message || 'Service commands reloaded successfully!' });
        // Auto-close after success
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setReloadStatus({ type: 'error', message: result.error || 'Failed to reload service commands' });
      }
    } catch (error) {
      setReloadStatus({ type: 'error', message: error instanceof Error ? error.message : 'Failed to reload config' });
    } finally {
      setIsReloading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Service Commands Configuration
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Configure the commands used to start, stop, and check the status of each service.
        </Typography>
        
        {reloadStatus && (
          <Alert severity={reloadStatus.type} sx={{ mb: 2 }}>
            {reloadStatus.message}
          </Alert>
        )}
        
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">Current Configuration</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ 
              backgroundColor: '#f5f5f5', 
              p: 2, 
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              maxHeight: 400,
              overflow: 'auto'
            }}>
              {Object.entries(serviceCommands).map(([serviceId, commands]) => (
                <Box key={serviceId} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                    {serviceId}:
                  </Typography>
                  {Object.entries(commands).map(([commandType, command]) => (
                    <Box key={commandType} sx={{ ml: 2, mb: 1 }}>
                      <Typography component="span" sx={{ color: '#d32f2f' }}>
                        {commandType}:
                      </Typography>
                      <Typography component="span" sx={{ ml: 1 }}>
                        {typeof command === 'object' && command !== null
                          ? JSON.stringify(command, null, 2)
                          : `"${String(command)}"`}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          To modify these commands, edit the files under <code>config/services/</code> and restart the application.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => window.electronAPI?.openConfigFolder()}
          startIcon={<FolderOpen />}
        >
          Open Config Folder
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} disabled={isReloading}>
          Close
        </Button>
        <Button 
          onClick={handleReloadConfig}
          variant="contained"
          disabled={isReloading}
          startIcon={isReloading ? <CircularProgress size={16} /> : <Refresh />}
        >
          {isReloading ? 'Reloading...' : 'Reload Config'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ServiceConfigDialog;
