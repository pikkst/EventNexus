import React, { useState } from 'react';
import { Star, MessageSquare, Send } from 'lucide-react';
import { submitOrganizerRating } from '../services/dbService';

interface RateOrganizerModalProps {
  organizerId: string;
  organizerName: string;
  eventId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const RateOrganizerModal: React.FC<RateOrganizerModalProps> = ({
  organizerId,
  organizerName,
  eventId,
  onClose,
  onSuccess
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [aspects, setAspects] = useState({
    organization: 0,
    venue: 0,
    communication: 0,
    value: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await submitOrganizerRating(
        organizerId,
        rating,
        eventId,
        reviewText || undefined,
        aspects
      );

      if (success) {
        alert('✓ Thank you for your feedback!');
        onSuccess?.();
        onClose();
      } else {
        alert('Failed to submit rating. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const AspectRating = ({ 
    label, 
    value, 
    onChange 
  }: { 
    label: string; 
    value: number; 
    onChange: (val: number) => void;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="text-xs text-slate-500">{value}/5</span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={`w-10 h-10 rounded-lg border-2 transition-all ${
              val <= value
                ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400'
                : 'border-slate-700 hover:border-slate-600'
            }`}
          >
            <span className="text-xs font-bold">{val}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-[40px] max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
          disabled={isSubmitting}
        >
          <span className="text-3xl">×</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-white mb-2">Rate Your Experience</h2>
          <p className="text-slate-400">
            How was <span className="text-white font-bold">{organizerName}</span>?
          </p>
        </div>

        {/* Overall Rating */}
        <div className="mb-8 text-center">
          <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            Overall Rating
          </label>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={48}
                  className={`${
                    star <= (hoverRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-slate-700'
                  } transition-colors`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-slate-400 mt-4">
              {rating === 5 && "🎉 Amazing!"}
              {rating === 4 && "😊 Great!"}
              {rating === 3 && "👍 Good"}
              {rating === 2 && "😐 Could be better"}
              {rating === 1 && "😞 Not satisfied"}
            </p>
          )}
        </div>

        {/* Detailed Aspects */}
        <div className="space-y-6 mb-8 p-6 bg-slate-950/50 rounded-3xl border border-slate-800">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
            Rate Specific Aspects (Optional)
          </h3>
          <AspectRating
            label="Organization & Planning"
            value={aspects.organization}
            onChange={(val) => setAspects({ ...aspects, organization: val })}
          />
          <AspectRating
            label="Venue & Facilities"
            value={aspects.venue}
            onChange={(val) => setAspects({ ...aspects, venue: val })}
          />
          <AspectRating
            label="Communication"
            value={aspects.communication}
            onChange={(val) => setAspects({ ...aspects, communication: val })}
          />
          <AspectRating
            label="Value for Money"
            value={aspects.value}
            onChange={(val) => setAspects({ ...aspects, value: val })}
          />
        </div>

        {/* Review Text */}
        <div className="mb-8">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
            <MessageSquare size={16} />
            Your Review (Optional)
          </label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience with others..."
            rows={4}
            maxLength={500}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500 resize-none"
          />
          <div className="text-right text-xs text-slate-500 mt-2">
            {reviewText.length}/500
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || isSubmitting}
          className="w-full py-5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20"
        >
          {isSubmitting ? (
            <>Processing...</>
          ) : (
            <>
              <Send size={18} />
              Submit Rating
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RateOrganizerModal;
