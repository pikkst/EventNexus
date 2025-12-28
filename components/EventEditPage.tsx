import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, X, ArrowLeft, Loader } from 'lucide-react';
import { getEvents, updateEvent } from '../services/dbService';
import { EventNexusEvent, User } from '../types';
import { CATEGORIES } from '../constants';

interface EventEditPageProps {
  user: User | null;
  onOpenAuth?: () => void;
}

const EventEditPage: React.FC<EventEditPageProps> = ({ user, onOpenAuth }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventNexusEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    aboutText: '',
    date: '',
    time: '',
    end_date: '',
    end_time: '',
    location: '',
    locationCity: '',
    price: 0,
    max_capacity: 100,
    visibility: 'public'
  });

  useEffect(() => {
    const loadEvent = async () => {
      if (!id || !user) {
        navigate('/');
        return;
      }

      try {
        const events = await getEvents();
        const foundEvent = events.find(e => e.id === id);
        
        if (!foundEvent) {
          alert('Event not found');
          navigate('/');
          return;
        }

        // Check if user is the organizer
        if (foundEvent.organizerId !== user.id) {
          alert('You do not have permission to edit this event');
          navigate(`/event/${id}`);
          return;
        }

        setEvent(foundEvent);
        
        // Pre-fill form with event data
        setFormData({
          name: foundEvent.name,
          category: foundEvent.category,
          description: foundEvent.description,
          aboutText: foundEvent.aboutText || '',
          date: foundEvent.date.split('T')[0],
          time: foundEvent.time,
          end_date: foundEvent.end_date || '',
          end_time: foundEvent.end_time || '',
          location: foundEvent.location.address,
          locationCity: foundEvent.location.city,
          price: foundEvent.price,
          max_capacity: foundEvent.maxAttendees,
          visibility: foundEvent.visibility
        });
      } catch (error) {
        console.error('Error loading event:', error);
        alert('Failed to load event');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    loadEvent();
  }, [id, user, navigate]);

  const handleSave = async () => {
    if (!event || !user) return;

    // Validate required fields
    if (!formData.name || !formData.category || !formData.description || !formData.date || !formData.time) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSaving(true);

    try {
      const updatedEvent: EventNexusEvent = {
        ...event,
        name: formData.name,
        category: formData.category,
        description: formData.description,
        aboutText: formData.aboutText || undefined,
        date: formData.date,
        time: formData.time,
        end_date: formData.end_date || undefined,
        end_time: formData.end_time || undefined,
        location: {
          ...event.location,
          address: formData.location,
          city: formData.locationCity
        },
        price: formData.price,
        maxAttendees: formData.max_capacity,
        visibility: formData.visibility as any
      };

      const success = await updateEvent(updatedEvent);
      
      if (success) {
        alert('✅ Event updated successfully!');
        navigate(`/event/${event.id}`);
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-500" />
          <p className="text-slate-400">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/event/${event.id}`)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-black">Edit Event</h1>
              <p className="text-slate-400 text-sm">Update your event details</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Event Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none"
              placeholder="Enter event name"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none"
            >
              <option value="">Select category</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none resize-none"
              placeholder="Describe your event"
            />
          </div>

          {/* About Text */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">About This Event (Detailed)</label>
            <textarea
              value={formData.aboutText}
              onChange={(e) => setFormData({ ...formData, aboutText: e.target.value })}
              rows={10}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none resize-none font-mono text-sm"
              placeholder="Add detailed information (schedule, lineup, FAQ, etc.)"
            />
            <p className="text-xs text-slate-500 mt-2">
              This will be displayed in the "About this event" section
            </p>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Start Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Start Time *</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* End Date & Time (Optional) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">End Date (Optional)</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">End Time (Optional)</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Location *</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none"
              placeholder="Enter venue address"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">City *</label>
            <input
              type="text"
              value={formData.locationCity}
              onChange={(e) => setFormData({ ...formData, locationCity: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none"
              placeholder="Enter city"
            />
          </div>

          {/* Price & Capacity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Ticket Price (€) *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                min="0"
                step="0.01"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Max Capacity *</label>
              <input
                type="number"
                value={formData.max_capacity}
                onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) })}
                min="1"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Visibility</label>
            <select
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none"
            >
              <option value="public">Public - Visible to everyone</option>
              <option value="private">Private - Only visible with link</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {isSaving ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isSaving ? 'Saving Changes...' : 'Save Changes'}
            </button>
            <button
              onClick={() => navigate(`/event/${event.id}`)}
              className="px-6 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventEditPage;
