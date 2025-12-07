import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SearchQuerySchema, validateQuery } from '@/lib/validations';
import { checkRateLimit, rateLimits } from '@/lib/rateLimit';
import { z } from 'zod';

interface SearchResultItem {
    id: string;
    title: string;
    cover_image_url: string | null;
    average_rating: number | null;
    year_published: number | null;
    created_at: string;
}

// Session token validation (UUID format)
const SessionTokenSchema = z.string().uuid('Invalid session token');

// Search cache (key = search term)
const searchCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute for search results

export async function GET(request: NextRequest) {
    // Rate limiting
    const rateLimitError = checkRateLimit(request, rateLimits.search);
    if (rateLimitError) return rateLimitError;

    const startTime = performance.now();

    try {
        // Validate session token from header
        const sessionToken = request.headers.get('x-session-token');
        const tokenResult = SessionTokenSchema.safeParse(sessionToken);

        if (!tokenResult.success) {
            return NextResponse.json(
                { error: 'Unauthorized - Invalid session' },
                { status: 401 }
            );
        }

        // Validate and sanitize search query using Zod
        const queryValidation = validateQuery(SearchQuerySchema, request.nextUrl.searchParams);

        if (!queryValidation.success) {
            return NextResponse.json(
                { error: queryValidation.error },
                { status: 400 }
            );
        }

        const searchTerm = queryValidation.data.query; // Already trimmed and lowercased by schema

        if (process.env.NODE_ENV === 'development') {
            console.log(`\n📊 [API /search] Query: "${searchTerm}"`);
        }

        // Check cache first
        const cached = searchCache.get(searchTerm);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            if (process.env.NODE_ENV === 'development') {
                console.log(`  ⚡ Cache HIT! Total time: ${(performance.now() - startTime).toFixed(1)}ms\n`);
            }
            return NextResponse.json(cached.data);
        }

        const queryStart = performance.now();
        const { data, error } = await supabase
            .from('content')
            .select('id, title, cover_image_url, average_rating, year_published, created_at')
            .ilike('title', `%${searchTerm}%`)
            .limit(6);
        if (process.env.NODE_ENV === 'development') {
            console.log(`  ⏱️ Search query: ${(performance.now() - queryStart).toFixed(1)}ms (${data?.length || 0} results)`);
        }

        if (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Search error:', error);
            }
            return NextResponse.json(
                { error: 'Search failed' },
                { status: 500 }
            );
        }

        // Map the results to match frontend expectations
        const results = (data || []).map((item: SearchResultItem) => ({
            id: item.id,
            title: item.title,
            cover_image: item.cover_image_url || '/placeholder.png',
            rating: item.average_rating || 0,
            published_date: item.year_published ? `${item.year_published}` : new Date(item.created_at).getFullYear().toString()
        }));

        const response = {
            results,
            count: results.length
        };

        // Cache the result
        searchCache.set(searchTerm, { data: response, timestamp: Date.now() });

        const totalTime = performance.now() - startTime;
        if (process.env.NODE_ENV === 'development') {
            console.log(`  ✅ Total time: ${totalTime.toFixed(1)}ms\n`);
        }

        return NextResponse.json(response);
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('❌ Search handler error:', error);
        }
        return NextResponse.json(
            { success: false, error: 'Search temporarily unavailable. Please try again.' },
            { status: 500 }
        );
    }
}
