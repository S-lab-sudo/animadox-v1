import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CreateSessionSchema, validateBody } from '@/lib/validations';
import { validateOrigin } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  // CSRF protection - validate origin
  const originError = validateOrigin(request);
  if (originError) return originError;

  try {
    const body = await request.json();

    // Validate request body with Zod
    const validation = validateBody(CreateSessionSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const { sessionToken } = validation.data;

    const { data, error } = await supabase
      .from('user_sessions')
      .upsert(
        { session_token: sessionToken },
        { onConflict: 'session_token' }
      )
      .select();

    if (error) {
      console.error('Error creating session:', error);
      return NextResponse.json(
        { success: false, error: 'Unable to create session. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
