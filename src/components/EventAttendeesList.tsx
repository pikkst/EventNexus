/**
 * EventAttendeesList Component
 * 
 * Displays attendees going to an event with:
 * - Avatar grid showing first 5 attendees
 * - Total count of attendees
 * - "See all" option to expand list
 * - User mini-profiles on hover/click
 * 
 * Used in EventDetail.tsx to show social proof
 */

import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { getEventAttendees, getEventAttendeeCount } from '../services/dbService';
import { EventAttendeePreview } from '../types';

interface EventAttendeesListProps {
  eventId: string;
  currentUserId?: string;
}

export const EventAttendeesList: React.FC<EventAttendeesListProps> = ({
  eventId,
  currentUserId
}) => {
  const [attendees, setAttendees] = useState<EventAttendeePreview[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    loadAttendeeData();
  }, [eventId]);

  const loadAttendeeData = async () => {
    setLoading(true);
    try {
      // Get preview attendees (first 5)
      const previewAttendees = await getEventAttendees(eventId, 5);
      setAttendees(previewAttendees);

      // Get total count
      const count = await getEventAttendeeCount(eventId);
      setTotalCount(count);
    } catch (error) {
      console.error('Error loading attendees:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (totalCount === 0) {
    return null; // Don't show section if no attendees
  }

  return (
    <div className="py-6 border-t border-gray-200">
      <div className="flex items-center gap-3 mb-4">
        <Users className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Going ({totalCount})
        </h3>
      </div>

      {/* Avatar Grid */}
      <div className="flex items-center gap-2 flex-wrap">
        {attendees.slice(0, 5).map((attendee) => (
          <div
            key={attendee.user_id}
            className="relative group cursor-pointer"
            onMouseEnter={() => setExpandedUserId(attendee.user_id)}
            onMouseLeave={() => setExpandedUserId(null)}
          >
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center ring-2 ring-white hover:ring-blue-500 transition-all">
              {attendee.avatar_url ? (
                <img
                  src={attendee.avatar_url}
                  alt={attendee.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold text-sm">
                  {attendee.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Tooltip on hover */}
            {expandedUserId === attendee.user_id && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap z-10 pointer-events-none">
                {attendee.name}
              </div>
            )}
          </div>
        ))}

        {/* More count badge */}
        {totalCount > 5 && (
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700 ring-2 ring-white">
            +{totalCount - 5}
          </div>
        )}
      </div>

      {/* Additional info */}
      {totalCount > 0 && (
        <p className="text-sm text-gray-600 mt-4">
          {totalCount === 1 && 'One person is going to this event'}
          {totalCount > 1 && totalCount <= 5 && `${totalCount} people are going`}
          {totalCount > 5 && `${totalCount} people are going • See who else is attending!`}
        </p>
      )}
    </div>
  );
};

export default EventAttendeesList;
