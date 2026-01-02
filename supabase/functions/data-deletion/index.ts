import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeletionRequest {
  signed_request?: string;
  user_id?: string;
  email?: string;
}

interface DeletionResponse {
  url: string;
  confirmation_code: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Handle POST requests (data deletion requests)
    if (req.method === 'POST') {
      const body: DeletionRequest = await req.json();
      
      console.log('Data deletion request received:', {
        hasSignedRequest: !!body.signed_request,
        userId: body.user_id,
        email: body.email,
      });

      // Extract user ID from signed request (Facebook OAuth format)
      let userId = body.user_id;
      
      if (body.signed_request) {
        // Parse Facebook's signed request
        // Format: signature.payload (base64 encoded)
        const [, payload] = body.signed_request.split('.');
        if (payload) {
          try {
            const decoded = JSON.parse(atob(payload));
            userId = decoded.user_id || userId;
          } catch (err) {
            console.error('Error parsing signed_request:', err);
          }
        }
      }

      if (!userId && !body.email) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing user identification',
            message: 'Please provide user_id or email'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Generate a unique confirmation code
      const confirmationCode = crypto.randomUUID();

      // Find user by email or external ID
      let userRecord = null;
      
      if (body.email) {
        const { data: users } = await supabaseClient
          .from('users')
          .select('id, email')
          .eq('email', body.email)
          .limit(1);
        
        if (users && users.length > 0) {
          userRecord = users[0];
        }
      }

      if (userRecord) {
        // Mark user for deletion (soft delete)
        const { error: updateError } = await supabaseClient
          .from('users')
          .update({ 
            deleted_at: new Date().toISOString(),
            email: `deleted_${confirmationCode}@eventnexus.eu`
          })
          .eq('id', userRecord.id);

        if (updateError) {
          console.error('Error marking user for deletion:', updateError);
        } else {
          console.log('User marked for deletion:', userRecord.id);
        }

        // Delete auth user from Supabase Auth
        try {
          const { error: authError } = await supabaseClient.auth.admin.deleteUser(
            userRecord.id
          );
          
          if (authError) {
            console.error('Error deleting auth user:', authError);
          } else {
            console.log('Auth user deleted:', userRecord.id);
          }
        } catch (authErr) {
          console.error('Auth deletion error:', authErr);
        }
      }

      // Return confirmation response for Facebook
      const response: DeletionResponse = {
        url: `https://www.eventnexus.eu/data-deletion-status?code=${confirmationCode}`,
        confirmation_code: confirmationCode,
      };

      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle GET requests (status page)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const code = url.searchParams.get('code');

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Data Deletion Request - EventNexus</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              text-align: center;
              background: white;
              padding: 3rem;
              border-radius: 1rem;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              max-width: 500px;
            }
            h1 { color: #333; margin: 0 0 1rem; font-size: 2rem; }
            p { color: #666; margin: 0 0 1rem; line-height: 1.6; }
            .code { 
              background: #f3f4f6; 
              padding: 1rem; 
              border-radius: 0.5rem; 
              font-family: monospace;
              word-break: break-all;
              margin: 1rem 0;
            }
            .success { color: #10b981; font-weight: bold; }
            .info { color: #3b82f6; font-size: 0.875rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Data Deletion Request</h1>
            ${code ? `
              <p class="success">✓ Your data deletion request has been received</p>
              <p>Your confirmation code:</p>
              <div class="code">${code}</div>
              <p class="info">
                Your account and associated data will be permanently deleted within 30 days.
                If you have any questions, please contact us at huntersest@gmail.com
              </p>
            ` : `
              <p>This endpoint handles data deletion requests for EventNexus.</p>
              <p class="info">
                To request deletion of your data, please contact us at huntersest@gmail.com
                or disconnect the app from your Facebook settings.
              </p>
            `}
          </div>
        </body>
        </html>
      `;

      return new Response(html, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
