/**
 * useRoutines - Hook for managing routines via RoutineService
 */

import { useState, useEffect, useCallback } from 'react';
import { RoutineService } from '../../services/service-orchestrator/RoutineService';

interface ResolvedService {
  id: string;
  name: string;
  command: string;
}

interface RoutineStep {
  action?: string;
  services?: string[] | 'all';
  run?: string;
  dir?: string;
  resolvedServices?: ResolvedService[];
}

interface RoutineSchedule {
  routineId: string;
  cronExpression: string | null;
  enabled: number;
  notify: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

export interface Routine {
  id: string;
  name: string;
  description?: string;
  notify: boolean;
  steps: RoutineStep[];
  schedule: RoutineSchedule | null;
}

export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoutines = useCallback(async () => {
    const result = await RoutineService.list();
    if (result?.success) setRoutines(result.routines);
    setLoading(false);
  }, []);

  useEffect(() => { loadRoutines(); }, [loadRoutines]);

  const runRoutine = useCallback(async (routineId: string, selectedSteps?: number[]) => {
    const result = await RoutineService.run(routineId, selectedSteps);
    loadRoutines();
    return result;
  }, [loadRoutines]);

  const saveSchedule = useCallback(async (data: {
    routineId: string;
    cronExpression?: string | null;
    enabled?: boolean;
    notify?: boolean;
  }) => {
    const result = await RoutineService.saveSchedule(data);
    if (result?.success) loadRoutines();
    return result;
  }, [loadRoutines]);

  return { routines, loading, runRoutine, saveSchedule, refresh: loadRoutines };
}
