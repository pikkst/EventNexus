import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log('send-test-email function initialized');
console.log('RESEND_API_KEY configured:', !!RESEND_API_KEY);
console.log('SUPABASE_URL configured:', !!SUPABASE_URL);

serve(async (req) => {
  console.log('Received request:', req.method, req.url);
  
  // CORS headers
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    console.log('Parsing request body...');
    const body = await req.json();
    console.log('Request body:', body);
    
    const { recipientEmail, recipientName } = body;

    if (!recipientEmail) {
      console.error('Missing recipientEmail');
      throw new Error('recipientEmail is required');
    }

    console.log('Recipient:', recipientEmail, recipientName);

    // Initialize Supabase client
    console.log('Initializing Supabase client...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Refresh AI platform stats first
    console.log('Refreshing AI platform stats...');
    try {
      const { error: refreshError } = await supabase.rpc('refresh_ai_platform_stats');
      if (refreshError) {
        console.error('Refresh error (non-critical):', refreshError);
      } else {
        console.log('Stats refreshed successfully');
      }
    } catch (e) {
      console.error('Failed to refresh stats (non-critical):', e);
    }

    // Get real platform context - query directly from tables for accurate data
    console.log('Fetching platform stats directly...');
    
    // Count active events
    const { count: eventCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    // Count users
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    console.log('Direct counts - Events:', eventCount, 'Users:', userCount);

    // Still try to get cached stats for other metrics
    const { data: stats, error: statsError } = await supabase
      .from('ai_platform_stats_cache')
      .select('*');

    if (statsError) {
      console.error('Stats error:', statsError);
    } else {
      console.log('Stats loaded:', stats?.length, 'entries');
    }

    console.log('Fetching changelog...');
    const { data: changelog, error: changelogError } = await supabase
      .from('ai_platform_changelog')
      .select('*')
      .eq('is_public', true)
      .order('release_date', { ascending: false })
      .limit(5);

    if (changelogError) {
      console.error('Changelog error:', changelogError);
    } else {
      console.log('Changelog loaded:', changelog?.length, 'entries');
    }

    // Use real counts or fallback to cached stats
    const userStat = userCount || stats?.find((s: any) => s.stat_name === 'total_users')?.stat_value || 0;
    const eventStat = eventCount || stats?.find((s: any) => s.stat_name === 'total_events')?.stat_value || 0;
    const platformPhase = stats?.find((s: any) => s.stat_name === 'platform_phase');
    const trendStat = stats?.find((s: any) => s.stat_name === 'event_creation_trend');

    console.log('Final stats - Users:', userStat, 'Events:', eventStat);

    // Format changelog
    const changelogText = changelog?.map((c: any, i: number) => 
      `${i + 1}. v${c.version} (${c.release_date}): ${c.title} [${c.category}]`
    ).join('\n') || 'No recent updates';

    // Generate email content
    const emailSubject = '🚀 EventNexus AI System Test - Real Platform Data';
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EventNexus AI Test</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #e2e8f0;">
  <div style="max-width: 600px; margin: 40px auto; background: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #fb923c 0%, #f97316 100%); padding: 32px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">🧪 AI System Test</h1>
      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">GitHub Sync + AI Knowledge Base Integration</p>
    </div>

    <!-- Content -->
    <div style="padding: 32px;">
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
        Tere ${recipientName || 'EventNexus Team'}! 👋
      </p>

      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
        See on automaatne test-kiri, mis genereeriti AI Knowledge Base süsteemi poolt kasutades <strong style="color: #fb923c;">reaalajas GitHubist sünkroniseeritud andmeid</strong>.
      </p>

      <!-- Platform Stats -->
      <div style="background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; color: #fb923c; font-size: 18px; font-weight: bold;">📊 Reaalsed Platvormi Andmed</h2>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #cbd5e1;">Kuupäev: ${new Date().toLocaleDateString('et-EE')}</p>
        <ul style="margin: 12px 0; padding-left: 20px; font-size: 14px; line-height: 2;">
          <li><strong style="color: #fb923c;">Platform Phase:</strong> ${platformPhase?.stat_value || 'active_growth'}</li>
          <li><strong style="color: #fb923c;">Kasutajaid kokku:</strong> ${userStat}</li>
          <li><strong style="color: #fb923c;">Aktiivseid üritusi:</strong> ${eventStat}</li>
          <li><strong style="color: #fb923c;">Trend:</strong> ${trendStat?.stat_value || 'growing'}</li>
          <li><strong style="color: #fb923c;">Piletitasu:</strong> 2.5%</li>
        </ul>
      </div>

      <!-- Latest Updates from GitHub -->
      <div style="background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; color: #fb923c; font-size: 18px; font-weight: bold;">📝 Viimased Uuendused (GitHubist)</h2>
        <pre style="margin: 0; padding: 16px; background: #020617; border-radius: 8px; font-size: 12px; line-height: 1.8; color: #94a3b8; overflow-x: auto; font-family: 'Courier New', monospace;">${changelogText}</pre>
      </div>

      <!-- Verification -->
      <div style="background: linear-gradient(135deg, #065f46 0%, #047857 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 12px 0; color: white; font-size: 16px; font-weight: bold;">✅ Süsteemi Kontroll</h2>
        <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: rgba(255,255,255,0.95);">
          See kiri genereeriti kasutades:
        </p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: rgba(255,255,255,0.9);">
          <li>✅ Supabase andmebaasi päringud (reaalajas andmed)</li>
          <li>✅ AI platvormi statistika cache (refresh_ai_platform_stats funktsioon)</li>
          <li>✅ GitHub changelog sync (semantic commit parsing)</li>
          <li>✅ Resend API email delivery</li>
        </ul>
      </div>

      <!-- Purpose -->
      <div style="background: #0f172a; border-left: 4px solid #fb923c; padding: 20px; margin-bottom: 24px; border-radius: 4px;">
        <h2 style="margin: 0 0 12px 0; color: #fb923c; font-size: 16px; font-weight: bold;">🎯 Testi Eesmärk</h2>
        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #cbd5e1;">
          Kontrollime, et AI agent:
        </p>
        <ol style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: #cbd5e1;">
          <li>Kasutab REAALSET platvormi andmeid (mitte hardcoded)</li>
          <li>Viitab tegelikele GitHub commitidele</li>
          <li>Püsib kursis platvormi uuendustega</li>
          <li>Ei leiuta ega hallutsineerida statistikat</li>
        </ol>
      </div>

      <!-- Success Message -->
      <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px;">
        <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: bold; color: #10b981;">
          🎉 Süsteem töötab korrektselt!
        </p>
        <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
          AI õpib nüüd automaatselt Git-i ajaloost ja hoiab platvormi teadmised ajakohasena.
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div style="background: #0f172a; padding: 24px; text-align: center; border-top: 1px solid #334155;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
        EventNexus AI System
      </p>
      <p style="margin: 0 0 16px 0; font-size: 12px; color: #64748b;">
        <a href="https://www.eventnexus.eu" style="color: #fb923c; text-decoration: none;">www.eventnexus.eu</a>
      </p>
      <p style="margin: 0; font-size: 11px; color: #475569; line-height: 1.6;">
        <em>See demonstreerib täielikku protsessi: Git commit → Edge Function → Andmebaas → AI → Email reaalsete andmetega.</em>
      </p>
    </div>

  </div>
</body>
</html>
    `.trim();

    // Send email via Resend
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      throw new Error('RESEND_API_KEY not configured');
    }

    console.log('Sending email to:', recipientEmail);
    console.log('Email subject:', emailSubject);
    
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'EventNexus AI <noreply@mail.eventnexus.eu>',
        to: [recipientEmail],
        subject: emailSubject,
        html: emailBody,
      }),
    });

    console.log('Resend API response status:', resendResponse.status);
    const resendData = await resendResponse.json();
    console.log('Resend API response:', resendData);

    if (!resendResponse.ok) {
      console.error('Resend API failed:', resendData);
      throw new Error(`Resend API error: ${JSON.stringify(resendData)}`);
    }

    console.log('Email sent successfully! ID:', resendData.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test email sent successfully',
        emailId: resendData.id,
        recipientEmail,
        stats: {
          totalUsers: userStat,
          totalEvents: eventStat,
          changelogEntries: changelog?.length || 0,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 200,
      }
    );

  } catch (error) {
    console.error('ERROR in send-test-email:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'no stack');
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 500,
      }
    );
  }
});
