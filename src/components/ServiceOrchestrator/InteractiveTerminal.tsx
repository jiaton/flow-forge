import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Box, Typography, Menu, MenuItem, ListItemText } from '@mui/material';
import { QuickCommand } from './types';

import '@xterm/xterm/css/xterm.css';

interface InteractiveTerminalProps {
  serviceId: string;
  serviceName?: string;
  cwd?: string;
  visible?: boolean;
  pendingCommand?: string | null;
  consumePendingCommand?: () => string | null;
  quickCommands?: QuickCommand[];
  keepAlive?: boolean;
  onData?: (data: string) => void;
  logFile?: string;
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

const InteractiveTerminal: React.FC<InteractiveTerminalProps> = ({
  serviceId,
  serviceName,
  cwd,
  visible = true,
  pendingCommand,
  consumePendingCommand,
  quickCommands,
  keepAlive = false,
  onData: onDataCallback,
  logFile,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const keepAliveRef = useRef(keepAlive);
  keepAliveRef.current = keepAlive;
  const onDataRef = useRef(onDataCallback);
  onDataRef.current = onDataCallback;
  const [ctxMenu, setCtxMenu] = useState<{ top: number; left: number } | null>(null);

  // Write a command to the PTY
  const writeCommand = (command: string) => {
    if (!window.electronAPI) return;
    window.electronAPI.ptyWrite(serviceId, command + '\r');
    termRef.current?.focus();
  };

  // Initialize xterm + PTY
  useEffect(() => {
    if (!containerRef.current || !window.electronAPI) return;

    const term = new Terminal({
      theme: XTERM_THEME,
      fontSize: 13,
      fontFamily: 'Monaco, "SF Mono", "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      convertEol: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);
    termRef.current = term;
    fitRef.current = fit;

    term.onData((data) => {
      window.electronAPI.ptyWrite(serviceId, data);
    });

    term.onResize(({ cols, rows }) => {
      window.electronAPI.ptyResize(serviceId, cols, rows);
    });

    const unsubData = window.electronAPI.onPtyData(
      (msg: { serviceId: string; data: string }) => {
        if (msg.serviceId === serviceId) {
          term.write(msg.data);
          onDataRef.current?.(msg.data);
        }
      }
    );

    const unsubExit = window.electronAPI.onPtyExit(
      (msg: { serviceId: string; exitCode: number }) => {
        if (msg.serviceId === serviceId) {
          term.writeln(`\r\n\x1b[90m[Shell exited with code ${msg.exitCode}]\x1b[0m`);
        }
      }
    );

    window.electronAPI.ptySpawn(serviceId, cwd, logFile).then(() => {
      try {
        fit.fit();
        window.electronAPI.ptyResize(serviceId, term.cols, term.rows);
      } catch { /* ignore */ }
      term.focus();
    });

    const onResize = () => {
      try { fit.fit(); } catch { /* ignore */ }
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      unsubData();
      unsubExit();
      if (!keepAliveRef.current) {
        window.electronAPI.ptyKill(serviceId);
      }
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [serviceId]);

  // Re-fit and focus when becoming visible
  useEffect(() => {
    if (!visible || !termRef.current || !fitRef.current) return;
    const timer = setTimeout(() => {
      try {
        fitRef.current?.fit();
        termRef.current?.focus();
      } catch { /* ignore */ }
    }, 100);
    return () => clearTimeout(timer);
  }, [visible]);

  // Execute pending command when it arrives
  useEffect(() => {
    if (!pendingCommand || !visible) return;
    // Small delay to let the shell be ready
    const timer = setTimeout(() => {
      const cmd = consumePendingCommand?.();
      if (cmd) writeCommand(cmd);
    }, 500);
    return () => clearTimeout(timer);
  }, [pendingCommand, visible]);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (quickCommands && quickCommands.length > 0) {
      e.preventDefault();
      setCtxMenu({ top: e.clientY, left: e.clientX });
    }
  };

  return (
    <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        p: 1,
        backgroundColor: '#21262d',
        borderBottom: '1px solid #30363d',
      }}>
        <Typography variant="caption" sx={{ color: '#7d8590', fontFamily: 'monospace' }}>
          Interactive Shell • {serviceName} • {cwd}
        </Typography>
      </Box>
      <Box
        ref={containerRef}
        onClick={() => termRef.current?.focus()}
        onContextMenu={handleContextMenu}
        sx={{
          flex: 1,
          backgroundColor: '#0d1117',
          minHeight: '300px',
          '& .xterm': { height: '100% !important', width: '100% !important' },
          '& .xterm-viewport': { backgroundColor: 'transparent !important' },
          '& .xterm-screen': { backgroundColor: 'transparent !important' },
        }}
      />

      {/* Right-click quick commands menu */}
      <Menu
        open={Boolean(ctxMenu)}
        onClose={() => setCtxMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={ctxMenu || undefined}
      >
        {quickCommands?.map((qc, idx) => (
          <MenuItem
            key={idx}
            onClick={() => {
              setCtxMenu(null);
              writeCommand(qc.command);
            }}
          >
            <ListItemText
              primary={qc.name}
              secondary={qc.command}
              secondaryTypographyProps={{ variant: 'caption', sx: { fontFamily: 'monospace' } }}
            />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default InteractiveTerminal;
