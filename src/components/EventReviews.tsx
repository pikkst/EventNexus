import React, { useState, useEffect } from 'react';
import { Loader, Star, ThumbsUp, User as UserIcon, MessageSquare, AlertCircle } from 'lucide-react';
import { User, EventReview, EventRatingSummary } from '../types';
import { getEventReviews, getEventRatingSummary, createEventReview, refreshUserStats } from '../services/dbService';
import logger from '../utils/logger';

interface EventReviewsProps {
  eventId: string;
  eventName: string;
  user: User | null;
  onOpenAuth?: () => void;
  onShowXPToast?: (xp: number) => void;
}

/**
 * EventReviews Component - Display and create event reviews
 * Phase 2 Social Feature - Event Reviews & Ratings
 * Users can rate and review events they attended
 */
const EventReviews: React.FC<EventReviewsProps> = ({ eventId, eventName, user, onOpenAuth, onShowXPToast }) => {
  // State management
  const [reviews, setReviews] = useState<any[]>([]);
  const [ratingSummary, setRatingSummary] = useState<EventRatingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Review form state
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [atmosphereRating, setAtmosphereRating] = useState(5);
  const [valueRating, setValueRating] = useState(5);
  const [organizationRating, setOrganizationRating] = useState(5);
  const [error, setError] = useState<string | null>(null);

  // Load reviews on mount
  useEffect(() => {
    loadReviews();
  }, [eventId]);

  // Load reviews and ratings
  const loadReviews = async () => {
    try {
      setIsLoading(true);
      
      const [reviewsData, summaryData] = await Promise.all([
        getEventReviews(eventId, 20),
        getEventRatingSummary(eventId)
      ]);

      setReviews(reviewsData || []);
      setRatingSummary(summaryData);
      setError(null);
    } catch (err) {
      logger.error('Failed to load reviews:', err);
      setError('Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      onOpenAuth?.();
      return;
    }

    if (!content.trim()) {
      setError('Please write a review');
      return;
    }

    setSubmitting(true);
    try {
      const newReview = await createEventReview({
        event_id: eventId,
        user_id: user.id,
        rating,
        title: title || undefined,
        content,
        atmosphere_rating: atmosphereRating,
        value_rating: valueRating,
        organization_rating: organizationRating
      });

      if (newReview) {
        setReviews(prev => [{ ...newReview, user }, ...prev]);
        setIsReviewOpen(false);
        setRating(5);
        setTitle('');
        setContent('');
        setAtmosphereRating(5);
        setValueRating(5);
        setOrganizationRating(5);
        setError(null);
        // Reload summary
        const summary = await getEventRatingSummary(eventId);
        setRatingSummary(summary);
        // Award 10 XP for review and show toast
        onShowXPToast?.(10);
        // Refresh stats silently in background
        try {
          await refreshUserStats();
        } catch (e) {
          // Silent fail
        }
      }
    } catch (err) {
      logger.error('Failed to submit review:', err);
      setError('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Star rating component
  const StarRating = ({ rating: value, onChange }: { rating: number; onChange: (n: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(num => (
        <button
          key={num}
          onClick={() => onChange(num)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            className={`w-6 h-6 ${
              num <= value
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-600'
            }`}
          />
        </button>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-6 h-6 animate-spin text-indigo-400" />
          <p className="text-slate-400 text-sm">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {ratingSummary && ratingSummary.total_reviews > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Overall Rating */}
            <div className="text-center">
              <div className="text-4xl font-black text-amber-400 mb-2">
                {ratingSummary.avg_rating?.toFixed(1)}
              </div>
              <div className="flex justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i <= Math.round(ratingSummary.avg_rating || 0)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-600'
                    }`}
                  />
                ))}
              </div>
              <p className="text-slate-400 text-sm">
                {ratingSummary.total_reviews} {ratingSummary.total_reviews === 1 ? 'review' : 'reviews'}
              </p>
            </div>

            {/* Category Ratings */}
            {ratingSummary.avg_atmosphere !== null && (
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-400 mb-1">
                  {ratingSummary.avg_atmosphere?.toFixed(1)}
                </div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">Atmosphere</p>
              </div>
            )}

            {ratingSummary.avg_value !== null && (
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400 mb-1">
                  {ratingSummary.avg_value?.toFixed(1)}
                </div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">Value</p>
              </div>
            )}

            {ratingSummary.avg_organization !== null && (
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400 mb-1">
                  {ratingSummary.avg_organization?.toFixed(1)}
                </div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">Organization</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Write Review Button */}
      {user ? (
        <button
          onClick={() => setIsReviewOpen(!isReviewOpen)}
          className="w-full px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          <MessageSquare className="w-5 h-5" />
          <span>{isReviewOpen ? 'Cancel Review' : 'Share Your Experience'}</span>
        </button>
      ) : (
        <button
          onClick={onOpenAuth}
          className="w-full px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          <MessageSquare className="w-5 h-5" />
          <span>Sign in to Review</span>
        </button>
      )}

      {/* Review Form */}
      {isReviewOpen && user && (
        <form onSubmit={handleSubmitReview} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Amazing event!"
              maxLength={100}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Overall Rating */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Overall Rating</label>
            <StarRating rating={rating} onChange={setRating} />
          </div>

          {/* Category Ratings */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Atmosphere</label>
              <StarRating rating={atmosphereRating} onChange={setAtmosphereRating} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Value</label>
              <StarRating rating={valueRating} onChange={setValueRating} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Organization</label>
              <StarRating rating={organizationRating} onChange={setOrganizationRating} />
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">
              Your Review <span className="text-red-400">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What did you think? Share your experience..."
              maxLength={1000}
              rows={4}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              {content.length}/1000 characters
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4" />
                <span>Post Review</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length > 0 ? (
          reviews.map(review => (
            <div key={review.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
              {/* Review Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3 flex-1 min-w-0">
                  <img
                    src={review.user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${review.user?.full_name || 'User'}`}
                    alt={review.user?.full_name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white">{review.user?.full_name || 'Anonymous'}</h4>
                    <p className="text-xs text-slate-500">{new Date(review.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Rating Stars */}
                <div className="flex gap-1 flex-shrink-0">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i <= review.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Review Title */}
              {review.title && (
                <h5 className="font-semibold text-white">{review.title}</h5>
              )}

              {/* Review Content */}
              <p className="text-slate-300 text-sm leading-relaxed">{review.content}</p>

              {/* Category Ratings */}
              {(review.atmosphere_rating || review.value_rating || review.organization_rating) && (
                <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-800">
                  {review.atmosphere_rating && (
                    <div className="text-xs">
                      <p className="text-slate-500 mb-1">Atmosphere</p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} className={`w-3 h-3 ${i <= review.atmosphere_rating ? 'fill-indigo-400 text-indigo-400' : 'text-slate-700'}`} />
                        ))}
                      </div>
                    </div>
                  )}
                  {review.value_rating && (
                    <div className="text-xs">
                      <p className="text-slate-500 mb-1">Value</p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} className={`w-3 h-3 ${i <= review.value_rating ? 'fill-emerald-400 text-emerald-400' : 'text-slate-700'}`} />
                        ))}
                      </div>
                    </div>
                  )}
                  {review.organization_rating && (
                    <div className="text-xs">
                      <p className="text-slate-500 mb-1">Organization</p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} className={`w-3 h-3 ${i <= review.organization_rating ? 'fill-purple-400 text-purple-400' : 'text-slate-700'}`} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Helpful Button */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 text-sm transition-colors">
                  <ThumbsUp className="w-4 h-4" />
                  <span>Helpful ({review.helpful_count})</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-slate-800/20 rounded-xl border border-slate-700/50">
            <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No reviews yet</p>
            <p className="text-slate-500 text-sm">Be the first to share your experience</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventReviews;
