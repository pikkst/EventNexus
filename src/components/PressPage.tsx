import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Lightbulb, TrendingUp, Globe, Brain } from 'lucide-react';

/**
 * Press & Blog Section - Content Authority Builder
 * Implements recommendation: "Create a dedicated 'Press' or 'Blog' section to document 
 * the 'AI & Events' journey, leveraging the founder's story to build backlinks and authority"
 */

const PressPage: React.FC = () => {
  React.useEffect(() => {
    // Update meta tags for SEO
    document.title = 'Press & Media | EventNexus.eu - AI-Powered Event Discovery';
    
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Press releases, founder story, and media resources for EventNexus.eu - Europe\'s first AI-powered event platform using Gemini 3.0.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 pt-24 px-4 pb-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">Press & Media</h1>
          <p className="text-xl text-slate-300">
            The story behind Europe's first AI-powered event discovery platform
          </p>
        </div>

        {/* Founder Story */}
        <section className="mb-16 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-6">
            <Brain className="w-8 h-8 text-indigo-400" />
            <h2 className="text-3xl font-bold text-white">The Founder's Vision</h2>
          </div>
          
          <div className="space-y-4 text-slate-300 text-lg leading-relaxed">
            <p>
              Founded in October 2025 by <strong className="text-white">Villu Künnap</strong>, 
              EventNexus.eu was born from a simple observation: language barriers were preventing 
              people from discovering amazing local experiences right in their own cities.
            </p>
            
            <p>
              "I noticed tourists and expats in Tallinn constantly asking 'What's happening this weekend?' 
              while incredible Estonian events were happening all around them," explains Villu. 
              "The problem wasn't a lack of events—it was a lack of accessible information in their language."
            </p>
            
            <p>
              Rather than building yet another ticketing platform, Villu envisioned something revolutionary: 
              an AI-native event discovery system that could break down language barriers in real-time. 
              By integrating <strong className="text-indigo-400">Google's Gemini 3.0</strong>, EventNexus 
              became the first platform to offer seamless multilingual event discovery across 17 languages.
            </p>
          </div>
        </section>

        {/* Key Milestones */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="w-8 h-8 text-indigo-400" />
            <h2 className="text-3xl font-bold text-white">Milestones</h2>
          </div>
          
          <div className="space-y-6">
            {[
              { date: 'October 2025', title: 'Platform Launch', description: 'EventNexus.eu goes live with Gemini 3.0 integration' },
              { date: 'December 2025', title: 'First 1,000 Events', description: 'Platform reaches milestone of 1,000+ listed events across Europe' },
              { date: 'January 2026', title: 'AI Event Pack Integration', description: 'Implemented comprehensive Schema.org markup for Google Event Pack visibility' },
              { date: 'January 2026', title: 'SEO Optimization', description: 'Major technical SEO improvements for search engine discoverability' }
            ].map((milestone, idx) => (
              <div key={idx} className="flex gap-6 items-start bg-slate-800/30 p-6 rounded-xl border border-slate-700/30">
                <div className="flex-shrink-0">
                  <Calendar className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <div className="text-sm font-bold text-indigo-400 mb-1">{milestone.date}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{milestone.title}</h3>
                  <p className="text-slate-300">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Technology Innovation */}
        <section className="mb-16 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 backdrop-blur-sm rounded-2xl p-8 border border-indigo-500/30">
          <div className="flex items-center gap-3 mb-6">
            <Lightbulb className="w-8 h-8 text-yellow-400" />
            <h2 className="text-3xl font-bold text-white">Technology Innovation</h2>
          </div>
          
          <div className="space-y-4 text-slate-300 text-lg leading-relaxed">
            <p>
              EventNexus is built on a cutting-edge technology stack that prioritizes AI-first design:
            </p>
            
            <ul className="space-y-3 list-none pl-0">
              <li className="flex items-start gap-3">
                <span className="text-indigo-400 font-bold">•</span>
                <span><strong className="text-white">Gemini 3.0 Integration:</strong> Real-time translation across 17 languages with context-aware descriptions</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-400 font-bold">•</span>
                <span><strong className="text-white">Geospatial Discovery:</strong> PostGIS-powered location-based event recommendations</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-400 font-bold">•</span>
                <span><strong className="text-white">AI-Generated Marketing:</strong> Automated campaign creation and social media content</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-400 font-bold">•</span>
                <span><strong className="text-white">Schema.org Compliance:</strong> Comprehensive structured data for AI search engines</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Press Kit */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <Globe className="w-8 h-8 text-indigo-400" />
            <h2 className="text-3xl font-bold text-white">Press Kit</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-xl font-bold text-white mb-3">Brand Assets</h3>
              <ul className="space-y-2 text-slate-300">
                <li>• Logo (SVG, PNG)</li>
                <li>• Brand Guidelines</li>
                <li>• Screenshots</li>
                <li>• Product Images</li>
              </ul>
              <a 
                href="/logo-optimized.svg" 
                download 
                className="inline-block mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-semibold"
              >
                Download Logo
              </a>
            </div>
            
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-xl font-bold text-white mb-3">Media Contact</h3>
              <div className="space-y-3 text-slate-300">
                <p>
                  <strong className="text-white">Email:</strong><br />
                  <a href="mailto:huntersest@gmail.com" className="text-indigo-400 hover:underline">
                    huntersest@gmail.com
                  </a>
                </p>
                <p>
                  <strong className="text-white">Website:</strong><br />
                  <a href="https://www.eventnexus.eu" className="text-indigo-400 hover:underline">
                    www.eventnexus.eu
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Blog Link */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Read Our Blog</h2>
            <p className="text-white/90 mb-6">
              Explore insights on AI, events, and the future of discovery
            </p>
            <Link 
              to="/blog"
              className="inline-block px-8 py-3 bg-white hover:bg-slate-100 text-indigo-600 font-bold rounded-lg transition-colors"
            >
              Visit Blog
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PressPage;
