/**
 * PID File Management Module
 * Handles PID file operations for hybrid service detection
 *
 * PID files are stored in /tmp for OS-managed auto-cleanup on reboot
 */
import fs from 'fs';
import path from 'path';
import { execSync, execFile } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../../utils/logger.js';

const execFileAsync = promisify(execFile);
const log = createLogger('PidManager');
const PID_DIR = '/tmp';
/**
 * Write PID file for a service
 */
export function writePidFile(serviceId, pid, workingDir) {
    const pidPath = path.join(PID_DIR, `${serviceId}.pid`);
    const data = {
        pid,
        workingDir,
        timestamp: Date.now()
    };
    try {
        fs.writeFileSync(pidPath, JSON.stringify(data), 'utf8');
        log.debug('Written PID file', { serviceId, pid, path: pidPath });
        return true;
    }
    catch (error) {
        log.error('Failed to write PID file', error, { serviceId });
        return false;
    }
}
/**
 * Read and validate PID file
 */
export function readPidFile(serviceId) {
    const pidPath = path.join(PID_DIR, `${serviceId}.pid`);
    try {
        if (!fs.existsSync(pidPath)) {
            return null;
        }
        const content = fs.readFileSync(pidPath, 'utf8');
        const data = JSON.parse(content);
        // Validate structure
        if (!data.pid || !data.workingDir) {
            log.warn('Invalid PID file structure', { serviceId });
            return null;
        }
        log.debug('Read PID file', { serviceId, pid: data.pid });
        return data;
    }
    catch (error) {
        log.error('Failed to read PID file', error, { serviceId });
        return null;
    }
}
/**
 * Verify PID is still running and in correct directory
 */
export function validatePid(pid, expectedWorkingDir) {
    try {
        // Check if process exists (signal 0 doesn't actually send a signal)
        process.kill(pid, 0);
        // Verify working directory via lsof
        const cmd = `lsof -a -p ${pid} -d cwd 2>/dev/null | tail -n 1 | awk '{print $NF}'`;
        const actualDir = execSync(cmd, { encoding: 'utf8' }).trim();
        // Expand environment variables in expected path
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        const expandedExpected = expectedWorkingDir
            .replace(/~/g, homeDir)
            .replace(/\$HOME/g, homeDir);
        const valid = actualDir === expandedExpected;
        if (!valid && actualDir) {
            log.debug('PID directory mismatch', {
                pid,
                expected: expandedExpected,
                actual: actualDir
            });
        }
        return { valid, actualDir };
    }
    catch (error) {
        // Process doesn't exist or lsof failed
        log.debug('PID validation failed', {
            pid,
            error: error instanceof Error ? error.message : String(error)
        });
        return { valid: false, actualDir: null };
    }
}
/**
 * Remove PID file for a service
 */
export function removePidFile(serviceId) {
    const pidPath = path.join(PID_DIR, `${serviceId}.pid`);
    try {
        if (fs.existsSync(pidPath)) {
            fs.unlinkSync(pidPath);
            log.debug('Removed PID file', { serviceId });
            return true;
        }
        return false;
    }
    catch (error) {
        log.error('Failed to remove PID file', error, { serviceId });
        return false;
    }
}
/**
 * Extract PID from port number using lsof (async)
 */
export async function findPidByPort(port) {
    try {
        const { stdout } = await execFileAsync('/usr/sbin/lsof', ['-ti', `:${port}`], { encoding: 'utf8', timeout: 3000 });
        const pid = parseInt(stdout.trim().split('\n')[0], 10);
        if (isNaN(pid)) {
            log.debug('No valid PID found for port', { port });
            return null;
        }
        log.debug('Found PID by port', { port, pid });
        return pid;
    }
    catch (error) {
        log.debug('Port check failed', {
            port,
            error: error instanceof Error ? error.message : String(error)
        });
        return null;
    }
}
/**
 * Extract PID from command output
 * Attempts to parse PID from various check command output formats
 */
export function extractPidFromOutput(output) {
    if (!output || !output.trim()) {
        return null;
    }
    // Try to find first number that looks like a PID (3+ digits)
    const pidMatch = output.match(/\b(\d{3,})\b/);
    if (pidMatch) {
        const pid = parseInt(pidMatch[1], 10);
        log.debug('Extracted PID from output', { pid });
        return pid;
    }
    return null;
}
/**
 * Clean up all PID files for a given prefix
 * Useful for bulk cleanup during shutdown
 */
export function cleanupPidFiles(prefix = '') {
    try {
        const files = fs.readdirSync(PID_DIR);
        const pidFiles = files.filter(f => f.endsWith('.pid') && f.startsWith(prefix));
        let cleaned = 0;
        for (const file of pidFiles) {
            try {
                fs.unlinkSync(path.join(PID_DIR, file));
                cleaned++;
            }
            catch {
                // Ignore individual file errors
            }
        }
        if (cleaned > 0) {
            log.info('Cleaned up PID files', { count: cleaned, prefix });
        }
        return cleaned;
    }
    catch (error) {
        log.error('Failed to cleanup PID files', error, { prefix });
        return 0;
    }
}
//# sourceMappingURL=pid-manager.js.map