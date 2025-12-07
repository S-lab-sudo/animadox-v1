import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SaveProgressSchema, validateBody } from '@/lib/validations';
import { validateOrigin } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  // CSRF protection - validate origin
  const originError = validateOrigin(request);
  if (originError) return originError;

  try {
    const body = await request.json();

    // Validate request body with Zod
    const validation = validateBody(SaveProgressSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const { sessionToken, contentId, lastReadChapterId, lastReadChapterNumber, progressPercentage } = validation.data;

    const { data, error } = await supabase
      .from('reading_progress')
      .upsert(
        {
          session_token: sessionToken,
          content_id: contentId,
          last_read_chapter_id: lastReadChapterId,
          last_read_chapter_number: lastReadChapterNumber,
          progress_percentage: progressPercentage || 0,
          last_read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_token,content_id' }
      )
      .select();

    if (error) {
      console.error('Error saving reading progress:', error);
      return NextResponse.json(
        { success: false, error: 'Unable to save progress. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error saving reading progress:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
