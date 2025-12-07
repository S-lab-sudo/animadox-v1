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

// Dynamic API URL - uses serverless API routes at /api
const getApiBaseUrl = (): string => {
    // For serverless deployment, API routes are at same origin
    // This works for both local dev (localhost:8000/api) and production
    return '/api';
};

const API_BASE_URL = getApiBaseUrl();

export async function fetchContents(params: FetchContentsParams): Promise<{ data: Content[] }> {
    try {
        const queryParams = new URLSearchParams();
        if (params.contentType && params.contentType !== 'all') {
            queryParams.append('contentType', params.contentType);
        }
        if (params.search) {
            queryParams.append('search', params.search);
        }
        if (params.limit) {
            queryParams.append('limit', params.limit.toString());
        }

        const response = await fetch(`${API_BASE_URL}/content?${queryParams.toString()}`);

        if (!response.ok) {
            throw new Error('Failed to load content');
        }

        const result = await response.json();
        return { data: result.data || [] };
    } catch (error: unknown) {
        // In production, return empty array on API failure rather than bundling mock data
        // This reduces bundle size by ~3KB
        if (process.env.NODE_ENV === 'development') {
            console.warn('[API] Fetch failed, returning empty array:', error);
        }
        return { data: [] };
    }
}
