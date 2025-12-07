import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Content } from '@/lib/types';

// Simple in-memory cache for content (edge-compatible)
const contentCache = new Map<string, { data: Content; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = performance.now();

    try {
        const { id } = await params;
        if (process.env.NODE_ENV === 'development') {
            console.log(`\n📊 [API /content/${id}] Request started`);
        }

        if (!id || id.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Content ID is required' },
                { status: 400 }
            );
        }

        // Check cache first
        const cached = contentCache.get(id);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            if (process.env.NODE_ENV === 'development') {
                console.log(`  ⚡ Cache HIT! Total time: ${(performance.now() - startTime).toFixed(1)}ms\n`);
            }
            return NextResponse.json({
                success: true,
                data: cached.data
            });
        }

        // Single query - fetch content only (chapter count will come from chapters API)
        const queryStart = performance.now();
        const { data, error } = await supabase
            .from('content')
            .select('*')
            .eq('id', id)
            .single(); // Use single() for better performance
        if (process.env.NODE_ENV === 'development') {
            console.log(`  ⏱️ Content query: ${(performance.now() - queryStart).toFixed(1)}ms`);
        }

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json(
                    { success: false, error: 'Content not found' },
                    { status: 404 }
                );
            }
            if (process.env.NODE_ENV === 'development') {
                console.error(`Error fetching content ${id}:`, error.message);
            }
            return NextResponse.json(
                { success: false, error: 'Unable to load content. Please try again later.' },
                { status: 500 }
            );
        }

        const contentData = data as Content;

        // Cache the result
        contentCache.set(id, { data: contentData, timestamp: Date.now() });

        const totalTime = performance.now() - startTime;
        if (process.env.NODE_ENV === 'development') {
            console.log(`  ✅ Total time: ${totalTime.toFixed(1)}ms\n`);
        }

        return NextResponse.json({
            success: true,
            data: contentData
        });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error in getContentById:', error);
        }
        return NextResponse.json(
            { success: false, error: 'Unable to load content. Please try again later.' },
            { status: 500 }
        );
    }
}
