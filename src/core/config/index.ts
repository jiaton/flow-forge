/**
 * Core Configuration System - Barrel Export
 *
 * Centralized configuration management for FlowForge.
 *
 * @example
 * ```ts
 * import { configLoader } from '@/core/config';
 *
 * // Initialize (do this once on app startup)
 * await configLoader.initialize();
 *
 * // Access configurations
 * const appConfig = configLoader.getAppConfig();
 * const teams = configLoader.getAllTeams();
 * const services = configLoader.getServices();
 * ```
 *
 * @module config
 */

// Export configuration loader
export { configLoader } from './ConfigLoader';

// Export all types
export type * from './config.types';
