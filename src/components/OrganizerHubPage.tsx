import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  TrendingUp, BarChart3, Users, Globe, Zap, Shield, Clock, 
  DollarSign, Smartphone, BookOpen, CheckCircle, ArrowRight 
} from 'lucide-react';
import { User } from '../types';

/**
 * OrganizerHubPage - B2B Landing Page for Event Organizers
 * Targets keywords: "sell tickets", "event management", "ticketing platform"
 * SEO-optimized for organizers looking for tools to host events
 */

interface OrganizerHubProps {
  user?: User;
  onOpenAuth?: () => void;
}

const OrganizerHubPage: React.FC<OrganizerHubProps> = ({ user, onOpenAuth }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // SEO meta tags optimized for B2B organizers
    document.title = 'Organizer Hub | EventNexus.eu - Sell Tickets & Manage Events';
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', 
      'EventNexus.eu Organizer Hub: Create and manage events, sell tickets, and reach audiences across Europe. AI-powered event discovery platform for organizers.'
    );

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', 'https://eventnexus.eu/host');

    // Update OG tags for sharing
    const updateMetaProperty = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateMetaProperty('og:title', 'Organizer Hub - EventNexus.eu');
    updateMetaProperty('og:description', 'Create events, sell tickets, and manage bookings all in one place.');
    updateMetaProperty('og:type', 'website');
  }, []);

  const cta = () => {
    if (user) {
      navigate('/create');
    } else {
      onOpenAuth?.();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Hero Section */}
      <div className="pt-24 px-4 pb-12 bg-gradient-to-b from-indigo-600/20 to-transparent">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-block px-4 py-2 bg-indigo-500/20 rounded-full border border-indigo-500/50 mb-6">
            <span className="text-sm font-semibold text-indigo-400">For Event Organizers</span>
          </div>

          <h1 className="text-6xl font-black text-white mb-6 leading-tight">
            Host Events the Smart Way
          </h1>

          <p className="text-2xl text-slate-300 mb-8 max-w-3xl mx-auto">
            Create, promote, and sell tickets to events across Europe. Reach audiences in 17 languages with AI-powered discovery.
          </p>

          <button 
            onClick={cta}
            className="inline-block px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-lg transition-all shadow-lg hover:shadow-indigo-500/50 active:scale-95"
          >
            {user ? 'Create Event' : 'Get Started Free'}
            <ArrowRight className="inline-block ml-2 w-5 h-5" />
          </button>

          <p className="text-sm text-slate-400 mt-4">No credit card required • Free for first event</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16 space-y-20">
        {/* Key Features Section */}
        <section>
          <h2 className="text-4xl font-bold text-white mb-12 text-center">
            Everything You Need to Host Events
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Globe,
                title: 'AI-Powered Discovery',
                description: 'Your events reach audiences across Europe. Gemini 3.0 automatically translates your event into 17 languages.',
                color: 'from-indigo-600/20 to-indigo-600/5'
              },
              {
                icon: DollarSign,
                title: 'Transparent Pricing',
                description: 'Competitive fees with no hidden charges. Keep more of your revenue. Only pay when you sell.',
                color: 'from-green-600/20 to-green-600/5'
              },
              {
                icon: Users,
                title: 'Audience Management',
                description: 'Detailed attendee lists, check-in tools, and real-time attendance tracking.',
                color: 'from-blue-600/20 to-blue-600/5'
              },
              {
                icon: Zap,
                title: 'Easy Ticket Sales',
                description: 'Sell tickets in minutes. Support multiple price tiers, discount codes, and waitlists.',
                color: 'from-yellow-600/20 to-yellow-600/5'
              },
              {
                icon: Smartphone,
                title: 'Mobile Optimized',
                description: 'Your event page looks perfect on all devices. Mobile attendees can buy tickets instantly.',
                color: 'from-purple-600/20 to-purple-600/5'
              },
              {
                icon: Analytics,
                title: 'Real-Time Analytics',
                description: 'Track sales, attendee demographics, and promotional performance in real-time.',
                color: 'from-pink-600/20 to-pink-600/5'
              }
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={idx}
                  className={`bg-gradient-to-br ${feature.color} backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 hover:border-slate-600/50 transition-all`}
                >
                  <Icon className="w-12 h-12 text-indigo-400 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-300 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-slate-800/50 backdrop-blur-sm rounded-3xl p-12 border border-slate-700/50">
          <h2 className="text-4xl font-bold text-white mb-12 text-center">How It Works</h2>

          <div className="space-y-8">
            {[
              {
                step: '1',
                title: 'Create Your Event',
                description: 'Add event details, set ticket prices, and configure venue information. Takes less than 5 minutes.',
              },
              {
                step: '2',
                title: 'Go Live',
                description: 'Publish your event. It automatically appears on EventNexus maps and gets translated into 17 languages.',
              },
              {
                step: '3',
                title: 'Sell Tickets',
                description: 'Start receiving ticket orders immediately. Attendees buy from your event page with secure checkout.',
              },
              {
                step: '4',
                title: 'Manage & Track',
                description: 'Check attendee lists, process check-ins with QR codes, and track real-time analytics.',
              },
              {
                step: '5',
                title: 'Get Paid',
                description: 'Payouts processed weekly to your bank account. No complicated withdrawal process.',
              }
            ].map((item, idx) => (
              <div key={idx} className="flex gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-600 text-white font-bold text-xl">
                    {item.step}
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-300 text-lg">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Case Studies / Trust Signals */}
        <section>
          <h2 className="text-4xl font-bold text-white mb-12 text-center">Success Stories</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                org: 'Tallinn Tech Conference',
                stats: '1,200+ attendees',
                testimonial: 'EventNexus helped us reach tech professionals across the Baltics. The AI translation feature was game-changing.',
                metric: '€18,500 revenue'
              },
              {
                org: 'Jazz Summer Festival',
                stats: '3,500+ attendees',
                testimonial: 'Simple to use, great mobile experience. Our attendees loved the seamless ticket purchase process.',
                metric: '€42,000 revenue'
              },
              {
                org: 'Local Workshop Series',
                stats: '450+ attendees',
                testimonial: 'Affordable option compared to other platforms. Customer support was incredibly helpful.',
                metric: '€8,900 revenue'
              }
            ].map((cs, idx) => (
              <div 
                key={idx}
                className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50"
              >
                <div className="flex items-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <span key={i} className="text-yellow-400">★</span>
                  ))}
                </div>
                <p className="text-slate-300 italic mb-6">"{cs.testimonial}"</p>
                <div className="border-t border-slate-700 pt-4">
                  <p className="font-bold text-white">{cs.org}</p>
                  <p className="text-indigo-400 font-semibold text-lg mb-2">{cs.metric}</p>
                  <p className="text-sm text-slate-400">{cs.stats}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison Table */}
        <section>
          <h2 className="text-4xl font-bold text-white mb-12 text-center">
            Why EventNexus vs. Eventbrite?
          </h2>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="px-6 py-4 text-left font-bold text-white">Feature</th>
                    <th className="px-6 py-4 text-left font-bold text-indigo-400">EventNexus</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-400">Eventbrite</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {[
                    { feature: 'Transaction Fee', nexus: '2% + €0.20', eventbrite: '3.5% + €0.99' },
                    { feature: 'AI Event Translation', nexus: 'Included', eventbrite: 'Not available' },
                    { feature: 'Geospatial Discovery', nexus: 'Automatic', eventbrite: 'Not available' },
                    { feature: 'QR Check-In', nexus: 'Free', eventbrite: 'Premium only' },
                    { feature: 'Payment Processing', nexus: 'Weekly', eventbrite: 'Bi-weekly' },
                    { feature: 'Setup Complexity', nexus: 'Very Simple', eventbrite: 'Complex' },
                    { feature: 'EU Focus', nexus: 'Yes', eventbrite: 'Global only' },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-white">{row.feature}</td>
                      <td className="px-6 py-4 text-indigo-400 font-bold">{row.nexus}</td>
                      <td className="px-6 py-4 text-slate-400">{row.eventbrite}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-12 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Host Your Event?</h2>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
            Join hundreds of event organizers using EventNexus to sell more tickets and reach larger audiences.
          </p>
          <button 
            onClick={cta}
            className="inline-block px-8 py-4 bg-white hover:bg-slate-100 text-indigo-600 font-bold text-lg rounded-lg transition-all active:scale-95"
          >
            Start Creating Events
            <ArrowRight className="inline-block ml-2 w-5 h-5" />
          </button>
        </section>

        {/* FAQ Section for SEO */}
        <section>
          <h2 className="text-4xl font-bold text-white mb-12 text-center">Frequently Asked Questions</h2>

          <div className="space-y-6">
            {[
              {
                q: 'How much does it cost to host an event?',
                a: 'EventNexus is free to use. We only charge a small transaction fee (2% + €0.20) when you sell tickets. There are no setup fees or monthly charges.'
              },
              {
                q: 'Do I need to promote my event?',
                a: 'No. Your event automatically appears on EventNexus maps and reaches audiences across Europe. Our AI system handles translation and discovery optimization.'
              },
              {
                q: 'When do I get paid?',
                a: 'Payouts are processed weekly to your bank account. You can view your earnings in real-time on your organizer dashboard.'
              },
              {
                q: 'Can I sell different ticket types?',
                a: 'Yes. Create unlimited ticket tiers, early-bird pricing, group discounts, and more. Our system handles all variations automatically.'
              },
              {
                q: 'What payment methods do you support?',
                a: 'We support all major credit cards, bank transfers, and digital wallets through our integrated payment processor.'
              }
            ].map((faq, idx) => (
              <div 
                key={idx}
                className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50"
              >
                <h3 className="text-lg font-bold text-white mb-3">{faq.q}</h3>
                <p className="text-slate-300">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

// Add Analytics icon that was missing
const Analytics = ({ className }: { className?: string }) => (
  <BarChart3 className={className} />
);

export default OrganizerHubPage;
