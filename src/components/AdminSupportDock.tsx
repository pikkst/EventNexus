import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageCircle, MessageSquare, Send, X } from 'lucide-react';
import { SupportMessage, SupportThread, User } from '../types';
import {
  assignThreadToAdmin,
  closeSupportThread,
  fetchSupportMessages,
  fetchSupportThreads,
  postAdminMessage
} from '../services/supportAdminService';
import logger from '../utils/logger';
import { supabase } from '../services/supabase';

interface AdminSupportDockProps {
  user: User;
  openSignal?: number;
  onUnreadChange?: (count: number) => void;
}

const AdminSupportDock: React.FC<AdminSupportDockProps> = ({ user, openSignal, onUnreadChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [input, setInput] = useState('');
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [lastSeen, setLastSeen] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('support-admin-last-seen');
      return stored ? JSON.parse(stored) : {};
    } catch (err) {
      logger.warn('Failed to parse lastSeen cache', err);
      return {};
    }
  });
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openSignal === undefined) return;
    setIsOpen(true);
  }, [openSignal]);

  useEffect(() => {
    if (!isOpen) return;

    const loadThreads = async () => {
      setIsLoadingThreads(true);
      const data = await fetchSupportThreads();
      setThreads(data);
      if (!selectedThreadId && data.length > 0) {
        setSelectedThreadId(data[0].id);
      }
      setIsLoadingThreads(false);
    };

    loadThreads();

    const channel = supabase
      .channel('realtime:support-threads')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_threads'
      }, () => {
        loadThreads();
      });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.log('✅ Subscribed to support_threads realtime');
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, selectedThreadId]);

  useEffect(() => {
    if (!isOpen || !selectedThreadId) return;

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      const data = await fetchSupportMessages(selectedThreadId);
      setMessages(data);
      setIsLoadingMessages(false);
      const latest = data.length > 0 ? data[data.length - 1].created_at : new Date().toISOString();
      if (latest) {
        setLastSeen(prev => ({ ...prev, [selectedThreadId]: latest }));
      }
      requestAnimationFrame(() => {
        if (messageListRef.current) {
          messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
      });
    };

    loadMessages();

    const channel = supabase
      .channel(`realtime:support-messages:${selectedThreadId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_messages',
        filter: `thread_id=eq.${selectedThreadId}`
      }, () => {
        loadMessages();
      });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.log(`✅ Subscribed to support_messages for thread ${selectedThreadId}`);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, selectedThreadId]);

  useEffect(() => {
    try {
      localStorage.setItem('support-admin-last-seen', JSON.stringify(lastSeen));
    } catch (err) {
      logger.warn('Failed to persist lastSeen cache', err);
    }
  }, [lastSeen]);

  const isThreadUnread = (thread: SupportThread) => {
    const lastViewed = lastSeen[thread.id];
    if (!thread.last_message_at) return false;
    if (!lastViewed) return thread.status !== 'closed';
    return thread.status !== 'closed' && new Date(thread.last_message_at).getTime() > new Date(lastViewed).getTime();
  };

  const unreadCount = useMemo(
    () => threads.filter(t => isThreadUnread(t)).length,
    [threads, lastSeen]
  );

  useEffect(() => {
    if (typeof onUnreadChange === 'function') {
      onUnreadChange(unreadCount);
    }
  }, [unreadCount, onUnreadChange]);

  const selectedThread = threads.find(t => t.id === selectedThreadId) || null;

  const handleAssignToMe = async () => {
    if (!selectedThreadId || !user?.id) return;
    const ok = await assignThreadToAdmin(selectedThreadId, user.id);
    if (ok) {
      setThreads(prev => prev.map(t => (t.id === selectedThreadId ? { ...t, status: 'assigned', assigned_admin_id: user.id } : t)));
    }
  };

  const handleCloseThread = async () => {
    if (!selectedThreadId) return;
    const ok = await closeSupportThread(selectedThreadId);
    if (ok) {
      setThreads(prev => prev.map(t => (t.id === selectedThreadId ? { ...t, status: 'closed' } : t)));
    }
  };

  const handleSend = async () => {
    if (!selectedThreadId || !input.trim()) return;
    setIsSending(true);
    const ok = await postAdminMessage(selectedThreadId, input.trim(), user?.id, selectedThread?.language || 'en');
    if (!ok) {
      setIsSending(false);
      return;
    }
    setInput('');
    const data = await fetchSupportMessages(selectedThreadId);
    setMessages(data);
    setIsSending(false);
  };

  const statusBadge = (thread: SupportThread) => {
    if (thread.status === 'closed') return 'bg-slate-800 text-slate-300';
    if (thread.status === 'assigned') return 'bg-amber-500/20 text-amber-300';
    return 'bg-emerald-500/20 text-emerald-300';
  };

  return (
    <div className="fixed bottom-4 right-4 z-[1400]">
      <div className="flex flex-col items-end gap-3">
        {isOpen && (
          <div className="w-[960px] max-w-[95vw] h-[520px] bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden">
            <div className="flex h-full">
              <div className="w-80 border-r border-slate-800 bg-slate-900/60 flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                    <MessageSquare className="w-4 h-4" />
                    Support Threads
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
                    aria-label="Close support dock"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                  {isLoadingThreads && (
                    <div className="p-4 text-sm text-slate-400 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading threads...
                    </div>
                  )}
                  {threads.map(thread => (
                    <button
                      key={thread.id}
                      onClick={() => setSelectedThreadId(thread.id)}
                      className={`w-full text-left px-4 py-3 border-b border-slate-800/60 hover:bg-slate-800/50 transition ${
                        thread.id === selectedThreadId ? 'bg-slate-800/60' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-bold text-slate-100 truncate">
                          {thread.user_id ? `User ${thread.user_id.slice(0, 6)}...` : thread.guest_email || 'Guest'}
                        </div>
                        {isThreadUnread(thread) && <span className="w-2 h-2 rounded-full bg-emerald-400" aria-label="Unread"></span>}
                        <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase tracking-widest ${statusBadge(thread)}`}>
                          {thread.status}
                        const displayMessage = (msg: SupportMessage) => {
                          if (msg.author_type === 'visitor' && msg.content_en) {
                            return msg.content_en;
                          }
                          return msg.content_original;
                        };
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 truncate">
                        Mode: {thread.mode === 'human' ? 'Human' : 'AI assist'} | Lang: {thread.language || 'unknown'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Updated {thread.last_message_at ? new Date(thread.last_message_at).toLocaleString() : 'n/a'}
                      </div>
                    </button>
                  ))}
                  {!isLoadingThreads && threads.length === 0 && (
                    <div className="p-4 text-sm text-slate-400">No support threads yet.</div>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-slate-950/80">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="text-sm font-bold text-slate-100">{selectedThread ? selectedThread.guest_email || selectedThread.user_id || 'Guest' : 'No thread selected'}</div>
                    {selectedThread && (
                      <div className="text-xs text-slate-400">Thread ID: {selectedThread.id}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAssignToMe}
                      disabled={!selectedThread || selectedThread.assigned_admin_id === user.id}
                      className="px-3 py-2 text-xs font-bold rounded-lg bg-amber-500/10 text-amber-200 border border-amber-500/30 hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      Take ownership
                    </button>
                    <button
                      onClick={handleCloseThread}
                      disabled={!selectedThread}
                      className="px-3 py-2 text-xs font-bold rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 disabled:opacity-50"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div ref={messageListRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ scrollbarWidth: 'thin' }}>
                  {isLoadingMessages && (
                    <div className="text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading conversation...</div>
                  )}
                  {!selectedThread && <div className="text-sm text-slate-500">Select a thread to reply.</div>}
                  {selectedThread && messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        msg.author_type === 'admin' ? 'ml-auto bg-indigo-600 text-white' : msg.author_type === 'ai' ? 'ml-auto bg-emerald-700 text-white' : 'bg-slate-800 text-slate-100'
                      }`}
                    >
                      <div className="text-[11px] uppercase tracking-widest font-black opacity-70 mb-1">
                        {msg.author_type}
                      </div>
                      <div>{msg.content_original}</div>
                      <div className="text-[10px] text-white/70 mt-1">{msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ''}</div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-800 p-3 bg-slate-900/80">
                  <div className="flex items-center gap-2">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={selectedThread ? 'Reply to user...' : 'Select a thread to start replying'}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[52px]"
                      disabled={!selectedThread || isSending}
                      rows={2}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!selectedThread || !input.trim() || isSending}
                      className="h-[52px] px-4 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsOpen(v => !v)}
          className="relative flex items-center gap-2 px-4 py-3 rounded-full bg-indigo-600 text-white font-bold shadow-xl hover:bg-indigo-500"
        >
          <MessageCircle className="w-5 h-5" />
          Support Inbox
          {unreadCount > 0 && (
            <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500 text-slate-900 font-black">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default AdminSupportDock;
