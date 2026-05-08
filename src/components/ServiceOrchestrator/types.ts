import { ServiceStatus, ServiceMode } from '../../shared/constants/service';

export interface QuickCommand {
  name: string;
  command: string;
  category?: string;
}

export interface DockerConfig {
  composePath?: string;
  service?: string;
  pull?: 'auto' | 'always' | 'never';
}

export interface Service {
  id: string;
  name: string;
  type: string;
  mode?: ServiceMode;
  status: ServiceStatus;
  description: string;
  port?: number;
  endpoint?: string;
  path?: string;
  detached?: boolean;
  docker?: DockerConfig;
  quickCommands?: QuickCommand[];
  routines?: Record<string, string>;

  // Diagnostic fields for hybrid PID tracking
  pid?: number;
  diagnosticMessage?: string;
  detectionMethod?: 'pid-file' | 'port-based' | 'command-check' | null;
  lastChecked?: string;
  processInfo?: {
    running: boolean;
    pid: number | null;
    method: string | null;
    checkCommand: string | null;
    lastChecked: string;
  };
  portInfo?: {
    listening: boolean;
    number: number | null;
    checkResult: string | null;
  };
}

export interface ServiceLog {
  timestamp: string;
  level: string;
  message: string;
  details?: unknown;
  source?: 'stdout' | 'stderr' | 'system';
}

export interface ServiceOrchestratorProps {
  viewId: string;
}