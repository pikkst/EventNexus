
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, User, Loader2, Minus, Maximize2, Database, Image, TrendingUp, Calendar, Zap, FileText } from 'lucide-react';
import { createNexusChat } from '../services/geminiService';
import { GenerateContentResponse } from '@google/genai';
import { User as UserType, EventNexusEvent } from '../types';
import { getEvents, getOrganizerEvents } from '../services/dbService';
import { generateAdImage, generateAdCampaign } from '../services/geminiService';

interface Message {
  role: 'user' | 'model';
  text: string;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  name: string;
  status: 'running' | 'complete' | 'error';
  result?: any;
}

interface EnterpriseSuccessManagerProps {
  user: UserType;
  isOpen: boolean;
  onClose: () => void;
}

const EnterpriseSuccessManager: React.FC<EnterpriseSuccessManagerProps> = ({ user, isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'model', 
      text: `Hello ${user.name}! 👋 I'm your dedicated Enterprise Success Manager, powered by advanced AI.\n\nI have access to your complete EventNexus data and can help you with:\n\n🎯 **Event Creation** - Build and optimize events\n🎨 **Marketing Materials** - Generate flyers, ads, campaigns\n📊 **Analytics & Insights** - Deep dive into your performance\n📈 **Growth Strategy** - Data-driven recommendations\n🔧 **Platform Tools** - Full access to all Enterprise features\n\nWhat would you like to accomplish today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !chatRef.current) {
      chatRef.current = createNexusChat();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const executeToolCall = async (toolName: string, params: any): Promise<any> => {
    try {
      switch (toolName) {
        case 'get_my_events':
          const myEvents = await getOrganizerEvents(user.id);
          return {
            success: true,
            data: myEvents,
            summary: `Found ${myEvents.length} events in your account`
          };

        case 'get_platform_events':
          const allEvents = await getEvents();
          return {
            success: true,
            data: allEvents,
            summary: `Retrieved ${allEvents.length} events from platform`
          };

        case 'generate_flyer':
          const flyerImage = await generateAdImage(params.prompt, '3:4');
          return {
            success: !!flyerImage,
            data: flyerImage,
            summary: flyerImage ? 'Flyer generated successfully' : 'Failed to generate flyer'
          };

        case 'generate_ad_campaign':
          const campaign = await generateAdCampaign(
            params.eventName,
            params.description,
            params.objective || 'awareness'
          );
          return {
            success: !!campaign,
            data: campaign,
            summary: campaign ? `Generated ${campaign.length} ad variations` : 'Failed to generate campaign'
          };

        case 'analyze_performance':
          const events = await getOrganizerEvents(user.id);
          const totalRevenue = events.reduce((sum, e) => sum + (e.price * e.attendeesCount), 0);
          const totalAttendees = events.reduce((sum, e) => sum + e.attendeesCount, 0);
          const avgTicketPrice = totalAttendees > 0 ? totalRevenue / totalAttendees : 0;
          
          return {
            success: true,
            data: {
              totalEvents: events.length,
              totalRevenue,
              totalAttendees,
              avgTicketPrice,
              events
            },
            summary: `Analyzed ${events.length} events with $${totalRevenue.toFixed(2)} total revenue`
          };

        default:
          return {
            success: false,
            error: `Unknown tool: ${toolName}`
          };
      }
    } catch (error) {
      console.error(`Tool execution error (${toolName}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      if (!chatRef.current) chatRef.current = createNexusChat();
      
      // Enhanced context for Enterprise Success Manager
      const contextualMessage = `User Info: ${user.name} (${user.email}), Tier: ${user.subscription_tier}, Role: ${user.role}.\n\nUser Request: ${userMsg}`;
      
      const result = await chatRef.current.sendMessageStream({ message: contextualMessage });
      
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      
      let fullText = '';
      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        const newPart = c.text || '';
        fullText += newPart;
        
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].text = fullText;
          return newMsgs;
        });
      }

      // Check if AI response mentions tool usage and execute
      if (fullText.toLowerCase().includes('analyzing your events') || 
          fullText.toLowerCase().includes('let me check')) {
        // Auto-execute relevant tools based on context
        await autoExecuteTools(userMsg, fullText);
      }

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: 'I apologize, but I encountered an error. As your dedicated success manager, I\'m here 24/7. Please try your request again or rephrase it.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const autoExecuteTools = async (userMessage: string, aiResponse: string) => {
    const lowerMsg = userMessage.toLowerCase();
    const toolCalls: ToolCall[] = [];

    // Detect intent and execute relevant tools
    if (lowerMsg.includes('my events') || lowerMsg.includes('my statistics') || lowerMsg.includes('performance')) {
      toolCalls.push({ name: 'analyze_performance', status: 'running' });
      const result = await executeToolCall('analyze_performance', {});
      toolCalls[toolCalls.length - 1].status = result.success ? 'complete' : 'error';
      toolCalls[toolCalls.length - 1].result = result;
      
      // Add follow-up message with data
      if (result.success) {
        setMessages(prev => [...prev, {
          role: 'model',
          text: `📊 **Performance Analysis Complete**\n\n` +
                `• Total Events: ${result.data.totalEvents}\n` +
                `• Total Revenue: $${result.data.totalRevenue.toFixed(2)}\n` +
                `• Total Attendees: ${result.data.totalAttendees}\n` +
                `• Avg Ticket Price: $${result.data.avgTicketPrice.toFixed(2)}\n\n` +
                `Would you like me to provide recommendations for improvement?`,
          toolCalls
        }]);
      }
    }

    if (lowerMsg.includes('generate') && (lowerMsg.includes('flyer') || lowerMsg.includes('poster'))) {
      toolCalls.push({ name: 'generate_flyer', status: 'running' });
      // Extract event details from message for prompt
      const result = await executeToolCall('generate_flyer', { 
        prompt: `Professional event flyer for ${user.name}'s event` 
      });
      toolCalls[toolCalls.length - 1].status = result.success ? 'complete' : 'error';
      toolCalls[toolCalls.length - 1].result = result;
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed bottom-6 right-6 z-[1500] w-[90vw] sm:w-[480px] flex flex-col transition-all duration-300 ${isMinimized ? 'h-16' : 'h-[700px] max-h-[85vh]'} bg-gradient-to-br from-slate-900 to-purple-900/20 border-2 border-purple-500/30 rounded-[32px] shadow-2xl shadow-purple-500/20 overflow-hidden animate-in slide-in-from-bottom-8 duration-500`}>
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-md border-b border-purple-500/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/40 relative">
            <Sparkles className="w-7 h-7 text-white" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
              Enterprise Success Manager
              <span className="text-[8px] font-black uppercase tracking-widest bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">AI</span>
            </h3>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">24/7 Available • Full Access</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-purple-500/20 rounded-xl text-purple-300 transition-colors">
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          </button>
          <button onClick={onClose} className="p-2 hover:bg-purple-500/20 rounded-xl text-purple-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Quick Actions */}
          <div className="p-3 bg-slate-950/50 border-b border-purple-500/20 shrink-0">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              <QuickActionBtn 
                icon={<Database className="w-3 h-3" />} 
                label="My Stats" 
                onClick={() => setInput('Show me my event statistics and performance')}
              />
              <QuickActionBtn 
                icon={<Image className="w-3 h-3" />} 
                label="Generate Flyer" 
                onClick={() => setInput('Generate a professional flyer for my next event')}
              />
              <QuickActionBtn 
                icon={<TrendingUp className="w-3 h-3" />} 
                label="Growth Tips" 
                onClick={() => setInput('Give me personalized growth recommendations')}
              />
              <QuickActionBtn 
                icon={<Calendar className="w-3 h-3" />} 
                label="Create Event" 
                onClick={() => setInput('Help me create a new event step by step')}
              />
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.role === 'user' 
                  ? 'bg-slate-800' 
                  : 'bg-gradient-to-br from-purple-600 to-pink-600'
                }`}>
                  {msg.role === 'user' ? <User className="w-5 h-5 text-slate-400" /> : <Sparkles className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1 space-y-2">
                  <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed font-medium ${
                    msg.role === 'user' 
                    ? 'bg-purple-600 text-white rounded-tr-none ml-auto' 
                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-purple-500/20'
                  }`}>
                    <div className="whitespace-pre-wrap">
                      {msg.text || (isLoading && idx === messages.length - 1 ? <Loader2 className="w-4 h-4 animate-spin" /> : '')}
                    </div>
                  </div>
                  
                  {/* Tool Call Indicators */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="space-y-2 max-w-[85%]">
                      {msg.toolCalls.map((tool, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-slate-950/50 border border-purple-500/20 rounded-xl px-3 py-2">
                          <Zap className="w-3 h-3 text-purple-400" />
                          <span className="text-purple-300 font-medium">{tool.name.replace(/_/g, ' ')}</span>
                          {tool.status === 'running' && <Loader2 className="w-3 h-3 animate-spin text-purple-400" />}
                          {tool.status === 'complete' && <span className="text-emerald-400">✓</span>}
                          {tool.status === 'error' && <span className="text-red-400">✗</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 bg-slate-950/50 border-t border-purple-500/30 shrink-0">
            <div className="relative group">
              <input 
                type="text"
                placeholder="Ask your success manager anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="w-full bg-slate-900 border border-purple-500/30 rounded-2xl px-5 py-4 pr-16 text-sm text-white placeholder:text-slate-500 outline-none focus:border-purple-500 transition-all"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`absolute right-2 top-2 bottom-2 px-4 rounded-xl flex items-center justify-center transition-all ${
                  input.trim() 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30 active:scale-95' 
                  : 'bg-slate-800 text-slate-500'
                }`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Enterprise AI • Gemini 3.0 Flash</p>
              <div className="flex items-center gap-1 text-[9px] text-purple-400 font-bold">
                <FileText className="w-3 h-3" />
                <span>Database Access Active</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const QuickActionBtn: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-300 transition-all shrink-0 text-[10px] font-bold uppercase tracking-wider"
  >
    {icon}
    {label}
  </button>
);

export default EnterpriseSuccessManager;
