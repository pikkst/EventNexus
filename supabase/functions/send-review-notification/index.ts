import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export const onRequest = async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { event_id, reviewer_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get event details
    const { data: event } = await supabase
      .from("events")
      .select("id, name, organizer_id")
      .eq("id", event_id)
      .single();

    if (!event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get reviewer details
    const { data: reviewer } = await supabase
      .from("users")
      .select("username")
      .eq("id", reviewer_id)
      .single();

    // Get event organizer
    const { data: organizer } = await supabase
      .from("users")
      .select("id, email")
      .eq("id", event.organizer_id)
      .single();

    if (!organizer) {
      return new Response(JSON.stringify({ error: "Organizer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create notification for organizer
    await supabase.from("notifications").insert({
      user_id: organizer.id,
      type: "event_review",
      title: `New review for ${event.name}`,
      message: `${reviewer?.username} left a review for your event "${event.name}". Check it out!`,
      related_event_id: event_id,
      related_user_id: reviewer_id,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    console.log(
      `Review notification sent for event ${event.name} to organizer ${organizer.email}`
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Review notification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};
