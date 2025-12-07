import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const sessionToken = searchParams.get('sessionToken');

        if (!sessionToken) {
            return NextResponse.json(
                { success: false, error: 'Session token is required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('reading_progress')
            .select('*')
            .eq('session_token', sessionToken)
            .order('last_read_at', { ascending: false });

        if (error) {
            console.error('Error getting reading history:', error);
            return NextResponse.json(
                { success: false, error: 'Unable to get history. Please try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error getting reading history:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
