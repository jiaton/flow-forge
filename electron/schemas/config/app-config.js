/**
 * App Configuration Schema
 * Validates app.config.yaml
 */

import { z } from 'zod';

// App info schema
export const AppInfoSchema = z.object({
  name: z.string().min(1),
  version: z.string(),
  environment: z.string(),
  description: z.string().optional(),
}).strict();

// Environment definition schema
export const EnvironmentDefinitionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
}).strict();

// Git provider configuration schema
export const GitProviderConfigSchema = z.object({
  provider: z.enum(['gitlab', 'github', 'bitbucket']),
  name: z.string(),
  description: z.string().optional(),
  baseUrl: z.string().min(1),
  apiUrl: z.string().min(1),
  defaultReviewers: z.array(z.string()).optional(),
}).strict();

// External service schema
export const ExternalServiceSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  baseUrl: z.string().min(1),
}).strict();

// Other services schema
export const OtherServicesSchema = z.object({
  git: GitProviderConfigSchema.optional(),
}).catchall(ExternalServiceSchema); // Allow additional services like teamspace

// Feature flags schema
export const NotificationFeatureSchema = z.object({
  enabled: z.boolean(),
  position: z.string().optional(),
  duration: z.number().optional(),
}).strict();

export const DebugFeatureSchema = z.object({
  enabled: z.boolean(),
  logLevel: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).optional(),
}).strict();

export const FeaturesSchema = z.object({
  notifications: NotificationFeatureSchema.optional(),
  analytics: z.object({ enabled: z.boolean() }).optional(),
  debug: DebugFeatureSchema.optional(),
}).catchall(z.object({ enabled: z.boolean() })); // Allow additional features

// UI Theme schema
export const ThemeSchema = z.object({
  default: z.enum(['light', 'dark']),
  allowUserOverride: z.boolean().optional(),
  primaryColor: z.string().optional(),
}).strict();

// Sidebar schema
export const SidebarSchema = z.object({
  defaultCollapsed: z.boolean().optional(),
  width: z.number().positive().optional(),
  collapsedWidth: z.number().positive().optional(),
}).strict();

// UI configuration schema
export const UIConfigSchema = z.object({
  theme: ThemeSchema.optional(),
  sidebar: SidebarSchema.optional(),
}).strict();

// Module definition schema
export const ModuleDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().optional(),
  icon: z.string().optional(),
  route: z.string().optional(),
  enabled: z.boolean().optional(),
  order: z.number().optional(),
  teamSpecific: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

// Main app config schema
export const AppConfigSchema = z.object({
  app: AppInfoSchema,
  environments: z.record(z.string(), EnvironmentDefinitionSchema).optional(),
  otherServices: OtherServicesSchema.optional(),
  features: FeaturesSchema.optional(),
  ui: UIConfigSchema.optional(),
  modules: z.record(z.string(), ModuleDefinitionSchema).optional(),
}).strict();

// Helper to validate app config with better error messages
export function validateAppConfig(data) {
  try {
    return {
      success: true,
      data: AppConfigSchema.parse(data),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = (error.issues || error.errors || []).map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      return {
        success: false,
        error: 'App configuration validation failed',
        issues,
      };
    }
    return {
      success: false,
      error: error.message,
    };
  }
}
