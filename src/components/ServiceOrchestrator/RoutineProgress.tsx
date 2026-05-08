/**
 * RoutineProgress — sidebar showing step-by-step progress for a running routine.
 */

import React from 'react';
import { Box, Typography, LinearProgress, Stack } from '@mui/material';
import { CheckCircle, Error as ErrorIcon, HourglassEmpty, PlayArrow } from '@mui/icons-material';

export type StepStatus = 'pending' | 'running' | 'success' | 'failed';

export interface CommandDef {
  label: string;
  detail: string;
}

interface RoutineProgressProps {
  commands: CommandDef[];
  statuses: StepStatus[];
  done: boolean;
}

const STATUS_ICON: Record<StepStatus, React.ReactNode> = {
  pending: <HourglassEmpty sx={{ fontSize: 16, color: 'text.disabled' }} />,
  running: <PlayArrow sx={{ fontSize: 16, color: 'info.main' }} />,
  success: <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />,
  failed: <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />,
};

const RoutineProgress: React.FC<RoutineProgressProps> = ({ commands, statuses, done }) => {
  const completed = statuses.filter(s => s === 'success' || s === 'failed').length;
  const failed = statuses.filter(s => s === 'failed').length;
  const progress = commands.length > 0 ? (completed / commands.length) * 100 : 0;

  return (
    <Box sx={{ width: 240, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header + progress bar */}
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          {done
            ? `Done — ${completed}/${commands.length}${failed ? ` (${failed} failed)` : ''}`
            : `${completed} / ${commands.length} steps`}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress}
          color={failed > 0 ? 'error' : 'primary'}
          sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
        />
      </Box>

      {/* Step list */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {commands.map((cmd, i) => {
          const status = statuses[i] || 'pending';
          return (
            <Stack key={i} direction="row" spacing={0.75} alignItems="flex-start" sx={{ py: 0.5, opacity: status === 'pending' ? 0.5 : 1 }}>
              <Box sx={{ pt: '2px', flexShrink: 0 }}>{STATUS_ICON[status]}</Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" noWrap sx={{ display: 'block', fontWeight: status === 'running' ? 600 : 400 }}>
                  {cmd.label}
                </Typography>
                <Typography variant="caption" color="text.disabled" noWrap sx={{ display: 'block', fontSize: '0.65rem', fontFamily: 'monospace' }}>
                  {cmd.detail}
                </Typography>
              </Box>
            </Stack>
          );
        })}
      </Box>
    </Box>
  );
};

export default RoutineProgress;
