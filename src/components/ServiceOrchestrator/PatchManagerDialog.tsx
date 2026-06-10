/**
 * PatchManagerDialog - Manage file overrides for a service.
 *
 * Patches use 3-way merge on apply — safe across upstream branch updates.
 * Workflow: make local changes → Save Patch → pull upstream → Apply Patch.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Button, Typography, Box,
  Chip, Divider, Stack, TextField, Checkbox, FormControlLabel,
  Alert, Tooltip, CircularProgress, Tabs, Tab,
} from '@mui/material';
import { Close, Add, Delete, PlayArrow, Refresh, SettingsBackupRestore, ContentPaste } from '@mui/icons-material';
import { usePatchManager, PatchInfo } from '../../hooks/service-orchestrator/usePatchManager';
import { PATCH_SOURCE } from '../../shared/constants/patch';

interface PatchManagerDialogProps {
  open: boolean;
  onClose: () => void;
  serviceId: string;
}

type View = 'list' | 'create';

const PatchManagerDialog: React.FC<PatchManagerDialogProps> = ({ open, onClose, serviceId }) => {
  const {
    patches, modifiedFiles, loading, error, createPatch, applyPatch, resetToHead,
    deletePatch, loadModifiedFiles, refresh,
  } = usePatchManager(serviceId);

  const [view, setView] = useState<View>('list');
  const [createTab, setCreateTab] = useState(0);
  const [patchName, setPatchName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [pasteContent, setPasteContent] = useState('');
  const [parsedFiles, setParsedFiles] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [...prev.slice(-19), `${new Date().toLocaleTimeString()} ${msg}`]);

  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  const handleOpenCreate = async () => {
    setPatchName('');
    setSelectedFiles(new Set());
    setPasteContent('');
    setParsedFiles([]);
    setCreateTab(0);
    setActionError(null);
    setView('create');
    await loadModifiedFiles();
  };

  const handleCreate = async () => {
    if (!patchName.trim()) { setActionError('Name is required'); return; }
    setActionLoading('create');
    const isPaste = createTab === 1;
    const files = isPaste ? undefined : (selectedFiles.size > 0 ? Array.from(selectedFiles) : undefined);
    const content = isPaste ? pasteContent : undefined;
    addLog(`Saving patch "${patchName}"...`);
    const result = await createPatch(patchName.trim(), files, content);
    setActionLoading(null);
    if (result.success) {
      addLog(`✓ Patch "${patchName}" saved (${result.files?.length ?? 0} files)`);
      setView('list');
    } else {
      addLog(`✗ Save failed: ${result.error}`);
      setActionError(result.error || 'Failed to save patch');
    }
  };

  const handleApply = async (patch: PatchInfo) => {
    setActionLoading(patch.name);
    setActionError(null);
    addLog(`Applying "${patch.name}"...`);
    const result = await applyPatch(patch);
    if (!result.success) {
      addLog(`✗ Apply failed: ${result.error}`);
      setActionError(`"${patch.name}" failed: ${result.error}`);
    } else if (result.conflicts?.length) {
      addLog(`⚠ Applied with conflicts: ${result.conflicts.join(', ')} — open in IDE to resolve`);
      setActionError(`Conflicts in: ${result.conflicts.join(', ')} — open in IDE to resolve`);
    } else {
      addLog(`✓ "${patch.name}" applied`);
    }
    setActionLoading(null);
  };

  const handleDelete = async (patch: PatchInfo) => {
    setActionLoading(patch.name);
    addLog(`Deleting "${patch.name}"...`);
    await deletePatch(patch);
    addLog(`✓ "${patch.name}" deleted`);
    setActionLoading(null);
  };

  const handleResetToHead = async (patch: PatchInfo) => {
    setActionLoading(patch.name);
    setActionError(null);
    addLog(`Resetting "${patch.name}" files to HEAD...`);
    const result = await resetToHead(patch);
    if (!result.success) {
      addLog(`✗ Reset failed: ${result.error}`);
      setActionError(result.error);
    } else {
      addLog(`✓ "${patch.name}" files reset to HEAD`);
    }
    setActionLoading(null);
  };

  const teamPatches = patches.filter(p => p.source === PATCH_SOURCE.TEAM);
  const personalPatches = patches.filter(p => p.source === PATCH_SOURCE.PERSONAL);

  if (view === 'create') {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          Save Patch
          <IconButton onClick={() => setView('list')} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <TextField
            label="Patch name" value={patchName} onChange={e => setPatchName(e.target.value)}
            fullWidth size="small" sx={{ mb: 2 }} placeholder="e.g. local-db-config"
          />
          <Tabs value={createTab} onChange={(_, v) => { setCreateTab(v); setActionError(null); }} sx={{ mb: 2 }}>
            <Tab label="From working changes" sx={{ textTransform: 'none', fontSize: '0.8rem' }} />
            <Tab icon={<ContentPaste fontSize="small" />} iconPosition="start" label="Paste patch (IntelliJ)" sx={{ textTransform: 'none', fontSize: '0.8rem' }} />
          </Tabs>

          {createTab === 0 && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Select files to include (leave all unchecked = all changes):
              </Typography>
              {modifiedFiles.length === 0 ? (
                <Typography color="text.secondary" variant="body2">No modified files found.</Typography>
              ) : (
                <Box sx={{ maxHeight: 220, overflow: 'auto' }}>
                  {modifiedFiles.map(f => (
                    <FormControlLabel key={f}
                      control={
                        <Checkbox size="small" checked={selectedFiles.has(f)} onChange={() => {
                          const next = new Set(selectedFiles);
                          if (next.has(f)) next.delete(f); else next.add(f);
                          setSelectedFiles(next);
                        }} />
                      }
                      label={<Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{f}</Typography>}
                    />
                  ))}
                </Box>
              )}
            </>
          )}

          {createTab === 1 && (
            <>
              <TextField
                multiline rows={6} fullWidth size="small"
                placeholder={'Paste unified diff from IntelliJ "Copy as Patch"...\n\ndiff --git a/config/app.yaml b/config/app.yaml\n...'}
                value={pasteContent}
                onChange={e => {
                  setPasteContent(e.target.value);
                  setParsedFiles([...e.target.value.matchAll(/^\+\+\+ b\/(.+)$/gm)].map(m => m[1].trim()));
                  setActionError(null);
                }}
                sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
              />
              {parsedFiles.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Files detected ({parsedFiles.length}):
                  </Typography>
                  {parsedFiles.map(f => (
                    <Typography key={f} variant="caption" display="block" sx={{ fontFamily: 'monospace', ml: 1 }}>{f}</Typography>
                  ))}
                </Box>
              )}
            </>
          )}
          {actionError && <Alert severity="error" sx={{ mt: 2 }}>{actionError}</Alert>}
          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 2 }}>
            <Button onClick={() => setView('list')}>Cancel</Button>
            <Button variant="contained" onClick={handleCreate}
              disabled={!!actionLoading || (createTab === 1 && parsedFiles.length === 0)}>
              {actionLoading === 'create' ? <CircularProgress size={16} /> : 'Save'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        Patch Manager
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" startIcon={<Add />} onClick={handleOpenCreate}>New</Button>
          <IconButton onClick={onClose} size="small"><Close /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {actionError && (
          <Alert severity="warning" sx={{ m: 1 }} onClose={() => setActionError(null)}>
            <Box sx={{ whiteSpace: 'pre-wrap' }}>{actionError}</Box>
          </Alert>
        )}
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={24} /></Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        ) : patches.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            No patches. Create one to save local overrides.
          </Typography>
        ) : (
          <Stack divider={<Divider />}>
            {teamPatches.length > 0 && (
              <>
                <Typography variant="overline" sx={{ px: 2, pt: 1, color: 'text.secondary' }}>Team</Typography>
                {teamPatches.map(p => (
                  <PatchRow key={p.name} patch={p} onApply={handleApply} onResetToHead={handleResetToHead} onDelete={handleDelete} actionLoading={actionLoading} />
                ))}
              </>
            )}
            {personalPatches.length > 0 && (
              <>
                <Typography variant="overline" sx={{ px: 2, pt: 1, color: 'text.secondary' }}>Mine</Typography>
                {personalPatches.map(p => (
                  <PatchRow key={p.name} patch={p} onApply={handleApply} onResetToHead={handleResetToHead} onDelete={handleDelete} actionLoading={actionLoading} />
                ))}
              </>
            )}
          </Stack>
        )}
      </DialogContent>
      {log.length > 0 && (
        <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider', maxHeight: 100, overflow: 'auto', bgcolor: 'action.hover' }}>
          {log.map((entry, i) => (
            <Typography key={i} variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'text.secondary' }}>
              {entry}
            </Typography>
          ))}
        </Box>
      )}
    </Dialog>
  );
};

interface PatchRowProps {
  patch: PatchInfo;
  onApply: (p: PatchInfo) => void;
  onResetToHead: (p: PatchInfo) => void;
  onDelete: (p: PatchInfo) => void;
  actionLoading: string | null;
}

const PatchRow: React.FC<PatchRowProps> = ({ patch, onApply, onResetToHead, onDelete, actionLoading }) => (
  <Box sx={{ px: 2, py: 1.5 }}>
    <Stack direction="row" alignItems="center" spacing={1}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography variant="subtitle2" noWrap>{patch.name}</Typography>
          {patch.active && <Chip label="Applied" size="small" color="success" sx={{ height: 18, fontSize: '0.65rem' }} />}
        </Stack>
        {patch.description && <Typography variant="caption" color="text.secondary" noWrap>{patch.description}</Typography>}
        {patch.files.length > 0 && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {patch.files.slice(0, 3).join(', ')}{patch.files.length > 3 ? ` +${patch.files.length - 3} more` : ''}
          </Typography>
        )}
      </Box>
      <Stack direction="row" spacing={0.5}>
        <Tooltip title={patch.active ? 'Reapply' : 'Apply (3-way merge)'}>
          <IconButton size="small" onClick={() => onApply(patch)} disabled={actionLoading === patch.name}>
            {actionLoading === patch.name ? <CircularProgress size={14} /> : patch.active ? <Refresh fontSize="small" /> : <PlayArrow fontSize="small" />}
          </IconButton>
        </Tooltip>
        {patch.active && (
          <Tooltip title="Reset to HEAD (discard patch, restore upstream)">
            <IconButton size="small" onClick={() => onResetToHead(patch)} disabled={actionLoading === patch.name}>
              <SettingsBackupRestore fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {patch.source === PATCH_SOURCE.PERSONAL && (
          <Tooltip title="Delete patch">
            <IconButton size="small" onClick={() => onDelete(patch)} color="error" disabled={actionLoading === patch.name}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Stack>
  </Box>
);

export default PatchManagerDialog;
