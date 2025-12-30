import React, { useState, useEffect } from 'react';
import { Mail, Inbox, Send, Archive, Trash2, Star, RefreshCw, AlertCircle, Clock, Search, Filter, ChevronLeft, ExternalLink } from 'lucide-react';
import { getInboxMessages, markInboxAsRead, replyToInboxMessage, deleteInboxMessage, getInboxStats } from '../services/dbService';
import { sanitizeHtml } from '../utils/security';

interface InboxMessage {
  id: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  attachments: any[];
  status: 'unread' | 'read' | 'replied' | 'archived' | 'spam';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  replied_at: string | null;
  created_at: string;
}

interface InboxStats {
  total: number;
  unread: number;
  replied: number;
  high_priority: number;
}

const AdminInbox: React.FC = () => {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [stats, setStats] = useState<InboxStats>({ total: 0, unread: 0, replied: 0, high_priority: 0 });
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);

  useEffect(() => {
    loadMessages();
    loadStats();
  }, [filterStatus]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const data = await getInboxMessages(filterStatus === 'all' ? undefined : filterStatus);
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading inbox:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getInboxStats();
      setStats(data || { total: 0, unread: 0, replied: 0, high_priority: 0 });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSelectMessage = async (message: InboxMessage) => {
    setSelectedMessage(message);
    setIsReplying(false);
    setReplyBody('');

    // Mark as read if unread
    if (message.status === 'unread') {
      try {
        await markInboxAsRead(message.id);
        // Update local state
        setMessages(prev => prev.map(m => 
          m.id === message.id ? { ...m, status: 'read' as const } : m
        ));
        loadStats();
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyBody.trim()) return;

    setIsSendingReply(true);
    try {
      await replyToInboxMessage(selectedMessage.id, replyBody);
      
      // Update local state
      setMessages(prev => prev.map(m => 
        m.id === selectedMessage.id 
          ? { ...m, status: 'replied' as const, replied_at: new Date().toISOString() } 
          : m
      ));
      setSelectedMessage(prev => prev ? { ...prev, status: 'replied', replied_at: new Date().toISOString() } : null);
      setIsReplying(false);
      setReplyBody('');
      loadStats();
      
      alert('Reply sent successfully! ✅');
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply. Check console for details.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm('Delete this message permanently?')) return;

    try {
      await deleteInboxMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
      loadStats();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return msg.subject.toLowerCase().includes(query) ||
             msg.from_email.toLowerCase().includes(query) ||
             msg.body_text?.toLowerCase().includes(query);
    }
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'low': return 'text-slate-500';
      default: return 'text-slate-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unread': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'read': return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      case 'replied': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'archived': return 'bg-slate-600/10 text-slate-500 border-slate-600/30';
      case 'spam': return 'bg-red-500/10 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">📬 Admin Inbox</h2>
          <p className="text-slate-400 text-sm mt-1">Manage support emails and customer inquiries</p>
        </div>
        <button
          onClick={loadMessages}
          disabled={isLoading}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <Inbox className="w-8 h-8 text-blue-400" />
            <span className="text-3xl font-black text-white">{stats.total}</span>
          </div>
          <p className="text-slate-400 text-sm mt-2 font-medium">Total Messages</p>
        </div>
        <div className="bg-slate-900/50 border border-blue-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <Mail className="w-8 h-8 text-blue-400" />
            <span className="text-3xl font-black text-blue-400">{stats.unread}</span>
          </div>
          <p className="text-slate-400 text-sm mt-2 font-medium">Unread</p>
        </div>
        <div className="bg-slate-900/50 border border-green-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <Send className="w-8 h-8 text-green-400" />
            <span className="text-3xl font-black text-green-400">{stats.replied}</span>
          </div>
          <p className="text-slate-400 text-sm mt-2 font-medium">Replied</p>
        </div>
        <div className="bg-slate-900/50 border border-orange-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <AlertCircle className="w-8 h-8 text-orange-400" />
            <span className="text-3xl font-black text-orange-400">{stats.high_priority}</span>
          </div>
          <p className="text-slate-400 text-sm mt-2 font-medium">High Priority</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500"
        >
          <option value="all">All Messages</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
          <option value="replied">Replied</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Inbox Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message List */}
        <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading messages...</div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No messages found</p>
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => handleSelectMessage(msg)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedMessage?.id === msg.id
                    ? 'bg-indigo-600/20 border-indigo-500'
                    : msg.status === 'unread'
                    ? 'bg-slate-900 border-slate-700 hover:border-slate-600'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${msg.status === 'unread' ? 'text-white' : 'text-slate-300'}`}>
                      {msg.from_name || msg.from_email}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{msg.from_email}</p>
                  </div>
                  {msg.priority !== 'normal' && (
                    <AlertCircle className={`w-4 h-4 flex-shrink-0 ${getPriorityColor(msg.priority)}`} />
                  )}
                </div>
                <p className={`text-sm mb-2 truncate ${msg.status === 'unread' ? 'text-white font-semibold' : 'text-slate-400'}`}>
                  {msg.subject}
                </p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-lg border ${getStatusBadge(msg.status)}`}>
                    {msg.status}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(msg.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              {/* Message Header */}
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">{selectedMessage.subject}</h3>
                    <p className="text-slate-400 text-sm">
                      From: <span className="text-white font-semibold">{selectedMessage.from_name || selectedMessage.from_email}</span>
                      {selectedMessage.from_name && <span className="text-slate-500 ml-2">&lt;{selectedMessage.from_email}&gt;</span>}
                    </p>
                    <p className="text-slate-400 text-sm">
                      To: <span className="text-white">{selectedMessage.to_email}</span>
                    </p>
                    <p className="text-slate-500 text-xs mt-2">
                      {new Date(selectedMessage.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(selectedMessage.id)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <span className={`text-xs px-3 py-1 rounded-lg border ${getStatusBadge(selectedMessage.status)}`}>
                    {selectedMessage.status}
                  </span>
                  {selectedMessage.priority !== 'normal' && (
                    <span className={`text-xs px-3 py-1 rounded-lg border ${getPriorityColor(selectedMessage.priority)} border-current`}>
                      {selectedMessage.priority} priority
                    </span>
                  )}
                </div>
              </div>

              {/* Message Body */}
              <div className="prose prose-invert max-w-none">
                {selectedMessage.body_html ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedMessage.body_html) }} 
                    className="text-slate-300" 
                  />
                ) : (
                  <p className="text-slate-300 whitespace-pre-wrap">{selectedMessage.body_text}</p>
                )}
              </div>

              {/* Attachments */}
              {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                <div className="border-t border-slate-800 pt-4">
                  <p className="text-sm font-bold text-white mb-2">Attachments:</p>
                  <div className="space-y-2">
                    {selectedMessage.attachments.map((att: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800/50 p-2 rounded-lg">
                        <ExternalLink className="w-4 h-4" />
                        <span>{att.name}</span>
                        <span className="text-xs text-slate-500">({(att.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply Section */}
              {!isReplying && selectedMessage.status !== 'replied' ? (
                <button
                  onClick={() => setIsReplying(true)}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Reply
                </button>
              ) : selectedMessage.status === 'replied' ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                  <p className="text-green-400 font-semibold">✅ Replied on {new Date(selectedMessage.replied_at!).toLocaleString()}</p>
                </div>
              ) : (
                <div className="space-y-4 border-t border-slate-800 pt-4">
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Type your reply..."
                    rows={6}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-indigo-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSendReply}
                      disabled={isSendingReply || !replyBody.trim()}
                      className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSendingReply ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Send Reply
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsReplying(false);
                        setReplyBody('');
                      }}
                      className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
              <Mail className="w-24 h-24 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Select a message to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminInbox;
