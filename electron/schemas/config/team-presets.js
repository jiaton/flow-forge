/**
 * Team Presets Configuration Schema
 * Validates team-presets.yaml
 */

import { z } from 'zod';

// JSON Template schema
export const JSONTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
}).strict();

// Module configuration schema
export const ModuleConfigSchema = z.object({
  enabled: z.boolean(),
  order: z.number().int().positive().optional(),
}).strict();

// Team configuration schema
export const TeamConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  presetServices: z.array(z.string()).optional(),
  modules: z.record(z.string(), ModuleConfigSchema).optional(),
  jsonTemplates: z.array(JSONTemplateSchema).optional(),
}).strict();

// Menu item schema
export const MenuItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  icon: z.string().optional(),
}).strict();

// Main team presets schema
export const TeamPresetsSchema = z.object({
  teams: z.record(z.string(), TeamConfigSchema).optional(),
  baseMenuItems: z.array(MenuItemSchema).optional(),
}).strict();

// Helper to validate team presets with better error messages
export function validateTeamPresets(data) {
  try {
    return {
      success: true,
      data: TeamPresetsSchema.parse(data),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = (error.issues || error.errors || []).map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      return {
        success: false,
        error: 'Team presets validation failed',
        issues,
      };
    }
    return {
      success: false,
      error: error.message,
    };
  }
}
