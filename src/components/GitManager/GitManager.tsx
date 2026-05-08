import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  LinearProgress,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
} from '@mui/material';
import { Add, Refresh, Settings, Edit, Delete } from '@mui/icons-material';
import { glassEffect, processColors } from '../../theme/theme';
import { useGitManager } from './useGitManager';
import GitTableRow from './GitTableRow';
import GitSettingsDialog from './GitSettingsDialog';
import TrackMRDialog from './TrackMRDialog';
import { EditMRDialog } from './EditMRDialog.tsx';

const GitManager: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const {
    mergeRequests,
    settings,
    loading,
    error,
    refreshing,
    availableServices,
    settingsDialogOpen,
    trackDialogOpen,
    editDialogOpen,
    selectedMR,
    anchorEl,
    menuMR,
    setSettingsDialogOpen,
    setTrackDialogOpen,
    handleRefreshAll,
    handleTrackMR,
    handleDeleteMR,
    handleEditMR,
    handleUpdateMR,
    handleMenuOpen,
    handleMenuClose,
    saveSettings,
    validateToken,
  } = useGitManager();

  if (!settings?.accessToken) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          GitLab is not configured. Please configure your GitLab settings to start tracking merge requests.
        </Alert>
        <Button
          variant="contained"
          startIcon={<Settings />}
          onClick={() => setSettingsDialogOpen(true)}
        >
          Configure GitLab
        </Button>
        <GitSettingsDialog
          open={settingsDialogOpen}
          onClose={() => setSettingsDialogOpen(false)}
          settings={settings}
          onSave={saveSettings}
          onValidateToken={validateToken}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" className="gradient-text" sx={{ fontWeight: 700 }}>
              MR Manager
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track GitLab merge requests, pipeline status, and comments
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<Settings />}
              variant="outlined"
              onClick={() => setSettingsDialogOpen(true)}
              className="btn-enhanced"
            >
              Settings
            </Button>
            <Button
              startIcon={<Refresh />}
              variant="outlined"
              onClick={() => handleRefreshAll(false)}
              disabled={refreshing || loading}
              className="btn-enhanced"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              startIcon={<Add />}
              variant="contained"
              onClick={() => setTrackDialogOpen(true)}
              className="btn-enhanced glow"
            >
              Track MR
            </Button>
          </Box>
        </Box>
        {(refreshing || loading) && <LinearProgress sx={{ mt: 1 }} />}
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {mergeRequests.length === 0 ? (
          <Alert severity="info">
            No merge requests tracked yet. Click "Track MR" to start tracking.
          </Alert>
        ) : (
          <TableContainer 
            component={Paper} 
            className="glass-effect" 
            sx={{
              ...glassEffect(isDarkMode),
              background: processColors.primary.gradient,
              border: `1px solid ${processColors.primary.border}`,
              borderRadius: 2,
            }}
          >
            <Table>
              <TableHead sx={{ background: processColors.primary.gradient }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Service</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Branch</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Pipeline</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Approvals</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Comments</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Updated</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mergeRequests.map((mr) => (
                  <GitTableRow key={mr.id} mr={mr} onMenuOpen={handleMenuOpen} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleEditMR(menuMR)}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
          <ListItemText>Edit Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDeleteMR(menuMR)}>
          <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Remove</ListItemText>
        </MenuItem>
      </Menu>

      <GitSettingsDialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        settings={settings}
        onSave={saveSettings}
        onValidateToken={validateToken}
      />

      <TrackMRDialog
        open={trackDialogOpen}
        onClose={() => setTrackDialogOpen(false)}
        onTrack={handleTrackMR}
        availableServices={availableServices}
      />

      <EditMRDialog
        open={editDialogOpen}
        onClose={() => handleEditMR(null)}
        mergeRequest={selectedMR}
        onUpdate={handleUpdateMR}
        availableServices={availableServices}
      />
    </Box>
  );
};

export default GitManager;
