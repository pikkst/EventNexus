import React, { useState, useEffect } from 'react';
import {
  Gift,
  Coins,
  Plus,
  Code,
  Users,
  Download,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Search,
  Filter,
  TrendingUp,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import {
  generatePromoCodes,
  getAllPromoCodes,
  getPromoCodeStats,
  updatePromoCodeStatus,
  deletePromoCode,
  adminGrantCredits,
  getAllCreditTransactions,
  getUsers,
  PromoCode,
  CreditTransaction
} from '../services/dbService';
import { User } from '../types';

interface AdminCreditManagerProps {
  user: User;
}

const AdminCreditManager: React.FC<AdminCreditManagerProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'grant' | 'generate' | 'codes' | 'transactions'>('grant');
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [codeStats, setCodeStats] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Grant Credits Form
  const [selectedUserId, setSelectedUserId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [grantReason, setGrantReason] = useState('');

  // Generate Codes Form
  const [codeType, setCodeType] = useState<'promo' | 'reward'>('promo');
  const [tier, setTier] = useState<'free' | 'basic' | 'pro' | 'enterprise'>('basic');
  const [codeCredit, setCodeCredit] = useState('100');
  const [maxUses, setMaxUses] = useState('1');
  const [validUntil, setValidUntil] = useState('');
  const [codeCount, setCodeCount] = useState('1');
  const [codePrefix, setCodePrefix] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'promo' | 'reward'>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [codesData, statsData, transactionsData, usersData] = await Promise.all([
        getAllPromoCodes(),
        getPromoCodeStats(),
        getAllCreditTransactions(),
        getUsers()
      ]);
      setPromoCodes(codesData);
      setCodeStats(statsData);
      setTransactions(transactionsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleGrantCredits = async () => {
    if (!selectedUserId || !creditAmount || !grantReason) {
      showMessage('error', 'Please fill in all fields');
      return;
    }

    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount === 0) {
      showMessage('error', 'Invalid credit amount');
      return;
    }

    setLoading(true);
    try {
      const result = await adminGrantCredits(selectedUserId, amount, grantReason, user.id);
      if (result.success) {
        showMessage('success', `Successfully granted ${amount} credits. New balance: ${result.new_balance}`);
        setSelectedUserId('');
        setCreditAmount('');
        setGrantReason('');
        loadData();
      } else {
        showMessage('error', result.error || 'Failed to grant credits');
      }
    } catch (error) {
      console.error('Error granting credits:', error);
      showMessage('error', 'Failed to grant credits');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCodes = async () => {
    const credit = parseInt(codeCredit);
    const count = parseInt(codeCount);
    const uses = maxUses ? parseInt(maxUses) : null;

    if (isNaN(credit) || credit <= 0) {
      showMessage('error', 'Invalid credit amount');
      return;
    }

    if (isNaN(count) || count <= 0 || count > 100) {
      showMessage('error', 'Count must be between 1 and 100');
      return;
    }

    setLoading(true);
    try {
      const codes = await generatePromoCodes({
        codeType,
        tier,
        creditAmount: credit,
        maxUses: uses,
        validUntil: validUntil || undefined,
        count,
        prefix: codePrefix || undefined
      });

      if (codes.length > 0) {
        showMessage('success', `Successfully generated ${codes.length} codes`);
        setCodeCredit('100');
        setMaxUses('1');
        setValidUntil('');
        setCodeCount('1');
        setCodePrefix('');
        loadData();
      } else {
        showMessage('error', 'Failed to generate codes');
      }
    } catch (error) {
      console.error('Error generating codes:', error);
      showMessage('error', 'Failed to generate codes');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCodeStatus = async (codeId: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      const success = await updatePromoCodeStatus(codeId, !currentStatus);
      if (success) {
        showMessage('success', `Code ${!currentStatus ? 'activated' : 'deactivated'}`);
        loadData();
      } else {
        showMessage('error', 'Failed to update code status');
      }
    } catch (error) {
      console.error('Error updating code:', error);
      showMessage('error', 'Failed to update code status');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm('Are you sure you want to delete this code?')) return;

    setLoading(true);
    try {
      const success = await deletePromoCode(codeId);
      if (success) {
        showMessage('success', 'Code deleted successfully');
        loadData();
      } else {
        showMessage('error', 'Failed to delete code');
      }
    } catch (error) {
      console.error('Error deleting code:', error);
      showMessage('error', 'Failed to delete code');
    } finally {
      setLoading(false);
    }
  };

  const exportCodes = () => {
    const filteredCodes = getFilteredCodes();
    const csv = [
      ['Code', 'Type', 'Tier', 'Credits', 'Max Uses', 'Current Uses', 'Status', 'Valid Until'].join(','),
      ...filteredCodes.map(code => [
        code.code,
        code.code_type,
        code.tier,
        code.credit_amount,
        code.max_uses || 'Unlimited',
        code.current_uses,
        code.is_active ? 'Active' : 'Inactive',
        code.valid_until ? new Date(code.valid_until).toLocaleDateString() : 'No expiry'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promo-codes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFilteredCodes = () => {
    return promoCodes.filter(code => {
      const matchesSearch = code.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || code.code_type === filterType;
      const matchesActive = filterActive === 'all' || 
        (filterActive === 'active' && code.is_active) ||
        (filterActive === 'inactive' && !code.is_active);
      return matchesSearch && matchesType && matchesActive;
    });
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'pro': return 'bg-purple-100 text-purple-800';
      case 'enterprise': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'admin_grant': return 'bg-green-100 text-green-800';
      case 'code_redemption': return 'bg-blue-100 text-blue-800';
      case 'purchase': return 'bg-purple-100 text-purple-800';
      case 'refund': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Credit Manager</h1>
                <p className="text-sm text-gray-600">Manage credits and promotional codes</p>
              </div>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div className={`px-6 py-3 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex px-6" aria-label="Tabs">
            {[
              { id: 'grant', label: 'Grant Credits', icon: Coins },
              { id: 'generate', label: 'Generate Codes', icon: Code },
              { id: 'codes', label: 'Manage Codes', icon: Gift },
              { id: 'transactions', label: 'Transactions', icon: TrendingUp }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Grant Credits Tab */}
          {activeTab === 'grant' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-4">Grant Credits to User</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select User
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">-- Select a user --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) - Current: {u.credits || 0} credits
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Credit Amount (positive to add, negative to remove)
                  </label>
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="e.g., 100 or -50"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason
                  </label>
                  <textarea
                    value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                    placeholder="Explain why credits are being granted or removed"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleGrantCredits}
                  disabled={loading || !selectedUserId || !creditAmount || !grantReason}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:from-orange-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5" />
                  Grant Credits
                </button>
              </div>
            </div>
          )}

          {/* Generate Codes Tab */}
          {activeTab === 'generate' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-4">Generate Promo/Reward Codes</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Code Type
                    </label>
                    <select
                      value={codeType}
                      onChange={(e) => setCodeType(e.target.value as any)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="promo">Promo (for registration)</option>
                      <option value="reward">Reward (for existing users)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tier
                    </label>
                    <select
                      value={tier}
                      onChange={(e) => setTier(e.target.value as any)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="free">Free</option>
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Credit Amount
                    </label>
                    <input
                      type="number"
                      value={codeCredit}
                      onChange={(e) => setCodeCredit(e.target.value)}
                      min="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Uses (blank for unlimited)
                    </label>
                    <input
                      type="number"
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                      min="1"
                      placeholder="Unlimited"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Codes
                    </label>
                    <input
                      type="number"
                      value={codeCount}
                      onChange={(e) => setCodeCount(e.target.value)}
                      min="1"
                      max="100"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valid Until (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code Prefix (optional)
                  </label>
                  <input
                    type="text"
                    value={codePrefix}
                    onChange={(e) => setCodePrefix(e.target.value.toUpperCase())}
                    placeholder="e.g., WELCOME"
                    maxLength={10}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleGenerateCodes}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:from-orange-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Code className="w-5 h-5" />
                  Generate Codes
                </button>
              </div>
            </div>
          )}

          {/* Manage Codes Tab */}
          {activeTab === 'codes' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Manage Codes</h2>
                <button
                  onClick={exportCodes}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>

              {/* Filters */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search codes..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="promo">Promo</option>
                  <option value="reward">Reward</option>
                </select>
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Codes Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uses</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFilteredCodes().map(code => (
                      <tr key={code.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{code.code}</code>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm capitalize">{code.code_type}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTierColor(code.tier)}`}>
                            {code.tier}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm">{code.credit_amount}</td>
                        <td className="px-4 py-4 text-sm">
                          {code.current_uses}/{code.max_uses || '∞'}
                        </td>
                        <td className="px-4 py-4">
                          {code.is_active ? (
                            <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                              <CheckCircle className="w-4 h-4" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-gray-600 text-sm">
                              <XCircle className="w-4 h-4" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {code.valid_until ? new Date(code.valid_until).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleCodeStatus(code.id, code.is_active)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title={code.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {code.is_active ? (
                                <ToggleRight className="w-5 h-5 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteCode(code.id)}
                              className="p-1 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {getFilteredCodes().length === 0 && (
                <div className="text-center py-12">
                  <Code className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No codes found</p>
                </div>
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div>
              <h2 className="text-lg font-semibold mb-6">Credit Transactions</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance After</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map(txn => {
                      const user = users.find(u => u.id === txn.user_id);
                      return (
                        <tr key={txn.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {new Date(txn.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            {user?.name || 'Unknown User'}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTransactionTypeColor(txn.transaction_type)}`}>
                              {txn.transaction_type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className={`px-4 py-4 text-sm font-semibold ${txn.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {txn.amount >= 0 ? '+' : ''}{txn.amount}
                          </td>
                          <td className="px-4 py-4 text-sm font-medium">{txn.balance_after}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">{txn.reason || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {transactions.length === 0 && (
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No transactions yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCreditManager;
