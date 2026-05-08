/**
 * Command Executor — delegates to shell service.
 * Kept for backward compatibility with existing callers.
 */
import { shellLogin } from './shell.js';

export async function executeCommand(command, options = {}) {
  return shellLogin(command, options);
}
