/**
 * V007: Distributed Rate Limiter Implementation
 *
 * Provides sliding window rate limiting using Upstash Redis for distributed
 * consistency across serverless function instances. Falls back to in-memory
 * rate limiting when Redis is unavailable.
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
 * In-memory fallback rate limiter for when Redis is unavailable
 */
class InMemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
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
        remaining: MAX_REQUESTS - 1,
        reset: now + WINDOW_MS,
      };
    }

    // Increment counter
    entry.count += 1;
    const resetAt = entry.windowStart + WINDOW_MS;

    // Check if limit exceeded
    if (entry.count > MAX_REQUESTS) {
      return {
        success: false,
        remaining: 0,
        reset: resetAt,
      };
    }

    return {
      success: true,
      remaining: MAX_REQUESTS - entry.count,
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
 * Uses Redis-based distributed rate limiting when available,
 * falls back to in-memory rate limiting otherwise.
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
      };
    } catch (error) {
      // Redis failed, mark as unavailable and fall back
      console.error(
        '[RateLimiter] Redis rate limit check failed, falling back to in-memory:',
        error
      );
      redisAvailable = false;

      // Schedule retry to re-enable Redis after 60 seconds
      setTimeout(() => {
        redisAvailable = redisRateLimiter !== null;
      }, 60000);
    }
  }

  // Fallback to in-memory rate limiting
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

/**
 * Export for testing
 */
export { InMemoryRateLimiter };
