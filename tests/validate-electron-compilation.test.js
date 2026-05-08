/**
 * Electron Backend Compilation Test
 * Validates TypeScript compilation and JavaScript module syntax
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runTest(testName, testFn) {
  totalTests++;
  try {
    testFn();
    passedTests++;
    log(`  ✓ ${testName}`, colors.green);
    return true;
  } catch (error) {
    failedTests++;
    log(`  ✗ ${testName}`, colors.red);
    log(`    ${error.message}`, colors.red);
    return false;
  }
}

// Test 1: TypeScript compilation for Drizzle schemas
function testTypeScriptCompilation() {
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');

  // Check if tsconfig.json exists
  if (!existsSync(tsconfigPath)) {
    throw new Error('tsconfig.json not found');
  }

  try {
    // Run TypeScript compiler in no-emit mode (just check for errors)
    execSync('npx tsc --noEmit', {
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
  } catch (error) {
    // TypeScript errors will be in stderr
    throw new Error(`TypeScript compilation failed:\n${error.stderr || error.stdout}`);
  }
}

// Test 2: Check Drizzle schema files exist and are valid
function testDrizzleSchemaFiles() {
  const schemaFiles = [
    'electron/database/schema/app.js',
    'electron/database/schema/service-orchestration.js',
    'electron/database/schema/git.js',
    'electron/database/schema/meta.js',
    'electron/database/schema/index.js',
  ];

  const missingFiles = schemaFiles.filter(file => {
    const fullPath = path.join(projectRoot, file);
    return !existsSync(fullPath);
  });

  if (missingFiles.length > 0) {
    throw new Error(`Missing Drizzle schema files: ${missingFiles.join(', ')}`);
  }
}

// Test 3: Check database repositories exist
function testDatabaseRepositories() {
  const repoFiles = [
    'electron/database/repositories/app/app-settings.js',
    'electron/database/repositories/app/team-configs.js',
    'electron/database/repositories/app/view-states.js',
    'electron/database/repositories/app/notifications.js',
    'electron/database/repositories/service-orchestration/service-state.js',
    'electron/database/repositories/git/git-settings.js',
    'electron/database/repositories/git/merge-requests.js',
  ];

  const missingFiles = repoFiles.filter(file => {
    const fullPath = path.join(projectRoot, file);
    return !existsSync(fullPath);
  });

  if (missingFiles.length > 0) {
    throw new Error(`Missing repository files: ${missingFiles.join(', ')}`);
  }
}

// Test 4: Validate main Electron entry point syntax
function testElectronMainSyntax() {
  const mainPath = path.join(projectRoot, 'electron/main.js');

  if (!existsSync(mainPath)) {
    throw new Error('electron/main.js not found');
  }

  try {
    // Use Node.js --check flag to validate syntax without executing
    execSync(`node --check "${mainPath}"`, {
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
  } catch (error) {
    throw new Error(`electron/main.js syntax error:\n${error.stderr || error.stdout}`);
  }
}

// Test 5: Validate database index.js syntax
function testDatabaseIndexSyntax() {
  const dbIndexPath = path.join(projectRoot, 'electron/database/index.js');

  if (!existsSync(dbIndexPath)) {
    throw new Error('electron/database/index.js not found');
  }

  try {
    execSync(`node --check "${dbIndexPath}"`, {
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
  } catch (error) {
    throw new Error(`electron/database/index.js syntax error:\n${error.stderr || error.stdout}`);
  }
}

// Test 6: Check Drizzle ORM dependencies
function testDrizzleDependencies() {
  const packageJsonPath = path.join(projectRoot, 'package.json');

  if (!existsSync(packageJsonPath)) {
    throw new Error('package.json not found');
  }

  const packageJson = JSON.parse(execSync(`cat "${packageJsonPath}"`, { encoding: 'utf-8' }));

  if (!packageJson.dependencies['drizzle-orm']) {
    throw new Error('drizzle-orm not found in dependencies');
  }

  if (!packageJson.devDependencies['drizzle-kit']) {
    throw new Error('drizzle-kit not found in devDependencies');
  }
}

// Test 7: Validate Drizzle config exists
function testDrizzleConfig() {
  const drizzleConfigPath = path.join(projectRoot, 'drizzle.config.ts');

  if (!existsSync(drizzleConfigPath)) {
    throw new Error('drizzle.config.ts not found');
  }
}

// Test 8: Check Electron backend uses JavaScript
function testJavaScriptSchemas() {
  const schemaFiles = [
    'electron/database/schema/app.js',
    'electron/database/schema/index.js',
  ];

  const missingFiles = schemaFiles.filter(file => {
    const fullPath = path.join(projectRoot, file);
    return !existsSync(fullPath);
  });

  if (missingFiles.length > 0) {
    throw new Error(`Schemas should be JavaScript files: ${missingFiles.join(', ')}`);
  }

  // Check that TypeScript schemas don't exist
  const tsFiles = [
    'electron/database/schema/app.ts',
    'electron/database/schema/index.ts',
  ];

  const foundTsFiles = tsFiles.filter(file => {
    const fullPath = path.join(projectRoot, file);
    return existsSync(fullPath);
  });

  if (foundTsFiles.length > 0) {
    throw new Error(`Found TypeScript schema files (should be .js): ${foundTsFiles.join(', ')}`);
  }
}

// Main test runner
async function runAllTests() {
  log(`\n${colors.bold}${colors.cyan}Electron Backend Compilation Tests${colors.reset}\n`);

  // Run all tests
  runTest('TypeScript compilation', testTypeScriptCompilation);
  runTest('Drizzle schema files exist', testDrizzleSchemaFiles);
  runTest('Database repositories exist', testDatabaseRepositories);
  runTest('Electron main.js syntax valid', testElectronMainSyntax);
  runTest('Database index.js syntax valid', testDatabaseIndexSyntax);
  runTest('Drizzle ORM dependencies installed', testDrizzleDependencies);
  runTest('Drizzle config exists', testDrizzleConfig);
  runTest('Schemas are JavaScript (not TypeScript)', testJavaScriptSchemas);

  // Summary
  log('');
  log('─'.repeat(50), colors.cyan);
  log(`Total Tests: ${totalTests}`, colors.bold);
  log(`Passed: ${passedTests}`, colors.green);
  log(`Failed: ${failedTests}`, colors.red);
  log('─'.repeat(50), colors.cyan);

  if (failedTests > 0) {
    log(`\n${colors.bold}${colors.red}❌ Electron compilation tests failed${colors.reset}\n`);
    process.exit(1);
  } else {
    log(`\n${colors.bold}${colors.green}✅ All Electron compilation tests passed!${colors.reset}\n`);
    process.exit(0);
  }
}

// Run tests
runAllTests();
