// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)
        const userId = url.searchParams.get('user_id')

        if (!userId) {
            return new Response(
                JSON.stringify({ error: 'user_id is required' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Create Supabase client with service role key
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Fetch unread notifications for user
        const { data, error, count } = await supabase
            .from('user_notifications')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .eq('is_read', false)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Query error:', error)
            return new Response(
                JSON.stringify({ error: error.message }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        return new Response(
            JSON.stringify({ data: data || [], count: count || 0 }),
            {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                    // Short cache for notifications (30 seconds)
                    'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
                }
            }
        )
    } catch (err) {
        console.error('Edge function error:', err)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
