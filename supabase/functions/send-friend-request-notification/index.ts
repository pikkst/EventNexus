// supabase/functions/send-friend-request-notification/index.ts
// Edge Function to send notifications when a buddy/friend request is sent
// Triggered when a user sends a friend request to another user

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { buddyId, action } = await req.json()

    if (!buddyId) {
      throw new Error('Missing buddyId')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch buddy request details
    const { data: buddyRequest, error: buddyError } = await supabase
      .from('user_buddies')
      .select(`
        *,
        sender:initiated_by(id, name, email, avatar),
        user1:user_id_1(id, name, email, avatar),
        user2:user_id_2(id, name, email, avatar)
      `)
      .eq('id', buddyId)
      .single()

    if (buddyError || !buddyRequest) {
      throw new Error(`Buddy request not found: ${buddyError?.message}`)
    }

    console.log(`👥 Processing ${action} notification for buddy request ${buddyId}`)

    if (action === 'created') {
      await sendFriendRequestEmail(supabase, buddyRequest)
      await createInAppNotification(supabase, buddyRequest, 'friend_request')
    } else if (action === 'accepted') {
      await sendFriendAcceptedEmail(supabase, buddyRequest)
      await createInAppNotification(supabase, buddyRequest, 'friend_accepted')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        buddyId,
        action,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in send-friend-request-notification:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function sendFriendRequestEmail(supabase: any, buddyRequest: any) {
  try {
    const sender = buddyRequest.sender
    const recipient = buddyRequest.user_id_1 === sender.id ? buddyRequest.user2 : buddyRequest.user1

    if (!recipient?.email) {
      console.error('Recipient email not found')
      return
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')!
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
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
            .user-card {
              background: white;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              display: flex;
              align-items: center;
              gap: 15px;
              border: 2px solid #667eea;
            }
            .avatar {
              width: 60px;
              height: 60px;
              border-radius: 50%;
              object-fit: cover;
            }
            .button { 
              display: inline-block; 
              background: #667eea; 
              color: white; 
              padding: 12px 24px; 
              border-radius: 6px; 
              text-decoration: none;
              margin: 15px 5px;
              font-weight: bold;
            }
            .button-secondary {
              background: #94a3b8;
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
              <h2 style="margin: 0;">🤝 New Friend Request</h2>
            </div>
            
            <div class="content">
              <p>Hi ${recipient.name},</p>
              
              <p>You have a new friend request on EventNexus!</p>
              
              <div class="user-card">
                <img 
                  src="${sender.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${sender.name}`}" 
                  alt="${sender.name}" 
                  class="avatar"
                />
                <div>
                  <h3 style="margin: 0; color: #667eea;">${sender.name}</h3>
                  <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Wants to connect with you</p>
                </div>
              </div>
              
              ${buddyRequest.common_interests?.length > 0 ? `
                <p><strong>Shared Interests:</strong> ${buddyRequest.common_interests.slice(0, 3).join(', ')}</p>
              ` : ''}
              
              <p>Respond to this friend request and start building your event buddy network!</p>
              
              <div style="text-align: center;">
                <a href="https://www.eventnexus.eu/social" class="button">Accept Request</a>
                <a href="https://www.eventnexus.eu/social" class="button button-secondary">View Profile</a>
              </div>
            </div>
            
            <div class="footer">
              <p>EventNexus - Connect with people who share your interests<br/>
              This is an automated message. Manage your friend requests in your profile.</p>
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
        to: recipient.email,
        subject: `${sender.name} wants to be your friend on EventNexus`,
        html: emailHtml
      })
    })

    if (!response.ok) {
      throw new Error(`Resend API error: ${response.statusText}`)
    }

    console.log(`✅ Friend request email sent to ${recipient.email}`)
  } catch (error) {
    console.error('Error sending friend request email:', error)
  }
}

async function sendFriendAcceptedEmail(supabase: any, buddyRequest: any) {
  try {
    const acceptor = buddyRequest.user_id_1 === buddyRequest.initiated_by 
      ? buddyRequest.user2 
      : buddyRequest.user1
    const requester = buddyRequest.sender

    if (!requester?.email) {
      console.error('Requester email not found')
      return
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')!
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { 
              background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
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
            .user-card {
              background: white;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              display: flex;
              align-items: center;
              gap: 15px;
              border: 2px solid #10b981;
            }
            .avatar {
              width: 60px;
              height: 60px;
              border-radius: 50%;
              object-fit: cover;
            }
            .button { 
              display: inline-block; 
              background: #10b981; 
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
              <h2 style="margin: 0;">🎉 Friend Request Accepted!</h2>
            </div>
            
            <div class="content">
              <p>Hi ${requester.full_name},</p>
              
              <p>Great news! ${acceptor.full_name} accepted your friend request.</p>
              
              <div class="user-card">
                <img 
                  src="${acceptor.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${acceptor.full_name}`}" 
                  alt="${acceptor.full_name}" 
                  class="avatar"
                />
                <div>
                  <h3 style="margin: 0; color: #10b981;">${acceptor.full_name}</h3>
                  <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">You're now friends on EventNexus!</p>
                </div>
              </div>
              
              <p>You can now message each other, see shared events, and discover more ways to connect!</p>
              
              <div style="text-align: center;">
                <a href="https://www.eventnexus.eu/social" class="button">View Friends</a>
              </div>
            </div>
            
            <div class="footer">
              <p>EventNexus - Connect with people who share your interests<br/>
              This is an automated message.</p>
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
        to: requester.email,
        subject: `${acceptor.full_name} accepted your friend request!`,
        html: emailHtml
      })
    })

    if (!response.ok) {
      throw new Error(`Resend API error: ${response.statusText}`)
    }

    console.log(`✅ Friend accepted email sent to ${requester.email}`)
  } catch (error) {
    console.error('Error sending friend accepted email:', error)
  }
}

async function createInAppNotification(supabase: any, buddyRequest: any, type: string) {
  try {
    const sender = buddyRequest.sender
    const recipient = buddyRequest.user_id_1 === sender.id ? buddyRequest.user2 : buddyRequest.user1

    let notificationData
    if (type === 'friend_request') {
      notificationData = {
        user_id: recipient.id,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `${sender.full_name} wants to be your friend`,
        metadata: {
          buddy_id: buddyRequest.id,
          sender_id: sender.id,
          sender_name: sender.full_name,
          sender_avatar: sender.avatar
        },
        is_read: false
      }
    } else if (type === 'friend_accepted') {
      notificationData = {
        user_id: sender.id,
        type: 'friend_accepted',
        title: 'Friend Request Accepted',
        message: `${recipient.full_name} accepted your friend request`,
        metadata: {
          buddy_id: buddyRequest.id,
          friend_id: recipient.id,
          friend_name: recipient.full_name,
          friend_avatar: recipient.avatar
        },
        is_read: false
      }
    }

    if (notificationData) {
      const { error } = await supabase
        .from('notifications')
        .insert([notificationData])

      if (error) {
        console.error('Error creating in-app notification:', error)
      } else {
        console.log(`✅ In-app notification created for ${type}`)
      }
    }
  } catch (error) {
    console.error('Error creating in-app notification:', error)
  }
}
