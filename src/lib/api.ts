export interface Content {
    id: string;
    title: string;
    type: string;
    status: string;
    cover_image_url?: string;
    author?: string;
    average_rating?: number;
    genres?: string[];
    description?: string;
    chapters?: number;
    release_year?: number;
    chapter_count?: number;
    year_published?: number;
    banner_image_url?: string;
    illustrator?: string;
    publisher?: string;
    licensed_by?: string;
    volume_count?: number;
    original_language?: string;
    translation_status?: string;
    themes?: string[];
    content_warnings?: string[];
    average_score?: number;
    total_reviews?: number;
    total_readers?: number;
    total_rating_votes?: number;
    created_at?: string;
    updated_at?: string;
    published_at?: string;
    is_featured?: boolean;
    is_approved?: boolean;
}

interface FetchContentsParams {
    contentType?: string;
    search?: string;
    limit?: number;
}

// Supabase Edge Function URL - replace with your actual project ref
const SUPABASE_PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF || 'dujvlcrbrusntcafoxqw';
const EDGE_FUNCTION_BASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1`;

/**
 * Fetches content from Supabase Edge Function (faster cold starts)
 * Falls back to direct Supabase query if Edge Function fails
 */
export async function fetchContents(params: FetchContentsParams): Promise<{ data: Content[] }> {
    try {
        // Build query parameters
        const queryParams = new URLSearchParams();
        if (params.contentType && params.contentType !== 'all') {
            queryParams.append('type', params.contentType);
        }
        if (params.search) {
            queryParams.append('search', params.search);
        }
        if (params.limit) {
            queryParams.append('limit', params.limit.toString());
        }

        // Call Edge Function (no auth needed - function uses service role key)
        const response = await fetch(
            `${EDGE_FUNCTION_BASE_URL}/get-browse-content?${queryParams.toString()}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Edge function returned ${response.status}`);
        }

        const result = await response.json();
        return { data: (result.data as Content[]) || [] };
    } catch (error: unknown) {
        console.error('[API] Edge function failed, falling back to direct query:', error);

        // Fallback to direct Supabase query if Edge Function fails
        try {
            const { supabase } = await import('@/lib/supabase');

            let query = supabase
                .from('content')
                .select('*')
                .order('created_at', { ascending: false });

            if (params.contentType && params.contentType !== 'all') {
                query = query.eq('type', params.contentType);
            }
            if (params.search) {
                query = query.ilike('title', `%${params.search}%`);
            }
            if (params.limit) {
                query = query.limit(params.limit);
            }

            const { data, error } = await query;
            if (error) throw error;

            return { data: (data as Content[]) || [] };
        } catch (fallbackError) {
            console.error('[API] Fallback also failed:', fallbackError);
            return { data: [] };
        }
    }
}
