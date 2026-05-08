/**
 * Routine Runner
 * Manual runs: executes via PTY (interactive terminal with full shell env)
 * Cron runs: headless spawn (future)
 */

import os from 'os';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { createLogger } from '../../utils/logger.js';
import { loadRoutines } from '../config/routine-loader.js';
import { configManager } from '../../utils/configManager.js';
import { routineSchedulesRepo } from '../../database/repositories/routines/routine-schedules.js';
import { routineRunsRepo } from '../../database/repositories/routines/routine-runs.js';

const logger = createLogger('RoutineRunner');

let servicesMap = {};

export function setServicesMap(services) {
  servicesMap = services;
}

function resolvePath(p) {
  return p?.replace(/\$HOME/g, os.homedir()).replace(/~(?=\/|$)/g, os.homedir()) || os.homedir();
}

/**
 * Build a shell script from routine steps.
 * Returns { script, commands } where commands is metadata for the progress sidebar.
 */
function buildRoutineScript(routine) {
  const lines = ['echo "\\n🔄 Running routine: ' + routine.name + '\\n"'];
  const commands = []; // { label, detail }
  let idx = 0;

  for (const step of routine.steps) {
    if ('run' in step) {
      const dir = resolvePath(step.dir);
      const label = `run: ${step.run}`;
      commands.push({ label, detail: dir });
      lines.push(`echo "##STEP:${idx}:START##"`);
      lines.push(`echo "── Run: ${step.run} in ${dir}"`);
      lines.push(`cd "${dir}" && ${step.run}`);
      lines.push(`echo "##STEP:${idx}:DONE:$?##"`);
      idx++;
    } else if ('action' in step) {
      const targetIds = step.services === 'all'
        ? Object.keys(servicesMap).filter(id => servicesMap[id].routines?.[step.action])
        : (step.services || []).filter(id => servicesMap[id]?.routines?.[step.action]);

      if (targetIds.length === 0) {
        lines.push(`echo "⊘ ${step.action}: no services have this action"`);
        continue;
      }

      for (const id of targetIds) {
        const svc = servicesMap[id];
        const cmd = svc.routines[step.action];
        const dir = resolvePath(svc.path);
        const label = `${step.action}: ${svc.name}`;
        commands.push({ label, detail: cmd });
        lines.push(`echo "##STEP:${idx}:START##"`);
        lines.push(`echo "── ${label}"`);
        lines.push(`cd "${dir}" && ${cmd}`);
        lines.push(`echo "##STEP:${idx}:DONE:$?##"`);
        idx++;
      }
    }
  }

  lines.push('echo "##ROUTINE:DONE##"');
  lines.push('echo "\\n✅ Routine complete\\n"');
  return { script: lines.join('\n'), commands };
}

function getRoutineLogsDir() {
  const dir = path.join(app.getPath('userData'), 'routine-logs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Run a routine via PTY (manual/interactive)
 * Returns the script to write to an existing PTY session
 */
export function getRoutineScript(routineId, selectedSteps, trigger = 'manual') {
  const configDir = configManager.getUserConfigDir();
  const routines = loadRoutines(configDir);
  const routine = routines[routineId];

  if (!routine) return { success: false, error: `Routine "${routineId}" not found` };

  const filteredRoutine = selectedSteps
    ? { ...routine, steps: routine.steps.filter((_, i) => selectedSteps.includes(i)) }
    : routine;

  const { script: baseScript, commands } = buildRoutineScript(filteredRoutine);

  // Create log file and run record
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(getRoutineLogsDir(), `${routineId}-${ts}.log`);
  const run = routineRunsRepo.create({
    routineId,
    trigger,
    status: 'running',
    logFile,
    startedAt: new Date().toISOString(),
  });

  const script = baseScript;

  // Update schedule last run
  try {
    routineSchedulesRepo.save({
      routineId,
      lastRunAt: new Date().toISOString(),
      lastRunStatus: 'success',
    });
  } catch (err) {
    logger.warn('Failed to save routine run status:', err.message);
  }

  return { success: true, script, name: routine.name, runId: run?.id, commands, logFile };
}

/**
 * Get all routines with their DB schedule/preferences merged.
 * Resolves "all" to concrete service names and includes commands.
 */
export function getRoutinesWithSchedules() {
  const configDir = configManager.getUserConfigDir();
  const routines = loadRoutines(configDir);
  const schedules = routineSchedulesRepo.getAll();
  const scheduleMap = Object.fromEntries(schedules.map(s => [s.routineId, s]));

  return Object.entries(routines).map(([id, routine]) => ({
    ...routine,
    id,
    steps: routine.steps.map(step => {
      if (!('action' in step)) return step;
      const targetIds = step.services === 'all'
        ? Object.keys(servicesMap).filter(sid => servicesMap[sid].routines?.[step.action])
        : (step.services || []).filter(sid => servicesMap[sid]?.routines?.[step.action]);
      return {
        ...step,
        resolvedServices: targetIds.map(sid => ({
          id: sid,
          name: servicesMap[sid]?.name || sid,
          command: servicesMap[sid]?.routines?.[step.action] || '',
        })),
      };
    }),
    schedule: scheduleMap[id] || null,
  }));
}
