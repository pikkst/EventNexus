import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    )

    const { organizer_id, period = 'month' } = await req.json()

    if (!organizer_id) {
      return new Response(
        JSON.stringify({ error: 'organizer_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    // Fetch organizer events
    const { data: events, error: eventsError } = await supabaseClient
      .from('events')
      .select('*')
      .eq('organizerId', organizer_id)
      .order('date', { ascending: false })

    if (eventsError) throw eventsError

    const eventIds = events.map(e => e.id)
    const upcomingEvents = events.filter(e => new Date(e.date) >= now)
    const pastEvents = events.filter(e => new Date(e.date) < now)

    // Fetch all tickets for organizer's events
    const { data: tickets, error: ticketsError } = await supabaseClient
      .from('tickets')
      .select('*')
      .in('event_id', eventIds)

    if (ticketsError) throw ticketsError

    // Fetch ticket templates for detailed stats
    const { data: ticketTemplates, error: templatesError } = await supabaseClient
      .from('ticket_templates')
      .select('*')
      .in('event_id', eventIds)

    if (templatesError) throw templatesError

    // Calculate dashboard stats
    const totalTicketsSold = tickets.length
    const totalRevenue = tickets.reduce((sum, t) => sum + (t.price_paid || 0), 0)
    const averageTicketPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0
    const totalAttendees = new Set(tickets.map(t => t.user_id)).size
    const ticketsCheckedIn = tickets.filter(t => t.status === 'used').length

    // Find top selling event
    const eventSales = new Map()
    tickets.forEach(ticket => {
      const current = eventSales.get(ticket.event_id) || { tickets: 0, revenue: 0 }
      eventSales.set(ticket.event_id, {
        tickets: current.tickets + 1,
        revenue: current.revenue + (ticket.price_paid || 0)
      })
    })

    let topSellingEvent = null
    let maxTickets = 0
    eventSales.forEach((sales, eventId) => {
      if (sales.tickets > maxTickets) {
        maxTickets = sales.tickets
        const event = events.find(e => e.id === eventId)
        topSellingEvent = {
          id: eventId,
          name: event?.name || 'Unknown',
          tickets_sold: sales.tickets,
          revenue: sales.revenue
        }
      }
    })

    // Revenue by month (last 12 months)
    const revenueByMonth = []
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date()
      monthDate.setMonth(monthDate.getMonth() - i)
      const monthStr = monthDate.toLocaleString('en-US', { month: 'short' })
      const year = monthDate.getFullYear()
      const month = monthDate.getMonth()

      const monthTickets = tickets.filter(t => {
        const ticketDate = new Date(t.purchased_at)
        return ticketDate.getFullYear() === year && ticketDate.getMonth() === month
      })

      revenueByMonth.push({
        month: monthStr,
        revenue: monthTickets.reduce((sum, t) => sum + (t.price_paid || 0), 0),
        tickets_sold: monthTickets.length
      })
    }

    // Recent sales (last 20)
    const recentSales = tickets
      .sort((a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime())
      .slice(0, 20)
      .map(ticket => {
        const event = events.find(e => e.id === ticket.event_id)
        return {
          ticket_id: ticket.id,
          event_name: event?.name || 'Unknown',
          buyer_name: ticket.holder_name,
          amount: ticket.price_paid,
          purchased_at: ticket.purchased_at
        }
      })

    // Calculate event-specific stats
    const eventStats = events.map(event => {
      const eventTickets = tickets.filter(t => t.event_id === event.id)
      const eventTemplates = ticketTemplates.filter(t => t.event_id === event.id)
      
      const totalAvailable = eventTemplates.reduce((sum, t) => sum + (t.quantity_total || 0), 0)
      const totalSold = eventTickets.length
      const revenue = eventTickets.reduce((sum, t) => sum + (t.price_paid || 0), 0)
      const checkedIn = eventTickets.filter(t => t.status === 'used').length
      const checkInRate = totalSold > 0 ? (checkedIn / totalSold) * 100 : 0
      const avgPrice = totalSold > 0 ? revenue / totalSold : 0

      const ticketsByType = eventTemplates.map(template => {
        const templateTickets = eventTickets.filter(t => t.ticket_template_id === template.id)
        return {
          type: template.type,
          name: template.name,
          sold: templateTickets.length,
          available: template.quantity_total,
          revenue: templateTickets.reduce((sum, t) => sum + (t.price_paid || 0), 0)
        }
      })

      return {
        event_id: event.id,
        total_tickets_available: totalAvailable,
        total_tickets_sold: totalSold,
        total_revenue: revenue,
        tickets_by_type: ticketsByType,
        tickets_checked_in: checkedIn,
        check_in_rate: checkInRate,
        average_ticket_price: avgPrice
      }
    })

    const dashboardStats = {
      total_events: events.length,
      upcoming_events: upcomingEvents.length,
      past_events: pastEvents.length,
      total_tickets_sold: totalTicketsSold,
      total_revenue: totalRevenue,
      total_attendees: totalAttendees,
      average_ticket_price: averageTicketPrice,
      top_selling_event: topSellingEvent,
      revenue_by_month: revenueByMonth,
      recent_sales: recentSales
    }

    return new Response(
      JSON.stringify({
        dashboard_stats: dashboardStats,
        event_stats: eventStats,
        events: events
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
