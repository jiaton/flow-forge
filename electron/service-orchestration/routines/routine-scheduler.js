/**
 * Routine Scheduler — checks cron schedules every 60s and runs due routines headlessly.
 */

import { execFile } from 'child_process';
import { powerMonitor } from 'electron';
import os from 'os';
import { createLogger } from '../../utils/logger.js';
import { routineSchedulesRepo } from '../../database/repositories/routines/routine-schedules.js';
import { routineRunsRepo } from '../../database/repositories/routines/routine-runs.js';
import { getRoutineScript, setServicesMap } from './routine-runner.js';

const logger = createLogger('RoutineScheduler');
let intervalId = null;
let lastCheckMinute = -1;

/**
 * Match a cron expression against a date.
 * Supports: number, *, ranges (1-5), lists (1,3,5), step (asterisk/N)
 */
function matchCronField(field, value, max) {
  if (field === '*') return true;
  for (const part of field.split(',')) {
    if (part.includes('/')) {
      const [range, step] = part.split('/');
      const s = parseInt(step);
      const start = range === '*' ? 0 : parseInt(range);
      if ((value - start) % s === 0 && value >= start) return true;
    } else if (part.includes('-')) {
      const [lo, hi] = part.split('-').map(Number);
      if (value >= lo && value <= hi) return true;
    } else {
      if (parseInt(part) === value) return true;
    }
  }
  return false;
}

function cronMatches(expression, date) {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [min, hour, dom, month, dow] = parts;
  return (
    matchCronField(min, date.getMinutes(), 59) &&
    matchCronField(hour, date.getHours(), 23) &&
    matchCronField(dom, date.getDate(), 31) &&
    matchCronField(month, date.getMonth() + 1, 12) &&
    matchCronField(dow, date.getDay(), 6)
  );
}

/**
 * Execute a routine headlessly (no PTY, output to log file).
 */
async function executeRoutine(routineId) {
  logger.info(`Cron executing routine: ${routineId}`);

  try {
    const { ServiceLoader } = await import('../config/service-loader.js');
    const { configManager } = await import('../../utils/configManager.js');
    const loader = new ServiceLoader(configManager.getUserConfigDir());
    setServicesMap(loader.loadServices());
  } catch (err) {
    logger.error(`Failed to load services for routine ${routineId}:`, err.message);
    return;
  }

  const result = getRoutineScript(routineId, undefined, 'cron');
  if (!result?.success) {
    logger.error(`Failed to get script for routine ${routineId}:`, result?.error);
    return;
  }

  const shell = process.env.SHELL || '/bin/zsh';
  execFile(shell, ['-l', '-c', result.script], {
    encoding: 'utf8',
    timeout: 30 * 60 * 1000,
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, FORCE_COLOR: '0' },
  }, (error) => {
    const status = error ? 'failed' : 'success';
    logger.info(`Routine ${routineId} finished: ${status}`);
    if (result.runId) {
      try { routineRunsRepo.finish(result.runId, status); } catch { /* ignore */ }
    }
    try {
      routineSchedulesRepo.save({
        routineId,
        lastRunAt: new Date().toISOString(),
        lastRunStatus: status,
      });
    } catch { /* ignore */ }
  });
}

function tick() {
  const now = new Date();
  const currentMinute = now.getHours() * 60 + now.getMinutes();

  // Only check once per minute
  if (currentMinute === lastCheckMinute) return;
  lastCheckMinute = currentMinute;

  let schedules;
  try {
    schedules = routineSchedulesRepo.getAll();
  } catch (err) {
    logger.error('Failed to load schedules:', err.message);
    return;
  }

  for (const schedule of schedules) {
    if (!schedule.enabled || !schedule.cronExpression) continue;
    if (cronMatches(schedule.cronExpression, now)) {
      logger.info(`Cron match for routine: ${schedule.routineId}`);
      executeRoutine(schedule.routineId);
    }
  }
}

/**
 * Check for missed runs (laptop was off/asleep when job was due).
 * If lastRunAt is older than the cron interval suggests, run now.
 */
function checkMissedRuns() {
  let schedules;
  try {
    schedules = routineSchedulesRepo.getAll();
  } catch { return; }

  const now = Date.now();
  for (const schedule of schedules) {
    if (!schedule.enabled || !schedule.cronExpression) continue;
    const lastRun = schedule.lastRunAt ? new Date(schedule.lastRunAt).getTime() : 0;
    const elapsed = now - lastRun;
    // If never run or last run was >25 hours ago for any enabled schedule, run it
    if (elapsed > 25 * 60 * 60 * 1000) {
      logger.info(`Missed run detected for ${schedule.routineId} (last: ${schedule.lastRunAt || 'never'})`);
      executeRoutine(schedule.routineId);
    }
  }
}

export function startScheduler() {
  if (intervalId) return;
  logger.info('Routine scheduler started');
  // Check for missed runs after a short delay (let DB and services initialize)
  setTimeout(checkMissedRuns, 10_000);
  // Re-check on wake from sleep
  powerMonitor.on('resume', () => {
    logger.info('System resumed from sleep, checking missed runs');
    lastCheckMinute = -1; // Reset so next tick runs
    setTimeout(checkMissedRuns, 5_000);
  });
  tick();
  intervalId = setInterval(tick, 30_000);
}

export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Routine scheduler stopped');
  }
}
