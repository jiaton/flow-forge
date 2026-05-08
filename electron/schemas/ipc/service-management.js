/**
 * Service Management IPC Payload Schemas
 * Validates data sent via IPC for service management operations
 */

import { z } from 'zod';

// Start service request schema
export const StartServiceRequestSchema = z.object({
  serviceId: z.string().min(1),
  serviceName: z.string().min(1),
  serviceType: z.string().min(1),
  port: z.number().int().positive().optional(),
  endpoint: z.string().optional(),
  team: z.string().min(1),
  executionMode: z.enum(['internal']).optional(),
  detached: z.boolean().optional(),
}).strict();

// Stop service request schema
export const StopServiceRequestSchema = z.object({
  serviceId: z.string().min(1),
  team: z.string().min(1),
}).strict();

// Get service logs request schema
export const GetServiceLogsRequestSchema = z.object({
  serviceId: z.string().min(1),
  team: z.string().min(1),
}).strict();

// Check service status request schema
export const CheckServiceStatusRequestSchema = z.object({
  serviceIds: z.array(z.string().min(1)).min(1),
}).strict();

// Service response schema
export const ServiceResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  executionMode: z.string().optional(),
});

// Helpers to validate IPC requests
export function validateStartServiceRequest(data) {
  try {
    return {
      success: true,
      data: StartServiceRequestSchema.parse(data),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = (error.issues || error.errors || []).map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      return {
        success: false,
        error: 'Start service request validation failed',
        issues,
      };
    }
    return {
      success: false,
      error: error.message,
    };
  }
}

export function validateStopServiceRequest(data) {
  try {
    return {
      success: true,
      data: StopServiceRequestSchema.parse(data),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = (error.issues || error.errors || []).map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      return {
        success: false,
        error: 'Stop service request validation failed',
        issues,
      };
    }
    return {
      success: false,
      error: error.message,
    };
  }
}

export function validateGetServiceLogsRequest(data) {
  try {
    return {
      success: true,
      data: GetServiceLogsRequestSchema.parse(data),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = (error.issues || error.errors || []).map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      return {
        success: false,
        error: 'Get service logs request validation failed',
        issues,
      };
    }
    return {
      success: false,
      error: error.message,
    };
  }
}

export function validateCheckServiceStatusRequest(data) {
  try {
    return {
      success: true,
      data: CheckServiceStatusRequestSchema.parse(data),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = (error.issues || error.errors || []).map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      return {
        success: false,
        error: 'Check service status request validation failed',
        issues,
      };
    }
    return {
      success: false,
      error: error.message,
    };
  }
}
