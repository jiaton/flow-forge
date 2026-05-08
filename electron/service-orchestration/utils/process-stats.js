/**
 * Process Stats — get CPU% and memory for a PID and its children.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../../utils/logger.js';

const execFileAsync = promisify(execFile);
const log = createLogger('ProcessStats');

/**
 * Get CPU% and RSS (MB) for a process group (async).
 * Uses `ps` to find the PID + all descendants, then sums.
 */
export async function getProcessStats(pid) {
  try {
    const { stdout } = await execFileAsync('ps', ['-eo', 'ppid=,pid=,%cpu=,rss='], { encoding: 'utf8', timeout: 3000 });

    const lines = stdout.trim().split('\n').map(line => {
      const parts = line.trim().split(/\s+/);
      return { ppid: parseInt(parts[0]), pid: parseInt(parts[1]), cpu: parseFloat(parts[2]), rss: parseInt(parts[3]) };
    }).filter(p => !isNaN(p.pid));

    // Find all descendants of the target PID
    const treePids = new Set([pid]);
    let added = true;
    while (added) {
      added = false;
      for (const p of lines) {
        if (treePids.has(p.ppid) && !treePids.has(p.pid)) {
          treePids.add(p.pid);
          added = true;
        }
      }
    }

    let totalCpu = 0;
    let totalRss = 0;
    for (const p of lines) {
      if (treePids.has(p.pid)) {
        totalCpu += p.cpu;
        totalRss += p.rss;
      }
    }

    if (totalCpu === 0 && totalRss === 0 && treePids.size === 1) {
      if (!lines.some(p => p.pid === pid)) return null;
    }

    return {
      cpu: Math.round(totalCpu * 10) / 10,
      memory: Math.round(totalRss / 1024),
    };
  } catch {
    return null;
  }
}

/**
 * Get stats for all running services (async, parallel).
 * @param {Map} services - serviceStateManager.services
 */
export async function getAllServiceStats(services) {
  const entries = [];
  const dockerEntries = [];
  for (const [serviceId, service] of services.entries()) {
    if (service.processType === 'docker') {
      dockerEntries.push(serviceId);
    } else {
      const pid = service.pid || service.process?.pid;
      if (pid) entries.push({ serviceId, pid });
    }
  }

  const results = await Promise.all(entries.map(async ({ serviceId, pid }) => {
    const s = await getProcessStats(pid);
    return s ? [serviceId, s] : null;
  }));

  // Collect Docker container stats
  if (dockerEntries.length > 0) {
    const dockerStats = await getDockerStats();
    for (const serviceId of dockerEntries) {
      if (dockerStats[serviceId]) {
        results.push([serviceId, dockerStats[serviceId]]);
      }
    }
  }

  return Object.fromEntries(results.filter(Boolean));
}

/**
 * Get CPU/memory stats for all running Docker containers.
 * Maps container names back to service IDs.
 */
async function getDockerStats() {
  try {
    const { stdout } = await execFileAsync('docker', ['stats', '--no-stream', '--format', '{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'], { timeout: 5000 });
    const stats = {};
    for (const line of stdout.trim().split('\n')) {
      if (!line) continue;
      const [name, cpuStr, memStr] = line.split('\t');
      const cpu = parseFloat(cpuStr) || 0;
      // memStr is like "45.2MiB / 7.77GiB" — parse the usage part
      const memMatch = memStr?.match(/([\d.]+)\s*(MiB|GiB|KiB)/);
      let memMB = 0;
      if (memMatch) {
        const val = parseFloat(memMatch[1]);
        if (memMatch[2] === 'GiB') memMB = Math.round(val * 1024);
        else if (memMatch[2] === 'MiB') memMB = Math.round(val);
        else if (memMatch[2] === 'KiB') memMB = Math.round(val / 1024);
      }
      stats[name] = { cpu: Math.round(cpu * 10) / 10, memory: memMB };
    }

    // Aggregate by service — match container names to service IDs
    // Container names from compose are typically: {project}-{service}-{n} or custom container_name
    const { serviceCommands } = await import('../config/microservice-config.js');
    const result = {};
    for (const [serviceId, cfg] of Object.entries(serviceCommands)) {
      if (cfg.mode !== 'docker') continue;
      // Sum stats for all containers belonging to this compose project
      const projectDir = (cfg.path || '').split('/').pop() || serviceId;
      let totalCpu = 0, totalMem = 0, found = false;
      for (const [containerName, s] of Object.entries(stats)) {
        if (containerName.startsWith(projectDir) || containerName.includes(serviceId)) {
          totalCpu += s.cpu;
          totalMem += s.memory;
          found = true;
        }
      }
      if (found) result[serviceId] = { cpu: Math.round(totalCpu * 10) / 10, memory: totalMem };
    }
    return result;
  } catch {
    return {};
  }
}
