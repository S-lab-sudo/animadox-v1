// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// In-memory cache for warm function invocations
// This persists as long as the edge function instance is warm
let cachedData: { data: unknown; timestamp: number; cacheKey: string } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute cache

// Only select fields needed for browse page (excludes heavy JSONB fields)
const BROWSE_FIELDS = `
  id,
  title,
  alternate_title,
  slug,
  type,
  status,
  author,
  cover_image_url,
  average_rating,
  chapter_count,
  genres,
  created_at
`;

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)
        const contentType = url.searchParams.get('type') || 'all'
        const search = url.searchParams.get('search') || ''
        const limit = parseInt(url.searchParams.get('limit') || '50')

        // Generate cache key based on query params
        const cacheKey = `${contentType}-${search}-${limit}`;

        // Check in-memory cache for non-search requests (cache search would be less effective)
        if (!search && cachedData && cachedData.cacheKey === cacheKey) {
            if (Date.now() - cachedData.timestamp < CACHE_TTL) {
                console.log('[Cache HIT] Returning cached data');
                return new Response(
                    JSON.stringify(cachedData.data),
                    {
                        headers: {
                            ...corsHeaders,
                            'Content-Type': 'application/json',
                            'X-Cache': 'HIT',
                            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
                        }
                    }
                )
            }
        }

        // Create Supabase client with service role for server-side operations
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Build optimized query - only select needed fields
        let query = supabase
            .from('content')
            .select(BROWSE_FIELDS)
            .order('created_at', { ascending: false })
            .limit(limit)

        // Filter by content type if specified
        if (contentType && contentType !== 'all') {
            query = query.eq('type', contentType)
        }

        // Search by title if specified
        if (search) {
            query = query.ilike('title', `%${search}%`)
        }

        const { data, error } = await query

        if (error) {
            console.error('Query error:', error)
            return new Response(
                JSON.stringify({ error: error.message }),
                {
                    status: 500,
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                        'Cache-Control': 'public, max-age=60' // Cache for 1 minute on error
                    }
                }
            )
        }

        const responseData = { data: data || [] };

        // Update in-memory cache for non-search queries
        if (!search) {
            cachedData = { data: responseData, timestamp: Date.now(), cacheKey };
            console.log('[Cache MISS] Data cached');
        }

        return new Response(
            JSON.stringify(responseData),
            {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                    'X-Cache': 'MISS',
                    // Cache successful responses for 5 minutes at CDN level
                    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
                }
            }
        )
    } catch (err) {
        console.error('Edge function error:', err)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})

