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
                description: 'Start free with 100 welcome credits. Upgrade to Pro (€19.99/mo) for unlimited creation. 0% platform fees on ticket sales.',
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

        {/* Pricing Tiers Overview */}
        <section>
          <h2 className="text-4xl font-bold text-white mb-12 text-center">Choose Your Plan</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
                <div className="text-4xl font-black text-indigo-400 mb-2">€0<span className="text-lg text-slate-400">/mo</span></div>
                <p className="text-slate-300">Perfect for exploring and trying out</p>
              </div>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>100 welcome credits (€50 value)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Browse and attend events</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Create events with credits</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-indigo-600/30 to-purple-600/30 backdrop-blur-sm rounded-2xl p-8 border-2 border-indigo-500/50 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-500 rounded-full text-white text-sm font-bold">
                Most Popular
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
                <div className="text-4xl font-black text-indigo-400 mb-2">€19.99<span className="text-lg text-slate-400">/mo</span></div>
                <p className="text-slate-300">For creators and promoters</p>
              </div>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Create up to 20 events/month</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>AI-powered translations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>0% platform fee on tickets</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Analytics dashboard</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Premium</h3>
                <div className="text-4xl font-black text-indigo-400 mb-2">€49.99<span className="text-lg text-slate-400">/mo</span></div>
                <p className="text-slate-300">For professional agencies</p>
              </div>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Create up to 100 events/month</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>0% platform fee on tickets</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Featured map placement</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Custom branded tickets</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link to="/pricing" className="text-indigo-400 hover:text-indigo-300 font-semibold">
              View full pricing details →
            </Link>
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
                    { feature: 'Starting Price', nexus: 'Free + Credits', eventbrite: 'Free' },
                    { feature: 'Platform Fee (Pro)', nexus: '0%', eventbrite: '3.5% + €0.99' },
                    { feature: 'Platform Fee (Premium)', nexus: '0%', eventbrite: '3.5% + €0.99' },
                    { feature: 'AI Event Translation', nexus: '17 Languages', eventbrite: 'Not available' },
                    { feature: 'Geospatial Discovery', nexus: 'Map-First Interface', eventbrite: 'List Only' },
                    { feature: 'QR Check-In', nexus: 'All Plans', eventbrite: 'Premium only' },
                    { feature: 'Setup Time', nexus: '< 5 minutes', eventbrite: '15+ minutes' },
                    { feature: 'EU Focus', nexus: 'Optimized', eventbrite: 'Global' },
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
                a: 'Start free with 100 welcome credits. Pro plan is €19.99/mo, Premium is €49.99/mo, and Enterprise is €149.99/mo. All plans have 0% platform fee on ticket sales — you keep 100% of your revenue (only Stripe processing fees apply).'
              },
              {
                q: 'What are platform fees?',
                a: 'EventNexus charges 0% platform fees on ticket sales — you keep 100% of your ticket revenue. Only standard Stripe payment processing fees (2.9% + €0.25) apply. Platform revenue comes from monthly subscription plans.'
              },
              {
                q: 'Do I need to promote my event?',
                a: 'Your event automatically appears on EventNexus maps and gets translated into 17 languages. However, promotion through your own channels will boost attendance.'
              },
              {
                q: 'Can I sell different ticket types?',
                a: 'Yes. All plans support multiple ticket tiers, early-bird pricing, group discounts, and custom pricing structures.'
              },
              {
                q: 'What payment methods do you support?',
                a: 'We support all major credit cards and bank transfers through our integrated Stripe payment processor.'
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
