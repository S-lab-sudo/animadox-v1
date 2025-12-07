import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Content } from '@/lib/types';
import { checkRateLimit, rateLimits } from '@/lib/rateLimit';

// Cache for content list (key = query params string)
const contentListCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds for list (shorter since it can change more often)

export async function GET(request: NextRequest) {
    // Rate limiting
    const rateLimitError = checkRateLimit(request, rateLimits.content);
    if (rateLimitError) return rateLimitError;

    const startTime = performance.now();

    try {
        const searchParams = request.nextUrl.searchParams;
        const contentType = searchParams.get('contentType');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        // Create cache key from params
        const cacheKey = `${contentType || 'all'}-${search || ''}-${page}-${limit}`;

        if (process.env.NODE_ENV === 'development') {
            console.log(`\n📊 [API /content] Request started (${cacheKey})`);
        }

        // Check cache first
        const cached = contentListCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            if (process.env.NODE_ENV === 'development') {
                console.log(`  ⚡ Cache HIT! Total time: ${(performance.now() - startTime).toFixed(1)}ms\n`);
            }
            return NextResponse.json(cached.data);
        }

        const queryStart = performance.now();
        let query = supabase
            .from('content')
            .select('id, title, type, status, cover_image_url, author, average_rating, genres, description, year_published', { count: 'exact' })
            .order('created_at', { ascending: false });

        // Filter by content type
        if (contentType && contentType !== 'all') {
            query = query.eq('type', contentType);
        }

        // Search functionality
        if (search && search.trim()) {
            query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
        }

        // Pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;
        if (process.env.NODE_ENV === 'development') {
            console.log(`  ⏱️ Content list query: ${(performance.now() - queryStart).toFixed(1)}ms (${data?.length || 0} items)`);
        }

        if (error) {
            console.error('Error fetching contents:', error.message);
            return NextResponse.json(
                { success: false, error: 'Unable to load content. Please try again later.' },
                { status: 500 }
            );
        }

        // Get chapter counts for all content items efficiently
        // Only fetch content_id (minimal data), count is done client-side
        const countStart = performance.now();
        const contentIds = (data || []).map((c: Record<string, unknown>) => c.id as string);

        // Skip chapter count query if no content
        let countMap = new Map<string, number>();
        if (contentIds.length > 0) {
            const { data: chapterCounts, error: countError } = await supabase
                .from('chapters')
                .select('content_id')
                .in('content_id', contentIds);

            if (countError) {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Error fetching chapter counts:', countError.message);
                }
            } else {
                // Count chapters per content
                (chapterCounts || []).forEach((ch: { content_id: string }) => {
                    countMap.set(ch.content_id, (countMap.get(ch.content_id) || 0) + 1);
                });
            }
        }
        if (process.env.NODE_ENV === 'development') {
            console.log(`  ⏱️ Chapter counts: ${(performance.now() - countStart).toFixed(1)}ms`);
        }

        // Add chapter counts to content
        const contentsWithCounts = (data || []).map((content: Record<string, unknown>) => ({
            ...content,
            chapter_count: countMap.get(content.id as string) || 0
        }));

        const response = {
            success: true,
            data: contentsWithCounts as Content[],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        };

        // Cache the result
        contentListCache.set(cacheKey, { data: response, timestamp: Date.now() });

        const totalTime = performance.now() - startTime;
        if (process.env.NODE_ENV === 'development') {
            console.log(`  ✅ Total time: ${totalTime.toFixed(1)}ms\n`);
        }

        return NextResponse.json(response);
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('❌ Error in content API:', error);
        }
        return NextResponse.json(
            { success: false, error: 'Unable to load content. Please try again later.' },
            { status: 500 }
        );
    }
}
