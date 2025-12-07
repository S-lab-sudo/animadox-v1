import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple Rate Limiting for Vercel Serverless
 * 
 * Note: In serverless, each function instance has its own memory.
 * This provides basic protection but isn't perfect for distributed systems.
 * For production, consider Upstash (@upstash/ratelimit) for Redis-based limiting.
 * 
 * This implementation uses a sliding window algorithm.
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// In-memory store (works per instance in serverless)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;

    lastCleanup = now;
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetTime < now) {
            rateLimitStore.delete(key);
        }
    }
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
    /** Maximum requests allowed in the window */
    limit: number;
    /** Window size in milliseconds */
    windowMs: number;
    /** Optional identifier function (defaults to IP) */
    identifierFn?: (request: NextRequest) => string;
}

const defaultConfig: RateLimitConfig = {
    limit: 100,        // 100 requests
    windowMs: 60000,   // per minute
};

/**
 * Get client identifier from request
 */
function getIdentifier(request: NextRequest): string {
    // Try various headers for the real IP (Vercel sets these)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const vercelIp = request.headers.get('x-vercel-forwarded-for');

    // Use the first IP in the chain, or fallback
    const clientIp = vercelIp?.split(',')[0]?.trim()
        || forwardedFor?.split(',')[0]?.trim()
        || realIp
        || 'unknown';

    return clientIp;
}

/**
 * Check rate limit for a request
 * @returns null if allowed, NextResponse if rate limited
 */
export function checkRateLimit(
    request: NextRequest,
    config: Partial<RateLimitConfig> = {}
): NextResponse | null {
    // Periodic cleanup
    cleanup();

    const { limit, windowMs } = { ...defaultConfig, ...config };
    const identifier = config.identifierFn?.(request) || getIdentifier(request);
    const key = `${request.nextUrl.pathname}:${identifier}`;

    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
        // New window
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + windowMs,
        });
        return null;
    }

    if (entry.count >= limit) {
        // Rate limited
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

        return NextResponse.json(
            {
                error: 'Too many requests. Please try again later.',
                retryAfter
            },
            {
                status: 429,
                headers: {
                    'Retry-After': String(retryAfter),
                    'X-RateLimit-Limit': String(limit),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(entry.resetTime),
                }
            }
        );
    }

    // Increment count
    entry.count++;
    return null;
}

/**
 * Rate limit configurations for different routes
 */
export const rateLimits = {
    // Stricter limits for mutation routes
    mutation: { limit: 30, windowMs: 60000 },   // 30 per minute

    // Search has moderate limits
    search: { limit: 60, windowMs: 60000 },     // 60 per minute

    // Content fetching is more lenient
    content: { limit: 100, windowMs: 60000 },   // 100 per minute

    // Tracking can be frequent
    tracking: { limit: 120, windowMs: 60000 },  // 120 per minute
};
