import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const sessionToken = searchParams.get('sessionToken');
        const contentId = searchParams.get('contentId');

        if (!sessionToken || !contentId) {
            return NextResponse.json(
                { success: false, error: 'Session token and content ID are required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('chapter_history')
            .select('chapter_id')
            .eq('session_token', sessionToken)
            .eq('content_id', contentId);

        if (error) {
            console.error('Error getting visited chapters:', error);
            return NextResponse.json(
                { success: false, error: 'Unable to get chapters. Please try again.' },
                { status: 500 }
            );
        }

        const chapterIds = data?.map((item) => item.chapter_id) || [];

        return NextResponse.json({ success: true, data: chapterIds });
    } catch (error) {
        console.error('Error getting visited chapters:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
