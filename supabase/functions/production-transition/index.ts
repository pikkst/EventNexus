import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface TransitionRequest {
  stripe_public_key?: string;
  api_base_url?: string;
  notes?: string;
}

serve(async (req: Request) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: TransitionRequest = await req.json();

    // Call the production transition function
    const { data, error } = await supabase.rpc("transition_to_production", {
      p_admin_id: user.id,
      p_stripe_public_key: body.stripe_public_key || null,
      p_api_base_url: body.api_base_url || "https://www.eventnexus.eu",
      p_notes: body.notes || null,
    });

    if (error) {
      console.error("Production transition error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Transition failed" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Log the transition
    console.log("✅ Production transition completed:", {
      transitionId: data?.transition_id,
      environment: data?.environment,
      timestamp: new Date().toISOString(),
      admin: user.email,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data,
        message: "Platform successfully transitioned to production",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Production transition edge function error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
