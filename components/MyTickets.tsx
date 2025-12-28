import React, { useState, useEffect } from 'react';
import { Ticket as TicketIcon, Calendar, MapPin, Download, QrCode, Filter, Search, AlertCircle } from 'lucide-react';
import { Ticket, EventNexusEvent } from '../types';
import TicketQRDisplay from './TicketQRDisplay';

interface MyTicketsProps {
  userId: string;
}

export default function MyTickets({ userId }: MyTicketsProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [events, setEvents] = useState<Map<string, EventNexusEvent>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTickets();
  }, [userId]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      
      // Fetch user tickets from Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-tickets`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ user_id: userId })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
        
        // Build events map
        const eventsMap = new Map<string, EventNexusEvent>();
        (data.events || []).forEach((event: EventNexusEvent) => {
          eventsMap.set(event.id, event);
        });
        setEvents(eventsMap);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTickets = () => {
    let filtered = tickets;

    // Apply status filter
    if (filter === 'upcoming') {
      filtered = filtered.filter(ticket => {
        const event = events.get(ticket.event_id);
        if (!event) return false;
        const eventDate = new Date(event.date);
        return eventDate >= new Date() && ticket.status === 'valid';
      });
    } else if (filter === 'past') {
      filtered = filtered.filter(ticket => {
        const event = events.get(ticket.event_id);
        if (!event) return false;
        const eventDate = new Date(event.date);
        return eventDate < new Date() || ticket.status === 'used';
      });
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ticket => {
        const event = events.get(ticket.event_id);
        return (
          ticket.ticket_name.toLowerCase().includes(query) ||
          event?.name.toLowerCase().includes(query) ||
          event?.location.city.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  };

  const filteredTickets = getFilteredTickets();

  const getStatusBadge = (status: string) => {
    const styles = {
      valid: 'bg-green-100 text-green-800',
      used: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-orange-100 text-orange-800'
    };
    return styles[status as keyof typeof styles] || styles.valid;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (selectedTicket) {
    const event = events.get(selectedTicket.event_id);
    return (
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => setSelectedTicket(null)}
          className="mb-4 text-indigo-600 hover:text-indigo-700 font-medium"
        >
          ← Back to My Tickets
        </button>
        {event && (
          <TicketQRDisplay ticket={selectedTicket} event={event} />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Tickets</h1>
        <p className="text-gray-600">View and manage all your event tickets</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'upcoming'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'past'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Past
          </button>
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tickets Grid */}
      {filteredTickets.length === 0 ? (
        <div className="text-center py-12">
          <TicketIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No tickets found</h3>
          <p className="text-gray-600 mb-6">
            {filter === 'upcoming' 
              ? "You don't have any upcoming event tickets yet."
              : "No tickets match your search criteria."}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map(ticket => {
            const event = events.get(ticket.event_id);
            if (!event) return null;

            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group"
              >
                {/* Event Image */}
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={event.imageUrl || '/api/placeholder/400/300'}
                    alt={event.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(ticket.status)}`}>
                      {ticket.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Ticket Info */}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">
                    {event.name}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>{new Date(event.date).toLocaleDateString()} at {event.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="line-clamp-1">{event.location.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TicketIcon className="w-4 h-4 flex-shrink-0" />
                      <span>{ticket.ticket_name}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <span className="text-sm text-gray-500">
                      ${ticket.price_paid.toFixed(2)}
                    </span>
                    <button className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm group-hover:gap-3 transition-all">
                      <QrCode className="w-4 h-4" />
                      View Ticket
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Help Text */}
      {tickets.length > 0 && (
        <div className="mt-8 bg-indigo-50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-900">
            <p className="font-medium mb-1">Ticket Tips</p>
            <p className="text-indigo-700">
              Click on any ticket to view the QR code. You can download, print, or share your tickets. 
              Show the QR code at the event entrance for quick check-in.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
