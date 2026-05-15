import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Stack,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Box,
  Divider,
} from '@mui/material';
import { Add, Delete, PlayArrow } from '@mui/icons-material';
import { CommandTemplate, TemplateVersion } from './types';

interface TemplateDialogProps {
  open: boolean;
  onClose: () => void;
  templates: CommandTemplate[];
  onRun: (command: string) => void;
  onSaveVersion: (templateId: string, version: TemplateVersion) => void;
  onDeleteVersion: (templateId: string, versionName: string) => void;
}

const TemplateDialog: React.FC<TemplateDialogProps> = ({
  open, onClose, templates, onRun, onSaveVersion, onDeleteVersion,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<CommandTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [savingAs, setSavingAs] = useState(false);
  const [versionName, setVersionName] = useState('');

  const selectTemplate = useCallback((tpl: CommandTemplate) => {
    setSelectedTemplate(tpl);
    // Initialize with defaults
    const defaults: Record<string, string | string[]> = {};
    if (tpl.variables) {
      for (const [key, v] of Object.entries(tpl.variables)) {
        defaults[key] = v.repeat ? [v.default] : v.default;
      }
    }
    setValues(defaults);
    setSavingAs(false);
  }, []);

  const loadVersion = useCallback((version: TemplateVersion) => {
    setValues({ ...version.values });
  }, []);

  const updateValue = useCallback((key: string, value: string, index?: number) => {
    setValues(prev => {
      if (index !== undefined) {
        const arr = [...(prev[key] as string[] || [''])];
        arr[index] = value;
        return { ...prev, [key]: arr };
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const addRepeatValue = useCallback((key: string) => {
    setValues(prev => ({
      ...prev,
      [key]: [...(prev[key] as string[] || ['']), ''],
    }));
  }, []);

  const removeRepeatValue = useCallback((key: string, index: number) => {
    setValues(prev => {
      const arr = [...(prev[key] as string[] || [])];
      arr.splice(index, 1);
      return { ...prev, [key]: arr };
    });
  }, []);

  const buildCommand = useCallback(() => {
    if (!selectedTemplate) return '';
    let cmd = selectedTemplate.command;
    for (const [key, val] of Object.entries(values)) {
      if (Array.isArray(val)) {
        // Repeat variables: replace ${KEY} with all values joined
        cmd = cmd.replace(`\${${key}}`, val.filter(Boolean).join(' '));
      } else {
        cmd = cmd.replace(`\${${key}}`, val);
      }
    }
    return cmd;
  }, [selectedTemplate, values]);

  const handleRun = useCallback(() => {
    const cmd = buildCommand();
    if (cmd) {
      onRun(cmd);
      onClose();
    }
  }, [buildCommand, onRun, onClose]);

  const handleSaveVersion = useCallback(() => {
    if (!selectedTemplate || !versionName.trim()) return;
    onSaveVersion(selectedTemplate.id, { name: versionName.trim(), values });
    setSavingAs(false);
    setVersionName('');
  }, [selectedTemplate, versionName, values, onSaveVersion]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Command Templates</DialogTitle>
      <DialogContent>
        {!selectedTemplate ? (
          // Template list
          <List dense>
            {templates.map((tpl) => (
              <ListItemButton key={tpl.id || tpl.name} onClick={() => selectTemplate(tpl)}>
                <ListItemText
                  primary={tpl.name}
                  secondary={tpl.command}
                  secondaryTypographyProps={{ fontFamily: 'monospace', fontSize: 11, noWrap: true }}
                />
              </ListItemButton>
            ))}
            {templates.length === 0 && (
              <Typography color="text.secondary" sx={{ p: 2 }}>
                No templates yet. Save one from the input bar.
              </Typography>
            )}
          </List>
        ) : (
          // Template form
          <Stack spacing={2}>
            <Button size="small" onClick={() => setSelectedTemplate(null)} sx={{ alignSelf: 'flex-start' }}>
              ← Back to list
            </Button>

            <Typography variant="subtitle1" fontWeight="bold">{selectedTemplate.name}</Typography>

            {/* Saved versions */}
            {selectedTemplate.versions && selectedTemplate.versions.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">Saved versions:</Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                  {selectedTemplate.versions.map((v) => (
                    <Chip
                      key={v.name}
                      label={v.name}
                      size="small"
                      onClick={() => loadVersion(v)}
                      onDelete={() => onDeleteVersion(selectedTemplate.id, v.name)}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            <Divider />

            {/* Variable inputs */}
            {selectedTemplate.variables && Object.entries(selectedTemplate.variables).map(([key, variable]) => (
              <Box key={key}>
                <Typography variant="caption" color="text.secondary">{variable.prompt}</Typography>
                {variable.repeat ? (
                  // Repeatable field
                  <Stack spacing={0.5}>
                    {(values[key] as string[] || ['']).map((val, idx) => (
                      <Stack key={idx} direction="row" spacing={0.5} alignItems="center">
                        <TextField
                          size="small"
                          fullWidth
                          value={val}
                          onChange={(e) => updateValue(key, e.target.value, idx)}
                          placeholder={variable.default || key}
                          sx={{ '& input': { fontFamily: 'monospace', fontSize: 13 } }}
                        />
                        {(values[key] as string[]).length > 1 && (
                          <IconButton size="small" onClick={() => removeRepeatValue(key, idx)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    ))}
                    <Button size="small" startIcon={<Add />} onClick={() => addRepeatValue(key)}>
                      Add another
                    </Button>
                  </Stack>
                ) : (
                  // Single field
                  <TextField
                    size="small"
                    fullWidth
                    value={values[key] || ''}
                    onChange={(e) => updateValue(key, e.target.value)}
                    placeholder={variable.default || key}
                    sx={{ '& input': { fontFamily: 'monospace', fontSize: 13 } }}
                  />
                )}
              </Box>
            ))}

            <Divider />

            {/* Preview */}
            <Box>
              <Typography variant="caption" color="text.secondary">Preview:</Typography>
              <Typography
                variant="body2"
                fontFamily="monospace"
                sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1, wordBreak: 'break-all', fontSize: 12 }}
              >
                {buildCommand()}
              </Typography>
            </Box>

            {/* Save as version */}
            {savingAs ? (
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Version name (e.g. CIN-8218)"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveVersion(); }}
                />
                <Button size="small" onClick={handleSaveVersion} disabled={!versionName.trim()}>Save</Button>
                <Button size="small" onClick={() => setSavingAs(false)}>Cancel</Button>
              </Stack>
            ) : (
              <Button size="small" variant="outlined" onClick={() => setSavingAs(true)}>
                Save as version
              </Button>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {selectedTemplate && (
          <Button startIcon={<PlayArrow />} variant="contained" onClick={handleRun}>
            Run
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateDialog;
