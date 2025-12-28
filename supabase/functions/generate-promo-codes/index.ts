import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface GenerateCodeRequest {
  codeType: 'promo' | 'reward'
  tier: 'free' | 'basic' | 'pro' | 'enterprise'
  creditAmount: number
  maxUses?: number
  validUntil?: string
  count?: number
  prefix?: string
}

interface PromoCode {
  code: string
  code_type: string
  tier: string
  credit_amount: number
  max_uses: number | null
  valid_until: string | null
}

// Generate a random alphanumeric code
function generateCode(length: number = 12, prefix: string = ''): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude similar characters
  let code = prefix
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Generate readable code based on tier and type
function generateReadableCode(type: string, tier: string, prefix: string = ''): string {
  const typePrefix = type === 'promo' ? 'PROMO' : 'REWARD'
  const tierPrefix = tier.toUpperCase().substring(0, 3)
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  
  return prefix ? `${prefix}-${typePrefix}-${tierPrefix}-${timestamp}${random}` 
                : `${typePrefix}-${tierPrefix}-${timestamp}${random}`
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user is admin
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check admin role
    const { data: userData, error: roleError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (roleError || userData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const requestData: GenerateCodeRequest = await req.json()

    // Validate request
    if (!requestData.codeType || !requestData.tier || !requestData.creditAmount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: codeType, tier, creditAmount' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (requestData.creditAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Credit amount must be positive' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const count = requestData.count || 1
    if (count < 1 || count > 100) {
      return new Response(
        JSON.stringify({ error: 'Count must be between 1 and 100' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Generate codes
    const codes: PromoCode[] = []
    const generatedCodes = new Set<string>()

    for (let i = 0; i < count; i++) {
      let code: string
      let attempts = 0
      const maxAttempts = 10

      // Ensure unique code
      do {
        code = generateReadableCode(
          requestData.codeType,
          requestData.tier,
          requestData.prefix || ''
        )
        attempts++
      } while (generatedCodes.has(code) && attempts < maxAttempts)

      if (attempts >= maxAttempts) {
        return new Response(
          JSON.stringify({ error: 'Failed to generate unique codes' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      generatedCodes.add(code)

      codes.push({
        code,
        code_type: requestData.codeType,
        tier: requestData.tier,
        credit_amount: requestData.creditAmount,
        max_uses: requestData.maxUses || null,
        valid_until: requestData.validUntil || null,
      })
    }

    // Insert codes into database
    const { data, error } = await supabaseClient
      .from('promo_codes')
      .insert(
        codes.map(code => ({
          ...code,
          created_by: user.id,
          is_active: true,
        }))
      )
      .select()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create codes', details: error.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
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
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
