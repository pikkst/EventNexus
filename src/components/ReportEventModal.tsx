import React, { useState } from 'react';
import { X, AlertTriangle, Send, Loader } from 'lucide-react';
import { createEventReport } from '../services/dbService';

interface ReportEventModalProps {
  eventId: string;
  eventName: string;
  isOpen: boolean;
  onClose: () => void;
  onReportSubmitted?: () => void;
}

const REPORT_TYPES = [
  { value: 'wrong_location', label: '📍 Wrong Location', description: 'Event location is incorrect' },
  { value: 'wrong_info', label: '📝 Wrong Information', description: 'Event details (date, time, price, etc.) are inaccurate' },
  { value: 'duplicate', label: '🔄 Duplicate Event', description: 'This event is already listed' },
  { value: 'spam', label: '🚫 Spam', description: 'This event appears to be spam or unwanted' },
  { value: 'inappropriate', label: '⚠️ Inappropriate Content', description: 'Event contains inappropriate or offensive content' },
  { value: 'other', label: '❓ Other', description: 'Another type of issue' }
];

const ReportEventModal: React.FC<ReportEventModalProps> = ({
  eventId,
  eventName,
  isOpen,
  onClose,
  onReportSubmitted
}) => {
  const [selectedType, setSelectedType] = useState('wrong_location');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Please provide a reason for your report');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createEventReport(
        eventId,
        selectedType,
        reason,
        description || undefined,
        reporterEmail || undefined
      );

      if (result) {
        setSuccess(true);
        setSelectedType('wrong_location');
        setReason('');
        setDescription('');
        setReporterEmail('');

        // Close modal after 2 seconds
        setTimeout(() => {
          onClose();
          setSuccess(false);
          onReportSubmitted?.();
        }, 2000);
      } else {
        setError('Failed to submit report. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting report:', err);
      setError('An error occurred while submitting your report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Report Event</h2>
              <p className="text-sm text-slate-400">{eventName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {success ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-bold text-green-400 mb-2">Thank You!</h3>
              <p className="text-sm text-green-300">Your report has been submitted successfully. Our team will review it shortly.</p>
            </div>
          ) : (
            <>
              {/* Report Type Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3">What's wrong with this event?</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {REPORT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setSelectedType(type.value)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedType === type.value
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-semibold text-slate-100">{type.label}</div>
                      <div className="text-xs text-slate-400 mt-1">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason (Required) */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Why are you reporting this? <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., 'The location is in a different city' or 'The date has already passed'"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Description (Optional) */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Additional Details (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide any additional information that would help us review this report..."
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none"
                />
              </div>

              {/* Contact Email (Optional) */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Your Email (Optional)</label>
                <input
                  type="email"
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                  placeholder="We'll use this if we need more information"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Info Message */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  <strong>Note:</strong> Your report will be reviewed by our moderation team and the event organizer. Thank you for helping keep EventNexus safe!
                </p>
              </div>
            </>
          )}

          {/* Footer */}
          {!success && (
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Report
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ReportEventModal;
