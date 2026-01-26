// supabase/functions/send-review-notification/index.ts
// Edge Function to send notifications when an event receives a new review
// Triggered when a user posts a review for an event

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { reviewId } = await req.json()

    if (!reviewId) {
      throw new Error('Missing reviewId')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch review details
    const { data: review, error: reviewError } = await supabase
      .from('event_reviews')
      .select(`
        *,
        reviewer:user_id(id, name, email, avatar),
        event:event_id(id, name, organizer_id, organizer:organizer_id(id, name, email))
      `)
      .eq('id', reviewId)
      .single()

    if (reviewError || !review) {
      throw new Error(`Review not found: ${reviewError?.message}`)
    }

    console.log(`⭐ Processing review notification for review ${reviewId}`)

    // Send notification to event organizer
    await sendReviewEmailToOrganizer(supabase, review)
    await createInAppNotification(supabase, review)

    return new Response(
      JSON.stringify({ 
        success: true, 
        reviewId,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in send-review-notification:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function sendReviewEmailToOrganizer(supabase: any, review: any) {
  try {
    const organizer = review.event.organizer
    const reviewer = review.reviewer
    const event = review.event

    if (!organizer?.email) {
      console.error('Organizer email not found')
      return
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')!
    
    // Generate star rating HTML
    const starRating = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating)
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { 
              background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); 
              color: white; 
              padding: 20px; 
              border-radius: 8px 8px 0 0; 
              text-align: center;
            }
            .content { 
              background: #f9fafb; 
              padding: 20px; 
              border: 1px solid #e5e7eb; 
              border-top: none; 
              border-radius: 0 0 8px 8px; 
            }
            .event-card {
              background: white;
              padding: 15px;
              border-radius: 8px;
              margin: 15px 0;
              border-left: 4px solid #f59e0b;
            }
            .review-card {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border: 2px solid #e5e7eb;
            }
            .rating {
              font-size: 24px;
              margin: 10px 0;
              color: #f59e0b;
            }
            .reviewer-info {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 15px;
            }
            .avatar {
              width: 50px;
              height: 50px;
              border-radius: 50%;
              object-fit: cover;
            }
            .review-content {
              background: #f9fafb;
              padding: 15px;
              border-radius: 6px;
              border-left: 3px solid #f59e0b;
              margin: 15px 0;
            }
            .rating-breakdown {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              margin: 15px 0;
            }
            .rating-item {
              background: #fef3c7;
              padding: 10px;
              border-radius: 6px;
              text-align: center;
            }
            .badge {
              display: inline-block;
              padding: 4px 8px;
              background: #10b981;
              color: white;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
            }
            .button { 
              display: inline-block; 
              background: #f59e0b; 
              color: white; 
              padding: 12px 24px; 
              border-radius: 6px; 
              text-decoration: none;
              margin: 15px 5px;
              font-weight: bold;
            }
            .footer { 
              color: #6b7280; 
              font-size: 12px; 
              margin-top: 20px; 
              padding-top: 15px; 
              border-top: 1px solid #e5e7eb; 
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">⭐ New Review for Your Event</h2>
            </div>
            
            <div class="content">
              <p>Hi ${organizer.name},</p>
              
              <p>You received a new review on EventNexus!</p>
              
              <div class="event-card">
                <h3 style="margin: 0 0 5px 0; color: #1f2937;">${event.name}</h3>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Event ID: ${event.id}</p>
              </div>
              
              <div class="review-card">
                <div class="reviewer-info">
                  <img 
                    src="${reviewer.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${reviewer.name}`}" 
                    alt="${reviewer.name}" 
                    class="avatar"
                  />
                  <div>
                    <h4 style="margin: 0; color: #1f2937;">${reviewer.name}</h4>
                    ${review.is_verified_attendee ? '<span class="badge">✓ Verified Attendee</span>' : ''}
                  </div>
                </div>
                
                <div class="rating">${starRating} ${review.rating}/5</div>
                
                ${review.title ? `<h3 style="color: #1f2937; margin: 10px 0;">${review.title}</h3>` : ''}
                
                ${review.content ? `
                  <div class="review-content">
                    <p style="margin: 0; line-height: 1.6;">${review.content}</p>
                  </div>
                ` : ''}
                
                ${review.atmosphere_rating || review.value_rating || review.organization_rating ? `
                  <div class="rating-breakdown">
                    ${review.atmosphere_rating ? `
                      <div class="rating-item">
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Atmosphere</div>
                        <div style="font-weight: bold; color: #f59e0b;">${review.atmosphere_rating}/5</div>
                      </div>
                    ` : ''}
                    ${review.value_rating ? `
                      <div class="rating-item">
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Value</div>
                        <div style="font-weight: bold; color: #f59e0b;">${review.value_rating}/5</div>
                      </div>
                    ` : ''}
                    ${review.organization_rating ? `
                      <div class="rating-item">
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Organization</div>
                        <div style="font-weight: bold; color: #f59e0b;">${review.organization_rating}/5</div>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}
                
                <p style="color: #6b7280; font-size: 12px; margin: 15px 0 0 0;">
                  Posted ${new Date(review.created_at).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
              
              <p>Reviews help build trust and attract more attendees to your events. Thank you for creating great experiences!</p>
              
              <div style="text-align: center;">
                <a href="https://www.eventnexus.eu/events/${event.id}" class="button">View Event & Reviews</a>
              </div>
            </div>
            
            <div class="footer">
              <p>EventNexus - Build trust through authentic reviews<br/>
              This is an automated message. Manage your events in your dashboard.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'EventNexus <notifications@mail.eventnexus.eu>',
        to: organizer.email,
        subject: `⭐ New ${review.rating}-star review for ${event.name}`,
        html: emailHtml
      })
    })

    if (!response.ok) {
      throw new Error(`Resend API error: ${response.statusText}`)
    }

    console.log(`✅ Review notification email sent to ${organizer.email}`)
  } catch (error) {
    console.error('Error sending review email:', error)
  }
}

async function createInAppNotification(supabase: any, review: any) {
  try {
    const notificationData = {
      user_id: review.event.organizer_id,
      type: 'event_review',
      title: 'New Event Review',
      message: `${review.reviewer.name} left a ${review.rating}-star review for ${review.event.name}`,
      metadata: {
        review_id: review.id,
        event_id: review.event.id,
        event_name: review.event.name,
        reviewer_id: review.reviewer.id,
        reviewer_name: review.reviewer.name,
        rating: review.rating,
        is_verified: review.is_verified_attendee
      },
      is_read: false
    }

    const { error } = await supabase
      .from('notifications')
      .insert([notificationData])

    if (error) {
      console.error('Error creating in-app notification:', error)
    } else {
      console.log('✅ In-app notification created')
    }
  } catch (error) {
    console.error('Error creating in-app notification:', error)
  }
}
