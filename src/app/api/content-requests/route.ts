import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');

        let query = supabase
            .from('content_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[RequestAPI] Error getting requests:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to fetch requests' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data,
            count: data?.length || 0
        });
    } catch (error) {
        console.error('[RequestAPI] ❌ Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: 'Something went wrong' },
            { status: 500 }
        );
    }
}
