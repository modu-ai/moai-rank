import { z } from 'zod';

/**
 * API request/response Zod schemas
 */

// Generic API response wrapper
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.record(z.unknown()).optional(),
      })
      .optional(),
    meta: z
      .object({
        timestamp: z.coerce.date(),
        requestId: z.string().uuid().optional(),
      })
      .optional(),
  });

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  total: z.number().int().min(0).optional(),
  totalPages: z.number().int().min(0).optional(),
});

export const PaginatedRequestSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// Error codes
export const ApiErrorCodeSchema = z.enum([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
]);

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type PaginationType = z.infer<typeof PaginationSchema>;
export type PaginatedRequestType = z.infer<typeof PaginatedRequestSchema>;
