/**
 * UserProfileInterests Component
 * 
 * Displays and allows editing user interests:
 * - Event categories they're interested in
 * - Preferred event times (morning/afternoon/evening)
 * - Preferred days (weekends/weekdays)
 * - Bio (about the user)
 * - Privacy setting (public/private profile)
 * 
 * Used in UserProfile.tsx
 */

import React, { useState, useEffect } from 'react';
import { Edit2, Save, X } from 'lucide-react';
import { CATEGORIES } from '../constants';
import { updateUserInterests, getUserInterests } from '../services/dbService';
import { UserInterests } from '../types';

interface UserProfileInterestsProps {
  userId: string;
  isOwnProfile: boolean;
  onUpdate?: (interests: UserInterests) => void;
}

export const UserProfileInterests: React.FC<UserProfileInterestsProps> = ({
  userId,
  isOwnProfile,
  onUpdate
}) => {
  const [interests, setInterests] = useState<UserInterests | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [preferredDays, setPreferredDays] = useState<string[]>([]);
  const [preferredTime, setPreferredTime] = useState<string>('any');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    loadInterests();
  }, [userId]);

  const loadInterests = async () => {
    setLoading(true);
    try {
      const userInterests = await getUserInterests(userId);
      if (userInterests) {
        setInterests(userInterests);
        setSelectedCategories(userInterests.categories || []);
        setPreferredDays(userInterests.preferred_days || []);
        setPreferredTime(userInterests.preferred_time || 'any');
        setBio(userInterests.bio || '');
        setIsPublic(userInterests.is_public !== false);
      }
    } catch (error) {
      console.error('Error loading interests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isOwnProfile) return;

    setSaving(true);
    try {
      const updated = await updateUserInterests(userId, {
        categories: selectedCategories,
        preferred_days: preferredDays,
        preferred_time: preferredTime as any,
        bio,
        is_public: isPublic
      });

      if (updated) {
        setInterests(updated);
        onUpdate?.(updated);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving interests:', error);
      alert('Failed to save interests');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (interests) {
      setSelectedCategories(interests.categories || []);
      setPreferredDays(interests.preferred_days || []);
      setPreferredTime(interests.preferred_time || 'any');
      setBio(interests.bio || '');
      setIsPublic(interests.is_public !== false);
    }
    setIsEditing(false);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleDay = (day: string) => {
    setPreferredDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (isEditing && isOwnProfile) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">My Interests</h3>

        {/* Bio */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            About me
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            placeholder="Tell other EventNexus users about yourself..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">
            {bio.length}/160 characters
          </p>
        </div>

        {/* Categories */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Interested in
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategories.includes(cat)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Preferred Time */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred event time
          </label>
          <div className="flex gap-2">
            {['morning', 'afternoon', 'evening', 'any'].map(time => (
              <button
                key={time}
                onClick={() => setPreferredTime(time)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  preferredTime === time
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* Preferred Days */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred days
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  preferredDays.includes(day)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {day.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Privacy Setting */}
        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              Make my profile public (others can see my interests)
            </span>
          </label>
        </div>

        {/* Save/Cancel Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // View mode
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">My Interests</h3>
        {isOwnProfile && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Bio */}
      {bio && (
        <div className="mb-4">
          <p className="text-sm text-gray-700 italic">{bio}</p>
        </div>
      )}

      {/* Categories */}
      {selectedCategories.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-600 mb-2 uppercase">
            Interested in
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map(cat => (
              <span
                key={cat}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Preferred Time */}
      {preferredTime !== 'any' && (
        <div className="mb-2">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Prefers:</span> {preferredTime} events
          </p>
        </div>
      )}

      {/* Preferred Days */}
      {preferredDays.length > 0 && (
        <div className="mb-2">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Available:</span> {preferredDays.join(', ')}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!bio && selectedCategories.length === 0 && (
        <p className="text-sm text-gray-500">
          {isOwnProfile
            ? 'No interests set yet. Click edit to add them!'
            : 'No interests shared yet.'}
        </p>
      )}
    </div>
  );
};

export default UserProfileInterests;
