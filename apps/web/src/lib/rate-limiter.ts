/**
 * V007: Distributed Rate Limiter Implementation
 *
 * Provides sliding window rate limiting using Upstash Redis for distributed
 * consistency across serverless function instances.
 *
 * V011: Fail-Close Security Model
 * - When Redis is unavailable, the system can either:
 *   1. STRICT mode (RATE_LIMIT_STRICT=true): Reject all requests (fail-close)
 *   2. GRACEFUL mode (default): Allow limited requests with in-memory fallback
 *      but with a much lower limit to minimize abuse during Redis outage
 *
 * Security: Distributed rate limiting prevents bypass attacks that exploit
 * inconsistencies across multiple serverless instances.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limit result interface
 */
export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  /** Promise for deferred analytics processing - use with waitUntil() */
  pending?: Promise<unknown>;
}

/**
 * In-memory fallback rate limiter entry
 */
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

/**
 * Configuration constants
 */
const WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS = 100; // 100 requests per minute

/**
 * V011: Fail-close configuration
 *
 * STRICT mode: When Redis fails, reject all requests (true security)
 * GRACEFUL mode: Allow limited requests with reduced limits (availability over security)
 *
 * In serverless, each instance has its own memory, so in-memory fallback
 * provides much weaker protection. FALLBACK_MAX_REQUESTS is intentionally low.
 */
const RATE_LIMIT_STRICT = process.env.RATE_LIMIT_STRICT === 'true';
const FALLBACK_MAX_REQUESTS = 10; // Much lower limit for fallback (vs 100 normal)
const REDIS_RETRY_DELAY_MS = 30000; // 30 seconds before retrying Redis

/**
 * In-memory fallback rate limiter for when Redis is unavailable
 *
 * V011: Uses FALLBACK_MAX_REQUESTS (lower limit) to minimize abuse
 * during Redis outages in serverless environments.
 */
class InMemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;
  private maxRequests: number;

  constructor(maxRequests: number = FALLBACK_MAX_REQUESTS) {
    this.maxRequests = maxRequests;
    this.startCleanup();
  }

  check(identifier: string): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(identifier);

    // If no entry or window expired, start fresh
    if (!entry || now - entry.windowStart >= WINDOW_MS) {
      this.store.set(identifier, {
        count: 1,
        windowStart: now,
      });
      return {
        success: true,
        remaining: this.maxRequests - 1,
        reset: now + WINDOW_MS,
      };
    }

    // Increment counter
    entry.count += 1;
    const resetAt = entry.windowStart + WINDOW_MS;

    // Check if limit exceeded
    if (entry.count > this.maxRequests) {
      return {
        success: false,
        remaining: 0,
        reset: resetAt,
      };
    }

    return {
      success: true,
      remaining: this.maxRequests - entry.count,
      reset: resetAt,
    };
  }

  private startCleanup(): void {
    this.cleanupIntervalId = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now - entry.windowStart >= WINDOW_MS * 2) {
          this.store.delete(key);
        }
      }
    }, 60000);

    if (this.cleanupIntervalId.unref) {
      this.cleanupIntervalId.unref();
    }
  }

  stop(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Redis-based distributed rate limiter using Upstash
 */
let redisRateLimiter: Ratelimit | null = null;
let redisAvailable = false;

/**
 * Initialize Redis rate limiter if credentials are available
 *
 * Supports two naming conventions:
 * - Vercel Upstash Integration: KV_REST_API_URL, KV_REST_API_TOKEN
 * - Standard Upstash: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 */
function initializeRedisRateLimiter(): Ratelimit | null {
  // Support both Vercel integration and standard Upstash variable names
  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    console.warn(
      '[RateLimiter] Upstash Redis credentials not configured. ' +
        'Using in-memory rate limiting (not recommended for production).'
    );
    return null;
  }

  try {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(MAX_REQUESTS, '1 m'),
      analytics: true,
      prefix: 'moai-rank:ratelimit',
      ephemeralCache: new Map(), // Local cache reduces Redis calls for repeat requests
    });
  } catch (error) {
    console.error('[RateLimiter] Failed to initialize Redis rate limiter:', error);
    return null;
  }
}

// Initialize on module load
redisRateLimiter = initializeRedisRateLimiter();
redisAvailable = redisRateLimiter !== null;

/**
 * In-memory fallback instance
 */
const inMemoryFallback = new InMemoryRateLimiter();

/**
 * Check rate limit for a user
 *
 * Uses Redis-based distributed rate limiting when available.
 *
 * V011: Fail-Close Security Model
 * - STRICT mode (RATE_LIMIT_STRICT=true): Reject requests when Redis fails
 * - GRACEFUL mode (default): Fall back to in-memory with reduced limits
 *
 * @param userId - Unique identifier for the user
 * @returns Rate limit result with success status, remaining requests, and reset time
 */
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  // Try Redis first if available
  if (redisRateLimiter && redisAvailable) {
    try {
      const result = await redisRateLimiter.limit(userId);
      return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
        pending: result.pending, // Deferred analytics - use with waitUntil()
      };
    } catch (error) {
      // Redis failed, mark as unavailable
      console.error('[RateLimiter] Redis rate limit check failed:', error);
      redisAvailable = false;

      // Schedule retry to re-enable Redis
      setTimeout(() => {
        redisAvailable = redisRateLimiter !== null;
      }, REDIS_RETRY_DELAY_MS);

      // V011: Fail-close in STRICT mode - reject all requests when Redis fails
      if (RATE_LIMIT_STRICT) {
        console.warn('[RateLimiter] STRICT mode: Rejecting request due to Redis failure');
        return {
          success: false,
          remaining: 0,
          reset: Date.now() + REDIS_RETRY_DELAY_MS,
        };
      }

      // GRACEFUL mode: Fall through to in-memory with reduced limits
      console.warn('[RateLimiter] GRACEFUL mode: Using in-memory fallback with reduced limits');
    }
  }

  // V011: In STRICT mode, reject if Redis was never available
  if (RATE_LIMIT_STRICT && !redisRateLimiter) {
    console.warn('[RateLimiter] STRICT mode: Redis not configured, rejecting request');
    return {
      success: false,
      remaining: 0,
      reset: Date.now() + WINDOW_MS,
    };
  }

  // Fallback to in-memory rate limiting (with reduced limits)
  return inMemoryFallback.check(userId);
}

/**
 * Synchronous rate limit check using in-memory fallback
 *
 * Used for backward compatibility with existing code that expects
 * synchronous rate limiting.
 *
 * @param userId - Unique identifier for the user
 * @returns Rate limit result
 */
export function checkRateLimitSync(userId: string): RateLimitResult {
  return inMemoryFallback.check(userId);
}

/**
 * Session API rate limiter interface for backward compatibility
 *
 * Provides the same interface as the original InMemoryRateLimiter
 * but uses the new distributed implementation.
 */
export const sessionRateLimiter = {
  /**
   * Check rate limit synchronously (uses in-memory fallback)
   * For async distributed rate limiting, use checkRateLimit() instead
   */
  check(identifier: string): RateLimitResult {
    return inMemoryFallback.check(identifier);
  },

  /**
   * Check rate limit asynchronously with Redis
   */
  async checkAsync(identifier: string): Promise<RateLimitResult> {
    return checkRateLimit(identifier);
  },

  /**
   * Get rate limiter status
   */
  isDistributed(): boolean {
    return redisAvailable;
  },
};

/**
 * Check rate limit by IP address for public endpoints
 *
 * Uses the same rate limit as authenticated endpoints:
 * - 100 requests per minute per IP address (MAX_REQUESTS constant)
 *
 * @param ipAddress - IP address of the client
 * @returns Rate limit result
 */
export async function checkPublicRateLimit(ipAddress: string): Promise<RateLimitResult> {
  const identifier = `ip:${ipAddress}`;
  return checkRateLimit(identifier);
}

/**
 * Extract IP address from request headers
 * Handles various proxy headers
 */
export function extractIpAddress(headers: Headers): string {
  // Check common proxy headers in order of preference
  const forwardedFor = headers.get('X-Forwarded-For');
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('X-Real-IP');
  if (realIp) {
    return realIp.trim();
  }

  const cfConnectingIp = headers.get('CF-Connecting-IP');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  // Fallback to a default identifier for local development
  return 'unknown';
}

// =============================================================================
// Endpoint-Specific Rate Limiters
// =============================================================================

/**
 * Get Redis instance for rate limiters
 * Returns null if Redis credentials are not configured
 */
function getRedis(): Redis | null {
  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return null;
  }

  return new Redis({
    url: redisUrl,
    token: redisToken,
  });
}

/**
 * Create a rate limiter for authentication endpoints
 *
 * Stricter limits to prevent brute-force attacks:
 * - 10 requests per minute (vs 100 for general endpoints)
 *
 * @returns Ratelimit instance or null if Redis unavailable
 */
export function createAuthRateLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 req/min for auth
    analytics: true,
    prefix: 'moai-rank:auth-ratelimit',
    ephemeralCache: new Map(),
  });
}

/**
 * Create a rate limiter for sensitive API endpoints
 *
 * Moderate limits for endpoints that modify data:
 * - 30 requests per minute
 *
 * @returns Ratelimit instance or null if Redis unavailable
 */
export function createSensitiveRateLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 req/min for sensitive ops
    analytics: true,
    prefix: 'moai-rank:sensitive-ratelimit',
    ephemeralCache: new Map(),
  });
}

/**
 * Create a rate limiter for public/read-only endpoints
 *
 * Higher limits for read operations:
 * - 200 requests per minute
 *
 * @returns Ratelimit instance or null if Redis unavailable
 */
export function createPublicReadRateLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(200, '1 m'), // 200 req/min for reads
    analytics: true,
    prefix: 'moai-rank:public-ratelimit',
    ephemeralCache: new Map(),
  });
}

/**
 * Pre-configured rate limiter instances for common use cases
 * These are lazily initialized on first access
 */
let _authRateLimiter: Ratelimit | null | undefined;
let _sensitiveRateLimiter: Ratelimit | null | undefined;
let _publicReadRateLimiter: Ratelimit | null | undefined;

export const rateLimiters = {
  /** Rate limiter for auth endpoints (10 req/min) */
  get auth(): Ratelimit | null {
    if (_authRateLimiter === undefined) {
      _authRateLimiter = createAuthRateLimiter();
    }
    return _authRateLimiter;
  },

  /** Rate limiter for sensitive endpoints (30 req/min) */
  get sensitive(): Ratelimit | null {
    if (_sensitiveRateLimiter === undefined) {
      _sensitiveRateLimiter = createSensitiveRateLimiter();
    }
    return _sensitiveRateLimiter;
  },

  /** Rate limiter for public read endpoints (200 req/min) */
  get publicRead(): Ratelimit | null {
    if (_publicReadRateLimiter === undefined) {
      _publicReadRateLimiter = createPublicReadRateLimiter();
    }
    return _publicReadRateLimiter;
  },
};

/**
 * Export for testing
 */
export { InMemoryRateLimiter };
