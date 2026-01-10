// AI Agent: Validation & Trust Service
// Validates parsed events using rules and confidence scoring

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateEventDate } from '../_shared/dateValidator.ts';

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

function calculateTimeValidity(event: any, timezone: string = 'Europe/Tallinn'): number {
  try {
    // 🔧 Use central date validator with city timezone
    const validation = validateEventDate(event.start_time, timezone)
    
    if (!validation.valid) {
      console.log(`Time validation failed: ${validation.reason} - ${validation.details}`)
      return 0
    }

    // Check end time if provided
    if (event.end_time) {
      const startTime = new Date(event.start_time)
      const endTime = new Date(event.end_time)
      if (endTime <= startTime) {
        return 30 // Invalid time range
      }
    }

    return 100
  } catch (error) {
    console.error('Time validity error:', error)
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
  sourceScore: number,
  timezone: string = 'Europe/Tallinn'
): Promise<ValidationResult> {
  const event = parsedEvent.structured_json
  const errors: string[] = []
  const warnings: string[] = []

  // Calculate individual scores
  const dataCompleteness = calculateDataCompleteness(event)
  const timeValidity = calculateTimeValidity(event, timezone)
  const geoAccuracy = calculateGeoAccuracy(event)
  const semanticValidity = await calculateSemanticValidity(event)

  // Calculate final score (weighted average)
  // All component scores are 0-1, final_score is 0-100 for UI
  const finalScore = (
    (sourceScore / 100) * 0.25 +
    (dataCompleteness / 100) * 0.25 +
    (timeValidity / 100) * 0.20 +
    (geoAccuracy / 100) * 0.15 +
    (semanticValidity / 100) * 0.15
  ) * 100

  const scores = {
    source_score: sourceScore / 100,
    data_completeness: dataCompleteness / 100,
    time_validity: timeValidity / 100,
    geo_accuracy: geoAccuracy / 100,
    semantic_validity: semanticValidity / 100,
    final_score: Math.round(finalScore * 100) / 100, // Round to 2 decimals
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

    // Get city_id from request body
    let cityId: string | null = null
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        cityId = body.city_id || null
      } catch {
        // No body or invalid JSON
      }
    }

    // Build query for pending parsed events
    let query = supabaseClient
      .from('parsed_events')
      .select('*, raw_events!inner(event_sources!inner(city_id))')
      .eq('validation_status', 'pending')
      .limit(10)

    // Filter by city_id if provided
    if (cityId) {
      query = query.eq('raw_events.event_sources.city_id', cityId)
    }

    const { data: parsedEvents, error: parsedError } = await query

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

        // Get city_id from nested structure
        const eventCityId = parsedEvent.raw_events?.event_sources?.city_id

        // Fetch city config for timezone
        let cityConfig = { timezone: 'Europe/Tallinn', city_name: 'Unknown', country: 'Unknown' }
        if (eventCityId) {
          const { data: cityConfigData, error: cityError } = await supabaseClient
            .from('city_configs')
            .select('city_name, country, timezone')
            .eq('city_id', eventCityId)
            .single()

          if (!cityError && cityConfigData) {
            cityConfig = cityConfigData
          }
        }

        console.log(`Validating event for ${cityConfig.city_name}, ${cityConfig.country} (${cityConfig.timezone})`)

        // Fetch source_score separately to avoid complex JOIN issues
        let sourceScore = 50 // Default score if not found
        try {
          const { data: rawEvent } = await supabaseClient
            .from('raw_events')
            .select('source_id')
            .eq('id', parsedEvent.raw_event_id)
            .single()
          
          if (rawEvent?.source_id) {
            const { data: eventSource } = await supabaseClient
              .from('event_sources')
              .select('source_score')
              .eq('id', rawEvent.source_id)
              .single()
            
            if (eventSource?.source_score) {
              sourceScore = eventSource.source_score * 100
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch source_score for event ${parsedEvent.id}:`, err)
        }

        const validation = await validateEvent(parsedEvent, sourceScore, cityConfig.timezone)

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

          if (validation.action === 'auto_publish' || validation.action === 'publish_flagged') {
            // Call publish-event function
            try {
              const publishResponse = await fetch(
                `${Deno.env.get('SUPABASE_URL')}/functions/v1/publish-event`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ parsed_event_id: parsedEvent.id }),
                }
              )

              if (publishResponse.ok) {
                if (validation.action === 'auto_publish') {
                  results.auto_published++
                } else {
                  results.flagged++
                }
              } else {
                console.error(`Failed to publish event ${parsedEvent.id}:`, await publishResponse.text())
                results.queued_for_review++
              }
            } catch (publishError) {
              console.error(`Error calling publish-event for ${parsedEvent.id}:`, publishError)
              results.queued_for_review++
            }
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
