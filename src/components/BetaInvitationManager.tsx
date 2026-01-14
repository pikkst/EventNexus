import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  Trash2, 
  Download, 
  Zap, 
  Users, 
  Loader,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { 
  generateBetaInvitations, 
  getBetaInvitations, 
  getBetaStats, 
  revokeBetaInvitation 
} from '../services/dbService';
import { BetaInvitation } from '../services/dbService';

interface BetaStats {
  total: number;
  active: number;
  used: number;
  expired: number;
  creditsDistributed: number;
}

export const BetaInvitationManager: React.FC = () => {
  const [invitations, setInvitations] = useState<BetaInvitation[]>([]);
  const [stats, setStats] = useState<BetaStats>({
    total: 0,
    active: 0,
    used: 0,
    expired: 0,
    creditsDistributed: 0
  });
  const [count, setCount] = useState(10);
  const [expiryDays, setExpiryDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invitationsData, statsData] = await Promise.all([
        getBetaInvitations(),
        getBetaStats()
      ]);
      setInvitations(invitationsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateCodes = async () => {
    setLoading(true);
    try {
      const codes = await generateBetaInvitations(count, expiryDays);
      if (codes.length > 0) {
        setMessage({ 
          type: 'success', 
          text: `✅ Generated ${codes.length} beta invitation codes!` 
        });
        await loadData();
      } else {
        setMessage({ type: 'error', text: 'Failed to generate codes' });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    if (!window.confirm('Are you sure you want to revoke this invitation?')) return;
    
    try {
      const success = await revokeBetaInvitation(invitationId);
      if (success) {
        setMessage({ type: 'success', text: 'Invitation revoked' });
        await loadData();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to revoke invitation' });
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDownloadCodes = () => {
    const csv = invitations
      .map(inv => `${inv.code},${inv.status},${inv.redeemed_at || 'N/A'}`)
      .join('\n');
    
    const blob = new Blob(['Code,Status,Redeemed At\n' + csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'beta-invitations.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Beta Invitation Manager</h2>
        <p className="text-slate-400">Generate and manage beta testing invitation codes</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={18} className="text-yellow-400" />
            <p className="text-sm text-slate-400">Total Codes</p>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-400" />
            <p className="text-sm text-slate-400">Active</p>
          </div>
          <p className="text-2xl font-bold">{stats.active}</p>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} className="text-blue-400" />
            <p className="text-sm text-slate-400">Used</p>
          </div>
          <p className="text-2xl font-bold">{stats.used}</p>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={18} className="text-red-400" />
            <p className="text-sm text-slate-400">Expired</p>
          </div>
          <p className="text-2xl font-bold">{stats.expired}</p>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={18} className="text-purple-400" />
            <p className="text-sm text-slate-400">Credits Given</p>
          </div>
          <p className="text-2xl font-bold">{stats.creditsDistributed / 1000}k</p>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-4 rounded-lg flex gap-2 ${
          message.type === 'success'
            ? 'bg-green-500/20 border border-green-500 text-green-300'
            : 'bg-red-500/20 border border-red-500 text-red-300'
        }`}>
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <p>{message.text}</p>
        </div>
      )}

      {/* Generate Section */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-bold mb-4">Generate New Codes</h3>
        
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Number of Codes</label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              min="1"
              max="1000"
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Expiry (Days)</label>
            <input
              type="number"
              value={expiryDays}
              onChange={(e) => setExpiryDays(parseInt(e.target.value) || 30)}
              min="1"
              max="365"
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
        </div>

        <button
          onClick={handleGenerateCodes}
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader size={20} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Zap size={20} />
              Generate {count} Codes
            </>
          )}
        </button>
      </div>

      {/* Codes List */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">All Codes ({invitations.length})</h3>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 hover:bg-slate-700 rounded transition"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleDownloadCodes}
              disabled={invitations.length === 0}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded flex items-center gap-2"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 border-b border-slate-700">
          <button className="px-4 py-2 text-indigo-400 border-b-2 border-indigo-400">
            All ({invitations.length})
          </button>
          <button className="px-4 py-2 text-slate-400 hover:text-slate-300">
            Active ({stats.active})
          </button>
          <button className="px-4 py-2 text-slate-400 hover:text-slate-300">
            Used ({stats.used})
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4">Code</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Created</th>
                <th className="text-left py-3 px-4">Expires</th>
                <th className="text-left py-3 px-4">Used By</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No codes generated yet. Create some above!
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                    <td className="py-3 px-4 font-mono text-xs">{inv.code}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        inv.status === 'active' ? 'bg-green-500/20 text-green-300' :
                        inv.status === 'used' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {inv.redeemed_at ? new Date(inv.redeemed_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleCopyCode(inv.code)}
                          className="p-2 hover:bg-slate-600 rounded transition"
                          title="Copy code"
                        >
                          {copiedCode === inv.code ? (
                            <CheckCircle size={18} className="text-green-400" />
                          ) : (
                            <Copy size={18} />
                          )}
                        </button>
                        {inv.status === 'active' && (
                          <button
                            onClick={() => handleRevoke(inv.id)}
                            className="p-2 hover:bg-red-500/20 rounded transition text-red-400"
                            title="Revoke code"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BetaInvitationManager;
