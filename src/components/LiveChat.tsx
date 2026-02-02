import React, { useState, useEffect, useRef } from 'react';
import { Send, Heart, ThumbsUp, Smile, Flame, Star, X, Pin, Flag } from 'lucide-react';
import { LiveChatMessage, ReactionType, User } from '@/types';

interface LiveChatProps {
  eventId: string;
  currentUser?: User;
  isOrganizer?: boolean;
  onSendMessage?: (message: string) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  onPinMessage?: (messageId: string) => Promise<void>;
  className?: string;
}

const REACTIONS: { type: ReactionType; icon: typeof Heart; label: string; color: string }[] = [
  { type: 'heart', icon: Heart, label: 'Love', color: 'text-red-500' },
  { type: 'like', icon: ThumbsUp, label: 'Like', color: 'text-blue-500' },
  { type: 'clap', icon: Star, label: 'Clap', color: 'text-yellow-500' },
  { type: 'fire', icon: Flame, label: 'Fire', color: 'text-orange-500' },
  { type: 'wow', icon: Smile, label: 'Wow', color: 'text-purple-500' },
  { type: 'laugh', icon: Smile, label: 'Laugh', color: 'text-green-500' },
];

/**
 * Live Chat Component
 * 
 * Real-time chat interface for live streaming events
 * 
 * Features:
 * - Real-time message updates
 * - Emoji reactions
 * - Message pinning (organizer only)
 * - Message moderation (organizer only)
 * - User avatars and names
 * - Auto-scroll to latest message
 * - Message timestamps
 */
export default function LiveChat({
  eventId,
  currentUser,
  isOrganizer = false,
  onSendMessage,
  onDeleteMessage,
  onPinMessage,
  className = ''
}: LiveChatProps) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // TODO: Set up real-time subscription to chat messages
  useEffect(() => {
    // This would use Supabase real-time subscriptions
    // supabase
    //   .channel(`live_chat:${eventId}`)
    //   .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_chat_messages' }, payload => {
    //     setMessages(prev => [...prev, payload.new as LiveChatMessage]);
    //   })
    //   .subscribe();

    // Mock data for development
    const mockMessages: LiveChatMessage[] = [
      {
        id: '1',
        event_id: eventId,
        user_id: 'user1',
        message: 'Excited for this stream! 🎉',
        message_type: 'text',
        is_pinned: false,
        is_deleted: false,
        is_highlighted: false,
        user_name: 'John Doe',
        user_avatar: '',
        created_at: new Date(Date.now() - 120000).toISOString(),
      },
      {
        id: '2',
        event_id: eventId,
        user_id: 'user2',
        message: 'Great content as always!',
        message_type: 'text',
        is_pinned: false,
        is_deleted: false,
        is_highlighted: false,
        user_name: 'Jane Smith',
        user_avatar: '',
        created_at: new Date(Date.now() - 60000).toISOString(),
      },
    ];
    
    setMessages(mockMessages);
  }, [eventId]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending || !currentUser) return;

    setIsSending(true);
    try {
      await onSendMessage?.(inputMessage.trim());
      
      // Optimistically add message to UI
      const newMessage: LiveChatMessage = {
        id: `temp_${Date.now()}`,
        event_id: eventId,
        user_id: currentUser.id,
        message: inputMessage.trim(),
        message_type: 'text',
        is_pinned: false,
        is_deleted: false,
        is_highlighted: false,
        user_name: currentUser.name,
        user_avatar: currentUser.avatar,
        created_at: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, newMessage]);
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReaction = (type: ReactionType) => {
    // TODO: Send reaction to database
    console.log('Reaction:', type);
    setShowReactions(false);
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className={`flex flex-col bg-slate-900 rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800 border-b border-slate-700">
        <h3 className="font-bold text-white flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live Chat
          <span className="text-sm font-normal text-slate-400 ml-auto">
            {messages.length} messages
          </span>
        </h3>
      </div>

      {/* Messages Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[400px] max-h-[600px]"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.is_pinned ? 'bg-indigo-500/10 -mx-4 px-4 py-2 border-l-2 border-indigo-500' : ''}`}
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              {message.user_avatar ? (
                <img
                  src={message.user_avatar}
                  alt={message.user_name || 'User'}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                  {(message.user_name || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>

            {/* Message Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-white text-sm">
                  {message.user_name || 'Anonymous'}
                </span>
                <span className="text-xs text-slate-500">
                  {formatTimestamp(message.created_at)}
                </span>
                {message.is_pinned && (
                  <Pin className="w-3 h-3 text-indigo-400" />
                )}
              </div>
              
              <p className="text-slate-300 text-sm break-words">
                {message.message}
              </p>

              {/* Moderation Actions (Organizer Only) */}
              {isOrganizer && (
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => onPinMessage?.(message.id)}
                    className="text-xs text-slate-400 hover:text-indigo-400 transition-colors"
                  >
                    {message.is_pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    onClick={() => onDeleteMessage?.(message.id)}
                    className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Reactions Bar */}
      <div className="px-4 py-2 bg-slate-800 border-t border-slate-700">
        <div className="flex items-center gap-2 overflow-x-auto">
          {REACTIONS.map((reaction) => (
            <button
              key={reaction.type}
              onClick={() => handleReaction(reaction.type)}
              className={`flex-shrink-0 p-2 rounded-lg hover:bg-slate-700 transition-colors group`}
              title={reaction.label}
            >
              <reaction.icon className={`w-5 h-5 ${reaction.color} group-hover:scale-110 transition-transform`} />
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        {currentUser ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={isSending}
              className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isSending}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-slate-400 text-sm">
              Sign in to join the conversation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
