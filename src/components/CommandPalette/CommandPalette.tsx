import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Paper,
  Stack,
  List,
  ListItemButton,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  ListItem,
  ListItemSecondaryAction,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  PlayArrow,
  Refresh,
  SmartToy,
  Settings,
  Add,
  Delete,
} from '@mui/icons-material';
import { useCommandPalette } from '../../hooks/command-palette/useCommandPalette';
import InteractiveTerminal from '../shared/InteractiveTerminal';
import TemplatesPanel from './TemplatesPanel';
import { AutocompleteOption } from './types';

const CommandPalette: React.FC = () => {
  const {
    config,
    input,
    setInput,
    options,
    loading,
    error,
    activeBinary,
    cacheStatus,
    introspectLog,
    confirmIntrospect,
    actions,
  } = useCommandPalette();

  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newBinary, setNewBinary] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => { setHighlightIndex(-1); }, [options]);

  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[highlightIndex] as HTMLElement;
    if (item) item.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  const commitOption = useCallback((option: AutocompleteOption) => {
    setInput(option.path.join(' ') + ' ');
    setHighlightIndex(-1);
    inputRef.current?.focus();
  }, [setInput]);

  const handleExecute = useCallback(() => {
    const cmd = input.trim();
    if (!cmd) return;
    setPendingCommand(cmd);
  }, [input]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, -1));
    } else if (e.key === ' ' && highlightIndex >= 0 && options[highlightIndex]) {
      e.preventDefault();
      commitOption(options[highlightIndex]);
    } else if (e.key === 'Tab' && options.length > 0) {
      e.preventDefault();
      const idx = highlightIndex >= 0 ? highlightIndex : 0;
      commitOption(options[idx]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && options[highlightIndex]) {
        commitOption(options[highlightIndex]);
      } else {
        handleExecute();
      }
    } else if (e.key === 'Escape') {
      setHighlightIndex(-1);
    }
  }, [options, highlightIndex, commitOption, handleExecute]);

  const consumePendingCommand = useCallback(() => {
    const cmd = pendingCommand;
    setPendingCommand(null);
    return cmd;
  }, [pendingCommand]);

  const previewText = highlightIndex >= 0 && options[highlightIndex]
    ? options[highlightIndex].path.join(' ')
    : null;

  if (!config) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">Loading command palette...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Main content: left-right split */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', p: 2, gap: 2 }}>
        {/* Left panel: input + suggestions + templates */}
        <Box sx={{ flex: '0 0 35%', minWidth: 260, maxWidth: 400, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header with settings */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">Command Palette</Typography>
            <Tooltip title="Registered commands">
              <IconButton size="small" onClick={() => setSettingsOpen(true)}>
                <Settings fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Input row */}
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
            <TextField
              fullWidth size="small"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              inputRef={inputRef}
              placeholder="Type a command..."
              autoComplete="off"
              sx={{ '& input': { fontFamily: 'monospace', fontSize: 13 } }}
            />
            <Tooltip title="Run">
              <IconButton color="primary" size="small" onClick={handleExecute} disabled={!input.trim()}>
                <PlayArrow fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={activeBinary ? `Re-introspect ${activeBinary}` : 'Type a registered command'}>
              <span>
                <IconButton size="small" onClick={() => activeBinary && actions.introspect(activeBinary)} disabled={loading || !activeBinary}>
                  {loading ? <CircularProgress size={16} /> : <Refresh fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="AI introspect prompt">
              <IconButton size="small" onClick={() => activeBinary && actions.copyAIPrompt(activeBinary)} disabled={!activeBinary}>
                <SmartToy fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
            ↑↓ navigate · Space/Tab select · Enter run
          </Typography>

          {/* Preview */}
          {previewText && (
            <Typography variant="body2" fontFamily="monospace" sx={{ mb: 0.5, px: 1, py: 0.25, bgcolor: 'action.hover', borderRadius: 0.5, fontSize: 12 }}>
              → {previewText}
            </Typography>
          )}

          {/* Scrollable area: suggestions + progress + templates */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {/* Suggestions */}
            {options.length > 0 && (
              <Paper variant="outlined" sx={{ mb: 1 }}>
                <List dense disablePadding ref={listRef}>
                  {options.map((opt, idx) => (
                    <ListItemButton
                      key={opt.path.join('.')}
                      selected={idx === highlightIndex}
                      onClick={() => commitOption(opt)}
                      sx={{ py: 0.25 }}
                    >
                      <ListItemText
                        primary={<Typography variant="body2" fontFamily="monospace" fontWeight="bold" fontSize={12}>{opt.label}</Typography>}
                        secondary={opt.description || undefined}
                        secondaryTypographyProps={{ fontSize: 11 }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Paper>
            )}

            {/* Introspection progress */}
            {introspectLog.length > 0 && (() => {
              const lastProgress = [...introspectLog].reverse().find(l => /^\[\d+\/\d+\]/.test(l));
              const match = lastProgress?.match(/^\[(\d+)\/(\d+)\]/);
              const percent = match ? (parseInt(match[1]) / parseInt(match[2])) * 100 : 0;
              return (
                <Paper variant="outlined" sx={{ mb: 1, overflow: 'hidden', position: 'relative' }}>
                  {loading && <LinearProgress variant="determinate" value={percent} sx={{ height: 2 }} />}
                  <Box sx={{ p: 0.75, maxHeight: 80, overflow: 'auto', fontSize: 10 }}
                    ref={(el: HTMLDivElement | null) => { if (el) el.scrollTop = el.scrollHeight; }}
                  >
                    <IconButton size="small" onClick={() => actions.clearLog?.()} sx={{ position: 'sticky', top: 0, float: 'right', p: 0 }}>
                      <Typography variant="caption" fontSize={10}>✕</Typography>
                    </IconButton>
                    {introspectLog.map((line, i) => (
                      <Typography key={i} variant="caption" display="block" fontFamily="monospace" sx={{ lineHeight: 1.3, fontSize: 10 }}>
                        {line}
                      </Typography>
                    ))}
                  </Box>
                </Paper>
              );
            })()}

            {/* Status */}
            {error && <Typography color="error" variant="caption" sx={{ mb: 0.5, display: 'block' }}>{error}</Typography>}
            {cacheStatus && <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>{cacheStatus}</Typography>}

            {/* Templates */}
            <TemplatesPanel
              templates={config.templates || []}
              currentInput={input}
              onRun={(cmd) => { setInput(cmd); setPendingCommand(cmd); }}
              onSaveVersion={(templateId, version) => actions.saveTemplateVersion(templateId, version)}
              onDeleteVersion={(templateId, versionName) => actions.deleteTemplateVersion(templateId, versionName)}
              onCreateTemplate={(name, command) => actions.createTemplate(name, command)}
              onDeleteTemplate={(templateId) => actions.deleteTemplate(templateId)}
            />
          </Box>
        </Box>

        {/* Right panel: terminal */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <InteractiveTerminal
            serviceId="command-palette"
            serviceName="Command Palette"
            visible={true}
            pendingCommand={pendingCommand}
            consumePendingCommand={consumePendingCommand}
            keepAlive={true}
          />
        </Box>
      </Box>

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Registered Commands</DialogTitle>
        <DialogContent>
          <List dense>
            {config.commands?.map((cmd) => (
              <ListItem key={cmd.binary} disablePadding>
                <ListItemText primary={cmd.binary} primaryTypographyProps={{ fontFamily: 'monospace' }} />
                <ListItemSecondaryAction>
                  <IconButton edge="end" size="small" onClick={() => actions.removeCommand(cmd.binary)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <TextField
              size="small" fullWidth placeholder="Binary name (e.g. kubectl)"
              value={newBinary} onChange={(e) => setNewBinary(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newBinary.trim()) { actions.addCommand(newBinary.trim()); setNewBinary(''); } }}
            />
            <Button variant="outlined" startIcon={<Add />} onClick={() => { if (newBinary.trim()) { actions.addCommand(newBinary.trim()); setNewBinary(''); } }} disabled={!newBinary.trim()}>
              Add
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm re-introspect dialog */}
      <Dialog open={!!confirmIntrospect} onClose={actions.dismissConfirm} maxWidth="xs">
        <DialogTitle>Re-introspect?</DialogTitle>
        <DialogContent>
          <Typography>
            Cache for {confirmIntrospect} is up to date. Re-introspect anyway?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={actions.dismissConfirm}>Cancel</Button>
          <Button variant="contained" onClick={() => confirmIntrospect && actions.doIntrospect(confirmIntrospect)}>
            Re-introspect
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommandPalette;
