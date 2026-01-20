import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Video, FileText, Star, Eye, EyeOff, Users, Loader } from 'lucide-react';
import { uploadEventMemory, createEventMemory } from '../services/dbService';
import logger from '../utils/logger';

interface EventMemoryUploadProps {
  userId: string;
  eventId: string;
  eventName: string;
  onMemoryCreated?: () => void;
  onClose?: () => void;
}

const EventMemoryUpload: React.FC<EventMemoryUploadProps> = ({
  userId,
  eventId,
  eventName,
  onMemoryCreated,
  onClose
}) => {
  const [memoryType, setMemoryType] = useState<'photo' | 'video' | 'review'>('photo');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [visibility, setVisibility] = useState<'public' | 'private' | 'followers'>('public');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'];
    const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    const allValidTypes = [...validImageTypes, ...validVideoTypes];

    if (!allValidTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload an image (JPG, PNG, GIF, WebP, HEIC) or video (MP4, MOV, WebM).');
      return;
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }

    // Auto-detect memory type based on file
    if (validImageTypes.includes(selectedFile.type)) {
      setMemoryType('photo');
    } else if (validVideoTypes.includes(selectedFile.type)) {
      setMemoryType('video');
    }

    setFile(selectedFile);
    setError('');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (memoryType !== 'review' && !file) {
      setError('Please select a file to upload.');
      return;
    }

    if (memoryType === 'review' && !reviewText.trim()) {
      setError('Please write a review.');
      return;
    }

    setIsUploading(true);

    try {
      let mediaUrl: string | undefined = undefined;

      // Upload file if present
      if (file) {
        mediaUrl = await uploadEventMemory(userId, eventId, file);
        if (!mediaUrl) {
          throw new Error('Failed to upload media file');
        }
      }

      // Create memory record
      const memory = await createEventMemory({
        user_id: userId,
        event_id: eventId,
        memory_type: memoryType,
        media_url: mediaUrl,
        review_text: reviewText.trim() || undefined,
        rating: rating > 0 ? rating : undefined,
        visibility
      });

      if (!memory) {
        throw new Error('Failed to create memory');
      }

      logger.info('Event memory created successfully');
      
      // Reset form
      setFile(null);
      setPreview('');
      setReviewText('');
      setRating(0);
      
      // Notify parent
      if (onMemoryCreated) {
        onMemoryCreated();
      }

      // Close modal if callback provided
      if (onClose) {
        onClose();
      }

    } catch (err: any) {
      logger.error('Error creating event memory:', err);
      setError(err.message || 'Failed to upload memory. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Share Your Experience</h3>
          <p className="text-sm text-slate-400 mt-1">Upload photos, videos, or write a review for "{eventName}"</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Memory Type Selection */}
        <div>
          <label className="block text-sm font-semibold mb-3">What would you like to share?</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setMemoryType('photo')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                memoryType === 'photo'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <ImageIcon className="w-6 h-6" />
              <span className="font-semibold text-sm">Photo</span>
            </button>

            <button
              type="button"
              onClick={() => setMemoryType('video')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                memoryType === 'video'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <Video className="w-6 h-6" />
              <span className="font-semibold text-sm">Video</span>
            </button>

            <button
              type="button"
              onClick={() => setMemoryType('review')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                memoryType === 'review'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <FileText className="w-6 h-6" />
              <span className="font-semibold text-sm">Review</span>
            </button>
          </div>
        </div>

        {/* File Upload (for photo/video) */}
        {memoryType !== 'review' && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={memoryType === 'photo' ? 'image/*' : 'video/*'}
              onChange={handleFileSelect}
              className="hidden"
              id="memory-file-upload"
            />
            
            {!file ? (
              <label
                htmlFor="memory-file-upload"
                className="border-2 border-dashed border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-slate-600 hover:bg-slate-800/50 transition-all"
              >
                <Upload className="w-12 h-12 text-slate-500 mb-3" />
                <p className="font-semibold text-slate-300 mb-1">
                  Click to upload {memoryType === 'photo' ? 'photo' : 'video'}
                </p>
                <p className="text-xs text-slate-500">
                  {memoryType === 'photo' ? 'JPG, PNG, GIF, WebP, HEIC' : 'MP4, MOV, WebM'} • Max 10MB
                </p>
              </label>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-slate-700">
                {memoryType === 'photo' ? (
                  <img src={preview} alt="Preview" className="w-full h-64 object-cover" />
                ) : (
                  <video src={preview} controls className="w-full h-64 object-cover" />
                )}
                <button
                  type="button"
                  onClick={removeFile}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 p-2 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Review Text */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            {memoryType === 'review' ? 'Your Review' : 'Add a Caption (Optional)'}
          </label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder={
              memoryType === 'review'
                ? 'Share your thoughts about this event...'
                : 'What made this moment special?'
            }
            rows={4}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            required={memoryType === 'review'}
          />
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-semibold mb-2">Rating (Optional)</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="transition-all"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= rating
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-slate-600 hover:text-slate-500'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Visibility Settings */}
        <div>
          <label className="block text-sm font-semibold mb-3">Who can see this?</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setVisibility('public')}
              className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 justify-center ${
                visibility === 'public'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span className="font-semibold text-sm">Public</span>
            </button>

            <button
              type="button"
              onClick={() => setVisibility('followers')}
              className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 justify-center ${
                visibility === 'followers'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="font-semibold text-sm">Followers</span>
            </button>

            <button
              type="button"
              onClick={() => setVisibility('private')}
              className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 justify-center ${
                visibility === 'private'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <EyeOff className="w-4 h-4" />
              <span className="font-semibold text-sm">Private</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isUploading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Share Memory
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default EventMemoryUpload;
