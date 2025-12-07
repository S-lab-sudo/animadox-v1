import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ChapterManifest } from '@/lib/types';

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

        // Get chapter info first
        const { data: chapterData, error: chapterError } = await supabase
            .from('chapters')
            .select('id, number, title')
            .eq('id', chapterId)
            .single();

        if (chapterError) {
            if (chapterError.code === 'PGRST116') {
                return NextResponse.json(
                    { success: false, error: 'Chapter not found' },
                    { status: 404 }
                );
            }
            console.error(`Error fetching chapter ${chapterId}:`, chapterError.message);
            return NextResponse.json(
                { success: false, error: 'Unable to load pages. Please try again later.' },
                { status: 500 }
            );
        }

        // Try manifest first
        const manifest = await getManifest(chapterId);

        if (manifest && manifest.pages && manifest.pages.length > 0) {
            return NextResponse.json({
                success: true,
                data: {
                    chapterId: chapterData.id,
                    chapterNumber: chapterData.number,
                    title: chapterData.title,
                    pages: manifest.pages.map((page) => ({
                        id: `${chapterId}-${page.page_number}`,
                        chapter_id: chapterId,
                        page_number: page.page_number,
                        image_url: page.image_url || '',
                    }))
                }
            }, {
                headers: {
                    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
                }
            });
        }


        // Fallback to chapter_pages
        const { data: pagesData, error: pagesError } = await supabase
            .from('chapter_pages')
            .select('*')
            .eq('chapter_id', chapterId)
            .order('page_number', { ascending: true });

        if (pagesError && pagesError.code !== 'PGRST205') {
            console.error(`Error fetching chapter pages for ${chapterId}:`, pagesError.message);
        }

        return NextResponse.json({
            success: true,
            data: {
                chapterId: chapterData.id,
                chapterNumber: chapterData.number,
                title: chapterData.title,
                pages: pagesData?.map(page => ({
                    id: page.id,
                    chapter_id: page.chapter_id,
                    page_number: page.page_number,
                    image_url: page.image_url,
                    cloudinary_public_id: page.cloudinary_public_id || undefined
                })) || []
            }
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            }
        });
    } catch (error) {
        console.error('Error in getChapterPages:', error);
        return NextResponse.json(
            { success: false, error: 'Unable to load pages. Please try again later.' },
            { status: 500 }
        );
    }
}
