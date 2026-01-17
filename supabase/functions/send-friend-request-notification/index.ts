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
    const { user_id, buddy_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get buddy user details
    const { data: buddy } = await supabase
      .from("users")
      .select("username, email")
      .eq("id", buddy_id)
      .single();

    if (!buddy) {
      return new Response(JSON.stringify({ error: "Buddy not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get requester details
    const { data: requester } = await supabase
      .from("users")
      .select("username")
      .eq("id", user_id)
      .single();

    // Create notification
    await supabase.from("notifications").insert({
      user_id: buddy_id,
      type: "friend_request",
      title: `${requester?.username} wants to be your friend`,
      message: `${requester?.username} sent you a friend request. Connect to see common interests!`,
      related_user_id: user_id,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    // Send email notification (optional, depends on user preferences)
    // This is a simplified version - you might want to use a service like SendGrid
    console.log(
      `Friend request notification sent to ${buddy.email} from ${requester?.username}`
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Friend request notification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};
