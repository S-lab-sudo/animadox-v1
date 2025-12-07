import { NextRequest, NextResponse } from 'next/server';

/**
 * CSRF Protection Middleware
 * 
 * Validates that POST/PUT/DELETE requests originate from the same origin.
 * This provides basic CSRF protection by checking the Origin header.
 */

// Allowed origins (add your production domain here)
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:8000',
    'https://animadox-v1.vercel.app',
    process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

/**
 * Check if origin is a Vercel preview deployment
 * This allows *.vercel.app subdomains for preview URLs
 */
function isVercelPreview(origin: string): boolean {
    return /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin);
}

/**
 * Validates the origin of a request for CSRF protection
 * @returns null if valid, NextResponse error if invalid
 */
export function validateOrigin(request: NextRequest): NextResponse | null {
    // Skip validation for GET/HEAD requests (they should be idempotent)
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
        return null;
    }

    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    // For server-side requests (no origin), allow if referer matches
    if (!origin) {
        // If no origin and no referer, it might be a server-side request
        if (!referer) {
            // Allow in development, but could be stricter in production
            if (process.env.NODE_ENV === 'development') {
                return null;
            }
            // In production, you may want to require origin header
            return null; // Being permissive for now - can be stricter if needed
        }

        // Check referer against allowed origins
        const isAllowedReferer = ALLOWED_ORIGINS.some(allowed =>
            referer.startsWith(allowed)
        );

        if (!isAllowedReferer && process.env.NODE_ENV === 'production') {
            return NextResponse.json(
                { error: 'Invalid request origin' },
                { status: 403 }
            );
        }
        return null;
    }

    // Check if origin is in allowed list or is a Vercel preview deployment
    const isAllowed = ALLOWED_ORIGINS.includes(origin) || isVercelPreview(origin);

    if (!isAllowed && process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { error: 'Origin not allowed' },
            { status: 403 }
        );
    }

    return null;
}

/**
 * Helper to add CORS headers to response
 */
export function addCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
    const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
        ? origin
        : ALLOWED_ORIGINS[0];

    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-session-token');

    return response;
}
