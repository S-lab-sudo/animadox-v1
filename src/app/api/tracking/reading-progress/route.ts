import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ReadingProgressQuerySchema, validateQuery } from '@/lib/validations';

export async function GET(request: NextRequest) {
    try {
        // Validate query parameters with Zod
        const validation = validateQuery(ReadingProgressQuerySchema, request.nextUrl.searchParams);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: validation.error },
                { status: 400 }
            );
        }

        const { sessionToken, contentId } = validation.data;

        const { data, error } = await supabase
            .from('reading_progress')
            .select('*')
            .eq('session_token', sessionToken)
            .eq('content_id', contentId)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 is "no rows found"
            console.error('Error getting reading progress:', error);
            return NextResponse.json(
                { success: false, error: 'Unable to get progress. Please try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data: data || null });
    } catch (error) {
        console.error('Error getting reading progress:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
