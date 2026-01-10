import { NextResponse } from 'next/server';
import type { ApiErrorCode } from '@moai-rank/shared';

/**
 * Standard API response structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Create a successful API response
 */
export function successResponse<T>(
  data: T,
  status = 200,
  headers?: HeadersInit
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status, headers: addCorsHeaders(headers) }
  );
}

/**
 * Create an error API response
 */
export function errorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>,
  headers?: HeadersInit
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status, headers: addCorsHeaders(headers) }
  );
}

/**
 * Common error responses
 */
export const Errors = {
  unauthorized: (message = 'Authentication required') =>
    errorResponse('UNAUTHORIZED', message, 401),

  forbidden: (message = 'Access denied') => errorResponse('FORBIDDEN', message, 403),

  notFound: (resource = 'Resource') => errorResponse('NOT_FOUND', `${resource} not found`, 404),

  validationError: (message: string, details?: Record<string, unknown>) =>
    errorResponse('VALIDATION_ERROR', message, 400, details),

  rateLimited: (message = 'Rate limit exceeded') => errorResponse('RATE_LIMITED', message, 429),

  internalError: (message = 'Internal server error') =>
    errorResponse('INTERNAL_ERROR', message, 500),

  serviceUnavailable: (message = 'Service temporarily unavailable') =>
    errorResponse('SERVICE_UNAVAILABLE', message, 503),
};

/**
 * Rate limit response with Retry-After header
 * V014: Proper rate limit response with RFC 7231 compliant headers
 *
 * @param resetTime - Unix timestamp when the rate limit resets
 */
export function rateLimitResponse(resetTime: number): NextResponse<ApiResponse<never>> {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000));

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'RATE_LIMITED' as ApiErrorCode,
        message: 'Rate limit exceeded. Please try again later.',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    {
      status: 429,
      headers: addCorsHeaders({
        'Retry-After': retryAfterSeconds.toString(),
        'X-RateLimit-Reset': resetTime.toString(),
      }),
    }
  );
}

/**
 * Add CORS headers for CLI access
 */
function addCorsHeaders(existingHeaders?: HeadersInit): Headers {
  const headers = new Headers(existingHeaders);

  // Allow CLI access from any origin
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-Timestamp, X-Signature');
  headers.set('Access-Control-Max-Age', '86400');

  return headers;
}

/**
 * Handle OPTIONS preflight requests for CORS
 */
export function corsOptionsResponse(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: addCorsHeaders(),
  });
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

/**
 * Paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  status = 200
): NextResponse<ApiResponse<{ items: T[]; pagination: PaginationMeta }>> {
  return successResponse({ items: data, pagination }, status);
}
