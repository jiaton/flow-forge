/**
 * Routine Configuration Schema
 * Validates routine YAML files from config/routines/
 */

import { z } from 'zod';

// Step that runs a named action on services
const ServiceActionStep = z.object({
  action: z.string().min(1),
  services: z.union([z.literal('all'), z.array(z.coerce.string().min(1)).min(1)]),
});

// Step that runs an arbitrary command in a directory
const GlobalRunStep = z.object({
  run: z.string().min(1),
  dir: z.string().min(1),
});

const RoutineStep = z.union([ServiceActionStep, GlobalRunStep]);

export const RoutineSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  notify: z.boolean().optional().default(false),
  steps: z.array(RoutineStep).min(1, 'at least one step is required'),
});

export function validateRoutine(data, filePath = 'unknown') {
  try {
    return { success: true, data: RoutineSchema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = (error.issues || error.errors || []).map(err => ({
        path: Array.isArray(err.path) ? err.path.join('.') : String(err.path || ''),
        message: err.message || 'Unknown validation error',
      }));
      return { success: false, error: `Routine validation failed in ${filePath}`, issues };
    }
    return { success: false, error: error?.message || 'Unknown error' };
  }
}
