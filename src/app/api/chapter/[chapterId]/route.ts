import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Chapter, ChapterManifest } from '@/lib/types';

// Helper function to get manifest for a chapter
async function getManifest(chapterId: string): Promise<ChapterManifest | null> {
    try {
        const { data, error } = await supabase
            .from('chapter_manifests')
            .select('manifest')
            .eq('chapter_id', chapterId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        return data?.manifest as ChapterManifest | null;
    } catch (error) {
        console.error('Get manifest error:', error);
        return null;
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ chapterId: string }> }
) {
    try {
        const { chapterId } = await params;

        if (!chapterId || chapterId.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Chapter ID is required' },
                { status: 400 }
            );
        }

        // First get the chapter
        const { data: chapterData, error: chapterError } = await supabase
            .from('chapters')
            .select('*')
            .eq('id', chapterId);

        if (chapterError) {
            console.error(`Error fetching chapter ${chapterId}:`, chapterError.message);
            return NextResponse.json(
                { success: false, error: 'Unable to load chapter. Please try again later.' },
                { status: 500 }
            );
        }

        if (!chapterData || chapterData.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Chapter not found' },
                { status: 404 }
            );
        }

        const chapter = chapterData[0];

        // Try to get pages from manifest system first
        try {
            const manifest = await getManifest(chapterId);

            if (manifest && manifest.pages && manifest.pages.length > 0) {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`[API] Retrieved ${manifest.pages.length} pages from manifest for chapter ${chapterId}`);
                }

                return NextResponse.json({
                    success: true,
                    data: {
                        ...chapter,
                        pages: manifest.pages.map((page) => ({
                            id: `${chapterId}-${page.page_number}`,
                            chapter_id: chapterId,
                            page_number: page.page_number,
                            image_url: page.image_url || '',
                        }))
                    } as Chapter
                });
            }
        } catch (manifestErr) {
            if (process.env.NODE_ENV === 'development') {
                console.log(`[API] Manifest fetch failed, will try chapter_pages:`, manifestErr);
            }
        }

        // Fallback to chapter_pages (for backward compatibility)
        try {
            const { data: pagesData, error: pagesError } = await supabase
                .from('chapter_pages')
                .select('*')
                .eq('chapter_id', chapterId)
                .order('page_number', { ascending: true });

            if (pagesError && pagesError.code !== 'PGRST205') {
                if (process.env.NODE_ENV === 'development') {
                    console.error(`Error fetching chapter pages for ${chapterId}:`, pagesError.message);
                }
            }

            return NextResponse.json({
                success: true,
                data: {
                    ...chapter,
                    pages: pagesData?.map(page => ({
                        id: page.id,
                        chapter_id: page.chapter_id,
                        page_number: page.page_number,
                        image_url: page.image_url,
                        cloudinary_public_id: page.cloudinary_public_id || undefined
                    })) || []
                } as Chapter
            });
        } catch (err) {
            if (process.env.NODE_ENV === 'development') {
                console.error(`Error fetching pages for chapter ${chapterId}:`, err);
            }
            return NextResponse.json({
                success: true,
                data: {
                    ...chapter,
                    pages: []
                } as Chapter
            });
        }
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error in getChapterById:', error);
        }
        return NextResponse.json(
            { success: false, error: 'Unable to load chapter. Please try again later.' },
            { status: 500 }
        );
    }
}
