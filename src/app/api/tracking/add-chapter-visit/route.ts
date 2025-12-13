import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { AddChapterVisitSchema, validateBody } from '@/lib/validations';
import { validateOrigin } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  // CSRF protection - validate origin
  const originError = validateOrigin(request);
  if (originError) return originError;

  try {
    const body = await request.json();

    // Validate request body with Zod
    const validation = validateBody(AddChapterVisitSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const { sessionToken, chapterId, contentId, timeSpentSeconds, progressPercentage } = validation.data;

    const { data, error } = await supabase
      .from('chapter_history')
      .upsert(
        {
          session_token: sessionToken,
          chapter_id: chapterId,
          content_id: contentId,
          visited_at: new Date().toISOString(),
          time_spent_seconds: timeSpentSeconds || 0,
          progress_percentage: progressPercentage || 0,
        },
        { onConflict: 'session_token,chapter_id' }
      )
      .select();

    if (error) {
      console.error('Error adding chapter visit:', error);
      return NextResponse.json(
        {
          success: false,
          error: process.env.NODE_ENV === 'development' ? error : 'Unable to record visit. Please try again.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error adding chapter visit:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
