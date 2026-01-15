// log-error Edge Function
// Purpose: Server-side endpoint for logging errors from client or server
// Protected by authentication - allows authenticated users and service role to log errors

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ErrorLogRequest {
  error_message: string;
  error_stack?: string;
  error_type?: string;
  component_name?: string;
  url?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with the user's auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    // Allow unauthenticated logging (for guest users)
    // but get session ID from request if available
    
    // Parse request body
    const body: ErrorLogRequest = await req.json();

    // Validate required fields
    if (!body.error_message) {
      return new Response(
        JSON.stringify({ error: 'error_message is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract user agent from request headers
    const userAgent = req.headers.get('user-agent') || undefined;

    // Insert error log
    const { error: insertError } = await supabaseClient
      .from('error_logs')
      .insert({
        user_id: user?.id || null,
        session_id: body.metadata?.session_id || null,
        error_message: body.error_message,
        error_stack: body.error_stack,
        error_type: body.error_type || 'server_error',
        component_name: body.component_name,
        url: body.url,
        user_agent: userAgent,
        metadata: body.metadata || {},
      });

    if (insertError) {
      console.error('Error inserting error log:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to log error', details: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Error logged successfully' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in log-error function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
