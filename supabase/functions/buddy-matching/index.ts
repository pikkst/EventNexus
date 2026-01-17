// supabase/functions/buddy-matching/index.ts
// Edge Function: AI-powered buddy/friend matching algorithm
// Analyzes user interests, events attended, and activity patterns to suggest compatible friends

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get authenticated user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { limit = 15 } = await req.json().catch(() => ({}))

    console.log(`🤝 Calculating buddy matches for user ${user.id}`)

    // Get user's interests and activity
    const { data: userInterests } = await supabase
      .from('user_interests')
      .select('categories, preferred_days, preferred_time')
      .eq('user_id', user.id)
      .single()

    if (!userInterests) {
      return new Response(
        JSON.stringify({ matches: [], message: 'No user interests found. Update your profile to get matches.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all potential matches (users with interests, excluding self and existing buddies)
    const { data: existingBuddies } = await supabase
      .from('user_buddies')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)

    const excludedUserIds = new Set([user.id])
    existingBuddies?.forEach(buddy => {
      excludedUserIds.add(buddy.user_id_1)
      excludedUserIds.add(buddy.user_id_2)
    })

    // Fetch potential matches
    const { data: potentialMatches } = await supabase
      .from('user_interests')
      .select(`
        user_id,
        categories,
        preferred_days,
        preferred_time,
        users!user_id(id, full_name, avatar, bio)
      `)
      .not('user_id', 'in', `(${Array.from(excludedUserIds).join(',')})`)
      .eq('is_public', true)

    if (!potentialMatches || potentialMatches.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], message: 'No potential matches found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate similarity scores using AI algorithm
    const matches = await Promise.all(
      potentialMatches.map(async (candidate) => {
        const userCategories = new Set(userInterests.categories || [])
        const candidateCategories = new Set(candidate.categories || [])
        
        // Calculate category overlap
        const commonCategories = [...userCategories].filter(cat => candidateCategories.has(cat))
        const categoryScore = commonCategories.length / Math.max(userCategories.size, candidateCategories.size)

        // Calculate time preference match
        const timeMatch = (
          userInterests.preferred_time === candidate.preferred_time ||
          userInterests.preferred_time === 'any' ||
          candidate.preferred_time === 'any'
        ) ? 1 : 0.5

        // Calculate day preference overlap
        const userDays = new Set(userInterests.preferred_days || [])
        const candidateDays = new Set(candidate.preferred_days || [])
        const commonDays = [...userDays].filter(day => candidateDays.has(day))
        const dayScore = userDays.size > 0 && candidateDays.size > 0
          ? commonDays.length / Math.max(userDays.size, candidateDays.size)
          : 0.5

        // Get common events count
        const { count: commonEventCount } = await supabase
          .from('event_attendees')
          .select('event_id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('event_id', 
            supabase
              .from('event_attendees')
              .select('event_id')
              .eq('user_id', candidate.user_id)
          )

        // Weighted AI similarity algorithm
        const similarityScore = (
          categoryScore * 0.50 +  // 50% weight on shared interests
          timeMatch * 0.20 +       // 20% weight on time preference
          dayScore * 0.20 +        // 20% weight on day preference
          Math.min((commonEventCount || 0) / 5, 1) * 0.10  // 10% weight on shared events
        )

        return {
          user_id: candidate.user_id,
          name: candidate.users.full_name || 'User',
          avatar: candidate.users.avatar || null,
          bio: candidate.users.bio || null,
          common_categories: commonCategories,
          common_event_count: commonEventCount || 0,
          similarity_score: Math.round(similarityScore * 100) / 100
        }
      })
    )

    // Sort by similarity score and limit results
    const sortedMatches = matches
      .filter(m => m.similarity_score > 0.1) // Minimum 10% match
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, limit)

    console.log(`✅ Found ${sortedMatches.length} buddy matches for user ${user.id}`)

    return new Response(
      JSON.stringify({ 
        matches: sortedMatches,
        total: sortedMatches.length,
        algorithm: 'weighted_interest_similarity',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in buddy-matching:', error)
    return new Response(
      JSON.stringify({ error: error.message, matches: [] }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
