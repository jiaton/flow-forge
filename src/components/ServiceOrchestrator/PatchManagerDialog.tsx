/**
 * PatchManagerDialog - Manage git patches for a service
 *
 * Sections: Team Patches, My Patches
 * Views: List, Create, View patch content
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Button, Typography, Box,
  Chip, Divider, Stack, TextField, Checkbox, FormControlLabel, Tab, Tabs,
  Alert, Tooltip, CircularProgress,
} from '@mui/material';
import {
  Close, Add, Visibility, Delete, PlayArrow, Stop,
  VisibilityOff, ContentPaste, FolderOpen, Refresh,
} from '@mui/icons-material';
import { usePatchManager, PatchInfo } from '../../hooks/service-orchestrator/usePatchManager';
import { teamConfigLoader } from '../../lib/loaders/team-config';

interface PatchManagerDialogProps {
  open: boolean;
  onClose: () => void;
  serviceId: string;
}

type View = 'list' | 'create' | 'view';

const PatchManagerDialog: React.FC<PatchManagerDialogProps> = ({ open, onClose, serviceId }) => {
  const {
    patches, modifiedFiles, loading, error, servicePath,
    loadModifiedFiles, createPatch, applyPatch, unapplyPatch,
    deletePatch, toggleSkipWorktree, readPatchContent, refresh,
  } = usePatchManager(serviceId);

  const [view, setView] = useState<View>('list');
  const [viewContent, setViewContent] = useState('');
  const [viewPatchName, setViewPatchName] = useState('');

  // Create form state
  const [createTab, setCreateTab] = useState(0); // 0=files, 1=paste
  const [patchName, setPatchName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [conflictPatch, setConflictPatch] = useState<PatchInfo | null>(null);
  const [pasteContent, setPasteContent] = useState('');
  const [validationError, setValidationError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const handleOpenCreate = async () => {
    setView('create');
    setPatchName('');
    setSelectedFiles(new Set());
    setPasteContent('');
    setValidationError('');
    await loadModifiedFiles();
  };

  const handleCreate = async () => {
    if (!patchName.trim()) { setValidationError('Name is required'); return; }
    setActionLoading('create');
    let result;
    if (createTab === 0) {
      const files = selectedFiles.size > 0 ? Array.from(selectedFiles) : undefined;
      result = await createPatch(patchName.trim(), files);
    } else {
      // Validate pasted content first
      const validation = await window.electronAPI.patches.validate(pasteContent);
      if (!validation.valid) { setValidationError(validation.error || 'Invalid patch'); setActionLoading(null); return; }
      result = await createPatch(patchName.trim(), undefined, pasteContent);
    }
    setActionLoading(null);
    if (result.success) setView('list');
    else setValidationError(result.error || 'Failed to create patch');
  };

  const handleView = async (patch: PatchInfo) => {
    const content = await readPatchContent(patch);
    setViewContent(content);
    setViewPatchName(patch.name);
    setView('view');
  };

  const handleOpenInIDE = (patch: PatchInfo) => {
    const ideCmd = teamConfigLoader.getOpenIDECommand(serviceId);
    if (ideCmd) {
      // Open service repo root (for .rej conflict resolution), fall back to patch file
      const target = servicePath || patch.path;
      window.electronAPI.executeCommand(`${ideCmd} ${target}`);
    }
  };

  const handleApplyToggle = async (patch: PatchInfo) => {
    setActionLoading(patch.name);
    setValidationError('');
    setConflictPatch(null);
    const result = patch.active ? await unapplyPatch(patch) : await applyPatch(patch);
    if (!result.success) {
      setValidationError(`Failed to ${patch.active ? 'unapply' : 'apply'} "${patch.name}": ${result.error}`);
      if (!patch.active) setConflictPatch(patch); // offer conflict resolution on apply failure
    }
    setActionLoading(null);
  };

  const handleApplyWithReject = async (patch: PatchInfo) => {
    if (!servicePath) return;
    setActionLoading(patch.name);
    setValidationError('');
    setConflictPatch(null);
    const result = await window.electronAPI.patches.applyWithReject(servicePath, patch.path);
    if (result.partial && result.rejFiles?.length) {
      setValidationError(`Applied with conflicts. Resolve these .rej files:\n${result.rejFiles.join('\n')}`);
    }
    // IDEA supports `idea patch <file>` for a native Apply Patch dialog with merge UI.
    // Other IDEs don't have an equivalent — just open the repo root so user can find .rej files.
    const ideCmd = teamConfigLoader.getOpenIDECommand(serviceId);
    if (ideCmd) {
      const openCmd = /\bidea\b/i.test(ideCmd)
        ? `idea patch '${patch.path}'`
        : `${ideCmd.replace(/\s+\S+$/, '')} '${servicePath}'`;
      window.electronAPI.executeCommand(openCmd);
    }
    setActionLoading(null);
  };

  const handleReapply = async (patch: PatchInfo) => {
    setActionLoading(patch.name);
    setValidationError('');
    const unapplyResult = await unapplyPatch(patch);
    if (!unapplyResult.success) {
      setValidationError(`Failed to unapply before reapply: ${unapplyResult.error}`);
      setActionLoading(null);
      return;
    }
    const applyResult = await applyPatch({ ...patch, active: false });
    if (!applyResult.success) {
      setValidationError(`Unapplied but failed to reapply: ${applyResult.error}`);
    }
    setActionLoading(null);
  };

  const handleDelete = async (patch: PatchInfo) => {
    if (patch.active) await unapplyPatch(patch);
    await deletePatch(patch);
  };

  const teamPatches = patches.filter(p => p.source === 'team');
  const personalPatches = patches.filter(p => p.source === 'personal');

  // --- RENDER ---

  if (view === 'create') {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          Create Patch
          <IconButton onClick={() => setView('list')} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <TextField
            label="Patch name"
            value={patchName}
            onChange={e => { setPatchName(e.target.value); setValidationError(''); }}
            fullWidth size="small" sx={{ mb: 2 }}
            placeholder="e.g. local-db-config"
          />
          <Tabs value={createTab} onChange={(_, v) => setCreateTab(v)} sx={{ mb: 2 }}>
            <Tab icon={<FolderOpen />} iconPosition="start" label="From working changes" sx={{ textTransform: 'none' }} />
            <Tab icon={<ContentPaste />} iconPosition="start" label="Paste patch" sx={{ textTransform: 'none' }} />
          </Tabs>

          {createTab === 0 && (
            <Box>
              {modifiedFiles.length === 0 ? (
                <Typography color="text.secondary" variant="body2">No modified files found in this repo.</Typography>
              ) : (
                <Box sx={{ maxHeight: 250, overflow: 'auto' }}>
                  {modifiedFiles.map(f => (
                    <FormControlLabel
                      key={f}
                      control={
                        <Checkbox
                          size="small"
                          checked={selectedFiles.has(f)}
                          onChange={() => {
                            const next = new Set(selectedFiles);
                            if (next.has(f)) next.delete(f); else next.add(f);
                            setSelectedFiles(next);
                          }}
                        />
                      }
                      label={<Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{f}</Typography>}
                    />
                  ))}
                </Box>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Leave all unchecked to include all changes.
              </Typography>
            </Box>
          )}

          {createTab === 1 && (
            <TextField
              multiline rows={8} fullWidth
              placeholder="Paste unified diff content here..."
              value={pasteContent}
              onChange={e => { setPasteContent(e.target.value); setValidationError(''); }}
              sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
            />
          )}

          {validationError && <Alert severity="error" sx={{ mt: 2 }}>{validationError}</Alert>}

          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 2 }}>
            <Button onClick={() => setView('list')}>Cancel</Button>
            <Button
              variant="contained" onClick={handleCreate}
              disabled={!!actionLoading || (createTab === 0 && modifiedFiles.length === 0) || (createTab === 1 && !pasteContent.trim())}
            >
              {actionLoading === 'create' ? <CircularProgress size={16} /> : 'Save Patch'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    );
  }

  if (view === 'view') {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          {viewPatchName}
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => {
              const patch = patches.find(p => p.name === viewPatchName);
              if (patch) handleOpenInIDE(patch);
            }}>Open in IDE</Button>
            <IconButton onClick={() => setView('list')} size="small"><Close /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box
            component="pre"
            sx={{
              m: 0, p: 2, overflow: 'auto', maxHeight: 500,
              fontSize: '0.75rem', fontFamily: 'monospace', lineHeight: 1.5,
              '& .diff-add': { color: 'success.main', backgroundColor: 'action.hover' },
              '& .diff-del': { color: 'error.main', backgroundColor: 'action.hover' },
              '& .diff-hunk': { color: 'info.main' },
            }}
          >
            {viewContent.split('\n').map((line, i) => {
              let cls = '';
              if (line.startsWith('+') && !line.startsWith('+++')) cls = 'diff-add';
              else if (line.startsWith('-') && !line.startsWith('---')) cls = 'diff-del';
              else if (line.startsWith('@@')) cls = 'diff-hunk';
              return <div key={i} className={cls}>{line}</div>;
            })}
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  // Default: list view
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        Patch Manager
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" startIcon={<Add />} onClick={handleOpenCreate}>Create</Button>
          <IconButton onClick={onClose} size="small"><Close /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {validationError && (
          <Alert severity="error" sx={{ m: 1 }} onClose={() => { setValidationError(''); setConflictPatch(null); }}
            action={conflictPatch && (
              <Button size="small" color="inherit" onClick={() => handleApplyWithReject(conflictPatch)}>
                Apply with conflicts
              </Button>
            )}
          >
            <Box sx={{ whiteSpace: 'pre-wrap' }}>{validationError}</Box>
          </Alert>
        )}
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={24} /></Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        ) : patches.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            No patches yet. Create one or define team patches in service config.
          </Typography>
        ) : (
          <Stack divider={<Divider />}>
            {teamPatches.length > 0 && (
              <>
                <Typography variant="overline" sx={{ px: 2, pt: 1, color: 'text.secondary' }}>Team Patches</Typography>
                {teamPatches.map(p => <PatchRow key={p.name} patch={p} onApplyToggle={handleApplyToggle} onReapply={handleReapply} onView={handleView} onDelete={handleDelete} onToggleSkipWorktree={toggleSkipWorktree} actionLoading={actionLoading} />)}
              </>
            )}
            {personalPatches.length > 0 && (
              <>
                <Typography variant="overline" sx={{ px: 2, pt: 1, color: 'text.secondary' }}>My Patches</Typography>
                {personalPatches.map(p => <PatchRow key={p.name} patch={p} onApplyToggle={handleApplyToggle} onReapply={handleReapply} onView={handleView} onDelete={handleDelete} onToggleSkipWorktree={toggleSkipWorktree} actionLoading={actionLoading} />)}
              </>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};

// --- Patch Row Component ---

interface PatchRowProps {
  patch: PatchInfo;
  onApplyToggle: (p: PatchInfo) => void;
  onReapply: (p: PatchInfo) => void;
  onView: (p: PatchInfo) => void;
  onDelete: (p: PatchInfo) => void;
  onToggleSkipWorktree: (p: PatchInfo) => void;
  actionLoading: string | null;
}

const PatchRow: React.FC<PatchRowProps> = ({ patch, onApplyToggle, onReapply, onView, onDelete, onToggleSkipWorktree, actionLoading }) => (
  <Box sx={{ px: 2, py: 1.5 }}>
    <Stack direction="row" alignItems="center" spacing={1}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography variant="subtitle2" noWrap>{patch.name}</Typography>
          {patch.active && <Chip label="Active" size="small" color="success" sx={{ height: 18, fontSize: '0.65rem' }} />}
          {patch.skipWorktree && (
            <Tooltip title="Hidden from git status"><VisibilityOff sx={{ fontSize: 14, color: 'text.secondary' }} /></Tooltip>
          )}
        </Stack>
        {patch.description && <Typography variant="caption" color="text.secondary" noWrap>{patch.description}</Typography>}
      </Box>
      <Stack direction="row" spacing={0.5}>
        <Tooltip title={patch.active ? 'Unapply' : 'Apply'}>
          <IconButton size="small" onClick={() => onApplyToggle(patch)} disabled={actionLoading === patch.name}>
            {actionLoading === patch.name ? <CircularProgress size={14} /> : patch.active ? <Stop fontSize="small" /> : <PlayArrow fontSize="small" />}
          </IconButton>
        </Tooltip>
        {patch.active && (
          <Tooltip title="Reapply (unapply then apply again)">
            <IconButton size="small" onClick={() => onReapply(patch)} disabled={actionLoading === patch.name}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="View diff">
          <IconButton size="small" onClick={() => onView(patch)}><Visibility fontSize="small" /></IconButton>
        </Tooltip>
        {patch.active && (
          <Tooltip title={patch.skipWorktree ? 'Show in git status' : 'Hide from git status'}>
            <IconButton size="small" onClick={() => onToggleSkipWorktree(patch)}>
              {patch.skipWorktree ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
        {patch.source === 'personal' && (
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => onDelete(patch)} color="error"><Delete fontSize="small" /></IconButton>
          </Tooltip>
        )}
      </Stack>
    </Stack>
  </Box>
);

export default PatchManagerDialog;
