/**
 * Global Settings Configuration Schema
 * Validates global-settings.yaml
 */

import { z } from 'zod';

// Tool configuration schema (for IDE, terminal, file manager)
export const ToolConfigSchema = z.object({
  command: z.string().min(1),
  args: z.string().optional(),
}).strict();

// IDE can be a single tool or a list of tools
const IdeConfigSchema = z.union([
  ToolConfigSchema,
  z.array(ToolConfigSchema).min(1),
]);

// Main global settings schema
export const GlobalSettingsSchema = z.object({
  ide: IdeConfigSchema.optional(),
}).strict();

// Helper to validate global settings with better error messages
export function validateGlobalSettings(data) {
  try {
    return {
      success: true,
      data: GlobalSettingsSchema.parse(data),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = (error.issues || error.errors || []).map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      return {
        success: false,
        error: 'Global settings validation failed',
        issues,
      };
    }
    return {
      success: false,
      error: error.message,
    };
  }
}
