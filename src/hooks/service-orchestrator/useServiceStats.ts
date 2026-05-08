import { useState, useEffect, useRef } from 'react';

export interface ServiceStats {
  cpu: number;
  memory: number;
}

const POLL_INTERVAL = 5000;

/**
 * Polls CPU/memory stats for all running services.
 */
export function useServiceStats(enabled: boolean) {
  const [stats, setStats] = useState<Record<string, ServiceStats>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!enabled || !window.electronAPI) return;

    const poll = async () => {
      try {
        const result = await window.electronAPI.getServiceStats();
        setStats(result);
      } catch {
        // silent
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [enabled]);

  return stats;
}
