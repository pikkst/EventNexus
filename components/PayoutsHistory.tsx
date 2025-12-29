import React, { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { DollarSign, Calendar, CheckCircle, XCircle, Clock, TrendingUp, ExternalLink, AlertCircle } from 'lucide-react';
import { createConnectAccount, checkConnectStatus, getConnectDashboardLink, verifyConnectOnboarding } from '@/services/dbService';

interface Payout {
  id: string;
  event_id: string;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  ticket_count: number;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
  event_date: string;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
  event: {
    name: string;
    date: string;
  };
}

interface PayoutsHistoryProps {
  userId: string;
  user?: any; // Optional user object to detect stripe_connect status changes
}

export const PayoutsHistory: React.FC<PayoutsHistoryProps> = ({ userId, user }) => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectStatus, setConnectStatus] = useState<{
    hasAccount: boolean;
    onboardingComplete: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
  } | null>(null);
  const [isConnectLoading, setIsConnectLoading] = useState(false);
  const [stats, setStats] = useState({
    totalEarned: 0,
    pendingAmount: 0,
    successfulPayouts: 0,
  });

  useEffect(() => {
    fetchPayouts();
    fetchConnectStatus();
  }, [userId]);

  // Update connect status when user object changes (from parent Dashboard after verification)
  useEffect(() => {
    if (user) {
      console.log('PayoutsHistory: User object updated, refreshing connect status...');
      fetchConnectStatus();
    }
  }, [user?.stripe_connect_onboarding_complete, user?.stripe_connect_charges_enabled, user?.stripe_connect_payouts_enabled]);

  // Check for Stripe Connect return and verify onboarding status
  useEffect(() => {
    const checkStripeReturn = async () => {
      const params = new URLSearchParams(window.location.search);
      const connectParam = params.get('connect');
      
      if (connectParam === 'success' || connectParam === 'refresh') {
        console.log('PayoutsHistory: Returned from Stripe Connect onboarding, verifying status...');
        setIsConnectLoading(true);
        
        try {
          const result = await verifyConnectOnboarding(userId);
          
          if (result?.success) {
            console.log('PayoutsHistory: Connect verification result:', result);
            
            // Update connect status with latest from Stripe
            setConnectStatus({
              hasAccount: result.hasAccount,
              onboardingComplete: result.onboardingComplete,
              chargesEnabled: result.chargesEnabled,
              payoutsEnabled: result.payoutsEnabled,
            });
            
            // Refresh payouts list
            fetchPayouts();
          } else {
            console.warn('PayoutsHistory: Connect verification returned no result');
          }
        } catch (error) {
          console.error('PayoutsHistory: Error verifying Connect status:', error);
        } finally {
          setIsConnectLoading(false);
        }
      }
    };
    
    checkStripeReturn();
  }, [userId]);

  const fetchConnectStatus = async () => {
    const status = await checkConnectStatus(userId);
    if (status) {
      setConnectStatus(status);
    }
  };

  const handleStartOnboarding = async () => {
    setIsConnectLoading(true);
    try {
      // Get user email
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.email) {
        alert('Unable to retrieve email. Please try again.');
        return;
      }

      const result = await createConnectAccount(userId, userData.user.email);
      if (result?.url) {
        window.location.href = result.url;
      } else {
        alert('Failed to create Connect account. Please try again.');
      }
    } catch (error) {
      console.error('Error starting onboarding:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsConnectLoading(false);
    }
  };

  const handleOpenDashboard = async () => {
    setIsConnectLoading(true);
    try {
      const url = await getConnectDashboardLink(userId);
      if (url) {
        window.open(url, '_blank');
      } else {
        alert('Unable to access dashboard. Please try again.');
      }
    } catch (error) {
      console.error('Error opening dashboard:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsConnectLoading(false);
    }
  };

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payouts')
        .select(`
          *,
          event:events(name, date)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setPayouts(data as Payout[]);
        
        // Calculate stats
        const totalEarned = data
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + p.net_amount, 0);
        
        const pendingAmount = data
          .filter(p => p.status === 'pending' || p.status === 'processing')
          .reduce((sum, p) => sum + p.net_amount, 0);
        
        const successfulPayouts = data.filter(p => p.status === 'paid').length;
        
        setStats({ totalEarned, pendingAmount, successfulPayouts });
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClasses[status as keyof typeof statusClasses] || statusClasses.cancelled}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stripe Connect Onboarding Banner */}
      {connectStatus && !connectStatus.onboardingComplete && (
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-[32px] p-8 text-white shadow-2xl shadow-indigo-600/30">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                <h3 className="text-2xl font-black tracking-tight">Set Up Payouts</h3>
              </div>
              <p className="text-indigo-100 font-medium leading-relaxed">
                Complete your Stripe Connect onboarding to receive payouts from ticket sales. This takes about 5 minutes.
              </p>
              <ul className="text-sm text-indigo-100 space-y-1 list-disc list-inside">
                <li>Verify your identity (required by financial regulations)</li>
                <li>Add your bank account for payouts</li>
                <li>Start receiving earnings automatically</li>
              </ul>
            </div>
            <button
              onClick={handleStartOnboarding}
              disabled={isConnectLoading}
              className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm hover:bg-indigo-50 transition-all shadow-xl hover:shadow-2xl active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              {isConnectLoading ? 'Loading...' : 'Start Setup'}
            </button>
          </div>
        </div>
      )}

      {/* Stripe Dashboard Link */}
      {connectStatus?.onboardingComplete && (
        <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Payout & Banking Settings</h3>
              <p className="text-sm text-slate-400 font-medium">
                Manage your bank account, payout schedule, and tax forms via Stripe Dashboard
              </p>
            </div>
            <button
              onClick={handleOpenDashboard}
              disabled={isConnectLoading}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              <ExternalLink className="w-4 h-4" />
              {isConnectLoading ? 'Loading...' : 'Open Stripe Dashboard'}
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Earned</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {formatCurrency(stats.totalEarned)}
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-green-600 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Pending Payouts</p>
              <p className="text-2xl font-bold text-yellow-900 mt-1">
                {formatCurrency(stats.pendingAmount)}
              </p>
            </div>
            <Clock className="w-10 h-10 text-yellow-600 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6 border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-600">Successful Payouts</p>
              <p className="text-2xl font-bold text-indigo-900 mt-1">
                {stats.successfulPayouts}
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-indigo-600 opacity-50" />
          </div>
        </div>
      </div>

      {/* Payouts List */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Payout History</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track your event earnings and payout status
          </p>
        </div>

        {payouts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payouts yet</h3>
            <p className="text-gray-600">
              Payouts will appear here after your events complete and ticket sales are processed.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {payouts.map((payout) => (
              <div key={payout.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="mt-1">{getStatusIcon(payout.status)}</div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {payout.event?.name || 'Unknown Event'}
                      </h3>
                      
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Event: {formatDate(payout.event_date)}</span>
                        </div>
                        <div>
                          <span className="font-medium">{payout.ticket_count}</span> tickets sold
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                        <div>
                          <span className="font-medium">Gross:</span> {formatCurrency(payout.gross_amount)}
                        </div>
                        <div>
                          <span className="font-medium">Platform Fee:</span> -{formatCurrency(payout.platform_fee)}
                        </div>
                        <div className="text-green-600 font-semibold">
                          <span className="font-medium">Net:</span> {formatCurrency(payout.net_amount)}
                        </div>
                      </div>

                      {payout.error_message && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1 rounded">
                          {payout.error_message}
                        </div>
                      )}

                      {payout.processed_at && (
                        <div className="mt-2 text-xs text-gray-500">
                          Processed: {formatDate(payout.processed_at)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2 ml-4">
                    {getStatusBadge(payout.status)}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(payout.net_amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {payout.status === 'paid' ? 'Paid' : 'Expected'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900">Payout Schedule</h4>
            <p className="text-sm text-blue-700 mt-1">
              Payouts are processed automatically 2 days after your event completes. This allows time for refund requests and ensures secure transactions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayoutsHistory;
