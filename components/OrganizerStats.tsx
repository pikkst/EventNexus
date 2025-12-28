import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Ticket as TicketIcon,
  Calendar,
  Clock,
  MapPin,
  Download,
  ChevronRight,
  BarChart3,
  PieChart
} from 'lucide-react';
import { OrganizerDashboardStats, EventTicketStats, EventNexusEvent } from '../types';

interface OrganizerStatsProps {
  organizerId: string;
}

export default function OrganizerStats({ organizerId }: OrganizerStatsProps) {
  const [stats, setStats] = useState<OrganizerDashboardStats | null>(null);
  const [eventStats, setEventStats] = useState<Map<string, EventTicketStats>>(new Map());
  const [events, setEvents] = useState<EventNexusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, [organizerId, selectedPeriod]);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/organizer-stats`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            organizer_id: organizerId,
            period: selectedPeriod
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.dashboard_stats);
        setEvents(data.events || []);
        
        // Build event stats map
        const statsMap = new Map<string, EventTicketStats>();
        (data.event_stats || []).forEach((stat: EventTicketStats) => {
          statsMap.set(stat.event_id, stat);
        });
        setEventStats(statsMap);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    if (!stats) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Events', stats.total_events],
      ['Upcoming Events', stats.upcoming_events],
      ['Past Events', stats.past_events],
      ['Total Tickets Sold', stats.total_tickets_sold],
      ['Total Revenue', `$${stats.total_revenue.toFixed(2)}`],
      ['Average Ticket Price', `$${stats.average_ticket_price.toFixed(2)}`],
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `organizer-stats-${new Date().toISOString()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No statistics available</h3>
          <p className="text-gray-600">Create your first event to see statistics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Organizer Statistics</h1>
          <p className="text-gray-600">Track your event performance and revenue</p>
        </div>
        
        <div className="flex gap-3">
          {/* Period Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPeriod('week')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedPeriod === 'week'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setSelectedPeriod('month')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedPeriod === 'month'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setSelectedPeriod('year')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedPeriod === 'year'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Year
            </button>
          </div>

          <button
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-8 h-8" />
            <span className="text-sm font-medium opacity-90">Total Events</span>
          </div>
          <p className="text-4xl font-bold">{stats.total_events}</p>
          <p className="text-sm opacity-75 mt-2">
            {stats.upcoming_events} upcoming • {stats.past_events} completed
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-8 h-8" />
            <span className="text-sm font-medium opacity-90">Total Revenue</span>
          </div>
          <p className="text-4xl font-bold">${stats.total_revenue.toFixed(2)}</p>
          <p className="text-sm opacity-75 mt-2">
            Avg ${stats.average_ticket_price.toFixed(2)} per ticket
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <TicketIcon className="w-8 h-8" />
            <span className="text-sm font-medium opacity-90">Tickets Sold</span>
          </div>
          <p className="text-4xl font-bold">{stats.total_tickets_sold}</p>
          <p className="text-sm opacity-75 mt-2">
            Across all events
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-8 h-8" />
            <span className="text-sm font-medium opacity-90">Total Attendees</span>
          </div>
          <p className="text-4xl font-bold">{stats.total_attendees}</p>
          <p className="text-sm opacity-75 mt-2">
            Unique participants
          </p>
        </div>
      </div>

      {/* Top Selling Event */}
      {stats.top_selling_event && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="w-6 h-6 text-orange-600" />
            <h3 className="font-bold text-gray-900">Top Performing Event</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-900 mb-1">
                {stats.top_selling_event.name}
              </p>
              <p className="text-gray-700">
                {stats.top_selling_event.tickets_sold} tickets sold • 
                ${stats.top_selling_event.revenue.toFixed(2)} revenue
              </p>
            </div>
            <button className="text-orange-600 hover:text-orange-700 font-medium flex items-center gap-2">
              View Details
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Revenue Chart */}
      {stats.revenue_by_month && stats.revenue_by_month.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="font-bold text-gray-900 mb-6">Revenue Trend</h3>
          <div className="h-64 flex items-end gap-2">
            {stats.revenue_by_month.map((data, index) => {
              const maxRevenue = Math.max(...stats.revenue_by_month.map(d => d.revenue));
              const heightPercent = (data.revenue / maxRevenue) * 100;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-lg hover:from-indigo-600 hover:to-indigo-500 transition-colors relative group"
                    style={{ height: `${heightPercent}%`, minHeight: data.revenue > 0 ? '20px' : '0' }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      ${data.revenue.toFixed(2)}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600 text-center">
                    {data.month}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event List with Stats */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">Event Performance</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {events.map(event => {
            const eventStat = eventStats.get(event.id);
            if (!eventStat) return null;

            return (
              <div key={event.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg text-gray-900 mb-2">{event.name}</h4>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(event.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {event.location.city}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
                    className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                  >
                    {selectedEvent === event.id ? 'Hide' : 'Show'} Details
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600 mb-1">Tickets Sold</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {eventStat.total_tickets_sold}/{eventStat.total_tickets_available}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-600 mb-1">Revenue</p>
                    <p className="text-2xl font-bold text-green-900">
                      ${eventStat.total_revenue.toFixed(0)}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-purple-600 mb-1">Check-in Rate</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {eventStat.check_in_rate.toFixed(0)}%
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-xs text-orange-600 mb-1">Avg Price</p>
                    <p className="text-2xl font-bold text-orange-900">
                      ${eventStat.average_ticket_price.toFixed(2)}
                    </p>
                  </div>
                </div>

                {selectedEvent === event.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h5 className="font-semibold text-gray-900 mb-3">Ticket Breakdown</h5>
                    <div className="grid md:grid-cols-2 gap-4">
                      {eventStat.tickets_by_type.map((ticketType, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">{ticketType.name}</span>
                            <span className="text-sm text-gray-600">{ticketType.type}</span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Sold:</span>
                              <span className="font-medium">{ticketType.sold}/{ticketType.available}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Revenue:</span>
                              <span className="font-medium">${ticketType.revenue.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full transition-all"
                              style={{ width: `${(ticketType.sold / ticketType.available) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Sales */}
      {stats.recent_sales && stats.recent_sales.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-bold text-gray-900">Recent Sales</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {stats.recent_sales.slice(0, 10).map((sale, index) => (
              <div key={index} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{sale.event_name}</p>
                  <p className="text-sm text-gray-600">{sale.buyer_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${sale.amount.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(sale.purchased_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
