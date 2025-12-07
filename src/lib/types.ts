export interface Content {
    id: string;
    title: string;
    alternate_title?: string;
    slug: string;
    description?: string;
    type: 'anime' | 'manga' | 'manhwa' | 'novel' | 'manhua';
    status: 'ongoing' | 'completed' | 'hiatus' | 'dropped';
    author: string;
    illustrator?: string;
    publisher?: string;
    licensed_by?: string;
    year_published?: number;
    chapter_count?: number;
    volume_count?: number;
    original_language?: string;
    translation_status?: string;
    genres: string[];
    themes: string[];
    content_warnings: string[];
    cover_image_url?: string;
    banner_image_url?: string;
    average_rating?: number;
    average_score?: number;
    total_reviews?: number;
    total_readers?: number;
    total_rating_votes?: number;
    created_at: string;
    updated_at: string;
    published_at?: string;
    is_featured?: boolean;
    is_approved?: boolean;
    titles?: string[];
    descriptions?: string[];
}

export interface Chapter {
    id: string;
    content_id: string;
    number: number;
    title?: string;
    description?: string;
    pages: ChapterPage[];
    created_at: string;
    updated_at: string;
}

export interface ChapterPage {
    id?: string;
    chapter_id: string;
    page_number: number;
    image_url: string;
    cloudinary_public_id?: string;
}

export interface ContentFilters {
    contentType?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface ChapterManifest {
    version?: string;
    base_path?: string;
    extension?: string;
    pages: ManifestPage[];
    page_count: number;
}

export interface ManifestPage {
    page_number: number;
    filename?: string;
    image_url?: string;
}

export interface ApiError {
    success: false;
    error: string;
}

export interface ApiSuccess<T> {
    success: true;
    data: T;
}
