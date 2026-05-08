import { useState, useEffect } from 'react';

/** Fetches git branches on mount, then updates via fs.watch events from backend. */
export function useServiceBranches(enabled: boolean) {
  const [branches, setBranches] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!enabled || !window.electronAPI) return;

    // Initial fetch (also starts watchers on backend)
    window.electronAPI.getServiceBranches().then((b: Record<string, string>) => {
      if (b) setBranches(b);
    }).catch(() => {});

    // Listen for real-time branch changes
    const unsub = window.electronAPI.onServiceBranchChanged?.((data: { serviceId: string; branch: string }) => {
      setBranches(prev => ({ ...prev, [data.serviceId]: data.branch }));
    });

    return () => { unsub?.(); };
  }, [enabled]);

  return branches;
}
