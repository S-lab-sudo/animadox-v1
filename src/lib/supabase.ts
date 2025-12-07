import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let initializationError: string | null = null;

function getSupabaseClient(): SupabaseClient {
    // Return cached instance if available
    if (supabaseInstance) {
        return supabaseInstance;
    }

    // Check for errors from previous initialization attempt
    if (initializationError) {
        throw new Error(initializationError);
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    // Check for missing env vars at runtime
    if (!supabaseUrl || !supabaseKey) {
        // During build time, use placeholder to prevent build errors
        if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
            // This is a build-time check, use placeholders
            console.warn('⚠️ Supabase credentials not found during build - this is expected');
            supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder-key');
            return supabaseInstance;
        }

        // At runtime, this is a real error
        initializationError = 'Database configuration error. Please contact support.';
        console.error('❌ Missing Supabase environment variables:', {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseKey
        });
        throw new Error(initializationError);
    }

    try {
        supabaseInstance = createClient(supabaseUrl, supabaseKey);
        return supabaseInstance;
    } catch (error) {
        initializationError = 'Database connection failed. Please try again later.';
        console.error('❌ Failed to create Supabase client:', error);
        throw new Error(initializationError);
    }
}

// Export a proxy that lazily initializes the client and handles errors
export const supabase = new Proxy({} as SupabaseClient, {
    get(_, prop) {
        try {
            const client = getSupabaseClient();
            const value = (client as unknown as Record<string | symbol, unknown>)[prop];
            if (typeof value === 'function') {
                return value.bind(client);
            }
            return value;
        } catch (error) {
            // Re-throw to be caught by API route try-catch
            throw error;
        }
    }
});
