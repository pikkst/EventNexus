import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple function to get access token from service account
async function getAccessToken() {
  const serviceAccount = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT") || "{}");
  
  const jwtHeader = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const jwtClaimSet = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));
  
  // Note: This is simplified. In production, use proper JWT signing library
  // For now, we'll use the simpler approach with service account key
  
  return null; // Will implement proper JWT signing if needed
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { threadId, adminId, message, userName, userEmail } = await req.json();

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get admin FCM token
    const { data: admin, error: adminError } = await supabase
      .from("users")
      .select("fcm_token, email")
      .eq("id", adminId)
      .single();

    if (adminError || !admin?.fcm_token) {
      console.log("No FCM token for admin:", adminId);
      return new Response(
        JSON.stringify({ error: "No FCM token found for admin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For now, use the legacy API if FIREBASE_SERVER_KEY is set
    // TODO: Migrate to HTTP v1 API with service account
    const firebaseServerKey = Deno.env.get("FIREBASE_SERVER_KEY");
    
    if (firebaseServerKey) {
      // Legacy API (works for now, but deprecated)
      const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Authorization": `key=${firebaseServerKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: admin.fcm_token,
          priority: "high",
          notification: {
            title: "New Support Message",
            body: `${userName || userEmail || "User"}: ${message.substring(0, 100)}${message.length > 100 ? "..." : ""}`,
            icon: "ic_notification",
            color: "#6366F1",
            sound: "default",
          },
          data: {
            thread_id: threadId,
            user_name: userName || "",
            user_email: userEmail || "",
            message: message,
            type: "new_support_message",
          },
        }),
      });

      const fcmResult = await fcmResponse.json();

      if (!fcmResponse.ok) {
        console.error("FCM error:", fcmResult);
        return new Response(
          JSON.stringify({ error: "Failed to send FCM notification", details: fcmResult }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("FCM notification sent successfully:", fcmResult);

      return new Response(
        JSON.stringify({
          success: true,
          messageId: fcmResult.message_id || fcmResult.results?.[0]?.message_id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // If no server key, return error with instructions
    return new Response(
      JSON.stringify({ 
        error: "Firebase not configured. Enable Cloud Messaging API in Firebase Console and set FIREBASE_SERVER_KEY secret." 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-support-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
