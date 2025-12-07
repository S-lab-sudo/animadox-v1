import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Chapter } from '@/lib/types';

// Simple in-memory cache for chapters (edge-compatible)
const chaptersCache = new Map<string, { data: Chapter[]; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ contentId: string }> }
) {
    const startTime = performance.now();

    try {
        const { contentId } = await params;
        if (process.env.NODE_ENV === 'development') {
            console.log(`\n📊 [API /chapters/${contentId}] Request started`);
        }

        if (!contentId || contentId.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Content ID is required' },
                { status: 400 }
            );
        }

        // Check cache first
        const cached = chaptersCache.get(contentId);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            if (process.env.NODE_ENV === 'development') {
                console.log(`  ⚡ Cache HIT! (${cached.data.length} chapters) Total time: ${(performance.now() - startTime).toFixed(1)}ms\n`);
            }
            return NextResponse.json({
                success: true,
                data: cached.data
            });
        }

        const queryStart = performance.now();
        const { data, error } = await supabase
            .from('chapters')
            .select('id, content_id, number, title') // Select only needed fields
            .eq('content_id', contentId)
            .order('number', { ascending: true });
        if (process.env.NODE_ENV === 'development') {
            console.log(`  ⏱️ Chapters query: ${(performance.now() - queryStart).toFixed(1)}ms (${data?.length || 0} chapters)`);
        }

        if (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error(`Error fetching chapters for content ${contentId}:`, error.message);
            }
            return NextResponse.json(
                { success: false, error: 'Unable to load chapters. Please try again later.' },
                { status: 500 }
            );
        }

        const chaptersData = data as Chapter[];

        // Cache the result
        chaptersCache.set(contentId, { data: chaptersData, timestamp: Date.now() });

        const totalTime = performance.now() - startTime;
        if (process.env.NODE_ENV === 'development') {
            console.log(`  ✅ Total time: ${totalTime.toFixed(1)}ms\n`);
        }

        return NextResponse.json({
            success: true,
            data: chaptersData
        });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error in getChaptersByContentId:', error);
        }
        return NextResponse.json(
            { success: false, error: 'Unable to load chapters. Please try again later.' },
            { status: 500 }
        );
    }
}
