/**
 * CronSchedulePicker - Visual cron schedule builder
 * Builds a cron expression from frequency, time, and day selections.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Stack, Typography, TextField, ToggleButton, ToggleButtonGroup,
  Button,
} from '@mui/material';

const DAYS = [
  { value: '1', label: 'Mon' },
  { value: '2', label: 'Tue' },
  { value: '3', label: 'Wed' },
  { value: '4', label: 'Thu' },
  { value: '5', label: 'Fri' },
  { value: '6', label: 'Sat' },
  { value: '0', label: 'Sun' },
];

type Frequency = 'daily' | 'weekdays' | 'custom' | 'hourly';

interface CronSchedulePickerProps {
  value: string | null;
  onChange: (cron: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

/** Parse a cron expression into picker state */
function parseCron(cron: string | null): { freq: Frequency; hour: string; minute: string; days: string[] } {
  const defaults = { freq: 'daily' as Frequency, hour: '09', minute: '00', days: [] as string[] };
  if (!cron) return defaults;

  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return defaults;

  const [min, hr, , , dow] = parts;
  const minute = min.padStart(2, '0');
  const hour = hr === '*' ? '09' : hr.padStart(2, '0');

  if (hr === '*') return { freq: 'hourly', hour: '09', minute, days: [] };
  if (dow === '*') return { freq: 'daily', hour, minute, days: [] };
  if (dow === '1-5') return { freq: 'weekdays', hour, minute, days: [] };

  // Custom days
  const days = dow.split(',').filter(d => /^[0-6]$/.test(d));
  return { freq: 'custom', hour, minute, days };
}

/** Build cron expression from picker state */
function buildCron(freq: Frequency, hour: string, minute: string, days: string[]): string {
  const m = parseInt(minute) || 0;
  const h = parseInt(hour) || 9;
  switch (freq) {
    case 'hourly': return `${m} * * * *`;
    case 'daily': return `${m} ${h} * * *`;
    case 'weekdays': return `${m} ${h} * * 1-5`;
    case 'custom': return days.length > 0 ? `${m} ${h} * * ${days.sort().join(',')}` : `${m} ${h} * * *`;
  }
}

function describeCron(cron: string | null): string {
  if (!cron) return '';
  const { freq, hour, minute, days } = parseCron(cron);
  const time = `${hour}:${minute}`;
  switch (freq) {
    case 'hourly': return `Every hour at :${minute}`;
    case 'daily': return `Daily at ${time}`;
    case 'weekdays': return `Weekdays at ${time}`;
    case 'custom': {
      const dayNames = days.map(d => DAYS.find(dd => dd.value === d)?.label).filter(Boolean);
      return dayNames.length > 0 ? `${dayNames.join(', ')} at ${time}` : `Daily at ${time}`;
    }
  }
}

export { describeCron };

const CronSchedulePicker: React.FC<CronSchedulePickerProps> = ({ value, onChange, onSave, onCancel }) => {
  const parsed = useMemo(() => parseCron(value), [value]);
  const [freq, setFreq] = useState<Frequency>(parsed.freq);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [days, setDays] = useState<string[]>(parsed.days);

  // Sync cron on any change
  useEffect(() => {
    onChange(buildCron(freq, hour, minute, days));
  }, [freq, hour, minute, days]);

  const handleDayToggle = (_: React.MouseEvent, newDays: string[]) => {
    setDays(newDays);
  };

  return (
    <Box sx={{ mt: 1 }}>
      {/* Frequency */}
      <ToggleButtonGroup
        value={freq}
        exclusive
        onChange={(_, v) => v && setFreq(v)}
        size="small"
        sx={{ mb: 1.5 }}
      >
        <ToggleButton value="daily" sx={{ px: 1.5, py: 0.25, fontSize: '0.75rem', textTransform: 'none' }}>Daily</ToggleButton>
        <ToggleButton value="weekdays" sx={{ px: 1.5, py: 0.25, fontSize: '0.75rem', textTransform: 'none' }}>Mon–Fri</ToggleButton>
        <ToggleButton value="custom" sx={{ px: 1.5, py: 0.25, fontSize: '0.75rem', textTransform: 'none' }}>Custom</ToggleButton>
        <ToggleButton value="hourly" sx={{ px: 1.5, py: 0.25, fontSize: '0.75rem', textTransform: 'none' }}>Hourly</ToggleButton>
      </ToggleButtonGroup>

      {/* Day picker (custom only) */}
      {freq === 'custom' && (
        <ToggleButtonGroup
          value={days}
          onChange={handleDayToggle}
          size="small"
          sx={{ mb: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.25 }}
        >
          {DAYS.map(d => (
            <ToggleButton key={d.value} value={d.value} sx={{ px: 1, py: 0.25, fontSize: '0.75rem', minWidth: 40 }}>
              {d.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}

      {/* Time picker */}
      {freq !== 'hourly' ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary">At</Typography>
          <TextField
            size="small"
            type="time"
            value={`${hour}:${minute}`}
            onChange={(e) => {
              const [h, m] = e.target.value.split(':');
              setHour(h || '09');
              setMinute(m || '00');
            }}
            sx={{ width: 130 }}
            slotProps={{ htmlInput: { style: { fontSize: '0.85rem' } } }}
          />
        </Stack>
      ) : (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary">At minute</Typography>
          <TextField
            size="small"
            type="number"
            value={parseInt(minute)}
            onChange={(e) => setMinute(String(Math.max(0, Math.min(59, parseInt(e.target.value) || 0))).padStart(2, '0'))}
            sx={{ width: 70 }}
            slotProps={{ htmlInput: { min: 0, max: 59, style: { fontSize: '0.85rem' } } }}
          />
        </Stack>
      )}

      {/* Preview + actions */}
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, fontFamily: 'monospace' }}>
          {buildCron(freq, hour, minute, days)}
        </Typography>
        <Button size="small" onClick={onCancel}>Cancel</Button>
        <Button size="small" variant="contained" onClick={onSave}>Save</Button>
      </Stack>
    </Box>
  );
};

export default CronSchedulePicker;
