import React, { useState } from 'react';
import { supabase } from '@/services/supabase';
import { RefreshCw, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { PLATFORM_CONFIG } from '@/constants';

interface RefundButtonProps {
  ticketId: string;
  eventDate: string;
  eventName: string;
  ticketPrice: number;
  onRefundProcessed?: () => void;
}

export const RefundButton: React.FC<RefundButtonProps> = ({
  ticketId,
  eventDate,
  eventName,
  ticketPrice,
  onRefundProcessed,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const calculateRefundEligibility = () => {
    const now = new Date();
    const event = new Date(eventDate);
    const daysUntil = Math.floor((event.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil >= PLATFORM_CONFIG.refundPolicy.fullRefund) {
      return { eligible: true, percent: 100, reason: `Full refund (${PLATFORM_CONFIG.refundPolicy.fullRefund}+ days before event)` };
    } else if (daysUntil >= PLATFORM_CONFIG.refundPolicy.partialRefund) {
      return { eligible: true, percent: 50, reason: `Partial refund (${PLATFORM_CONFIG.refundPolicy.partialRefund}-${PLATFORM_CONFIG.refundPolicy.fullRefund} days before event)` };
    } else if (daysUntil >= 0) {
      return { eligible: false, percent: 0, reason: `No refunds within ${PLATFORM_CONFIG.refundPolicy.partialRefund} days of event` };
    } else {
      return { eligible: false, percent: 0, reason: 'Event has already occurred' };
    }
  };

  const eligibility = calculateRefundEligibility();

  const handleRequestRefund = async () => {
    if (!eligibility.eligible) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-refund', {
        body: {
          ticketId,
          userId: (await supabase.auth.getUser()).data.user?.id,
          reason: 'Customer requested refund',
        },
      });

      if (error) throw error;

      if (data.success) {
        setResult({
          success: true,
          message: `Refund of €${data.refundAmount} (${data.refundPercent}%) processed successfully. You'll receive it in 5-10 business days.`,
        });
        if (onRefundProcessed) onRefundProcessed();
      } else if (data.requiresManualReview) {
        setResult({
          success: true,
          message: 'Your refund request has been submitted for review. We\'ll contact you within 1-2 business days.',
        });
      } else {
        throw new Error(data.message || 'Refund failed');
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Failed to process refund. Please contact support.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={!eligibility.eligible}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          eligibility.eligible
            ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
        }`}
        title={eligibility.reason}
      >
        <RefreshCw className="w-4 h-4 inline-block mr-2" />
        Request Refund {eligibility.eligible && `(${eligibility.percent}%)`}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-700">
            {!result ? (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">Request Refund</h3>
                    <p className="text-sm text-gray-400 mt-1">{eventName}</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-100">
                      <p className="font-semibold mb-2">Refund Policy:</p>
                      <p className="mb-1">• 7+ days before: 100% refund</p>
                      <p className="mb-1">• 3-7 days before: 50% refund</p>
                      <p>• Less than 3 days: No refund</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Original amount:</span>
                    <span className="text-white font-semibold">€{ticketPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Refund amount:</span>
                    <span className="text-green-400 font-bold text-lg">
                      €{((ticketPrice * eligibility.percent) / 100).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Refund will be processed to your original payment method within 5-10 business days.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestRefund}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        Processing...
                      </span>
                    ) : (
                      `Confirm Refund (${eligibility.percent}%)`
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center py-6">
                  {result.success ? (
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  ) : (
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  )}
                  <h3 className={`text-xl font-bold mb-2 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                    {result.success ? 'Refund Processed' : 'Refund Failed'}
                  </h3>
                  <p className="text-gray-300 mb-6">{result.message}</p>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setResult(null);
                    }}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default RefundButton;
