import React, { useState, useEffect } from 'react';
import {
  Gift,
  Coins,
  CheckCircle,
  AlertCircle,
  Loader,
  Tag,
  Clock,
  TrendingUp,
  History
} from 'lucide-react';
import {
  redeemPromoCode,
  getCreditTransactions,
  getUserCodeRedemptions,
  CreditTransaction,
  CodeRedemption
} from '../services/dbService';
import { User } from '../types';

interface CodeRedemptionProps {
  user: User;
  onCreditsUpdated?: () => void;
}

const CodeRedemption: React.FC<CodeRedemptionProps> = ({ user, onCreditsUpdated }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [redemptions, setRedemptions] = useState<CodeRedemption[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [user.id]);

  const loadHistory = async () => {
    try {
      const [txnData, redemptionData] = await Promise.all([
        getCreditTransactions(user.id),
        getUserCodeRedemptions(user.id)
      ]);
      setTransactions(txnData);
      setRedemptions(redemptionData);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleRedeem = async () => {
    if (!code.trim()) {
      setMessage({ type: 'error', text: 'Please enter a code' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await redeemPromoCode(user.id, code.trim().toUpperCase());
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: `Success! ${result.credits_granted} credits added. New balance: ${result.new_balance} credits`
        });
        setCode('');
        loadHistory();
        if (onCreditsUpdated) {
          onCreditsUpdated();
        }
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to redeem code'
        });
      }
    } catch (error) {
      console.error('Error redeeming code:', error);
      setMessage({
        type: 'error',
        text: 'An error occurred while redeeming the code'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRedeem();
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'admin_grant':
        return <Gift className="w-5 h-5 text-green-600" />;
      case 'code_redemption':
        return <Tag className="w-5 h-5 text-blue-600" />;
      case 'purchase':
        return <Coins className="w-5 h-5 text-purple-600" />;
      case 'refund':
        return <TrendingUp className="w-5 h-5 text-red-600" />;
      default:
        return <Coins className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTransactionColor = (amount: number) => {
    return amount >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Redeem Code</h1>
              <p className="text-white/90 text-sm">Enter your promo or reward code</p>
            </div>
          </div>

          {/* Current Balance */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-white/90">Current Balance</span>
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5" />
                <span className="text-2xl font-bold">{user.credits || 0}</span>
                <span className="text-white/90">credits</span>
              </div>
            </div>
          </div>
        </div>

        {/* Redemption Form */}
        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Code
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="PROMO-XXX-XXXXXXXXXX"
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-lg uppercase"
                disabled={loading}
              />
              <button
                onClick={handleRedeem}
                disabled={loading || !code.trim()}
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:from-orange-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Redeeming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Redeem
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-4 rounded-lg mb-6 ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : message.type === 'error'
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : message.type === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                )}
                <p
                  className={`text-sm font-medium ${
                    message.type === 'success'
                      ? 'text-green-800'
                      : message.type === 'error'
                      ? 'text-red-800'
                      : 'text-blue-800'
                  }`}
                >
                  {message.text}
                </p>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <p className="font-medium text-gray-900 mb-1">About Codes</p>
                <ul className="space-y-1 text-gray-600">
                  <li>• <strong>Promo codes</strong> are for new registrations or special offers</li>
                  <li>• <strong>Reward codes</strong> are for existing users as recognition</li>
                  <li>• Each code can only be used once per user</li>
                  <li>• Some codes may have expiration dates or usage limits</li>
                </ul>
              </div>
            </div>
          </div>

          {/* History Toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 font-medium"
          >
            <History className="w-5 h-5" />
            {showHistory ? 'Hide History' : 'Show History'}
          </button>

          {/* Transaction History */}
          {showHistory && (
            <div className="mt-6 border-t pt-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-600" />
                Transaction History
              </h2>

              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(txn.transaction_type)}
                        <div>
                          <p className="font-medium text-gray-900">
                            {txn.transaction_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          {txn.reason && (
                            <p className="text-sm text-gray-600">{txn.reason}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {new Date(txn.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${getTransactionColor(txn.amount)}`}>
                          {txn.amount >= 0 ? '+' : ''}{txn.amount}
                        </p>
                        <p className="text-sm text-gray-600">
                          Balance: {txn.balance_after}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No transactions yet</p>
                  <p className="text-sm text-gray-500">Redeem your first code to get started!</p>
                </div>
              )}

              {redemptions.length > 0 && (
                <>
                  <h3 className="text-md font-semibold mt-6 mb-3 text-gray-700">
                    Redeemed Codes ({redemptions.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {redemptions.map((redemption) => (
                      <div
                        key={redemption.id}
                        className="p-3 bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600">Code Redeemed</span>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(redemption.redeemed_at).toLocaleDateString()}
                        </p>
                        <p className="text-lg font-bold text-green-600 mt-1">
                          +{redemption.credit_granted} credits
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeRedemption;
