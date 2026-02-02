import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@12.17.0?dts';
import { corsHeaders } from '../_shared/cors.ts';

interface GenerateDiscountRequest {
  tier: 'pro' | 'premium' | 'enterprise' | 'any';
  percentOff: number;
  durationMonths: number;
  maxUses?: number;
  validUntil?: string;
  count?: number;
  prefix?: string;
}

interface DiscountCodeRecord {
  code: string;
  tier: 'pro' | 'premium' | 'enterprise' | 'any';
  percent_off: number;
  duration_months: number;
  max_uses: number | null;
  valid_until: string | null;
  stripe_coupon_id: string;
  stripe_promotion_code_id: string;
}

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })
  : null;

function generateReadableCode(tier: string, percentOff: number, prefix: string = ''): string {
  const tierPrefix = tier.toUpperCase().substring(0, 3);
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const base = `${tierPrefix}-${percentOff}-${timestamp}${random}`;
  return prefix ? `${prefix}-${base}` : `DISC-${base}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!stripe) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: userData, error: roleError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || userData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const requestData: GenerateDiscountRequest = await req.json();

    if (!requestData.tier || !requestData.percentOff || !requestData.durationMonths) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: tier, percentOff, durationMonths' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (requestData.percentOff <= 0 || requestData.percentOff > 100) {
      return new Response(
        JSON.stringify({ error: 'Percent off must be between 1 and 100' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (requestData.durationMonths < 1 || requestData.durationMonths > 12) {
      return new Response(
        JSON.stringify({ error: 'Duration months must be between 1 and 12' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const count = requestData.count || 1;
    if (count < 1 || count > 100) {
      return new Response(
        JSON.stringify({ error: 'Count must be between 1 and 100' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const codes: DiscountCodeRecord[] = [];
    const generatedCodes = new Set<string>();

    for (let i = 0; i < count; i++) {
      let code = '';
      let attempts = 0;
      const maxAttempts = 10;

      do {
        code = generateReadableCode(
          requestData.tier,
          requestData.percentOff,
          (requestData.prefix || '').toUpperCase()
        );
        attempts++;
      } while (generatedCodes.has(code) && attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        return new Response(
          JSON.stringify({ error: 'Failed to generate unique codes' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      generatedCodes.add(code);

      const coupon = await stripe.coupons.create({
        percent_off: requestData.percentOff,
        duration: 'repeating',
        duration_in_months: requestData.durationMonths,
        metadata: {
          tier: requestData.tier,
          created_by: user.id,
        },
      });

      const promotionCode = await stripe.promotionCodes.create({
        coupon: coupon.id,
        code,
        max_redemptions: requestData.maxUses || undefined,
        expires_at: requestData.validUntil ? Math.floor(new Date(requestData.validUntil).getTime() / 1000) : undefined,
        metadata: {
          tier: requestData.tier,
          duration_months: requestData.durationMonths.toString(),
        },
      });

      codes.push({
        code,
        tier: requestData.tier,
        percent_off: requestData.percentOff,
        duration_months: requestData.durationMonths,
        max_uses: requestData.maxUses || null,
        valid_until: requestData.validUntil || null,
        stripe_coupon_id: coupon.id,
        stripe_promotion_code_id: promotionCode.id,
      });
    }

    const { data, error } = await supabaseClient
      .from('subscription_discount_codes')
      .insert(
        codes.map((code) => ({
          ...code,
          created_by: user.id,
          is_active: true,
        }))
      )
      .select();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create discount codes', details: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        codes: data,
        count: data.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
