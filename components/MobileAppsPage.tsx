import React, { useState } from 'react';
import { 
  Smartphone, 
  Download, 
  QrCode, 
  Zap, 
  Shield, 
  Clock,
  CheckCircle,
  Apple,
  PlayCircle,
  Camera,
  TrendingUp,
  Users,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Mobile Apps Landing Page
 * Showcase and download page for EventNexus Scanner mobile apps
 */
const MobileAppsPage: React.FC = () => {
  const [platform, setPlatform] = useState<'ios' | 'android'>('android');
  const [selectedApp, setSelectedApp] = useState<'scanner' | 'livemap'>('scanner');

  const features = {
    scanner: [
      {
        icon: <QrCode className="w-6 h-6" />,
        title: 'Instant QR Scanning',
        description: 'Fast and accurate QR code detection with camera integration'
      },
      {
        icon: <Zap className="w-6 h-6" />,
        title: 'Real-time Validation',
        description: 'Validate tickets instantly with live backend connection'
      },
      {
        icon: <Shield className="w-6 h-6" />,
        title: 'Secure Authentication',
        description: 'Scanner codes ensure only authorized staff can scan tickets'
      },
      {
        icon: <Clock className="w-6 h-6" />,
        title: 'Session Tracking',
        description: 'Monitor scan counts and session duration in real-time'
      },
      {
        icon: <Camera className="w-6 h-6" />,
        title: 'Optimized Camera',
        description: 'Works in low light and detects codes instantly'
      },
      {
        icon: <TrendingUp className="w-6 h-6" />,
        title: 'Live Statistics',
        description: 'See how many tickets have been scanned at any moment'
      }
    ],
    livemap: [
      {
        icon: <QrCode className="w-6 h-6" />,
        title: 'Interactive Map',
        description: 'Discover events on an interactive map with custom markers'
      },
      {
        icon: <Zap className="w-6 h-6" />,
        title: 'Location-Based Search',
        description: 'Find events within customizable radius (1-200km)'
      },
      {
        icon: <Shield className="w-6 h-6" />,
        title: 'Secure Tickets',
        description: 'Manage your tickets with QR codes for entry'
      },
      {
        icon: <Clock className="w-6 h-6" />,
        title: 'Real-time Updates',
        description: 'Get instant updates on event availability'
      },
      {
        icon: <Camera className="w-6 h-6" />,
        title: 'Category Filtering',
        description: 'Filter events by music, sports, arts, and more'
      },
      {
        icon: <TrendingUp className="w-6 h-6" />,
        title: 'In-App Purchase',
        description: 'Buy tickets directly in the app with secure authentication'
      }
    ]
  };

  const screenshots = [
    {
      title: 'Login Screen',
      description: 'Enter your scanner code',
      image: '/assets/screenshots/scanner-login.png'
    },
    {
      title: 'Scanner View',
      description: 'Scan tickets with camera',
      image: '/assets/screenshots/scanner-view.png'
    },
    {
      title: 'Validation Result',
      description: 'Instant ticket validation',
      image: '/assets/screenshots/scanner-result.png'
    }
  ];

  const handleDownload = (platform: 'ios' | 'android') => {
    if (platform === 'android') {
      // Direct APK download
          const appName = selectedApp === 'scanner' ? 'EventNexusScanner' : 'EventNexusLiveMap';
          window.location.href = `/downloads/${appName}.apk`;
    } else {
      // Link to TestFlight or App Store
          const appTitle = selectedApp === 'scanner' ? 'Scanner' : 'Live Map';
          alert(`🍎 iOS ${appTitle} App\n\nThe iOS version is coming soon!\n\nContact us at huntersest@gmail.com for TestFlight beta access.`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-4 pt-20 pb-16">
                    {/* App Switcher */}
                    <div className="flex justify-center mb-8">
                      <div className="inline-flex bg-slate-900/40 border border-slate-800 rounded-2xl p-2">
                        <button
                          onClick={() => setSelectedApp('scanner')}
                          className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                            selectedApp === 'scanner'
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <QrCode className="w-5 h-5 inline-block mr-2" />
                          Scanner App
                        </button>
                        <button
                          onClick={() => setSelectedApp('livemap')}
                          className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                            selectedApp === 'livemap'
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Smartphone className="w-5 h-5 inline-block mr-2" />
                          Live Map App
                        </button>
                      </div>
                    </div>

          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full mb-6">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-indigo-300 font-semibold">
                {selectedApp === 'scanner' ? 'Mobile Scanner Apps' : 'Mobile Event Discovery'}
              </span>
            </div>
            
            {selectedApp === 'scanner' ? (
              <>
                <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
                  EventNexus Scanner
                </h1>
                
                <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
                  Professional ticket scanning app for event entrances. Fast, secure, and easy to use.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
                  EventNexus Live Map
                </h1>
                
                <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
                  Discover events near you, purchase tickets, and manage your event experience.
                </p>
              </>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <button
                onClick={() => handleDownload('android')}
                className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/20 transition-all group"
              >
                <PlayCircle className="w-6 h-6" />
                Download for Android
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button
                onClick={() => handleDownload('ios')}
                className="flex items-center gap-3 px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl font-bold text-lg transition-all group"
              >
                <Apple className="w-6 h-6" />
                Download for iOS
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-8 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Free to use
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                No account needed
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Instant setup
              </div>
            </div>
          </div>

          {/* App Preview */}
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-3xl p-8 backdrop-blur-sm border border-slate-800">
              <div className="grid md:grid-cols-3 gap-6">
                {screenshots.map((screenshot, index) => (
                  <div key={index} className="text-center">
                    <div className="bg-slate-900 rounded-2xl p-4 mb-4 aspect-[9/16] flex items-center justify-center border border-slate-800">
                      <div className="text-slate-600">
                        <Smartphone className="w-16 h-16 mx-auto mb-2" />
                        <p className="text-sm">{screenshot.title}</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400">{screenshot.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            {selectedApp === 'scanner' ? 'Everything You Need to Scan Tickets' : 'Everything You Need to Discover Events'}
          </h2>
          <p className="text-xl text-slate-400">
            {selectedApp === 'scanner' 
              ? 'Built for speed, security, and reliability at event entrances'
              : 'Find events near you and manage tickets in one app'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features[selectedApp].map((feature, index) => (
            <div
              key={index}
              className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-all"
            >
              <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            How It Works
          </h2>
          <p className="text-xl text-slate-400">
            {selectedApp === 'scanner' ? 'Set up in minutes, scan in seconds' : 'Discover, purchase, and attend events'}
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
              1
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Get Scanner Code</h3>
            <p className="text-slate-400">Organizer receives 8-character code when creating event</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
              2
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Download App</h3>
            <p className="text-slate-400">Install EventNexus Scanner on iOS or Android device</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
              3
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Enter Code</h3>
            <p className="text-slate-400">Enter scanner code to sync with your event</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
              4
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Start Scanning</h3>
            <p className="text-slate-400">Scan tickets instantly at event entrance</p>
          </div>
        </div>
      </div>

      {/* Platform Selection */}
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Choose Your Platform
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* iOS Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white">
                  <Apple className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">iOS</p>
                  <h3 className="text-xl font-bold text-white">{selectedApp === 'scanner' ? 'EventNexus Scanner' : 'EventNexus Live Map'}</h3>
                </div>
              </div>

              <p className="text-slate-400">
                {selectedApp === 'scanner'
                  ? 'Request TestFlight access for the scanner app. Perfect for event staff.'
                  : 'Request TestFlight access for the Live Map app. Perfect for attendees.'}
              </p>

              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" /> iOS 15.0 or later
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" /> iPhone or iPad supported
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" /> Camera + (Live Map) location permissions
                </li>
              </ul>

              <button
                onClick={() => handleDownload('ios')}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-semibold transition-all"
              >
                <Apple className="w-5 h-5" />
                Request TestFlight Access
              </button>
            </div>

            {/* Android Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-600/40 flex items-center justify-center text-indigo-300">
                  <PlayCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Android</p>
                  <h3 className="text-xl font-bold text-white">{selectedApp === 'scanner' ? 'EventNexus Scanner' : 'EventNexus Live Map'}</h3>
                </div>
              </div>

              <p className="text-slate-400">Direct APK download for Android phones and tablets.</p>

              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" /> Android 8.0 or later
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" /> Material Design 3 UI
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" /> Works on phones & tablets
                </li>
              </ul>

              <button
                onClick={() => handleDownload('android')}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold transition-all"
              >
                <Download className="w-5 h-5" />
                Download for Android
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {selectedApp === 'scanner' ? (
            <>
              <details className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 group">
                <summary className="font-bold text-white cursor-pointer flex items-center justify-between">
                  Do I need to create an account?
                  <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="text-slate-400 mt-4">
                  No! The app only requires a scanner code from your event organizer. No account, username, or password needed.
                </p>
              </details>

              <details className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 group">
                <summary className="font-bold text-white cursor-pointer flex items-center justify-between">
                  How do I get a scanner code?
                  <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="text-slate-400 mt-4">
                  Event organizers receive scanner codes automatically when they create an event on EventNexus. Ask your organizer for the code.
                </p>
              </details>

              <details className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 group">
                <summary className="font-bold text-white cursor-pointer flex items-center justify-between">
                  Can multiple people scan tickets for the same event?
                  <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="text-slate-400 mt-4">
                  Yes! The organizer can create multiple scanner codes for different entrances or staff members. All scans sync in real-time.
                </p>
              </details>

              <details className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 group">
                <summary className="font-bold text-white cursor-pointer flex items-center justify-between">
                  Does it work offline?
                  <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="text-slate-400 mt-4">
                  The app requires an internet connection to validate tickets in real-time. Offline mode is coming in a future update.
                </p>
              </details>

              <details className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 group">
                <summary className="font-bold text-white cursor-pointer flex items-center justify-between">
                  Is it free to use?
                  <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="text-slate-400 mt-4">
                  Yes! The EventNexus Scanner app is completely free for all event organizers and their staff.
                </p>
              </details>
            </>
          ) : (
            <>
              <details className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 group">
                <summary className="font-bold text-white cursor-pointer flex items-center justify-between">
                  Do I need an account to browse events?
                  <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="text-slate-400 mt-4">
                  No! You can browse events and view details without an account. You only need to sign in to purchase tickets or view your purchased tickets.
                </p>
              </details>

              <details className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 group">
                <summary className="font-bold text-white cursor-pointer flex items-center justify-between">
                  How do I buy tickets in the app?
                  <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="text-slate-400 mt-4">
                  If you're signed in, you can purchase tickets directly in the app. Otherwise, you'll be redirected to the EventNexus website to complete your purchase.
                </p>
              </details>

              <details className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 group">
                <summary className="font-bold text-white cursor-pointer flex items-center justify-between">
                  Can I see events in different cities?
                  <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="text-slate-400 mt-4">
                  Yes! Adjust the radius filter from 1-200km to search for events in different areas. The map updates in real-time as you change your search radius.
                </p>
              </details>

              <details className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 group">
                <summary className="font-bold text-white cursor-pointer flex items-center justify-between">
                  Where can I find my purchased tickets?
                  <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="text-slate-400 mt-4">
                  All your purchased tickets are in the "My Tickets" tab. Each ticket displays a QR code that you can show at the event entrance for scanning.
                </p>
              </details>

              <details className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 group">
                <summary className="font-bold text-white cursor-pointer flex items-center justify-between">
                  Is it free to use?
                  <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="text-slate-400 mt-4">
                  Yes! The EventNexus Live Map app is completely free to download and use. You only pay for event tickets when you purchase them.
                </p>
              </details>
            </>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-12 text-center">
          <Users className="w-16 h-16 text-white mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Scanning?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Download the app now and start checking in attendees in minutes
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => handleDownload('android')}
              className="flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 transition-all"
            >
              <PlayCircle className="w-5 h-5" />
              Get Android App
            </button>
            
            <button
              onClick={() => handleDownload('ios')}
              className="flex items-center gap-2 px-8 py-4 bg-indigo-800 text-white rounded-2xl font-bold hover:bg-indigo-900 transition-all"
            >
              <Apple className="w-5 h-5" />
              Get iOS App
            </button>
          </div>

          <p className="text-sm text-indigo-100 mt-6">
            Need help? <Link to="/help" className="underline hover:text-white">Contact Support</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileAppsPage;
