
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader2, Minus, Maximize2, Globe, UserCheck, Shield } from 'lucide-react';
import { detectUserLanguage } from '../services/languageService';
import { sendSupportMessage } from '../services/supportChatService';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

const ChatBot: React.FC<ChatBotProps> = ({ isOpen, onClose, user }) => {
  // Admins use Support Inbox, not ChatBot
  if (user?.role === 'admin') return null;
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hi! I\'m NexusAI. How can I help you discover or create amazing experiences today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [userLanguage, setUserLanguage] = useState('en');
  // Modes align with SupportMode schema: 'ai' or 'human'
  const [mode, setMode] = useState<'ai' | 'human'>('ai');
  const [adminEmail, setAdminEmail] = useState('');
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detect preferred language once when widget mounts
    const lang = detectUserLanguage(undefined, undefined, undefined);
    if (lang) setUserLanguage(lang);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const supportReply = await sendSupportMessage({
        threadId,
        message: userMsg,
        language: userLanguage,
        mode: mode,
        email: adminEmail || undefined
      });

      if (supportReply.threadId) {
        setThreadId(supportReply.threadId);
      }

      const replyText = supportReply.reply || supportReply.translatedReply || 
        (mode === 'human' ? 'Thanks! An admin has been notified and will reply soon.' : 'Sorry, I could not process your request.');
      
      setMessages(prev => [...prev, { role: 'model', text: replyText }]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = mode === 'human' 
        ? 'We could not reach an admin right now. Please email support@mail.eventnexus.eu.'
        : 'Sorry, I encountered an error. Please try again or email support@mail.eventnexus.eu.';
      setMessages(prev => [...prev, { role: 'model', text: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed bottom-6 right-6 z-[1500] w-[90vw] sm:w-[400px] flex flex-col transition-all duration-300 ${isMinimized ? 'h-16' : 'h-[600px] max-h-[80vh]'} bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500`}>
      {/* Header */}
      <div className="p-4 bg-slate-950/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 relative">
            <Bot className="w-6 h-6 text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight">NexusAI Support</h3>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Multilingual · AI-first</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors" aria-label={isMinimized ? "Maximize chat window" : "Minimize chat window"}>
            {isMinimized ? <Maximize2 className="w-4 h-4" aria-hidden="true" /> : <Minus className="w-4 h-4" aria-hidden="true" />}
          </button>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors" aria-label="Close chat assistant">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="px-6 pt-4 flex items-center gap-2 text-[10px] uppercase tracking-widest font-black text-slate-400">
            <button
              onClick={() => setMode('ai')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all ${
                mode === 'ai' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
              aria-label="Use NexusAI"
            >
              <Bot className="w-3 h-3" /> NexusAI
            </button>
            <button
              onClick={() => setMode('human')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all ${
                mode === 'human' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
              aria-label="Ask a live admin"
            >
              <UserCheck className="w-3 h-3" /> Ask Admin
            </button>
            <div className="flex items-center gap-2 text-slate-500">
              <Globe className="w-3 h-3" /> Answering in {userLanguage || 'auto'}
            </div>
          </div>

          {mode === 'human' && (
            <div className="px-6 pt-2 flex items-center gap-2 text-[11px] text-slate-400">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>Leave an email so the admin can follow up:</span>
              <input
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-slate-900/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-800' : 'bg-indigo-600'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-slate-400" /> : <Bot className="w-4 h-4 text-white" />}
                </div>
                <div className={`max-w-[80%] px-5 py-3 rounded-2xl text-sm leading-relaxed font-medium ${
                  msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50'
                }`}>
                  {msg.text || (isLoading && idx === messages.length - 1 ? <Loader2 className="w-4 h-4 animate-spin" /> : '')}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 bg-slate-950/50 border-t border-slate-800 shrink-0">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 px-1">
              <span>{mode === 'ai' ? 'Ask NexusAI anything about the platform' : 'Send a message to a live admin'}</span>
              <a className="text-indigo-400 hover:text-indigo-300" href="mailto:support@mail.eventnexus.eu">Email support</a>
            </div>
            <div className="relative group">
              <input 
                type="text"
                placeholder={mode === 'ai' ? 'Ask NexusAI anything...' : 'Type your message for an admin...'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 pr-16 text-sm text-white outline-none focus:border-indigo-500 transition-all"
                aria-label="Chat message input"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`absolute right-2 top-2 bottom-2 px-4 rounded-xl flex items-center justify-center transition-all ${
                  input.trim() ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 active:scale-95' : 'bg-slate-800 text-slate-500'
                }`}
                aria-label={isLoading ? "Sending message" : "Send message"}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
            <p className="text-[9px] text-center text-slate-600 font-bold uppercase tracking-widest mt-3">Nexus backbone secured by Gemini v3</p>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatBot;
