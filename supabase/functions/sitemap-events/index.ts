import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch all public and semi-private events
    const { data: events, error } = await supabase
      .from("events")
      .select("id, name, date, updated_at, visibility")
      .eq("status", "active")
      .in("visibility", ["public", "semi-private"])
      .is("archived_at", null)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching events:", error);
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`,
        {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            ...corsHeaders,
          },
        }
      );
    }

    // Generate XML sitemap
    const baseUrl = "https://www.eventnexus.eu";
    let xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add events to sitemap
    if (events && events.length > 0) {
      for (const event of events) {
        const lastmod = event.updated_at
          ? new Date(event.updated_at).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];

        xml += `  <url>
    <loc>${baseUrl}/event/${event.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
      }
    }

    xml += "</urlset>";

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        ...corsHeaders,
      },
    });
  } catch (err) {
    console.error("Error in sitemap-events function:", err);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`,
      {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          ...corsHeaders,
        },
      }
    );
  }
});
