import React from 'react';
import { Heart, Users, Zap, CheckCircle, ArrowRight } from 'lucide-react';

const BetaInvitation: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white pt-20 pb-12">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
        <div className="inline-block mb-6 px-4 py-2 bg-indigo-500/20 border border-indigo-500/50 rounded-full">
          <span className="text-sm font-semibold text-indigo-300">🚀 Limited Beta Access</span>
        </div>
        
        <h1 className="text-5xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
          Be Part of the Revolution
        </h1>
        
        <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
          EventNexus is transforming how people discover and experience events. We're looking for passionate beta testers to shape the future of event discovery.
        </p>
        
        <button className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105">
          Join Our Beta Program <ArrowRight size={20} />
        </button>
      </div>

      {/* Features Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why Join EventNexus Beta?</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-8">
            <Zap className="w-12 h-12 text-yellow-400 mb-4" />
            <h3 className="text-xl font-bold mb-3">Lightning-Fast Discovery</h3>
            <p className="text-slate-300">
              Find events near you instantly with our advanced geospatial technology. Never miss an opportunity again.
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-8">
            <Users className="w-12 h-12 text-blue-400 mb-4" />
            <h3 className="text-xl font-bold mb-3">Community Driven</h3>
            <p className="text-slate-300">
              Connect with event organizers and attendees. Build your network while discovering amazing experiences.
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-8">
            <Heart className="w-12 h-12 text-red-400 mb-4" />
            <h3 className="text-xl font-bold mb-3">Your Feedback Matters</h3>
            <p className="text-slate-300">
              As a beta tester, your input directly shapes the platform. Your voice makes a real difference.
            </p>
          </div>
        </div>
      </div>

      {/* What's Included */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <h2 className="text-3xl font-bold text-center mb-12">What's Included in Beta</h2>
        
        <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-lg p-8 space-y-4">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-1">Early Access Features</h4>
              <p className="text-slate-300">Get exclusive access to new features before public launch</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-1">Direct Support Channel</h4>
              <p className="text-slate-300">Private support from our team with priority bug fixes</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-1">Lifetime Perks</h4>
              <p className="text-slate-300">Special badges and benefits as a founding member</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-1">Community Recognition</h4>
              <p className="text-slate-300">Featured on our beta testers page and social media</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-1">Exclusive Events</h4>
              <p className="text-slate-300">Access to private beta tester meetups and networking events</p>
            </div>
          </div>
        </div>
      </div>

      {/* How to Join */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <h2 className="text-3xl font-bold text-center mb-12">How to Join</h2>
        
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-full mb-4 font-bold text-lg">1</div>
            <h4 className="font-semibold mb-2">Sign Up</h4>
            <p className="text-sm text-slate-400">Create your EventNexus account</p>
          </div>

          <div className="flex items-center justify-center">
            <div className="hidden md:block w-8 h-0.5 bg-gradient-to-r from-slate-700 to-transparent"></div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-full mb-4 font-bold text-lg">2</div>
            <h4 className="font-semibold mb-2">Apply</h4>
            <p className="text-sm text-slate-400">Fill out the beta tester form</p>
          </div>

          <div className="flex items-center justify-center">
            <div className="hidden md:block w-8 h-0.5 bg-gradient-to-r from-slate-700 to-transparent"></div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-full mb-4 font-bold text-lg">3</div>
            <h4 className="font-semibold mb-2">Start Testing</h4>
            <p className="text-sm text-slate-400">Explore and share feedback</p>
          </div>

          <div className="flex items-center justify-center">
            <div className="hidden md:block w-8 h-0.5 bg-gradient-to-r from-slate-700 to-transparent"></div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-full mb-4 font-bold text-lg">4</div>
            <h4 className="font-semibold mb-2">Get Recognized</h4>
            <p className="text-sm text-slate-400">Join our community of founders</p>
          </div>
        </div>
      </div>

      {/* Requirements */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <h2 className="text-3xl font-bold text-center mb-12">What We're Looking For</h2>
        
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-8">
          <ul className="space-y-4 text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-indigo-400 font-bold">✓</span>
              <span>Event enthusiasts and frequent attendees</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-400 font-bold">✓</span>
              <span>Event organizers and promoters</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-400 font-bold">✓</span>
              <span>Tech-savvy individuals who love trying new platforms</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-400 font-bold">✓</span>
              <span>People passionate about community and networking</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-400 font-bold">✓</span>
              <span>Constructive feedback providers</span>
            </li>
          </ul>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-lg p-12">
          <h2 className="text-3xl font-bold mb-6">Ready to Shape the Future of Events?</h2>
          <p className="text-lg text-slate-300 mb-8">
            Limited beta slots available. Join now and be part of something special.
          </p>
          <a 
            href="https://www.eventnexus.eu/#/beta-signup"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-10 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105"
          >
            Apply for Beta Access <ArrowRight size={20} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default BetaInvitation;
