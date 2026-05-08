/**
 * Module Auto-Discovery
 *
 * Automatically discovers all modules in this directory.
 * To add a new module, simply create a new *.ts file here — no registration needed.
 *
 * Convention: module files use kebab-case (e.g. my-feature.ts).
 * MODULE_TEMPLATE.ts is excluded because it starts with an uppercase letter.
 */

import type { Module } from '../core/module-system/types';

// Vite scans all lowercase-named .ts files at build time (excludes MODULE_TEMPLATE.ts)
const moduleFiles = import.meta.glob<Record<string, unknown>>('./[a-z]*.ts', { eager: true });

export const allModules: Module[] = Object.values(moduleFiles)
  .flatMap(file => Object.values(file))
  .filter((exp): exp is Module =>
    exp !== null &&
    typeof exp === 'object' &&
    'metadata' in (exp as object) &&
    'component' in (exp as object)
  );
