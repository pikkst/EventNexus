import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BuddyMatch {
  user_id: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  similarity_score: number;
  common_interests: string[];
  common_events_count: number;
}

export const onRequest = async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current user's interests
    const { data: userInterests } = await supabase
      .from("user_interests")
      .select("categories, preferred_days, preferred_time")
      .eq("user_id", user.id)
      .single();

    // Get all users with interests
    const { data: allUsers } = await supabase
      .from("user_interests")
      .select("user_id, categories, preferred_days, preferred_time")
      .neq("user_id", user.id);

    if (!userInterests || !allUsers) {
      return new Response(
        JSON.stringify({ matches: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate similarity scores
    const matches: BuddyMatch[] = [];

    for (const otherUser of allUsers) {
      // Check if already connected
      const { data: existingConnection } = await supabase
        .from("user_buddies")
        .select("id")
        .or(`and(user_id.eq.${user.id},buddy_id.eq.${otherUser.user_id}),and(user_id.eq.${otherUser.user_id},buddy_id.eq.${user.id})`)
        .maybeSingle();

      if (existingConnection) continue;

      // Calculate similarity
      const userCats = userInterests.categories || [];
      const otherCats = otherUser.categories || [];
      const commonInterests = userCats.filter((cat) =>
        otherCats.includes(cat)
      );

      const userDays = userInterests.preferred_days || [];
      const otherDays = otherUser.preferred_days || [];
      const commonDays = userDays.filter((day) => otherDays.includes(day));

      const similarityScore =
        (commonInterests.length * 0.6 + commonDays.length * 0.4) /
        Math.max(userCats.length, otherCats.length, 1);

      // Get user profile and events count
      const { data: profile } = await supabase
        .from("users")
        .select("username, avatar")
        .eq("id", otherUser.user_id)
        .single();

      const { count: eventsCount } = await supabase
        .from("event_attendees")
        .select("id", { count: "exact", head: true })
        .eq("user_id", otherUser.user_id);

      if (profile && similarityScore > 0.3) {
        matches.push({
          user_id: otherUser.user_id,
          username: profile.username || "User",
          avatar: profile.avatar,
          bio: otherUser.user_id,
          similarity_score: Math.round(similarityScore * 100),
          common_interests: commonInterests,
          common_events_count: eventsCount || 0,
        });
      }
    }

    // Sort by similarity score and limit to top 10
    const topMatches = matches
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, 10);

    return new Response(JSON.stringify({ matches: topMatches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Buddy matching error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};
