import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Typography,
  Stack,
  IconButton,
  Chip,
  Collapse,
  Button,
  Paper,
  Tooltip,
} from '@mui/material';
import { PlayArrow, Add, Delete, ExpandMore, ExpandLess } from '@mui/icons-material';
import { CommandTemplate, TemplateVersion } from './types';

interface TemplatesPanelProps {
  templates: CommandTemplate[];
  currentInput?: string;
  onRun: (command: string) => void;
  onSaveVersion: (templateId: string, version: TemplateVersion) => void;
  onDeleteVersion: (templateId: string, versionName: string) => void;
  onCreateTemplate: (name: string, command: string) => void;
  onDeleteTemplate: (templateId: string) => void;
}

const TemplatesPanel: React.FC<TemplatesPanelProps> = ({
  templates, currentInput, onRun, onSaveVersion, onDeleteVersion, onCreateTemplate, onDeleteTemplate,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [versionName, setVersionName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCommand, setNewCommand] = useState('');

  const expand = useCallback((tpl: CommandTemplate) => {
    if (expandedId === (tpl.id || tpl.name)) {
      setExpandedId(null);
      return;
    }
    setExpandedId(tpl.id || tpl.name);
    // Init defaults
    const defaults: Record<string, string | string[]> = {};
    if (tpl.variables) {
      for (const [key, v] of Object.entries(tpl.variables)) {
        defaults[key] = v.repeat ? [v.default] : v.default;
      }
    }
    setValues(defaults);
    setVersionName('');
  }, [expandedId]);

  const loadVersion = useCallback((tpl: CommandTemplate, version: TemplateVersion) => {
    setExpandedId(tpl.id || tpl.name);
    setValues({ ...version.values });
  }, []);

  const updateValue = (key: string, value: string, index?: number) => {
    setValues(prev => {
      if (index !== undefined) {
        const arr = [...(prev[key] as string[] || [''])];
        arr[index] = value;
        return { ...prev, [key]: arr };
      }
      return { ...prev, [key]: value };
    });
  };

  const addRepeat = (key: string) => {
    setValues(prev => ({ ...prev, [key]: [...(prev[key] as string[] || ['']), ''] }));
  };

  const removeRepeat = (key: string, index: number) => {
    setValues(prev => {
      const arr = [...(prev[key] as string[] || [])];
      arr.splice(index, 1);
      return { ...prev, [key]: arr.length ? arr : [''] };
    });
  };

  const buildCommand = (tpl: CommandTemplate) => {
    let cmd = tpl.command;
    for (const [key, val] of Object.entries(values)) {
      if (Array.isArray(val)) {
        cmd = cmd.replace(`\${${key}}`, val.filter(Boolean).join(' '));
      } else {
        cmd = cmd.replace(`\${${key}}`, val);
      }
    }
    return cmd;
  };

  if (!templates.length) return null;

  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
        Templates
      </Typography>
      <Stack spacing={0.5}>
        {templates.map((tpl) => {
          const id = tpl.id || tpl.name;
          const isExpanded = expandedId === id;

          return (
            <Paper key={id} variant="outlined" sx={{ overflow: 'hidden' }}>
              {/* Header row — click to expand */}
              <Box
                sx={{
                  px: 1.5, py: 0.75,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => expand(tpl)}
              >
                <Typography variant="body2" fontWeight={isExpanded ? 'bold' : 'normal'}>
                  {tpl.name}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDeleteTemplate(id); }}>
                    <Delete sx={{ fontSize: 14 }} />
                  </IconButton>
                  {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </Stack>
              </Box>

              {/* Expanded form */}
              <Collapse in={isExpanded}>
                <Box sx={{ px: 1.5, pb: 1.5 }}>
                  {/* Saved versions as chips */}
                  {tpl.versions && tpl.versions.length > 0 && (
                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1 }}>
                      {tpl.versions.map((v) => (
                        <Chip
                          key={v.name}
                          label={v.name}
                          size="small"
                          onClick={() => loadVersion(tpl, v)}
                          onDelete={() => onDeleteVersion(id, v.name)}
                        />
                      ))}
                    </Stack>
                  )}

                  {/* Variable fields */}
                  {tpl.variables && Object.entries(tpl.variables).map(([key, variable]) => (
                    <Box key={key} sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">{variable.prompt}</Typography>
                      {variable.repeat ? (
                        <Stack spacing={0.5}>
                          {(values[key] as string[] || ['']).map((val, idx) => (
                            <Stack key={idx} direction="row" spacing={0.5} alignItems="center">
                              <TextField
                                size="small" fullWidth value={val}
                                onChange={(e) => updateValue(key, e.target.value, idx)}
                                placeholder={variable.default || key}
                                sx={{ '& input': { fontFamily: 'monospace', fontSize: 12 } }}
                              />
                              {((values[key] as string[]) || []).length > 1 && (
                                <IconButton size="small" onClick={() => removeRepeat(key, idx)}>
                                  <Delete sx={{ fontSize: 14 }} />
                                </IconButton>
                              )}
                            </Stack>
                          ))}
                          <Button size="small" startIcon={<Add />} onClick={() => addRepeat(key)} sx={{ alignSelf: 'flex-start' }}>
                            Add
                          </Button>
                        </Stack>
                      ) : (
                        <TextField
                          size="small" fullWidth value={values[key] || ''}
                          onChange={(e) => updateValue(key, e.target.value)}
                          placeholder={variable.default || key}
                          sx={{ '& input': { fontFamily: 'monospace', fontSize: 12 } }}
                        />
                      )}
                    </Box>
                  ))}

                  {/* Preview + run */}
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                    <Typography
                      variant="caption" fontFamily="monospace"
                      sx={{ flex: 1, p: 0.75, bgcolor: 'action.hover', borderRadius: 0.5, wordBreak: 'break-all' }}
                    >
                      {buildCommand(tpl)}
                    </Typography>
                    <Tooltip title="Run">
                      <IconButton size="small" color="primary" onClick={() => onRun(buildCommand(tpl))}>
                        <PlayArrow fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  {/* Save version */}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      size="small" placeholder="Save the version as..."
                      value={versionName}
                      onChange={(e) => setVersionName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && versionName.trim()) {
                          onSaveVersion(id, { name: versionName.trim(), values });
                          setVersionName('');
                        }
                      }}
                      sx={{ flex: 1 }}
                    />
                    <Button
                      size="small" disabled={!versionName.trim()}
                      onClick={() => { onSaveVersion(id, { name: versionName.trim(), values }); setVersionName(''); }}
                    >
                      Save
                    </Button>
                  </Stack>
                </Box>
              </Collapse>
            </Paper>
          );
        })}
      </Stack>

      {/* Create new template */}
      {creating ? (
        <Paper variant="outlined" sx={{ mt: 1, p: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            Use ${'{VAR}'} for variables, ${'{VAR repeat}'} for repeatable
          </Typography>
          <TextField
            size="small" fullWidth placeholder="Template name"
            value={newName} onChange={(e) => setNewName(e.target.value)}
            sx={{ mb: 1 }}
          />
          <TextField
            size="small" fullWidth placeholder="e.g. gh pr create --title ${TITLE}"
            value={newCommand} onChange={(e) => setNewCommand(e.target.value)}
            sx={{ mb: 1, '& input': { fontFamily: 'monospace', fontSize: 12 } }}
          />
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" disabled={!newName.trim() || !newCommand.trim()}
              onClick={() => { onCreateTemplate(newName.trim(), newCommand.trim()); setCreating(false); setNewName(''); setNewCommand(''); }}>
              Create
            </Button>
            <Button size="small" onClick={() => setCreating(false)}>Cancel</Button>
          </Stack>
        </Paper>
      ) : (
        <Button size="small" startIcon={<Add />} onClick={() => { setCreating(true); setNewCommand(currentInput || ''); }} sx={{ mt: 1 }}>
          New template
        </Button>
      )}
    </Box>
  );
};

export default TemplatesPanel;
