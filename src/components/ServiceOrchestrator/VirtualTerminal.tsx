import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { Clear, ContentCopy, Download } from '@mui/icons-material';
import { ServiceLog } from './types';
import { SERVICE_STATUS } from '../../shared/constants/service';
import { useDbAppStore as useAppStore } from '../../stores/dbAppStore';

import '@xterm/xterm/css/xterm.css';

interface VirtualTerminalProps {
  serviceId: string;
  serviceName?: string;
  serviceStatus?: string;
  containerFilter?: string | null;
  onClear?: () => void;
}

const XTERM_THEME = {
  background: '#0d1117',
  foreground: '#c9d1d9',
  cursor: '#f0f6fc',
  cursorAccent: '#0d1117',
  black: '#484f58',
  red: '#ff7b72',
  green: '#3fb950',
  yellow: '#d29922',
  blue: '#58a6ff',
  magenta: '#bc8cff',
  cyan: '#39c5cf',
  white: '#b1bac4',
  brightBlack: '#6e7681',
  brightRed: '#ffa198',
  brightGreen: '#56d364',
  brightYellow: '#e3b341',
  brightBlue: '#79c0ff',
  brightMagenta: '#d2a8ff',
  brightCyan: '#56d4dd',
  brightWhite: '#f0f6fc',
};

const LEVEL_COLORS: Record<string, string> = {
  ERROR: '\x1b[91m',
  WARN: '\x1b[93m',
  INFO: '\x1b[94m',
  DEBUG: '\x1b[92m',
};

/** Format a single log entry as an ANSI-colored terminal line */
function formatLog(log: ServiceLog): string {
  const ts = new Date(log.timestamp).toLocaleTimeString();
  const container = (log.details as { container?: string })?.container;
  const prefix = container ? `\x1b[35m[${container}]\x1b[0m ` : '';

  if (log.source === 'stdout' || log.source === 'stderr') {
    const color = log.source === 'stderr' ? '\x1b[91m' : '\x1b[96m';
    const tag = log.source === 'stderr' ? '[ERR]' : '[OUT]';
    return `\x1b[90m${ts}\x1b[0m ${prefix}${color}${tag}\x1b[0m ${log.message}`;
  }

  const lc = LEVEL_COLORS[log.level] ?? '\x1b[92m';
  return `\x1b[90m${ts}\x1b[0m ${prefix}${lc}[${log.level}]\x1b[0m ${log.message}`;
}

const VirtualTerminal: React.FC<VirtualTerminalProps> = ({
  serviceId,
  serviceName,
  serviceStatus,
  containerFilter,
  onClear,
}) => {
  const { selectedTeam } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const entryCountRef = useRef(0);

  // Stable write helper — writes a batch of logs to xterm
  const writeBatch = useCallback((logs: ServiceLog[]) => {
    const term = termRef.current;
    if (!term || logs.length === 0) return;
    const filtered = containerFilter
      ? logs.filter(l => (l.details as { container?: string })?.container === containerFilter || !(l.details as { container?: string })?.container)
      : logs;
    if (filtered.length === 0) return;
    const lines = filtered.map(formatLog);
    // Write all lines then scroll once
    term.write(lines.join('\r\n') + '\r\n', () => term.scrollToBottom());
    entryCountRef.current += filtered.length;
  }, [containerFilter]);

  // Initialize xterm once
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: XTERM_THEME,
      fontSize: 13,
      fontFamily: 'Monaco, "SF Mono", "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
      cursorBlink: false,
      cursorStyle: 'block',
      scrollback: 5000,
      disableStdin: true,
      convertEol: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);

    termRef.current = term;
    fitRef.current = fit;

    // Fit after layout settles
    const fitTimer = setTimeout(() => {
      try { fit.fit(); } catch { /* container not ready */ }
    }, 50);

    const onResize = () => {
      try { fit.fit(); } catch { /* ignore */ }
    };
    window.addEventListener('resize', onResize);

    // Banner
    if (serviceName) {
      term.writeln(`\x1b[1;34m── Service Terminal: ${serviceName} ──\x1b[0m\r\n`);
    }

    return () => {
      clearTimeout(fitTimer);
      window.removeEventListener('resize', onResize);
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      entryCountRef.current = 0;
    };
  }, [serviceName]);

  // Log lifecycle: fetch initial logs, subscribe to stream, unsubscribe on unmount
  useEffect(() => {
    if (!window.electronAPI || !serviceId) return;

    // Clear terminal when filter changes
    termRef.current?.clear();
    entryCountRef.current = 0;

    let cancelled = false;

    // 1. Fetch existing buffered logs
    window.electronAPI.getServiceLogs({ serviceId, team: selectedTeam }).then(
      (res: { success: boolean; logs?: ServiceLog[] }) => {
        if (cancelled || !res.success || !res.logs) return;
        writeBatch(res.logs);
      }
    );

    // 2. Subscribe to streaming updates
    window.electronAPI.subscribeServiceLogs(serviceId);

    const unsubscribeIpc = window.electronAPI.onServiceLogsUpdate(
      (data: { serviceId: string; logs: ServiceLog[] }) => {
        if (data.serviceId === serviceId) {
          writeBatch(data.logs);
        }
      }
    );

    // 3. Cleanup
    return () => {
      cancelled = true;
      unsubscribeIpc();
      window.electronAPI.unsubscribeServiceLogs(serviceId);
    };
  }, [serviceId, selectedTeam, writeBatch, containerFilter]);

  const handleClear = () => {
    termRef.current?.clear();
    entryCountRef.current = 0;
    if (serviceName) {
      termRef.current?.writeln(
        `\x1b[1;34m── Terminal cleared at ${new Date().toLocaleTimeString()} ──\x1b[0m\r\n`
      );
    }
    onClear?.();
  };

  const handleCopy = async () => {
    const term = termRef.current;
    if (!term) return;
    const selection = term.getSelection();
    if (selection) {
      await navigator.clipboard.writeText(selection);
      return;
    }
    // Copy full buffer
    const buf = term.buffer.active;
    let content = '';
    for (let i = 0; i < buf.length; i++) {
      const line = buf.getLine(i);
      if (line) content += line.translateToString(true) + '\n';
    }
    await navigator.clipboard.writeText(content);
  };

  const handleDownload = () => {
    const term = termRef.current;
    if (!term) return;
    const buf = term.buffer.active;
    let content = '';
    for (let i = 0; i < buf.length; i++) {
      const line = buf.getLine(i);
      if (line) content += line.translateToString(true) + '\n';
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${serviceName || 'service'}-logs-${new Date().toISOString().slice(0, 19)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 1,
        backgroundColor: '#21262d',
        borderBottom: '1px solid #30363d',
      }}>
        <Typography variant="caption" sx={{ color: '#7d8590', fontFamily: 'monospace' }}>
          Terminal{serviceStatus === SERVICE_STATUS.RUNNING ? ' • Live' : ''}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Copy terminal content">
            <IconButton size="small" onClick={handleCopy} sx={{ color: '#7d8590' }}>
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download logs">
            <IconButton size="small" onClick={handleDownload} sx={{ color: '#7d8590' }}>
              <Download fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear terminal">
            <IconButton size="small" onClick={handleClear} sx={{ color: '#7d8590' }}>
              <Clear fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          backgroundColor: '#0d1117',
          minHeight: '300px',
          '& .xterm': { height: '100% !important', width: '100% !important' },
          '& .xterm-viewport': { backgroundColor: 'transparent !important' },
          '& .xterm-screen': { backgroundColor: 'transparent !important' },
          '& .xterm-helper-textarea': { position: 'absolute !important', left: '-9999px !important' },
        }}
      />
    </Box>
  );
};

export default VirtualTerminal;
