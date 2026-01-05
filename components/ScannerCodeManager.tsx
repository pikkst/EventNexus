import React, { useState, useEffect } from 'react';
import { Smartphone, Key, Copy, Check, Trash2, Power, Plus, QrCode } from 'lucide-react';
import { 
  getEventScannerCodes, 
  createScannerCode, 
  toggleScannerCodeStatus, 
  deleteScannerCode,
  ScannerCode 
} from '../services/scannerCodeService';
import { EventNexusEvent } from '../types';

interface ScannerCodeManagerProps {
  event: EventNexusEvent;
  organizerId: string;
}

/**
 * Scanner Code Manager Component
 * Allows organizers to manage scanner codes for their mobile apps
 */
const ScannerCodeManager: React.FC<ScannerCodeManagerProps> = ({ event, organizerId }) => {
  const [scannerCodes, setScannerCodes] = useState<ScannerCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newCodeName, setNewCodeName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadScannerCodes();
  }, [event.id]);

  const loadScannerCodes = async () => {
    setIsLoading(true);
    try {
      const codes = await getEventScannerCodes(event.id);
      setScannerCodes(codes);
    } catch (error) {
      console.error('Failed to load scanner codes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCode = async () => {
    if (!newCodeName.trim()) {
      alert('Please enter a scanner name');
      return;
    }

    setIsCreating(true);
    try {
      const newCode = await createScannerCode(
        event.id,
        organizerId,
        newCodeName.trim()
      );

      if (newCode) {
        setScannerCodes([newCode, ...scannerCodes]);
        setNewCodeName('');
        setShowCreateForm(false);
        // Auto-copy new code
        handleCopyCode(newCode.code);
        alert(`Scanner code created: ${newCode.code}\n\nThe code has been copied to your clipboard. Use it to authenticate the EventNexus Scanner mobile app.`);
      } else {
        alert('Failed to create scanner code');
      }
    } catch (error) {
      console.error('Failed to create scanner code:', error);
      alert('Failed to create scanner code');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (codeId: string, currentStatus: boolean) => {
    const success = await toggleScannerCodeStatus(codeId, !currentStatus);
    if (success) {
      setScannerCodes(scannerCodes.map(code => 
        code.id === codeId ? { ...code, is_active: !currentStatus } : code
      ));
    } else {
      alert('Failed to update scanner code status');
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm('Are you sure you want to delete this scanner code? This action cannot be undone.')) {
      return;
    }

    const success = await deleteScannerCode(codeId);
    if (success) {
      setScannerCodes(scannerCodes.filter(code => code.id !== codeId));
    } else {
      alert('Failed to delete scanner code');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Smartphone className="w-6 h-6 text-indigo-500" />
          <h3 className="text-xl font-bold text-white">Mobile Scanner Codes</h3>
        </div>
        <div className="text-center py-8 text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Smartphone className="w-6 h-6 text-indigo-500" />
          <div>
            <h3 className="text-xl font-bold text-white">Mobile Scanner Codes</h3>
            <p className="text-sm text-slate-400">Manage codes for EventNexus Scanner mobile app</p>
          </div>
        </div>
        
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Code
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-5 h-5 text-indigo-400" />
            <h4 className="text-lg font-semibold text-white">Create New Scanner Code</h4>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newCodeName}
              onChange={(e) => setNewCodeName(e.target.value)}
              placeholder="Scanner name (e.g., Main Entrance, VIP Gate)"
              className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              maxLength={50}
            />
            
            <button
              onClick={handleCreateCode}
              disabled={isCreating || !newCodeName.trim()}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
            
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewCodeName('');
              }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-white transition-colors"
            >
              Cancel
            </button>
          </div>
          
          <p className="text-xs text-slate-400 mt-3">
            A unique 8-character code will be generated. Use it to authenticate the mobile scanner app.
          </p>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <QrCode className="w-5 h-5 text-indigo-400 mt-0.5" />
          <div>
            <p className="text-sm text-slate-300 font-semibold mb-1">How to use scanner codes:</p>
            <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
              <li>Download EventNexus Scanner app (iOS or Android)</li>
              <li>Enter the scanner code when prompted</li>
              <li>App will sync to this event automatically</li>
              <li>Start scanning tickets at your event</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Scanner Codes List */}
      {scannerCodes.length === 0 ? (
        <div className="text-center py-12">
          <Smartphone className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No scanner codes yet</p>
          <p className="text-sm text-slate-500">Create a code to use with the mobile scanner app</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scannerCodes.map((code) => (
            <div
              key={code.id}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-white">{code.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      code.is_active 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {code.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      <code className="font-mono font-bold text-indigo-400 text-lg tracking-wider">
                        {code.code}
                      </code>
                      <button
                        onClick={() => handleCopyCode(code.code)}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                        title="Copy code"
                      >
                        {copiedCode === code.code ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    
                    <div>
                      Created: {formatDate(code.created_at)}
                    </div>
                    
                    {code.last_used_at && (
                      <div>
                        Last used: {formatDate(code.last_used_at)}
                      </div>
                    )}
                    
                    <div>
                      Scans: {code.scan_count || 0}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(code.id, code.is_active)}
                    className={`p-2 rounded-xl transition-colors ${
                      code.is_active
                        ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                        : 'bg-gray-500/20 hover:bg-gray-500/30 text-gray-400'
                    }`}
                    title={code.is_active ? 'Disable code' : 'Enable code'}
                  >
                    <Power className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteCode(code.id)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
                    title="Delete code"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScannerCodeManager;
