import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const execFileAsync = promisify(execFile);

const MAX_DEPTH = 3;
const TIMEOUT_MS = 5000;

/**
 * Run a command and return stdout (swallows errors gracefully).
 */
async function runCommand(cmd, args = [], options = {}) {
  try {
    const { stdout } = await execFileAsync(cmd, args, {
      timeout: TIMEOUT_MS,
      encoding: 'utf8',
      env: { ...process.env, PAGER: '', AWS_PAGER: '', GIT_PAGER: '' },
      ...options,
    });
    return stdout;
  } catch (err) {
    // Some CLIs exit non-zero on --help but still output useful text
    if (err.stdout) return err.stdout;
    return null;
  }
}

/**
 * Detect current version of a binary.
 */
export async function detectVersion(binary, versionFlag = '--version') {
  const output = await runCommand(binary, [versionFlag]);
  if (!output) return null;
  // Extract first version-like string
  const match = output.match(/(\d+\.\d+[\w.-]*)/);
  return match ? match[1] : output.trim().split('\n')[0];
}

/**
 * Parse help output using a regex pattern.
 * Returns array of { name, description }.
 */
function parseHelpOutput(output, commandPattern, stopPattern) {
  const regex = new RegExp(commandPattern, 'gm');
  const stop = stopPattern ? new RegExp(stopPattern) : null;
  const results = [];
  const lines = output.split('\n');

  for (const line of lines) {
    if (stop && stop.test(line)) break;
    const match = regex.exec(line);
    if (match) {
      results.push({
        name: match[1].replace(/\*$/, ''), // strip trailing * (docker plugins)
        description: (match[2] || '').trim(),
      });
    }
    // Reset regex lastIndex for line-by-line matching
    regex.lastIndex = 0;
  }
  return results;
}

/**
 * Parse flags from help output.
 * Returns array of { name, shortFlag, description }.
 */
function parseFlags(output) {
  const regex = /^\s+(?:(-\w),\s+)?(--[\w-]+)(?:\s+\S+)?\s{2,}(.+)$/gm;
  const results = [];
  const lines = output.split('\n');
  for (const line of lines) {
    regex.lastIndex = 0;
    const match = regex.exec(line);
    if (match) {
      results.push({
        name: match[2],
        shortFlag: match[1] || null,
        description: match[3].trim(),
      });
    }
  }
  return results;
}

/**
 * Recursively introspect a CLI command tree.
 */
async function introspectRecursive(binary, subPath, helpFlag, parser, depth, onProgress = null) {
  if (depth >= MAX_DEPTH) return [];

  const args = [...subPath, helpFlag];
  const output = await runCommand(binary, args);
  if (!output) return [];

  const commands = parseHelpOutput(output, parser.commandPattern, parser.stopPattern);

  // Validate — if results look like garbage (bullets, URLs, flags), treat as leaf
  const validCount = commands.filter(c => /^[a-z][\w-]*$/i.test(c.name)).length;
  if (commands.length === 0 || validCount / commands.length < 0.5) {
    return { __flags: parseFlags(output) };
  }

  // Recurse into subcommands (depth + 1)
  if (depth < MAX_DEPTH - 1) {
    for (const cmd of commands) {
      if (onProgress) onProgress(`  ${'  '.repeat(depth)}${subPath.join(' ')} ${cmd.name}`);
      const result = await introspectRecursive(
        binary,
        [...subPath, cmd.name],
        helpFlag,
        parser,
        depth + 1,
        onProgress
      );
      if (result && result.__flags) {
        cmd.flags = result.__flags;
      } else if (Array.isArray(result) && result.length > 0) {
        cmd.subcommands = result;
      }
    }
  }

  return commands;
}

/**
 * Default parser patterns to try (covers ~70% of CLIs).
 */
const DEFAULT_PATTERNS = [
  // gh-style: "  command:    description"
  { commandPattern: '^\\s+(\\S+):\\s{2,}(.+)$', stopPattern: '^\\s*(FLAGS|INHERITED|LEARN MORE)' },
  // docker/kubectl-style: "  command    description" (2+ space indent)
  { commandPattern: '^\\s{2,}(\\S+?)\\*?\\s{2,}(.+)$', stopPattern: '^\\s*(Options|Global Options|Flags):' },
];

/**
 * Try default patterns against help output, return first that works.
 */
function detectParser(output) {
  for (const pattern of DEFAULT_PATTERNS) {
    const results = parseHelpOutput(output, pattern.commandPattern, pattern.stopPattern);
    if (results.length >= 3) return pattern; // found a working pattern
  }
  return null;
}

/**
 * Full introspection: detect version, detect/use parser, build tree, return cache object.
 */
export async function introspect(binary, helpFlag = '--help', versionFlag = '--version', parser = null, onProgress = null) {
  const log = (msg) => onProgress && onProgress(msg);

  log(`Detecting version: ${binary} ${versionFlag}`);
  const version = await detectVersion(binary, versionFlag);
  if (!version) throw new Error(`Could not detect version for ${binary}`);
  log(`Version: ${version}`);

  log(`Running: ${binary} ${helpFlag}`);
  const helpOutput = await runCommand(binary, [helpFlag]);
  if (!helpOutput) throw new Error(`No help output from: ${binary} ${helpFlag}`);

  // Extract one-liner description (first non-empty, non-usage, non-flag line)
  const descLine = helpOutput.split('\n')
    .map(l => l.trim())
    .find(l => l && l.length > 10
      && !l.startsWith('Usage') && !l.startsWith('usage')
      && !/^[\w-]+\s+[<\[]/.test(l)
      && !l.startsWith('-') && !l.startsWith('[')
      && !/^\w+:/.test(l));
  const description = descLine || '';

  const resolvedParser = parser || detectParser(helpOutput);
  if (!resolvedParser) {
    throw new Error(
      `Could not auto-detect help format for ${binary}. Use AI-assisted setup.`
    );
  }
  log(`Parser detected: ${resolvedParser.commandPattern}`);

  const commands = parseHelpOutput(helpOutput, resolvedParser.commandPattern, resolvedParser.stopPattern);
  log(`Found ${commands.length} top-level commands`);

  // Recurse into subcommands with progress tracking
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    log(`[${i + 1}/${commands.length}] ${binary} ${cmd.name}`);
    const subcommands = await introspectRecursive(binary, [cmd.name], helpFlag, resolvedParser, 1, onProgress);
    if (subcommands.length > 0) {
      cmd.subcommands = subcommands;
    }
  }

  log(`Done — ${commands.length} commands cached`);

  return {
    binary,
    version,
    description,
    helpFlag,
    versionFlag,
    parser: resolvedParser,
    commands,
  };
}

/**
 * Load cached tree from YAML file.
 */
export function loadCache(cacheDir, binary) {
  if (!fs.existsSync(cacheDir)) return null;
  const files = fs.readdirSync(cacheDir);
  const match = files.find(f => f.startsWith(`${binary}@`) && f.endsWith('.yaml'));
  if (!match) return null;
  const content = fs.readFileSync(path.join(cacheDir, match), 'utf8');
  return yaml.load(content);
}

/**
 * Save cache to YAML file (removes old versions).
 */
export function saveCache(cacheDir, tree) {
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  // Remove old cache for this binary
  const files = fs.readdirSync(cacheDir);
  for (const f of files) {
    if (f.startsWith(`${tree.binary}@`)) {
      fs.unlinkSync(path.join(cacheDir, f));
    }
  }

  const filename = `${tree.binary}@${tree.version}.yaml`;
  fs.writeFileSync(path.join(cacheDir, filename), yaml.dump(tree, { lineWidth: 120 }));
}

/**
 * Generate the AI-assist prompt for clipboard.
 */
export function generateAIPrompt(binary, helpFlag, versionFlag, cacheDir) {
  return `I need help configuring a CLI introspector for "${binary}".

1. Run: ${binary} ${helpFlag}
2. Look at the output format — how are subcommands listed?
3. Write a regex (JavaScript) that captures: group(1) = command name, group(2) = description

Then save this YAML to: ${cacheDir}/${binary}@<version>.yaml

\`\`\`yaml
binary: "${binary}"
version: "<run ${binary} ${versionFlag} to get this>"
helpFlag: "${helpFlag}"
versionFlag: "${versionFlag}"
parser:
  commandPattern: "<your regex here>"
  stopPattern: "<regex for where to stop parsing, e.g. FLAGS or OPTIONS section>"
commands: []
\`\`\`

Leave commands as empty array — the app will run the introspection automatically once the parser regex is correct.
Do NOT recursively call subcommands yourself. Just provide the regex pattern.`;
}
