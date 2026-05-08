/**
 * RunHistory — shows recent routine runs with inline log viewer.
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { RoutineService, RoutineRun } from '../../services/service-orchestrator/RoutineService';

interface RunHistoryProps {
  routineId: string;
}

const RunHistory: React.FC<RunHistoryProps> = ({ routineId }) => {
  const [runs, setRuns] = useState<RoutineRun[]>([]);
  const [logContent, setLogContent] = useState<string | null>(null);
  const [viewingRunId, setViewingRunId] = useState<number | null>(null);

  useEffect(() => {
    RoutineService.getRuns(routineId, 5).then(setRuns);
  }, [routineId]);

  const viewLog = async (run: RoutineRun) => {
    if (viewingRunId === run.id) { setViewingRunId(null); setLogContent(null); return; }
    if (!run.logFile) return;
    const content = await RoutineService.getRunLog(run.logFile);
    if (content !== null) { setLogContent(content); setViewingRunId(run.id); }
  };

  if (runs.length === 0) return null;

  const statusColor = (s: string) => s === 'success' ? 'success.main' : s === 'failed' ? 'error.main' : 'info.main';

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Run History
      </Typography>
      {runs.map(run => (
        <React.Fragment key={run.id}>
          <Stack
            direction="row" alignItems="center" spacing={1}
            onClick={() => viewLog(run)}
            sx={{ cursor: run.logFile ? 'pointer' : 'default', py: 0.25,
              '&:hover': run.logFile ? { bgcolor: 'action.hover', borderRadius: 0.5 } : {} }}
          >
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusColor(run.status), flexShrink: 0 }} />
            <Typography variant="caption" sx={{ flex: 1 }} noWrap>
              {new Date(run.startedAt).toLocaleString()} — {run.trigger}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {run.status}
            </Typography>
          </Stack>
          {viewingRunId === run.id && logContent !== null && (
            <Box sx={{
              mt: 0.5, mb: 1, p: 1, bgcolor: '#0d1117', borderRadius: 1,
              maxHeight: 200, overflow: 'auto', fontFamily: 'monospace', fontSize: '0.7rem',
              color: '#c9d1d9', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>
              {logContent || '(empty log)'}
            </Box>
          )}
        </React.Fragment>
      ))}
    </Box>
  );
};

export default RunHistory;
