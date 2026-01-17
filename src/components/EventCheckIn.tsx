/**
 * EventCheckIn Component
 * 
 * Allows users to check-in to an event with:
 * - Optional check-in message/post
 * - Geolocation capture (optional)
 * - Media upload (photos/videos)
 * - Privacy controls
 * 
 * Used in EventDetail.tsx when event is happening
 */

import React, { useState } from 'react';
import { MapPin, Camera, Share2, Loader } from 'lucide-react';
import { checkInToEvent, refreshUserStats } from '../services/dbService';

interface EventCheckInProps {
  eventId: string;
  userId: string;
  eventName: string;
  onCheckInSuccess?: () => void;
  onShowXPToast?: (xp: number) => void;
}

export const EventCheckIn: React.FC<EventCheckInProps> = ({
  eventId,
  userId,
  eventName,
  onCheckInSuccess,
  onShowXPToast
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [postText, setPostText] = useState('');
  const [loading, setLoading] = useState(false);
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [locationReady, setLocationReady] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | undefined>();

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setLocationReady(true);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Could not get your location. Check-in will be saved without location.');
          setLocationReady(true);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
      setLocationReady(true);
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const checkin = await checkInToEvent(
        userId,
        eventId,
        postText || undefined,
        mediaUrl,
        latitude,
        longitude
      );

      if (checkin) {
        setPostText('');
        setMediaUrl(undefined);
        setLatitude(undefined);
        setLongitude(undefined);
        setLocationReady(false);
        setIsOpen(false);
        onCheckInSuccess?.();
        onShowXPToast?.(15); // Award 15 XP for check-in
        // Refresh stats silently in background
        try {
          await refreshUserStats();
        } catch (e) {
          // Silent fail
        }
      } else {
        alert('Failed to check in. Please try again.');
      }
    } catch (error) {
      console.error('Error checking in:', error);
      alert('An error occurred during check-in.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          handleGetLocation();
        }}
        className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
      >
        <MapPin className="w-5 h-5" />
        Check In to Event
      </button>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        📍 Check In to {eventName}
      </h3>

      {/* Message Input */}
      <textarea
        value={postText}
        onChange={(e) => setPostText(e.target.value)}
        maxLength={280}
        placeholder="What's happening? What do you think of this event?"
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none mb-3"
        rows={3}
      />
      <p className="text-xs text-gray-500 text-right mb-3">
        {postText.length}/280
      </p>

      {/* Location Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 flex items-start gap-2">
        <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          {locationReady ? (
            <p>
              {latitude && longitude
                ? `✓ Location captured (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
                : 'Location will be shared with your check-in'}
            </p>
          ) : (
            <p>Getting your location...</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <Camera className="w-4 h-4" />
          Add Photo
        </button>
        <button
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share to Social
        </button>
      </div>

      {/* Check In / Cancel Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleCheckIn}
          disabled={loading || !locationReady}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {loading && <Loader className="w-4 h-4 animate-spin" />}
          {loading ? 'Checking In...' : 'Check In'}
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="px-4 py-3 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default EventCheckIn;
