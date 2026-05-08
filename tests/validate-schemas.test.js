/**
 * Test script to validate example configurations with Zod schemas
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { validateService } from '../electron/schemas/config/service.js';
import { validateGlobalSettings } from '../electron/schemas/config/global-settings.js';
import { validateAppConfig } from '../electron/schemas/config/app-config.js';
import { validateTeamPresets } from '../electron/schemas/config/team-presets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const examplesDir = path.join(__dirname, '../config.templates');

console.log('🧪 Testing Zod Schema Validation\n');
console.log('='.repeat(60));

let passCount = 0;
let failCount = 0;

// Test service YAML files
console.log('\n📦 Testing Service YAML Files:');
console.log('-'.repeat(60));

const servicesDir = path.join(examplesDir, 'services');
const findYamlFiles = (dir) => {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...findYamlFiles(fullPath));
    } else if (item.isFile() && /\.(yaml|yml)$/i.test(item.name)) {
      files.push(fullPath);
    }
  }

  return files;
};

const serviceFiles = findYamlFiles(servicesDir);

for (const filePath of serviceFiles) {
  const relativePath = path.relative(examplesDir, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const data = yaml.load(content);

  const result = validateService(data, relativePath);

  if (result.success) {
    console.log(`✅ ${relativePath}`);
    passCount++;
  } else {
    console.log(`❌ ${relativePath}`);
    console.log(`   Error: ${result.error}`);
    if (result.issues) {
      result.issues.forEach(issue => {
        console.log(`   - ${issue.path}: ${issue.message}`);
      });
    }
    failCount++;
  }
}

// Test global-settings.yaml
console.log('\n⚙️  Testing Global Settings:');
console.log('-'.repeat(60));

const globalSettingsPath = path.join(examplesDir, 'global-settings.yaml');
if (fs.existsSync(globalSettingsPath)) {
  const content = fs.readFileSync(globalSettingsPath, 'utf8');
  const data = yaml.load(content);

  const result = validateGlobalSettings(data);

  if (result.success) {
    console.log('✅ global-settings.yaml');
    passCount++;
  } else {
    console.log('❌ global-settings.yaml');
    console.log(`   Error: ${result.error}`);
    if (result.issues) {
      result.issues.forEach(issue => {
        console.log(`   - ${issue.path}: ${issue.message}`);
      });
    }
    failCount++;
  }
}

// Test app.config.yaml
console.log('\n🔧 Testing App Configuration:');
console.log('-'.repeat(60));

const appConfigPath = path.join(examplesDir, 'app.config.yaml');
if (fs.existsSync(appConfigPath)) {
  const content = fs.readFileSync(appConfigPath, 'utf8');
  const data = yaml.load(content);

  const result = validateAppConfig(data);

  if (result.success) {
    console.log('✅ app.config.yaml');
    passCount++;
  } else {
    console.log('❌ app.config.yaml');
    console.log(`   Error: ${result.error}`);
    if (result.issues) {
      result.issues.forEach(issue => {
        console.log(`   - ${issue.path}: ${issue.message}`);
      });
    }
    failCount++;
  }
}

// Test team-presets.yaml
console.log('\n👥 Testing Team Presets:');
console.log('-'.repeat(60));

const teamPresetsPath = path.join(examplesDir, 'team-presets.yaml');
if (fs.existsSync(teamPresetsPath)) {
  const content = fs.readFileSync(teamPresetsPath, 'utf8');
  const data = yaml.load(content);

  const result = validateTeamPresets(data);

  if (result.success) {
    console.log('✅ team-presets.yaml');
    passCount++;
  } else {
    console.log('❌ team-presets.yaml');
    console.log(`   Error: ${result.error}`);
    if (result.issues) {
      result.issues.forEach(issue => {
        console.log(`   - ${issue.path}: ${issue.message}`);
      });
    }
    failCount++;
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Test Summary:');
console.log(`   ✅ Passed: ${passCount}`);
console.log(`   ❌ Failed: ${failCount}`);
console.log(`   📝 Total:  ${passCount + failCount}`);
console.log('='.repeat(60));

// Exit with appropriate code
process.exit(failCount > 0 ? 1 : 0);
