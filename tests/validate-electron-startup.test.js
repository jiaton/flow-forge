/**
 * Electron App Startup Test
 * Validates that the Electron app can start successfully in development mode
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Configuration
const STARTUP_TIMEOUT = 30000; // 30 seconds
const SUCCESS_INDICATORS = [
  'Database initialized successfully',
  'Electron app is ready',
  'ready',
];

const ERROR_INDICATORS = [
  'Error:',
  'ERROR',
  'EADDRINUSE',
  'Cannot find module',
  'SyntaxError',
  'ReferenceError',
  'TypeError',
  'Failed to',
];

async function testElectronStartup() {
  return new Promise((resolve, reject) => {
    log(`\n${colors.bold}${colors.cyan}Electron App Startup Test${colors.reset}\n`);
    log('Starting Electron app in development mode...\n', colors.cyan);

    let viteProcess = null;
    let electronProcess = null;
    let startupSuccess = false;
    let hasErrors = false;
    const outputLines = [];

    // Start Vite dev server first
    log('Starting Vite dev server...', colors.yellow);
    viteProcess = spawn('npm', ['run', 'dev'], {
      cwd: projectRoot,
      stdio: 'pipe',
      shell: true,
    });

    let viteReady = false;

    viteProcess.stdout.on('data', (data) => {
      const output = data.toString();
      outputLines.push(output);

      if (output.includes('Local:') && output.includes('5173')) {
        viteReady = true;
        log('  ✓ Vite dev server started on port 5173', colors.green);
        log('\nStarting Electron app...', colors.yellow);

        // Start Electron after Vite is ready
        electronProcess = spawn('electron', ['electron/main.js'], {
          cwd: projectRoot,
          stdio: 'pipe',
          shell: true,
          env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
        });

        // Monitor Electron output
        electronProcess.stdout.on('data', (data) => {
          const output = data.toString();
          outputLines.push(output);

          // Check for success indicators
          if (SUCCESS_INDICATORS.some(indicator => output.includes(indicator))) {
            if (!startupSuccess) {
              startupSuccess = true;
              log('  ✓ Electron app started successfully', colors.green);
              log('\n' + '─'.repeat(50), colors.cyan);
              log('Status: SUCCESS', colors.green);
              log('─'.repeat(50), colors.cyan);
              log(`\n${colors.bold}${colors.green}✅ Electron app startup test passed!${colors.reset}\n`);
              cleanup();
              resolve();
            }
          }

          // Check for errors
          if (ERROR_INDICATORS.some(indicator => output.includes(indicator))) {
            hasErrors = true;
          }
        });

        electronProcess.stderr.on('data', (data) => {
          const output = data.toString();
          outputLines.push(output);

          // Check for errors (but ignore some expected warnings)
          if (ERROR_INDICATORS.some(indicator => output.includes(indicator))) {
            // Ignore Electron deprecation warnings
            if (!output.includes('DeprecationWarning') && !output.includes('Electron Security Warning')) {
              hasErrors = true;
            }
          }
        });

        electronProcess.on('error', (error) => {
          log(`\n  ✗ Electron process error: ${error.message}`, colors.red);
          hasErrors = true;
          cleanup();
          reject(new Error(`Electron failed to start: ${error.message}`));
        });

        electronProcess.on('exit', (code) => {
          if (!startupSuccess && code !== 0) {
            log(`\n  ✗ Electron exited with code ${code}`, colors.red);
            hasErrors = true;
            cleanup();
            reject(new Error(`Electron exited with code ${code}`));
          }
        });
      }
    });

    viteProcess.stderr.on('data', (data) => {
      const output = data.toString();
      outputLines.push(output);

      if (ERROR_INDICATORS.some(indicator => output.includes(indicator))) {
        if (output.includes('EADDRINUSE')) {
          log('  ✗ Port 5173 is already in use. Please run: npm run clean-ports', colors.red);
          hasErrors = true;
          cleanup();
          reject(new Error('Port 5173 is already in use'));
        }
      }
    });

    viteProcess.on('error', (error) => {
      log(`\n  ✗ Vite process error: ${error.message}`, colors.red);
      cleanup();
      reject(new Error(`Vite failed to start: ${error.message}`));
    });

    // Timeout handler
    const timeoutId = setTimeout(() => {
      if (!startupSuccess) {
        log('\n' + '─'.repeat(50), colors.red);
        log('Status: TIMEOUT', colors.red);
        log('─'.repeat(50), colors.red);
        log(`\n  ✗ Electron app did not start within ${STARTUP_TIMEOUT / 1000} seconds`, colors.red);

        if (hasErrors) {
          log('\nError output:', colors.yellow);
          outputLines.forEach(line => {
            if (ERROR_INDICATORS.some(indicator => line.includes(indicator))) {
              log(`  ${line.trim()}`, colors.red);
            }
          });
        }

        log(`\n${colors.bold}${colors.red}❌ Electron app startup test failed${colors.reset}\n`);
        cleanup();
        reject(new Error('Startup timeout'));
      }
    }, STARTUP_TIMEOUT);

    function cleanup() {
      clearTimeout(timeoutId);

      if (electronProcess) {
        try {
          electronProcess.kill('SIGTERM');
        } catch (e) {
          // Ignore
        }
      }

      if (viteProcess) {
        try {
          viteProcess.kill('SIGTERM');
        } catch (e) {
          // Ignore
        }
      }

      // Give processes time to clean up
      setTimeout(() => {
        // Force kill if still running
        try {
          if (electronProcess) electronProcess.kill('SIGKILL');
          if (viteProcess) viteProcess.kill('SIGKILL');
        } catch (e) {
          // Ignore
        }
      }, 1000);
    }

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      log('\n\nTest interrupted by user', colors.yellow);
      cleanup();
      process.exit(1);
    });
  });
}

// Run the test
testElectronStartup()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    log(`\nTest failed: ${error.message}`, colors.red);
    process.exit(1);
  });
