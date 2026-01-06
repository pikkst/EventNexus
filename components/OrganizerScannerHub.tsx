import React, { useState, useEffect } from 'react';
import { Smartphone, QrCode, Plus, ChevronDown, Activity } from 'lucide-react';
import { EventNexusEvent } from '../types';
import { getOrganizerEvents } from '../services/dbService';
import ScannerCodeManager from './ScannerCodeManager';

interface OrganizerScannerHubProps {
  organizerId: string;
}

/**
 * Organizer Scanner Hub Component
 * Centralized management for scanner codes across all organizer events
 */
const OrganizerScannerHub: React.FC<OrganizerScannerHubProps> = ({ organizerId }) => {
  const [events, setEvents] = useState<EventNexusEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventNexusEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEventSelector, setShowEventSelector] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [organizerId]);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const allEvents = await getOrganizerEvents(organizerId);
      setEvents(allEvents);
      
      // Auto-select first event if available
      if (allEvents.length > 0 && !selectedEvent) {
        setSelectedEvent(allEvents[0]);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEventSelect = (event: EventNexusEvent) => {
    setSelectedEvent(event);
    setShowEventSelector(false);
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
        <div className="text-center py-8">
          <Activity className="w-8 h-8 text-indigo-500 mx-auto mb-2 animate-spin" />
          <p className="text-slate-400">Loading events...</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
        <div className="text-center py-12">
          <Smartphone className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Events Yet</h3>
          <p className="text-slate-400 mb-6">Create an event to start using scanner codes</p>
          <a
            href="/create-event"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Your First Event
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Event Selector */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <QrCode className="w-6 h-6 text-indigo-500" />
            <div>
              <h2 className="text-2xl font-bold text-white">Scanner Code Manager</h2>
              <p className="text-sm text-slate-400">Manage mobile app scanner codes for your events</p>
            </div>
          </div>
        </div>

        {/* Event Selector */}
        <div className="relative">
          <button
            onClick={() => setShowEventSelector(!showEventSelector)}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-white transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                {selectedEvent?.image ? (
                  <img 
                    src={selectedEvent.image} 
                    alt={selectedEvent.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Smartphone className="w-5 h-5 text-indigo-400" />
                )}
              </div>
              <div className="text-left">
                <p className="font-semibold">{selectedEvent?.name || 'Select Event'}</p>
                <p className="text-xs text-slate-400">
                  {selectedEvent ? new Date(selectedEvent.start_datetime).toLocaleDateString() : 'Choose an event to manage codes'}
                </p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showEventSelector ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {showEventSelector && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 max-h-96 overflow-y-auto">
              {events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => handleEventSelect(event)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors ${
                    selectedEvent?.id === event.id ? 'bg-slate-700' : ''
                  }`}
                >
                  <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    {event.image ? (
                      <img 
                        src={event.image} 
                        alt={event.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Smartphone className="w-5 h-5 text-indigo-400" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-white">{event.name}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(event.start_datetime).toLocaleDateString()} • {event.location}
                    </p>
                  </div>
                  {selectedEvent?.id === event.id && (
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div className="mt-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-slate-300 font-semibold mb-1">About Scanner Codes</p>
              <p className="text-xs text-slate-400">
                Scanner codes are used by event staff to authenticate the mobile scanner app. Each code is linked to this specific event and can be used by multiple staff members simultaneously.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scanner Code Manager */}
      {selectedEvent && (
        <ScannerCodeManager 
          event={selectedEvent} 
          organizerId={organizerId}
        />
      )}
    </div>
  );
};

export default OrganizerScannerHub;
