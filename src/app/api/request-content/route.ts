import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { RequestContentSchema, validateBody } from '@/lib/validations';
import { validateOrigin } from '@/lib/csrf';
import { checkRateLimit, rateLimits } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
    // CSRF protection - validate origin
    const originError = validateOrigin(request);
    if (originError) return originError;

    // Rate limiting (stricter for mutations)
    const rateLimitError = checkRateLimit(request, rateLimits.mutation);
    if (rateLimitError) return rateLimitError;

    try {
        const body = await request.json();

        // Validate request body with Zod
        const validation = validateBody(RequestContentSchema, body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: validation.error },
                { status: 400 }
            );
        }

        const { title, type, description, email } = validation.data;

        const { data, error } = await supabase
            .from('content_requests')
            .insert({
                title: title.trim(),
                type: type || 'manhwa',
                description: description?.trim() || null,
                requester_email: email?.trim() || null,
                status: 'pending'
            })
            .select()
            .single();

        if (error) {
            console.error('[RequestAPI] Error creating request:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to submit request' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "You'll get your content in short time! Please enjoy our website.",
            data: { id: data.id }
        }, { status: 201 });
    } catch (error) {
        console.error('[RequestAPI] ❌ Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}
