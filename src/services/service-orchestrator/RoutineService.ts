/**
 * RoutineService — API layer for routine operations.
 */

export interface RoutineRunResult {
  success: boolean;
  script?: string;
  name?: string;
  error?: string;
  commands?: Array<{ label: string; detail: string }>;
  logFile?: string;
}

export interface RoutineRun {
  id: number;
  routineId: string;
  trigger: 'manual' | 'cron';
  status: 'running' | 'success' | 'failed';
  logFile: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export class RoutineService {
  static async list() {
    return window.electronAPI?.routines.list();
  }

  static async run(routineId: string, selectedSteps?: number[]): Promise<RoutineRunResult | undefined> {
    return window.electronAPI?.routines.run(routineId, selectedSteps);
  }

  static async saveSchedule(data: {
    routineId: string;
    cronExpression?: string | null;
    enabled?: boolean;
    notify?: boolean;
  }) {
    return window.electronAPI?.routines.saveSchedule(data);
  }

  static async getRuns(routineId?: string, limit?: number): Promise<RoutineRun[]> {
    const result = await window.electronAPI?.routines.getRuns(routineId, limit);
    return result?.success ? result.runs : [];
  }

  static async getRunLog(logFile: string): Promise<string | null> {
    const result = await window.electronAPI?.routines.getRunLog(logFile);
    return result?.success ? (result.content || '') : null;
  }
}
