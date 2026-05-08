/**
 * RoutinesDialog - Run routines with step selection, manage schedules
 */

import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Button, Typography, Box,
  Chip, Switch, Divider, Checkbox, Collapse, Tooltip, Stack,
} from '@mui/material';
import {
  Close, PlayArrow, CheckCircle, Error as ErrorIcon, Schedule,
  ExpandMore, ExpandLess,
} from '@mui/icons-material';
import { useRoutines, Routine } from '../../hooks/service-orchestrator/useRoutines';
import CronSchedulePicker, { describeCron } from './CronSchedulePicker';
import RunHistory from './RunHistory';

function stepLabel(step: Routine['steps'][number]): string {
  if ('run' in step && step.run) return `run: ${step.run}`;
  if ('action' in step && step.action) {
    const names = step.resolvedServices?.map(s => s.name) || [];
    return names.length > 0
      ? `${step.action} → ${names.join(', ')}`
      : `${step.action} → (none)`;
  }
  return 'unknown step';
}

function stepDetail(step: Routine['steps'][number]): string | null {
  if ('run' in step && step.run) return step.dir || null;
  if (step.resolvedServices?.length === 1) return step.resolvedServices[0].command;
  return null;
}

interface RoutinesDialogProps {
  open: boolean;
  onClose: () => void;
  onOpenTerminal: (routineId: string, script: string, commands?: Array<{ label: string; detail: string }>, logFile?: string) => void;
}

const RoutinesDialog: React.FC<RoutinesDialogProps> = ({ open, onClose, onOpenTerminal }) => {
  const { routines, loading, runRoutine, saveSchedule } = useRoutines();
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [cronInput, setCronInput] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  // Track unchecked steps per routine (all checked by default)
  const [uncheckedSteps, setUncheckedSteps] = useState<Record<string, Set<number>>>({});

  const isStepChecked = (routineId: string, stepIdx: number) =>
    !uncheckedSteps[routineId]?.has(stepIdx);

  const toggleStep = (routineId: string, stepIdx: number) => {
    setUncheckedSteps(prev => {
      const set = new Set(prev[routineId] || []);
      if (set.has(stepIdx)) set.delete(stepIdx); else set.add(stepIdx);
      return { ...prev, [routineId]: set };
    });
  };

  const getCheckedStepIndices = (routine: Routine) =>
    routine.steps.map((_, i) => i).filter(i => isStepChecked(routine.id, i));

  const handleRun = async (routine: Routine) => {
    const selectedIndices = getCheckedStepIndices(routine);
    const result = await runRoutine(routine.id, selectedIndices);
    if (result?.success && result.script) {
      onOpenTerminal(routine.id, result.script, result.commands, result.logFile);
    }
  };

  const handleSaveSchedule = async (routineId: string) => {
    await saveSchedule({
      routineId,
      cronExpression: cronInput || null,
      enabled: !!cronInput,
    });
    setEditingSchedule(null);
    setCronInput('');
  };

  const handleToggleSchedule = async (routine: Routine) => {
    if (!routine.schedule) return;
    await saveSchedule({
      routineId: routine.id,
      enabled: !routine.schedule.enabled,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        Routines
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {loading ? (
          <Typography color="text.secondary" sx={{ p: 2 }}>Loading...</Typography>
        ) : routines.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            No routines found. Add YAML files to config/routines/
          </Typography>
        ) : (
          <Stack divider={<Divider />}>
            {routines.map((routine) => {
              const isExpanded = expanded === routine.id;
              const checkedCount = getCheckedStepIndices(routine).length;
              const allChecked = checkedCount === routine.steps.length;

              return (
                <Box key={routine.id} sx={{ px: 2, py: 1.5 }}>
                  {/* Header row */}
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconButton size="small" onClick={() => setExpanded(isExpanded ? null : routine.id)}>
                      {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                    </IconButton>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="subtitle2" noWrap>{routine.name}</Typography>
                        {routine.schedule?.lastRunStatus === 'success' && <CheckCircle sx={{ fontSize: 14 }} color="success" />}
                        {routine.schedule?.lastRunStatus === 'failed' && <ErrorIcon sx={{ fontSize: 14 }} color="error" />}
                      </Stack>
                      {routine.description && (
                        <Typography variant="caption" color="text.secondary" noWrap>{routine.description}</Typography>
                      )}
                    </Box>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PlayArrow />}
                      onClick={() => handleRun(routine)}
                      disabled={checkedCount === 0}
                      sx={{ whiteSpace: 'nowrap', minWidth: 'auto' }}
                    >
                      Run{!allChecked ? ` (${checkedCount})` : ''}
                    </Button>
                  </Stack>

                  {/* Step chips (collapsed view) */}
                  {!isExpanded && (
                    <Box sx={{ mt: 0.5, ml: 4.5 }}>
                      {routine.steps.map((s, i) => {
                        const detail = stepDetail(s);
                        const chip = (
                          <Chip
                            key={i}
                            label={stepLabel(s)}
                            size="small"
                            variant={isStepChecked(routine.id, i) ? 'filled' : 'outlined'}
                            onClick={() => toggleStep(routine.id, i)}
                            sx={{ mr: 0.5, mt: 0.5, height: 22, fontSize: '0.7rem', cursor: 'pointer',
                              opacity: isStepChecked(routine.id, i) ? 1 : 0.5 }}
                          />
                        );
                        return detail
                          ? <Tooltip key={i} title={detail} arrow placement="top"><span>{chip}</span></Tooltip>
                          : chip;
                      })}
                    </Box>
                  )}

                  {/* Expanded: checkboxes + schedule */}
                  <Collapse in={isExpanded}>
                    <Box sx={{ ml: 4.5, mt: 1 }}>
                      {/* Step checkboxes */}
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        Steps
                      </Typography>
                      {routine.steps.map((s, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', ml: -0.5, my: 0.25 }}>
                          <Checkbox
                            size="small"
                            checked={isStepChecked(routine.id, i)}
                            onChange={() => toggleStep(routine.id, i)}
                            sx={{ mt: -0.25 }}
                          />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                              {stepLabel(s)}
                            </Typography>
                            {s.resolvedServices && s.resolvedServices.length > 0 && (
                              <Box sx={{ ml: 0.5 }}>
                                {s.resolvedServices.map(rs => (
                                  <Typography key={rs.id} variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block', fontSize: '0.7rem' }} noWrap>
                                    {rs.name}: {rs.command}
                                  </Typography>
                                ))}
                              </Box>
                            )}
                            {'run' in s && s.dir && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} noWrap>
                                in {s.dir}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}

                      {/* Schedule section */}
                      <Divider sx={{ my: 1 }} />
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                        <Schedule sx={{ fontSize: 16 }} color="action" />
                        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                          {routine.schedule?.cronExpression
                            ? describeCron(routine.schedule.cronExpression)
                            : 'No schedule'}
                        </Typography>
                        {routine.schedule?.cronExpression && (
                          <Switch
                            size="small"
                            checked={!!routine.schedule.enabled}
                            onChange={() => handleToggleSchedule(routine)}
                          />
                        )}
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => {
                            const editing = editingSchedule === routine.id ? null : routine.id;
                            setEditingSchedule(editing);
                            if (editing) setCronInput(routine.schedule?.cronExpression || '');
                          }}
                        >
                          {editingSchedule === routine.id ? 'Close' : routine.schedule?.cronExpression ? 'Edit' : 'Set'}
                        </Button>
                      </Stack>

                      {editingSchedule === routine.id && (
                        <CronSchedulePicker
                          value={cronInput}
                          onChange={setCronInput}
                          onSave={() => handleSaveSchedule(routine.id)}
                          onCancel={() => setEditingSchedule(null)}
                        />
                      )}

                      {routine.schedule?.lastRunAt && (
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                          Last run: {new Date(routine.schedule.lastRunAt).toLocaleString()}
                        </Typography>
                      )}

                      {/* Run History */}
                      <Divider sx={{ my: 1 }} />
                      <RunHistory routineId={routine.id} />
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RoutinesDialog;
