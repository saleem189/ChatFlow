// ================================
// Rate Limiting Middleware
// ================================
// Prevents abuse by limiting requests per IP/user

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface RateLimitConfig {
  /** Maximum number of requests allowed */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Custom error message */
  message?: string;
  /** Whether to use user ID (authenticated) or IP (public) */
  keyGenerator?: (request: NextRequest, userId?: string) => string;
}

interface RateLimitStore {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis in production for multi-instance deployments)
const rateLimitStore = new Map<string, RateLimitStore>();

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Rate limiting middleware
 * 
 * @example
 * ```ts
 * export async function DELETE(request: NextRequest) {
 *   const limitResult = await rateLimit(request, {
 *     max: 10,
 *     windowMs: 60000, // 10 requests per minute
 *   });
 *   if (!limitResult.success) {
 *     return limitResult.response;
 *   }
 *   // ... rest of route handler
 * }
 * ```
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{ success: true } | { success: false; response: NextResponse }> {
  const {
    max,
    windowMs,
    message = "Too many requests, please try again later",
    keyGenerator = defaultKeyGenerator,
  } = config;

  // Get session for user-based rate limiting
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  // Generate rate limit key
  const key = keyGenerator(request, userId);
  const now = Date.now();

  // Get or create rate limit record
  let record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // Create new record
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, record);

    return { success: true };
  }

  // Increment count
  record.count++;

  // Check if limit exceeded
  if (record.count > max) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);

    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Rate limit exceeded",
          message,
          retryAfter,
        },
        {
          status: 429, // Too Many Requests
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": max.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(record.resetTime).toISOString(),
          },
        }
      ),
    };
  }

  return { success: true };
}

/**
 * Default key generator - uses user ID if authenticated, otherwise IP
 */
function defaultKeyGenerator(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Get IP from various headers (considering proxies)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";

  return `ip:${ip}`;
}

/**
 * Create a rate limiter with specific configuration
 * Useful for creating reusable rate limiters
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (request: NextRequest) => {
    return rateLimit(request, config);
  };
}

/**
 * Preset rate limiters for common use cases
 */
export const RateLimitPresets = {
  /** Strict limit for sensitive operations (e.g., delete user) */
  strict: {
    max: 5,
    windowMs: 60000, // 5 requests per minute
    message: "Too many sensitive operations, please slow down",
  },

  /** Moderate limit for admin operations */
  admin: {
    max: 30,
    windowMs: 60000, // 30 requests per minute
    message: "Too many admin requests, please slow down",
  },

  /** Standard limit for authenticated users */
  standard: {
    max: 60,
    windowMs: 60000, // 60 requests per minute
    message: "Too many requests, please slow down",
  },

  /** Relaxed limit for read operations */
  relaxed: {
    max: 100,
    windowMs: 60000, // 100 requests per minute
    message: "Too many requests, please try again in a moment",
  },
} as const;

/**
 * Get current rate limit status for a key (useful for debugging)
 */
export function getRateLimitStatus(key: string): {
  count: number;
  limit: number;
  remaining: number;
  resetTime: number;
} | null {
  const record = rateLimitStore.get(key);
  if (!record) {
    return null;
  }

  // This would need to be passed in or stored with the record
  // For now, returning just the record data
  return {
    count: record.count,
    limit: 0, // Would need to be passed in
    remaining: 0, // Would need to be calculated
    resetTime: record.resetTime,
  };
}

/**
 * Clear rate limit for a specific key (useful for testing/admin tools)
 */
export function clearRateLimit(key: string): boolean {
  return rateLimitStore.delete(key);
}

/**
 * Clear all rate limits (use with caution!)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

