/**
 * useRoutineTerminals — manages routine terminal sessions, progress tracking, and visibility.
 */

import { useState, useCallback } from 'react';
import { StepStatus } from '../../components/ServiceOrchestrator/RoutineProgress';

export interface RoutineTerminal {
  id: string;
  name: string;
  script: string;
  commands: Array<{ label: string; detail: string }>;
  logFile?: string;
}

export function useRoutineTerminals() {
  const [terminals, setTerminals] = useState<Map<string, RoutineTerminal>>(new Map());
  const [visibleId, setVisibleId] = useState<string | null>(null);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus[]>>({});
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});

  const open = useCallback((rt: RoutineTerminal) => {
    setTerminals(prev => {
      const next = new Map(prev);
      if (next.has(rt.id)) {
        window.electronAPI?.ptyKill(`routine:${rt.id}`);
      }
      next.set(rt.id, rt);
      return next;
    });
    setStepStatuses(prev => ({ ...prev, [rt.id]: Array(rt.commands.length).fill('pending') }));
    setDoneMap(prev => ({ ...prev, [rt.id]: false }));
    setVisibleId(rt.id);
  }, []);

  const minimize = useCallback(() => setVisibleId(null), []);

  const close = useCallback((id: string) => {
    window.electronAPI?.ptyKill(`routine:${id}`);
    setTerminals(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setVisibleId(prev => prev === id ? null : prev);
  }, []);

  const consumeScript = useCallback((id: string): string | null => {
    let script: string | null = null;
    setTerminals(prev => {
      const next = new Map(prev);
      const entry = next.get(id);
      if (entry) {
        script = entry.script || null;
        next.set(id, { ...entry, script: '' });
      }
      return next;
    });
    return script;
  }, []);

  const parseMarkers = useCallback((routineId: string, data: string) => {
    const startMatch = data.match(/##STEP:(\d+):START##/);
    if (startMatch) {
      const idx = parseInt(startMatch[1]);
      setStepStatuses(prev => {
        const arr = [...(prev[routineId] || [])];
        arr[idx] = 'running';
        return { ...prev, [routineId]: arr };
      });
    }
    const doneMatch = data.match(/##STEP:(\d+):DONE:(\d+)##/);
    if (doneMatch) {
      const idx = parseInt(doneMatch[1]);
      const code = parseInt(doneMatch[2]);
      setStepStatuses(prev => {
        const arr = [...(prev[routineId] || [])];
        arr[idx] = code === 0 ? 'success' : 'failed';
        return { ...prev, [routineId]: arr };
      });
    }
    if (data.includes('##ROUTINE:DONE##')) {
      setDoneMap(prev => ({ ...prev, [routineId]: true }));
    }
  }, []);

  return {
    terminals,
    visibleId,
    stepStatuses,
    doneMap,
    activeNames: terminals.size > 0 ? Array.from(terminals.keys()) : null,
    open,
    minimize,
    close,
    show: setVisibleId,
    consumeScript,
    parseMarkers,
  };
}
