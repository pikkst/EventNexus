// AI Agent: Validation & Trust Service
// Validates parsed events using rules and confidence scoring

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidationResult {
  passed: boolean
  scores: {
    source_score: number
    data_completeness: number
    time_validity: number
    geo_accuracy: number
    semantic_validity: number
    final_score: number
  }
  errors: string[]
  warnings: string[]
  action: 'auto_publish' | 'publish_flagged' | 'review' | 'reject'
}

function calculateDataCompleteness(event: any): number {
  const requiredFields = ['name', 'description', 'start_time', 'location_address', 'category']
  const optionalFields = ['end_time', 'location_lat', 'location_lng', 'organizer', 'image_url', 'source_url']
  
  let score = 0
  let maxScore = 0

  // Required fields (70% weight)
  requiredFields.forEach(field => {
    maxScore += 70 / requiredFields.length
    if (event[field] && event[field].toString().trim().length > 0) {
      score += 70 / requiredFields.length
    }
  })

  // Optional fields (30% weight)
  optionalFields.forEach(field => {
    maxScore += 30 / optionalFields.length
    if (event[field] && event[field].toString().trim().length > 0) {
      score += 30 / optionalFields.length
    }
  })

  return Math.round(score)
}

function calculateTimeValidity(event: any): number {
  try {
    const startTime = new Date(event.start_time)
    const now = new Date()
    
    // Event must be in the future
    if (startTime <= now) {
      return 0
    }

    // Events too far in future (>1 year) get lower score
    const monthsAhead = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (monthsAhead > 12) {
      return 50
    }

    // Check end time if provided
    if (event.end_time) {
      const endTime = new Date(event.end_time)
      if (endTime <= startTime) {
        return 30 // Invalid time range
      }
    }

    return 100
  } catch (error) {
    return 0
  }
}

function calculateGeoAccuracy(event: any, cityBounds?: any): number {
  // No coordinates
  if (!event.location_lat || !event.location_lng) {
    return 30 // Has address but no coords
  }

  // Basic coordinate validation
  const lat = event.location_lat
  const lng = event.location_lng

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return 0
  }

  // If city bounds available, check if within bounds
  // (This would use PostGIS in production)
  // For now, give high score if coords exist
  return 100
}

async function calculateSemanticValidity(event: any): Promise<number> {
  // Rule-based spam detection
  const spamKeywords = ['buy now', 'click here', 'limited offer', 'act now', '$$$', 'free money']
  const title = event.title?.toLowerCase() || ''
  const description = event.description?.toLowerCase() || ''

  for (const keyword of spamKeywords) {
    if (title.includes(keyword) || description.includes(keyword)) {
      return 20 // Likely spam
    }
  }

  // Check for reasonable title length
  if (title.length < 5 || title.length > 200) {
    return 40
  }

  // Check for excessive caps
  const capsRatio = (title.match(/[A-Z]/g) || []).length / title.length
  if (capsRatio > 0.5) {
    return 50
  }

  return 100
}

async function validateEvent(
  parsedEvent: any,
  sourceScore: number
): Promise<ValidationResult> {
  const event = parsedEvent.structured_json
  const errors: string[] = []
  const warnings: string[] = []

  // Calculate individual scores
  const dataCompleteness = calculateDataCompleteness(event)
  const timeValidity = calculateTimeValidity(event)
  const geoAccuracy = calculateGeoAccuracy(event)
  const semanticValidity = await calculateSemanticValidity(event)

  // Calculate final score (weighted average)
  const finalScore = Math.round(
    sourceScore * 25 +
    dataCompleteness * 0.25 +
    timeValidity * 0.20 +
    geoAccuracy * 0.15 +
    semanticValidity * 0.15
  )

  const scores = {
    source_score: sourceScore,
    data_completeness: dataCompleteness,
    time_validity: timeValidity,
    geo_accuracy: geoAccuracy,
    semantic_validity: semanticValidity,
    final_score: finalScore,
  }

  // Validation rules
  if (timeValidity === 0) {
    errors.push('Event date is in the past or invalid')
  }

  if (dataCompleteness < 50) {
    errors.push('Insufficient event data')
  }

  if (semanticValidity < 30) {
    errors.push('Event appears to be spam or promotional')
  }

  if (geoAccuracy === 0) {
    errors.push('Invalid location coordinates')
  }

  // Warnings
  if (dataCompleteness < 70) {
    warnings.push('Some optional fields are missing')
  }

  if (!event.location_lat) {
    warnings.push('Location not geocoded')
  }

  // Determine action based on score
  let action: ValidationResult['action']
  if (finalScore >= 80 && errors.length === 0) {
    action = 'auto_publish'
  } else if (finalScore >= 60 && errors.length === 0) {
    action = 'publish_flagged'
  } else if (finalScore >= 40) {
    action = 'review'
  } else {
    action = 'reject'
  }

  return {
    passed: action !== 'reject',
    scores,
    errors,
    warnings,
    action,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get pending parsed events
    const { data: parsedEvents, error: parsedError } = await supabaseClient
      .from('parsed_events')
      .select(`
        *,
        raw_events!inner(
          event_sources!inner(source_score)
        )
      `)
      .eq('validation_status', 'pending')
      .limit(10)

    if (parsedError) throw parsedError

    const results = {
      validated: 0,
      auto_published: 0,
      flagged: 0,
      queued_for_review: 0,
      rejected: 0,
    }

    for (const parsedEvent of parsedEvents) {
      try {
        await supabaseClient
          .from('parsed_events')
          .update({ validation_status: 'validating' })
          .eq('id', parsedEvent.id)

        const sourceScore = parsedEvent.raw_events.event_sources.source_score * 100

        const validation = await validateEvent(parsedEvent, sourceScore)

        // Store confidence scores
        await supabaseClient
          .from('event_confidence')
          .insert({
            parsed_event_id: parsedEvent.id,
            ...validation.scores,
            calculation_metadata: {
              errors: validation.errors,
              warnings: validation.warnings,
            },
          })

        // Log decision
        await supabaseClient
          .from('ai_decision_log')
          .insert({
            parsed_event_id: parsedEvent.id,
            decision_type: 'validation',
            decision_result: validation.action,
            reasoning: {
              scores: validation.scores,
              errors: validation.errors,
              warnings: validation.warnings,
            },
            confidence_score: validation.scores.final_score,
            ai_model: 'rules_engine',
          })

        if (validation.action === 'reject') {
          await supabaseClient
            .from('parsed_events')
            .update({ validation_status: 'rejected' })
            .eq('id', parsedEvent.id)

          results.rejected++
        } else if (validation.action === 'review') {
          await supabaseClient
            .from('review_queue')
            .insert({
              parsed_event_id: parsedEvent.id,
              reason: `Low confidence: ${validation.errors.join(', ')}`,
              confidence_score: validation.scores.final_score,
              status: 'pending',
            })

          await supabaseClient
            .from('parsed_events')
            .update({ validation_status: 'validated' })
            .eq('id', parsedEvent.id)

          results.queued_for_review++
        } else {
          await supabaseClient
            .from('parsed_events')
            .update({ validation_status: 'validated' })
            .eq('id', parsedEvent.id)

          if (validation.action === 'auto_publish') {
            results.auto_published++
          } else {
            results.flagged++
          }
        }

        results.validated++
      } catch (error) {
        console.error(`Failed to validate event ${parsedEvent.id}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in validate-event:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
