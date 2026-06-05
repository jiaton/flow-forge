/**
 * Service Configuration Schema
 * Validates individual service YAML files
 */

import { z } from 'zod';

// Commands schema
export const ServiceCommandsSchema = z.object({
  start: z.string().optional(),
  stop: z.string().optional(),
  check: z.string().optional(),
  openIDE: z.union([z.string(), z.array(z.object({ name: z.string(), command: z.string() }))]).optional(),
}).catchall(z.string());

// Quick command schema
export const QuickCommandSchema = z.object({
  name: z.string().min(1),
  command: z.string().min(1),
  category: z.string().optional(),
});

// Patch definition schema (team-defined patches)
export const PatchDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  file: z.string().min(1),
});

// Environments schema - flexible key-value map for any environment name
// This is better than loose() because it validates that all values are strings
export const ServiceEnvironmentsSchema = z.record(z.string(), z.string().optional());

// Git configuration schema - known fields typed, others allowed as unknown
export const ServiceGitConfigSchema = z.object({
  projectId: z.string(),
  defaultReviewers: z.array(z.string()).optional(),
}).catchall(z.unknown()); // Allows git provider-specific fields

// Docker configuration schema
export const DockerConfigSchema = z.object({
  composePath: z.string().default('docker-compose.yml'),
  service: z.string().optional(),
  pull: z.enum(['auto', 'always', 'never']).default('auto'),
}).optional();

// Main service schema - strict core fields, extensible with catchall
export const ServiceSchema = z.object({
  serviceId: z.string().min(1, 'serviceId is required'),
  name: z.string().min(1, 'name is required'),
  type: z.string().min(1, 'type is required'),
  mode: z.enum(['process', 'docker']).default('process'),
  description: z.string().optional(),
  port: z.number().int().positive().optional(),
  path: z.string().optional(),
  git: ServiceGitConfigSchema.optional(),
  docker: DockerConfigSchema,
  commands: ServiceCommandsSchema.optional(),
  quickCommands: z.array(QuickCommandSchema).optional(),
  environments: ServiceEnvironmentsSchema.optional(),
  routines: z.record(z.string(), z.string()).optional(),
  patches: z.array(PatchDefinitionSchema).optional(),
}).catchall(z.unknown()); // Allows service-specific metadata

// Helper to validate service with better error messages
export function validateService(data, filePath = 'unknown') {
  try {
    return {
      success: true,
      data: ServiceSchema.parse(data),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = (error.errors || []).map(err => ({
        path: Array.isArray(err.path) ? err.path.join('.') : String(err.path || ''),
        message: err.message || 'Unknown validation error',
      }));
      return {
        success: false,
        error: `Service validation failed in ${filePath}`,
        issues,
      };
    }
    return {
      success: false,
      error: error?.message || 'Unknown error during validation',
    };
  }
}
