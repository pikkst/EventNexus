
import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, BookOpen, MessageSquare, ShieldCheck, Zap, Users, CreditCard, Mail } from 'lucide-react';
import ChatBot from './ChatBot';

const HelpCenter: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const categories = [
    { icon: <Users />, name: 'Attendee Support', description: 'Finding events, buying tickets, and account help.' },
    { icon: <Zap />, name: 'Organizer Hub', description: 'Creating events, managing sales, and promotion.' },
    { icon: <CreditCard />, name: 'Billing & Payouts', description: 'Fees, refunds, and revenue management.' },
    { icon: <ShieldCheck />, name: 'Trust & Safety', description: 'Privacy, security, and verification.' }
  ];

  const faqs = [
    {
      q: "How do I get my ticket after purchase?",
      a: "Once your payment is confirmed, your digital ticket with a unique QR code is instantly available in your 'My Tickets' section within your user profile. You will also receive a confirmation email with a link to your ticket."
    },
    {
      q: "What is the refund policy for events?",
      a: "Refund policies are set by individual organizers. Generally, you can request a full refund up to 24 hours before the event starts. Check the event detail page for specific terms."
    },
    {
      q: "How do I create a private, invite-only event?",
      a: "During the event creation flow (Step 3), select 'Private / Invite Only'. This will hide your event from the map. You can then share a secret link or access code with your guests."
    },
    {
      q: "How does the AI translation work?",
      a: "EventNexus uses Gemini AI to automatically translate your event name and description into over 12 languages. This happens automatically when you publish, ensuring global reach without extra work."
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-20 space-y-20 animate-in fade-in duration-700">
      {/* Hero Section */}
      <div className="text-center space-y-8">
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white">How can we <span className="text-indigo-500">help?</span></h1>
        <div className="max-w-2xl mx-auto relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Search for articles, guides, or solutions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-[32px] pl-16 pr-8 py-6 text-white outline-none focus:border-indigo-500 transition-all shadow-2xl"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((cat, i) => (
          <div key={i} className="bg-slate-900/50 border border-slate-800 p-8 rounded-[40px] hover:border-indigo-500/50 transition-all group cursor-pointer">
            <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-500 mb-6 group-hover:scale-110 transition-transform">
              {cat.icon}
            </div>
            <h3 className="font-bold text-lg mb-2 text-white">{cat.name}</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">{cat.description}</p>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="space-y-8">
        <h2 className="text-3xl font-black tracking-tighter text-white text-center">Frequently Asked Questions</h2>
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-[32px] overflow-hidden">
              <button 
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full px-8 py-6 flex justify-between items-center text-left hover:bg-slate-800/30 transition-colors"
              >
                <span className="font-bold text-slate-200">{faq.q}</span>
                {openFaq === i ? <ChevronUp className="w-5 h-5 text-indigo-400" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
              </button>
              {openFaq === i && (
                <div className="px-8 pb-6 text-slate-400 text-sm leading-relaxed font-medium animate-in slide-in-from-top-2 duration-300">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-indigo-600 rounded-[48px] p-12 text-center space-y-6 relative overflow-hidden shadow-2xl shadow-indigo-600/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <h2 className="text-3xl font-black text-white">Still need help?</h2>
        <p className="text-indigo-100 max-w-lg mx-auto font-medium">Our global support team is available 24/7 to help you with any issues or questions about the platform.</p>
        <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => setIsChatOpen(true)}
            className="bg-white text-indigo-600 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <MessageSquare className="w-4 h-4" /> Live AI Chat
          </button>
          <a 
            href="mailto:support@mail.eventnexus.eu"
            className="bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-800 transition-all"
          >
            <Mail className="w-4 h-4" /> Email Support
          </a>
        </div>
      </div>

      {/* AI ChatBot Overlay */}
      <ChatBot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};

export default HelpCenter;
