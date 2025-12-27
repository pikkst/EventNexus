// Rate Organizer Edge Function
// Handles organizer rating submissions with validation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RatingRequest {
  organizerId: string;
  eventId?: string;
  rating: number;
  reviewText?: string;
  aspects?: {
    organization?: number;
    venue?: number;
    communication?: number;
    value?: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: RatingRequest = await req.json();
    const { organizerId, eventId, rating, reviewText, aspects } = body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ error: 'Rating must be between 1 and 5' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate aspects if provided
    if (aspects) {
      const aspectKeys = ['organization', 'venue', 'communication', 'value'];
      for (const key of aspectKeys) {
        const value = aspects[key as keyof typeof aspects];
        if (value !== undefined && (value < 0 || value > 5)) {
          return new Response(
            JSON.stringify({ error: `Aspect ${key} must be between 0 and 5` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // If eventId provided, verify user attended the event
    if (eventId) {
      const { data: ticket, error: ticketError } = await supabaseClient
        .from('tickets')
        .select('checked_in_at')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .single();

      if (ticketError || !ticket || !ticket.checked_in_at) {
        return new Response(
          JSON.stringify({ error: 'You must attend the event before rating' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if rating already exists
    const { data: existingRating } = await supabaseClient
      .from('organizer_ratings')
      .select('id')
      .eq('organizer_id', organizerId)
      .eq('user_id', user.id)
      .eq('event_id', eventId || '')
      .maybeSingle();

    let result;
    if (existingRating) {
      // Update existing rating
      const { data, error } = await supabaseClient
        .from('organizer_ratings')
        .update({
          rating,
          review_text: reviewText,
          aspects: aspects || {
            organization: 0,
            venue: 0,
            communication: 0,
            value: 0,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRating.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new rating
      const { data, error } = await supabaseClient
        .from('organizer_ratings')
        .insert({
          organizer_id: organizerId,
          user_id: user.id,
          event_id: eventId || null,
          rating,
          review_text: reviewText,
          aspects: aspects || {
            organization: 0,
            venue: 0,
            communication: 0,
            value: 0,
          },
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // Refresh stats
    await supabaseClient.rpc('refresh_organizer_rating_stats');

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        message: existingRating ? 'Rating updated successfully' : 'Rating submitted successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in rate-organizer function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
