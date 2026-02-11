
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  Map as MapIcon, 
  PlusCircle, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  X, 
  Compass,
  Ticket as TicketIcon,
  Settings,
  Scan,
  Zap,
  Languages,
  ShieldAlert,
  Globe,
  Briefcase,
  Bell,
  Trash2,
  ExternalLink,
  Info,
  ShieldCheck,
  Radar,
  User as UserIcon,
  ChevronDown,
  Edit,
  Mail,
  Gift,
  Coins,
  Smartphone,
  Users,
  Newspaper,
  Heart,
  Trophy,
  MessageCircle
} from 'lucide-react';

// Lightweight components - load immediately
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import { DashboardSkeleton, PageSkeleton } from './components/LoadingSkeleton';
import { initializePerformanceOptimizations } from './utils/performanceOptimization';
import { AdRails } from './components/AdSlot';
import { UILanguageSelector } from './components/UILanguageSelector';
import { useTranslation } from './i18n/useTranslation';

// Heavy components - lazy load on demand
const HomeMap = lazy(() => import('./components/HomeMap'));
const EventCreationFlow = lazy(() => import('./components/EventCreationFlow'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const UserProfile = lazy(() => import('./components/UserProfile'));
const EventDetail = lazy(() => import('./components/EventDetail'));
const EventEditPage = lazy(() => import('./components/EventEditPage'));
const TicketScanner = lazy(() => import('./components/TicketScanner'));
const TicketViewPage = lazy(() => import('./components/TicketViewPage'));
const PricingPage = lazy(() => import('./components/PricingPage'));
const MobileAppsPage = lazy(() => import('./components/MobileAppsPage'));
const LiveMapApp = lazy(() => import('./components/LiveMapApp'));
const AgencyProfile = lazy(() => import('./components/AgencyProfile'));
const AdminCommandCenter = lazy(() => import('./components/AdminCommandCenter'));
const AIAgentDashboard = lazy(() => import('./components/AIAgentDashboard'));
const SimplifiedSocialMediaManager = lazy(() => import('./components/SimplifiedSocialMediaManager').then(m => ({ default: m.SimplifiedSocialMediaManager })));
const HelpCenter = lazy(() => import('./components/HelpCenter'));
const TermsOfService = lazy(() => import('./components/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const CookieSettings = lazy(() => import('./components/CookieSettings'));
const GDPRCompliance = lazy(() => import('./components/GDPRCompliance'));
const NotificationSettings = lazy(() => import('./components/NotificationSettings'));
const BetaInvitation = lazy(() => import('./components/BetaInvitation'));
const OnboardingTutorial = lazy(() => import('./components/OnboardingTutorial'));
const AdminCreditManager = lazy(() => import('./components/AdminCreditManager'));
const AdminSupportDock = lazy(() => import('./components/AdminSupportDock'));
const CodeRedemption = lazy(() => import('./components/CodeRedemption'));
const PublicEventsBrowse = lazy(() => import('./components/PublicEventsBrowse'));
const PublicUserProfile = lazy(() => import('./components/PublicUserProfile'));
const EventFeed = lazy(() => import('./components/EventFeed'));
const Communities = lazy(() => import('./components/Communities'));
const Achievements = lazy(() => import('./components/Achievements'));
const BlogList = lazy(() => import('./components/BlogList'));
const BlogPost = lazy(() => import('./components/BlogPost'));
const BlogPostEditor = lazy(() => import('./components/BlogPostEditor'));
const EventDirectory = lazy(() => import('./components/EventDirectory'));
const PressPage = lazy(() => import('./components/PressPage'));
const CityLandingPage = lazy(() => import('./components/CityLandingPage'));
const DataSourcePage = lazy(() => import('./components/DataSourcePage'));
const OrganizerHubPage = lazy(() => import('./components/OrganizerHubPage'));
import ErrorBoundary from './components/ErrorBoundary';
import { HelmetProvider } from 'react-helmet-async';

import { User, Notification, EventNexusEvent } from './types';
import { CATEGORIES } from './constants';
import { supabase } from './services/supabase';
import { 
  getEvents,
  getAllEvents, 
  getUser, 
  createUser, 
  updateUser, 
  getNotifications, 
  createNotification, 
  markNotificationRead, 
  deleteNotification,
  getCurrentUser,
  signInUser,
  signOutUser
} from './services/dbService';
import logger from './utils/logger';
import { 
  startNetworkMonitoring, 
  setupSessionTimeout, 
  AuthEdgeCases,
  isNetworkError
} from './utils/networkResilience';
import { filterActiveEvents } from './utils/eventUtils';

const GA_MEASUREMENT_ID = 'G-JD7P5ZKF4L';
const AD_LEFT_SLOT = import.meta.env.VITE_ADSENSE_SLOT_LEFT || '';
const AD_RIGHT_SLOT = import.meta.env.VITE_ADSENSE_SLOT_RIGHT || '';

// Redirect legacy hash URLs to clean URLs
// Track page views for BrowserRouter routes in Google Analytics
const AnalyticsTracker: React.FC<{ user: User | null }> = ({ user }) => {
  const location = useLocation();

  useEffect(() => {
    // Skip tracking for admin users
    if (user?.role === 'admin') {
      logger.log('⛔ Analytics tracking skipped: Admin user');
      return;
    }

    const gtag = (window as any).gtag;
    const fbq = (window as any).fbq;

    const page_path = `${location.pathname}${location.search}${location.hash}`;
    const page_location = window.location.href;

    if (gtag) {
      // Enhanced tracking with user dimensions
      gtag('config', GA_MEASUREMENT_ID, { 
        page_path, 
        page_location,
        user_role: user?.role || 'guest',
        user_country: user?.country || 'unknown',
        custom_map: {
          'dimension1': 'user_role',
          'dimension2': 'user_country'
        }
      });
      gtag('event', 'page_view', { 
        page_path, 
        page_location,
        user_type: user ? 'logged_in' : 'guest'
      });
      logger.log('✅ GA page_view sent', { page_path, user_type: user ? 'logged_in' : 'guest' });
    } else {
      logger.warn('⚠️ GA not ready (AnalyticsTracker)');
    }

    // Track Meta Pixel SPA PageView on route changes (exclude admin)
    if (typeof fbq === 'function') {
      fbq('track', 'PageView');
      logger.log('✅ Meta Pixel PageView tracked');
    } else {
      // If base code hasn't defined fbq yet, queue a call defensively
      (window as any).fbq = function(){
        (window as any).fbq.callMethod ? (window as any).fbq.callMethod.apply((window as any).fbq, arguments) : ((window as any).fbq.queue = (window as any).fbq.queue || []).push(arguments)
      };
      (window as any).fbq('track', 'PageView');
    }
  }, [location, user]);

  return null;
};

// Real user data will be loaded from Supabase

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(() => {
    // Try to restore user from cache immediately for faster UI
    try {
      const cached = localStorage.getItem('eventnexus-user-cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Invalidate cache if it doesn't have agency_slug field (old schema)
        if (parsed.user && !('agency_slug' in parsed.user || 'agencySlug' in parsed.user)) {
          logger.log('🔄 Cache invalidated - missing agency_slug field. Clearing cache.');
          localStorage.removeItem('eventnexus-user-cache');
          return null;
        }
        // Use cache for immediate UI, but ALWAYS refresh from DB in background
        // Cache is now only for initial render speed, not as source of truth
        if (parsed.timestamp && Date.now() - parsed.timestamp < 60 * 60 * 1000) { // 1 hour max
          logger.log('Using cached user data (will refresh from DB)');
          return parsed.user;
        }
      }
    } catch (e) {
      logger.warn('Failed to load user cache:', e);
    }
    return null;
  });
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    // Try to restore notifications from cache
    try {
      const cached = sessionStorage.getItem('eventnexus-notifications-cache');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      logger.warn('Failed to load notifications cache:', e);
    }
    return [];
  });
  const [notifiedEventIds, setNotifiedEventIds] = useState<Set<string>>(new Set());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [events, setEvents] = useState<EventNexusEvent[]>(() => {
    // Try to restore events from cache
    try {
      const cached = sessionStorage.getItem('eventnexus-events-cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if cache is less than 2 minutes old
        if (parsed.timestamp && Date.now() - parsed.timestamp < 2 * 60 * 1000) {
          logger.log('Using cached events data');
          return parsed.events;
        }
      }
    } catch (e) {
      logger.warn('Failed to load events cache:', e);
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [toast, setToast] = useState<null | { message: string; variant: 'success' | 'info' | 'error' }>(null);
  const [supportUnread, setSupportUnread] = useState(0);
  const [supportDockOpenSignal, setSupportDockOpenSignal] = useState(0);
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>(() => {
    // Restore map theme preference from localStorage
    try {
      const saved = localStorage.getItem('eventnexus-map-theme');
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    } catch (e) {
      return 'dark';
    }
  });
  const [geminiReady, setGeminiReady] = useState(false);
  const geminiInitializedRef = useRef(false);
 
  // Ensure GA script is present even if index.html is cached/stripped
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // If gtag already exists, don't re-initialize
    if ((window as any).gtag) return;

    const existingScript = document.querySelector(`script[src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`);
    if (!existingScript) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script);
      logger.log('GA fallback: injected gtag.js script');
    }

    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).gtag = function gtag(){ (window as any).dataLayer.push(arguments); };
    (window as any).gtag('js', new Date());
    (window as any).gtag('config', GA_MEASUREMENT_ID, { page_path: window.location.pathname + window.location.search + window.location.hash });
    logger.log(`✅ GA fallback initialized with ${GA_MEASUREMENT_ID}`);
    
    // Initialize performance optimizations after GA is set up
    initializePerformanceOptimizations();
    
    // Initialize Gemini AI module (blocking to ensure it's ready)
    // This prevents "GoogleGenAI module not yet loaded" errors in components
    const initGemini = async () => {
      // Prevent duplicate initialization
      if (geminiInitializedRef.current) {
        logger.log('✅ Gemini AI already initialized');
        return;
      }
      geminiInitializedRef.current = true;

      try {
        const { initializeGemini } = await import('./services/geminiService');
        await initializeGemini();
        logger.log('✅ Gemini AI module pre-initialized successfully');
        setGeminiReady(true);
      } catch (e) {
        logger.error('❌ Failed to pre-initialize Gemini:', e?.message || e);
        // Set ready anyway so components don't hang forever
        // They'll get an error from getAI() but can handle it gracefully
        setGeminiReady(true);
      }
    };
    
    // Call initialization and await it
    initGemini().catch(err => logger.error('initGemini promise error:', err));
  }, []);

  // Helper to cache user data
  const cacheUserData = (userData: User | null) => {
    try {
      if (userData) {
        localStorage.setItem('eventnexus-user-cache', JSON.stringify({
          user: userData,
          timestamp: Date.now()
        }));
      } else {
        localStorage.removeItem('eventnexus-user-cache');
      }
    } catch (e) {
      logger.warn('Failed to cache user data:', e);
    }
  };

  const handleOpenAuth = (returnUrl?: string) => {
    if (typeof window === 'undefined') return;
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const target = returnUrl || currentPath;
    const url = new URL('/login', window.location.origin);
    if (target) {
      url.searchParams.set('returnUrl', target);
    }
    window.location.assign(url.toString());
  };

  // Helper to cache notifications
  const cacheNotifications = (notifs: Notification[]) => {
    try {
      sessionStorage.setItem('eventnexus-notifications-cache', JSON.stringify(notifs));
    } catch (e) {
      logger.warn('Failed to cache notifications:', e);
    }
  };

  const showToast = (message: string, variant: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 3000);
  };

  // Helper to cache events
  const cacheEvents = (eventsData: EventNexusEvent[]) => {
    try {
      sessionStorage.setItem('eventnexus-events-cache', JSON.stringify({
        events: eventsData,
        timestamp: Date.now()
      }));
    } catch (e) {
      logger.warn('Failed to cache events:', e);
    }
  };

  // Load user and initial data
  const [sessionRestored, setSessionRestored] = useState(() => {
    // If user is cached, session is already "restored"
    try {
      const cached = localStorage.getItem('eventnexus-user-cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          return true; // Cache is valid, no need to restore
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    return false;
  });
  const sessionRestoreAttempted = useRef(false);
  const isMountedRef = useRef(true);
  const cleanupNetworkRef = useRef<(() => void) | null>(null);
  const cleanupSessionTimeoutRef = useRef<(() => void) | null>(null);
  
  // Global session keep-alive: prevents auto-logout during long-running operations
  // Especially critical for admin pages with multi-city batch processing
  useEffect(() => {
    let keepAliveInterval: NodeJS.Timer;
    
    const startKeepAlive = async () => {
      try {
        // Only start if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          keepAliveInterval = setInterval(async () => {
            try {
              await supabase.auth.refreshSession();
              if (isMountedRef.current) {
                logger.log('Global session keep-alive: session refreshed');
              }
            } catch (error: any) {
              if (isNetworkError(error)) {
                logger.warn('Keep-alive failed (network issue)', { code: error.code });
              } else {
                logger.error('Global keep-alive failed:', { code: error.code });
              }
            }
          }, 30000); // Refresh every 30 seconds globally
        }
      } catch (error) {
        logger.error('Error starting keep-alive:', { error });
      }
    };
    
    startKeepAlive();
    
    return () => {
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    };
  }, []);
  
  // Setup network monitoring
  useEffect(() => {
    if (!cleanupNetworkRef.current) {
      cleanupNetworkRef.current = startNetworkMonitoring(
        () => {
          logger.log('Network restored - attempting session recovery');
          AuthEdgeCases.validateSession();
        },
        () => {
          logger.warn('Network disconnected');
        }
      );
    }
    
    return () => {
      if (cleanupNetworkRef.current) {
        cleanupNetworkRef.current();
        cleanupNetworkRef.current = null;
      }
    };
  }, []);
  
  // Setup session inactivity timeout (30 minutes)
  useEffect(() => {
    if (user && !cleanupSessionTimeoutRef.current) {
      cleanupSessionTimeoutRef.current = setupSessionTimeout(
        30 * 60 * 1000, // 30 minutes
        () => {
          logger.log('Session timeout triggered');
          handleLogout();
        }
      );
    }
    
    return () => {
      if (!user && cleanupSessionTimeoutRef.current) {
        cleanupSessionTimeoutRef.current();
        cleanupSessionTimeoutRef.current = null;
      }
    };
  }, [user]);
  
  useEffect(() => {
    // Check for successful subscription checkout and reload user data
    const checkSubscriptionSuccess = async () => {
      const params = new URLSearchParams(window.location.hash.split('?')[1]);
      const checkoutSuccess = params.get('checkout') === 'success';
      
      if (checkoutSuccess && user) {
        logger.log('🔄 Subscription checkout successful, reloading user data...');
        try {
          // Wait a bit for webhook to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          const updatedUser = await getUser(user.id);
          if (updatedUser && isMountedRef.current) {
            setUser(updatedUser);
            cacheUserData(updatedUser);
            logger.log('✅ User data reloaded after subscription:', updatedUser.subscription_tier);
          }
        } catch (error) {
          logger.error('Error reloading user after subscription:', error);
        }
      }
    };
    
    checkSubscriptionSuccess();
  }, [user?.id]); // Only run when user ID changes or on mount

  useEffect(() => {
    const loadInitialData = async () => {
      // Prevent multiple restoration attempts
      if (sessionRestoreAttempted.current) {
        return;
      }
      sessionRestoreAttempted.current = true;
      
      // Set a timeout - if nothing completes in 15 seconds, force loading to end
      const hardTimeout = setTimeout(() => {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }, 15000);
      
      try {
        // Let Supabase's detectSessionInUrl handle PKCE code exchange automatically
        // Do NOT manually call exchangeCodeForSession - it races with auto-detect
        // and cleaning the URL before onAuthStateChange fires breaks OAuth handling
        
        // Check for existing session (auto-detect may have already exchanged ?code=)
        // Small delay to give detectSessionInUrl time to complete the exchange
        if (window.location.search.includes('code=')) {
          logger.log('\xf0\x9f\x94\x91 Auth code detected, waiting for auto-exchange...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Check for existing session FIRST (avoid TDZ on session variable)
        const { data: { session } } = await supabase.auth.getSession();

        // Initialize campaign tracking with known session info (with timeout to prevent hanging)
        try {
          const { initializeTracking } = await import('./services/campaignTrackingService');
          const trackingPromise = initializeTracking(session?.user?.id);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Campaign tracking timeout')), 5000)
          );
          await Promise.race([trackingPromise, timeoutPromise]);
        } catch (trackingError) {
          logger.warn('⚠️ Campaign tracking initialization failed (non-blocking):', trackingError?.message || trackingError);
          // Continue anyway - tracking is not critical for app loading
        }
        
        if (session?.user && isMountedRef.current) {
          logger.log('🔄 Loading fresh user data from database...');
          try {
            // ALWAYS fetch fresh data from database, don't rely on cache
            const userData = await getUser(session.user.id);
            if (userData && isMountedRef.current) {
              setUser(userData);
              cacheUserData(userData);
              setSessionRestored(true);
              logger.log('✅ Fresh user data loaded. Credits:', userData.credits);
              
              const userNotifications = await getNotifications(userData.id);
              if (isMountedRef.current) {
                setNotifications(userNotifications);
                cacheNotifications(userNotifications);
              }
            } else {
              // If user data fails to load, sign out
              logger.error('Failed to load user data, signing out');
              await supabase.auth.signOut();
              sessionRestoreAttempted.current = false;
            }
          } catch (userError) {
            logger.error('Error loading user data:', userError);
            await supabase.auth.signOut();
            sessionRestoreAttempted.current = false;
          }
        } else {
          // No session to restore, mark as complete
          setSessionRestored(true);
        }
        
        // Load events - use getAllEvents for authenticated users, getEvents for guests
        if (events.length === 0 || !sessionStorage.getItem('eventnexus-events-cache')) {
          const eventsData = session?.user ? await getAllEvents() : await getEvents();
          // Filter out expired events
          const activeEvents = filterActiveEvents(eventsData);
          if (isMountedRef.current) {
            setEvents(activeEvents);
            cacheEvents(activeEvents);
          }
        }
      } catch (error) {
        logger.error('Error loading initial data:', error);
      } finally {
        clearTimeout(hardTimeout);
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };
    
    loadInitialData();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.log('🔐 Auth event:', event, session?.user?.email || 'no session');
      
      // Handle OAuth callback - detect OAuth params in URL
      // Check if this is an OAuth callback (for URL cleanup)
      const hasOAuthCode = window.location.search.includes('code=');

      
      if (event === 'INITIAL_SESSION' && session?.user && !user) {
        logger.log('🔄 Session detected on init, loading user profile...');
        setIsLoading(true);
        
        try {
          // Ensure profile exists via RPC
          await supabase.rpc('ensure_user_profile', { user_id: session.user.id })
            .catch(err => logger.warn('⚠️ RPC warning:', err.message));
          
          // Small delay for profile creation
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const userData = await getUser(session.user.id);
          
          if (userData && isMountedRef.current) {
            setUser(userData);
            cacheUserData(userData);
            setIsLoading(false);
            
            // Load notifications and events in background
            getNotifications(userData.id).then(notifs => {
              if (isMountedRef.current) {
                setNotifications(notifs);
                cacheNotifications(notifs);
              }
            });
            
            getAllEvents().then(eventsData => {
              const activeEvents = filterActiveEvents(eventsData);
              if (isMountedRef.current) {
                setEvents(activeEvents);
                cacheEvents(activeEvents);
              }
            });
            
            // Clean URL - remove OAuth params and redirect to profile
            window.history.replaceState({}, '', '/profile');
            logger.log('✅ OAuth login successful');
          } else {
            logger.error('⚠️ Failed to load user profile');
            setIsLoading(false);
          }
        } catch (error) {
          logger.error('OAuth callback error:', error);
          setIsLoading(false);
        }
        return;
      }
      
      // Skip INITIAL_SESSION without session (unauthenticated)
      if (event === 'INITIAL_SESSION') {
        logger.log('✅ No active session on page load');
        return;
      }
      
      // Handle sign-in (OAuth + regular)
      if (event === 'SIGNED_IN' && session?.user && isMountedRef.current && !user) {
        logger.log('User signed in, loading data...');
        
        try {
          // Ensure profile exists (for OAuth/new users)
          await supabase.rpc('ensure_user_profile', { user_id: session.user.id })
            .catch(err => logger.warn('⚠️ RPC warning:', err.message));
          await new Promise(resolve => setTimeout(resolve, 300));

          const userData = await getUser(session.user.id);
          
          if (userData && isMountedRef.current) {
            setUser(userData);
            cacheUserData(userData);
            setIsLoading(false);
            
            // Clean URL if OAuth code is present
            if (hasOAuthCode) {
              window.history.replaceState({}, '', '/profile');
            }
            
            // Load notifications and events in background
            getNotifications(userData.id).then(notifs => {
              if (isMountedRef.current) {
                setNotifications(notifs);
                cacheNotifications(notifs);
              }
            });
            
            getAllEvents().then(eventsData => {
              const activeEvents = filterActiveEvents(eventsData);
              if (isMountedRef.current) {
                setEvents(activeEvents);
                cacheEvents(activeEvents);
              }
            });
            
            logger.log('✅ Sign-in complete:', userData.email);
          } else {
            logger.error('⚠️ Failed to load user profile after sign-in');
            setIsLoading(false);
          }
        } catch (userError) {
          logger.error('Error loading user data:', userError);
          setIsLoading(false);
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user && isMountedRef.current) {
        logger.log('✅ Token refreshed successfully');
      } else if (event === 'SIGNED_OUT' && isMountedRef.current) {
        logger.log('User signed out');
        setUser(null);
        setNotifications([]);
        cacheUserData(null);
        sessionStorage.removeItem('eventnexus-notifications-cache');
        setSessionRestored(false);
        sessionRestoreAttempted.current = false;
        
        // Reload only public events for guests
        const eventsData = await getEvents();
        const activeEvents = filterActiveEvents(eventsData);
        if (isMountedRef.current) {
          setEvents(activeEvents);
          cacheEvents(activeEvents);
        }
      } else if (event === 'USER_UPDATED' && session?.user && isMountedRef.current) {
        logger.log('User updated, reloading data...');
        const userData = await getUser(session.user.id);
        if (userData && isMountedRef.current) {
          setUser(userData);
          cacheUserData(userData);
        }
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Trigger onboarding for new users (check database, not localStorage)
  useEffect(() => {
    if (user && !user.tutorial_completed) {
      // Wait 2 seconds after user loads to show onboarding
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !user.notification_prefs?.proximityAlerts || !("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition((position) => {
      const { latitude, longitude } = position.coords;
      
      events.forEach(event => {
        if (notifiedEventIds.has(event.id)) return;
        if (!user.notification_prefs || 
            !Array.isArray(user.notification_prefs.interestedCategories)) return;
        
        // Only filter by categories if user has selected specific ones
        if (user.notification_prefs.interestedCategories.length > 0 &&
            !user.notification_prefs.interestedCategories.includes(event.category)) return;

        const distance = getDistance(latitude, longitude, event.location.lat, event.location.lng);

        if (distance <= (user.notification_prefs?.alertRadius || 10)) {
          const newNotif: Notification = {
            id: 'radar-' + event.id,
            title: 'Nexus Radar: Event nearby!',
            message: `"${event.name}" is only ${distance.toFixed(1)}km away! It matches your interests. Check it out now!`,
            type: 'proximity_radar',
            eventId: event.id,
            senderName: 'Nexus AI Radar',
            timestamp: new Date().toISOString(),
            isRead: false
          };
          
          setNotifications(prev => [newNotif, ...prev]);
          setNotifiedEventIds(prev => new Set(prev).add(event.id));
        }
      });
    }, (err) => logger.error(err), { enableHighAccuracy: true });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user, notifiedEventIds, events]);

  const handleLogout = async () => {
    await signOutUser();
    setUser(null);
    setNotifications([]);
    setNotifiedEventIds(new Set());
  };

  const handleLogin = async (userData: User) => {
    setUser(userData);
    const userNotifications = await getNotifications(userData.id);
    setNotifications(userNotifications);
  };

  const handleUpdateUser = async (updatedData: Partial<User>) => {
    if (!user) return;
    
    logger.log('🔄 Updating user with data:', updatedData);
    const updatedUser = await updateUser(user.id, updatedData);
    if (updatedUser) {
      logger.log('✅ User updated. New agency_slug:', updatedUser.agency_slug || updatedUser.agencySlug || 'NOT SET');
      setUser(updatedUser);
    }
  };

  const handleRefreshUser = async () => {
    if (!user) return;
    
    try {
      logger.log('🔄 Refreshing user data...');
      const updatedUser = await getUser(user.id);
      if (updatedUser) {
        setUser(updatedUser);
        cacheUserData(updatedUser);
        logger.log('✅ User data refreshed. Credits:', updatedUser.credits);
      }
    } catch (error) {
      logger.error('Error refreshing user:', error);
    }
  };

  const handleToggleMapTheme = () => {
    const newTheme = mapTheme === 'dark' ? 'light' : 'dark';
    setMapTheme(newTheme);
    localStorage.setItem('eventnexus-map-theme', newTheme);
  };

  const handleReloadEvents = async () => {
    try {
      logger.log('🔄 Reloading events after event creation...');
      const eventsData = user ? await getAllEvents() : await getEvents();
      // Filter out expired events
      const activeEvents = filterActiveEvents(eventsData);
      setEvents(activeEvents);
      cacheEvents(activeEvents);
      logger.log(`✅ Events reloaded: ${activeEvents.length} active of ${eventsData.length} total`);
    } catch (error) {
      logger.error('Error reloading events:', error);
    }
  };

  const handleMarkRead = async (id: string) => {
    const success = await markNotificationRead(id);
    if (success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    }
  };

  const handleDeleteNotification = async (id: string) => {
    // Radar notifications are client-side only (prefixed with "radar-")
    // They don't exist in the database, so just remove from state
    if (id.startsWith('radar-')) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      return;
    }
    
    // For database notifications, delete from Supabase
    const success = await deleteNotification(id);
    if (success) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const handleAddNotification = async (notif: Partial<Notification>) => {
    if (!user) return;
    
      const newNotif = await createNotification({
        user_id: user.id,
        title: notif.title || 'Nexus Alert',
        message: notif.message || '',
        // Use allowed DB types; fall back to system to avoid constraint failures
        type: notif.type || 'system',
        senderName: notif.senderName || 'Nexus System',
        timestamp: new Date().toISOString(),
        isRead: false,
        eventId: notif.eventId
      });
    
    if (newNotif) {
      setNotifications(prev => [newNotif, ...prev]);
      // Show success toast for Admin-origin notifications
      if (newNotif.senderName === 'EventNexus Admin') {
        showToast(`New message from Admin: ${newNotif.title}`, 'success');
      }
    }
  };

  // Real-time notifications subscription (Admin and system messages)
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`realtime:notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, async (payload: any) => {
        try {
          // Refresh notifications to ensure consistent client shape
          const latest = await getNotifications(user.id);
          setNotifications(latest);
          cacheNotifications(latest);
          const sender = payload?.new?.sender_name as string | undefined;
          const title = payload?.new?.title as string | undefined;
          if (sender === 'EventNexus Admin' && title) {
            showToast(`New message from Admin: ${title}`, 'success');
          }
        } catch (err) {
          logger.error('Realtime notifications update error:', err);
        }
      });
    channel.subscribe();
    return () => { channel.unsubscribe(); };
  }, [user?.id]);

  const handleToggleFollow = (organizerId: string) => {
    if (!user) {
      handleOpenAuth();
      return;
    }
    setUser(prev => {
      if (!prev) return null;
      const followedOrgs = Array.isArray(prev.followedOrganizers) ? prev.followedOrganizers : [];
      const isFollowing = followedOrgs.includes(organizerId);
      return {
        ...prev,
        followedOrganizers: isFollowing 
          ? followedOrgs.filter(id => id !== organizerId)
          : [...followedOrgs, organizerId]
      };
    });
  };

  const handleUpdatePrefs = async (newPrefs: any) => {
    if (!user) return;
    
    // Update local state immediately for responsive UI
    setUser(prev => prev ? ({ ...prev, notification_prefs: newPrefs }) : null);
    
    // Save to database
    try {
      await updateUser(user.id, { notification_prefs: newPrefs });
      logger.log('✅ Notification preferences saved to database');
    } catch (error) {
      logger.error('❌ Failed to save notification preferences:', error);
      // Optionally: Show error toast to user
    }
  };

  return (
    <HelmetProvider>
      <BrowserRouter>
        <AnalyticsTracker user={user} />
        <AdRails leftSlotId={AD_LEFT_SLOT} rightSlotId={AD_RIGHT_SLOT} />
        <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
          {/* Loading overlay for initial authentication */}
          {isLoading && (
            <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 text-sm animate-pulse">Loading EventNexus...</p>
              </div>
            </div>
          )}
        
        <Navbar 
          toggleSidebar={() => setSidebarOpen(true)} 
          sidebarOpen={sidebarOpen}
          user={user} 
          notifications={notifications}
          supportUnread={supportUnread}
          onOpenSupport={() => setSupportDockOpenSignal((s) => s + 1)}
          onMarkRead={handleMarkRead}
          onDelete={handleDeleteNotification}
          onLogout={handleLogout}
          onOpenAuth={() => handleOpenAuth()}
        />
        <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} user={user} />
        
        <main className="pt-16 flex-grow relative xl:px-6 2xl:px-12">
          <ErrorBoundary>
            <Suspense fallback={<DashboardSkeleton />}>
              <Routes>
              <Route path="/" element={<LandingPage user={user} onOpenAuth={() => handleOpenAuth('/')} />} />
              <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
              <Route path="/browse" element={<PublicEventsBrowse onOpenAuth={() => handleOpenAuth('/browse')} user={user} />} />
              <Route path="/events" element={<PublicEventsBrowse onOpenAuth={() => handleOpenAuth('/events')} user={user} />} />
              <Route path="/directory" element={<EventDirectory />} />
              <Route path="/directory/:category" element={<EventDirectory />} />
              <Route path="/events-in-:city" element={<CityLandingPage />} />
              <Route path="/data-source" element={<DataSourcePage />} />
              <Route path="/host" element={<OrganizerHubPage user={user} onOpenAuth={() => handleOpenAuth('/host')} />} />
              <Route path="/map" element={<HomeMap theme={mapTheme} onToggleTheme={handleToggleMapTheme} events={events} user={user} />} />
              <Route path="/create" element={user ? <EventCreationFlow user={user} onUpdateUser={handleUpdateUser} onEventCreated={handleReloadEvents} /> : <Navigate to="/login" state={{ returnUrl: '/create' }} replace />} />
              <Route path="/create-event" element={user ? <EventCreationFlow user={user} onUpdateUser={handleUpdateUser} onEventCreated={handleReloadEvents} /> : <Navigate to="/login" state={{ returnUrl: '/create-event' }} replace />} />
              <Route path="/dashboard" element={user ? <Dashboard user={user} onBroadcast={handleAddNotification} onUpdateUser={handleUpdateUser} /> : <Navigate to="/login" state={{ returnUrl: '/dashboard' }} replace />} />
              <Route path="/profile" element={user ? <UserProfile user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} onRefreshUser={handleRefreshUser} /> : <Navigate to="/login" state={{ returnUrl: '/profile' }} replace />} />
              <Route path="/event/:id" element={<EventDetail user={user} onToggleFollow={handleToggleFollow} onOpenAuth={() => handleOpenAuth()} />} />
              <Route path="/events/:id/edit" element={user ? <EventEditPage user={user} onOpenAuth={() => handleOpenAuth()} /> : <Navigate to="/login" replace />} />
              <Route path="/events/:id" element={<EventDetail user={user} onToggleFollow={handleToggleFollow} onOpenAuth={() => handleOpenAuth()} />} />
              <Route path="/scanner" element={<TicketScanner user={user} />} />
              <Route path="/ticket" element={user ? <TicketViewPage /> : <Navigate to="/login" state={{ returnUrl: '/ticket' }} replace />} />
              <Route path="/ticket/:id" element={user ? <TicketViewPage /> : <Navigate to="/login" state={{ returnUrl: `/ticket/${window.location.pathname.split('/').pop()}` }} replace />} />
              <Route path="/live-map" element={user ? <LiveMapApp user={user} /> : <Navigate to="/login" state={{ returnUrl: '/live-map' }} replace />} />
              <Route path="/pricing" element={<PricingPage user={user} onUpgrade={(t) => setUser(prev => prev ? ({ ...prev, subscription_tier: t, subscription: t }) : null)} onOpenAuth={() => handleOpenAuth('/pricing')} />} />
              <Route path="/mobile" element={<MobileAppsPage />} />
              <Route path="/beta" element={<BetaInvitation />} />
              <Route path="/beta-signup" element={<BetaInvitation />} />
              <Route path="/org/:slug" element={<AgencyProfile user={user} onToggleFollow={handleToggleFollow} />} />
              <Route path="/agency/:slug" element={<AgencyProfile user={user} onToggleFollow={handleToggleFollow} />} />
                <Route path="/user/:username" element={<PublicUserProfile currentUser={user} />} />
                  <Route path="/feed" element={<EventFeed user={user} />} />
              <Route path="/communities" element={<Communities user={user} onOpenAuth={() => handleOpenAuth('/communities')} />} />
              <Route path="/achievements" element={user ? <Achievements user={user} onOpenAuth={() => handleOpenAuth('/achievements')} /> : <Navigate to="/login" state={{ returnUrl: '/achievements' }} replace />} />
              <Route path="/blog" element={<BlogList />} />
              <Route path="/blog/new" element={user ? <BlogPostEditor /> : <Navigate to="/login" state={{ returnUrl: '/blog/new' }} replace />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/press" element={<PressPage />} />
              <Route path="/admin" element={user?.role === 'admin' ? <AdminCommandCenter user={user} supportUnread={supportUnread} onOpenSupport={() => setSupportDockOpenSignal((s) => s + 1)} /> : <Navigate to="/login" replace />} />
              <Route path="/admin/ai-agents" element={user?.role === 'admin' ? <AIAgentDashboard user={user} /> : <Navigate to="/login" replace />} />
              <Route path="/admin/credits" element={user?.role === 'admin' ? <AdminCreditManager user={user} /> : <Navigate to="/login" replace />} />
              <Route path="/redeem" element={user ? <CodeRedemption user={user} onCreditsUpdated={handleRefreshUser} /> : <Navigate to="/login" state={{ returnUrl: '/redeem' }} replace />} />
              <Route path="/social-media" element={user?.role === 'admin' ? <SimplifiedSocialMediaManager user={user} /> : <Navigate to="/login" replace />} />
              <Route path="/help" element={<HelpCenter user={user || undefined} onOpenAuth={() => handleOpenAuth('/help')} />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/cookies" element={<CookieSettings />} />
              <Route path="/gdpr" element={<GDPRCompliance />} />
              <Route path="/notifications" element={user ? <NotificationSettings user={user} onUpdatePrefs={handleUpdatePrefs} /> : <Navigate to="/login" state={{ returnUrl: '/notifications' }} replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>

        <ConditionalFooter />
        
        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
          onLogin={handleLogin} 
        />

        {/* Toast Notification */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1200]">
            <div className={`px-4 py-3 rounded-xl shadow-2xl border text-sm font-bold animate-in fade-in zoom-in-95 ${
              toast.variant === 'success' ? 'bg-emerald-600 text-white border-emerald-500/40' :
              toast.variant === 'error' ? 'bg-red-600 text-white border-red-500/40' :
              'bg-slate-800 text-white border-slate-700'
            }`}>
              {toast.message}
            </div>
          </div>
        )}

        {showOnboarding && user && (
          <OnboardingTutorial
            user={user}
            onComplete={async () => {
              // Save to database AND localStorage for backup
              if (user) {
                try {
                  await updateUser(user.id, { tutorial_completed: true });
                  // Update local state
                  setUser({ ...user, tutorial_completed: true });
                  localStorage.setItem('onboarding_completed', 'true');
                } catch (error) {
                  logger.error('Failed to save tutorial completion:', error);
                  // Still mark as completed locally to avoid repeated showing
                  localStorage.setItem('onboarding_completed', 'true');
                }
              }
              setShowOnboarding(false);
            }}
            onSkip={async () => {
              // Also mark as completed when skipped
              if (user) {
                try {
                  await updateUser(user.id, { tutorial_completed: true });
                  setUser({ ...user, tutorial_completed: true });
                  localStorage.setItem('onboarding_completed', 'true');
                } catch (error) {
                  logger.error('Failed to save tutorial skip:', error);
                  localStorage.setItem('onboarding_completed', 'true');
                }
              }
              setShowOnboarding(false);
            }}
          />
        )}

        {user?.role === 'admin' && (
          <Suspense fallback={null}>
            <AdminSupportDock
              user={user}
              openSignal={supportDockOpenSignal}
              onUnreadChange={(count) => setSupportUnread(count)}
            />
          </Suspense>
        )}
      </div>
    </BrowserRouter>
    </HelmetProvider>
  );
};

// Component to handle footer visibility
const ConditionalFooter = () => {
  const location = useLocation();
  // Don't show global footer on Agency Profile as it has its own branded footer
  if (location.pathname.startsWith('/org/') || location.pathname.startsWith('/agency/')) return null;
  return <Footer />;
}

const Navbar = ({ toggleSidebar, user, notifications, supportUnread, onOpenSupport, onMarkRead, onDelete, onLogout, onOpenAuth, sidebarOpen }: any) => {
  const t = useTranslation();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] h-16 border-b bg-slate-950/80 border-slate-800 backdrop-blur-md text-white">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleSidebar} 
            aria-label="Toggle navigation menu"
            aria-expanded={sidebarOpen}
            className="p-2 hover:bg-slate-800/20 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tighter">
            <img 
              src="/logo for eventnexus.png" 
              alt="EventNexus Logo"
              width="40"
              height="40"
              decoding="async"
              className="h-10 w-auto object-contain"
            />
            <span className="hidden sm:inline">EventNexus</span>
          </Link>
          
          {/* Desktop Quick Links */}
          <div className="hidden lg:flex items-center gap-1 ml-8">
            <Link to="/map" className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all">
              {t.nav.map}
            </Link>
            <Link to="/browse" className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all">
              {t.nav.events}
            </Link>
            <Link to="/blog" className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all">
              {t.nav.blog}
            </Link>
            <Link to="/pricing" className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all">
              {t.nav.pricing}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <>
              {user.role === 'admin' && (
                <button
                  onClick={onOpenSupport}
                  className="p-2.5 bg-indigo-600/80 border border-indigo-500/50 rounded-xl hover:bg-indigo-600 transition-all relative text-white"
                >
                  <MessageCircle className="w-5 h-5" />
                  {supportUnread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-emerald-400 text-slate-900 text-[11px] font-black px-1.5 rounded-full min-w-[18px] text-center">
                      {supportUnread > 99 ? '99+' : supportUnread}
                    </span>
                  )}
                </button>
              )}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifs(!showNotifs)}
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                  aria-expanded={showNotifs}
                  aria-controls="notif-menu"
                  aria-haspopup="menu"
                  className="p-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 transition-all relative text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <Bell className="w-5 h-5" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-slate-950" aria-hidden="true">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifs && (
                  <div 
                    id="notif-menu"
                    role="menu"
                    aria-labelledby="notif-button"
                    className="fixed sm:absolute top-16 sm:top-full sm:mt-4 right-0 sm:right-0 left-0 sm:left-auto w-full sm:w-96 bg-slate-900 border-x-0 sm:border-x border-t-0 sm:border-t border-b border-slate-800 sm:rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in sm:zoom-in-95 slide-in-from-top-4 sm:slide-in-from-top-0 duration-200 max-h-[calc(100vh-4rem)] sm:max-h-[80vh]"
                  >
                    <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                      <h4 id="notif-title" className="font-black text-xs sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] text-indigo-400">{t.notifications.title}</h4>
                      <button 
                        onClick={() => setShowNotifs(false)}
                        aria-label="Close notifications menu"
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <X className="w-4 h-4 text-slate-500" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="max-h-[calc(100vh-12rem)] sm:max-h-[400px] overflow-y-auto divide-y divide-slate-800 scrollbar-hide" role="menu">
                      {notifications.length === 0 ? (
                        <div className="p-10 text-center text-slate-600 italic text-sm" role="status">{t.notifications.noNotifications}</div>
                      ) : (
                        notifications.map((n: any) => (
                          <div 
                            key={n.id} 
                            role="menuitem"
                            tabIndex={0}
                            className={`block p-4 sm:p-5 space-y-2 sm:space-y-3 transition-colors cursor-pointer focus:outline-none focus:bg-slate-800/30 ${n.isRead ? 'opacity-60' : 'bg-indigo-600/5'}`} 
                            onClick={() => { onMarkRead(n.id); }}
                            onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onMarkRead(n.id); } }}
                          >
                            <div className="flex justify-between items-start gap-2 sm:gap-3">
                              <Link 
                                to={n.eventId ? `/event/${n.eventId}` : '#'}
                                className="space-y-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-1"
                                onClick={() => setShowNotifs(false)}
                              >
                                <div className="flex items-center gap-2">
                                  {n.type === 'proximity_radar' && <Radar className="w-3 h-3 text-indigo-400" aria-hidden="true" />}
                                  {n.type === 'contact_inquiry' && <Mail className="w-3 h-3 text-purple-400" aria-hidden="true" />}
                                  <h5 className="font-black text-sm text-white">{n.title}</h5>
                                </div>
                                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{n.senderName}</p>
                              </Link>
                              <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(n.id); }}
                                aria-label={`Delete notification: ${n.title}`}
                                className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium">{n.message}</p>
                            {n.type === 'proximity_radar' && (
                              <Link 
                                to={n.eventId ? `/event/${n.eventId}` : '#'}
                                onClick={() => setShowNotifs(false)}
                                className="block bg-indigo-600 py-2 rounded-xl text-center text-[10px] font-black uppercase tracking-widest text-white mt-2"
                              >
                                 Buy ticket now
                              </Link>
                            )}
                            {n.type === 'contact_inquiry' && n.metadata?.fromEmail && (
                              <a 
                                href={`mailto:${n.metadata.fromEmail}`}
                                onClick={(e) => e.stopPropagation()}
                                className="block bg-purple-600 hover:bg-purple-700 py-2 rounded-xl text-center text-[10px] font-black uppercase tracking-widest text-white mt-2 transition-colors"
                              >
                                 Reply via Email
                              </a>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  aria-label={`User menu for ${user.name}`}
                  aria-expanded={showProfileMenu}
                  aria-haspopup="menu"
                  aria-controls="profile-menu"
                  className="flex items-center gap-2 bg-slate-800/50 p-1 pr-3 rounded-full hover:bg-slate-800 transition-all border border-slate-700 group focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <img src={user.avatar} className="w-8 h-8 rounded-full border border-indigo-500" alt={`${user.name}'s avatar`} />
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>

                {showProfileMenu && (
                  <div 
                    id="profile-menu"
                    role="menu"
                    className="fixed sm:absolute top-16 sm:top-full sm:mt-4 right-0 left-0 sm:left-auto w-full sm:w-64 bg-slate-900 border-x-0 sm:border-x border-t-0 sm:border-t border-b border-slate-800 sm:rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in sm:zoom-in-95 slide-in-from-top-4 sm:slide-in-from-top-0 duration-200"
                  >
                    <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-950/50">
                      <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">{user.subscription_tier} plan</p>
                      <h4 className="font-black text-white truncate text-sm sm:text-base">{user.name}</h4>
                    </div>
                    <div className="p-2" role="menugroup">
                      <ProfileMenuItem 
                        icon={<UserIcon />} 
                        label={t.nav.profile} 
                        onClick={() => { setShowProfileMenu(false); navigate('/profile'); }} 
                        t={t}
                      />
                      <ProfileMenuItem 
                        icon={<Settings />} 
                        label={t.nav.settings} 
                        onClick={() => { setShowProfileMenu(false); navigate('/notifications'); }} 
                        t={t}
                      />
                      <div className="h-px bg-slate-800 my-2 mx-4" aria-hidden="true" />
                      <ProfileMenuItem 
                        icon={<LogOut />} 
                        label={t.nav.signOut} 
                        variant="danger"
                        onClick={() => { setShowProfileMenu(false); onLogout(); navigate('/'); }} 
                        t={t}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button 
              onClick={onOpenAuth}
              className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all shadow-xl active:scale-95"
            >
              {t.nav.signIn}
            </button>
          )}
          
          {/* Language Selector - Always visible */}
          <div className="ml-2">
            <UILanguageSelector compact={true} theme="dark" />
          </div>
        </div>
      </div>
    </nav>
  );
};

const ProfileMenuItem = ({ icon, label, onClick, variant, t }: any) => (
  <button 
    role="menuitem"
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 sm:py-3 min-h-[48px] sm:min-h-0 rounded-2xl transition-all text-sm font-bold active:scale-98 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
      variant === 'danger' ? 'text-red-400 hover:bg-red-400/10 active:bg-red-400/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white active:bg-slate-700'
    }`}
  >
    <span className="shrink-0" aria-hidden="true">{React.cloneElement(icon, { size: 18 })}</span>
    {label}
  </button>
);

const Sidebar = ({ isOpen, closeSidebar, user }: any) => {
  const t = useTranslation();
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1050]" 
          onClick={closeSidebar}
          role="presentation"
          aria-hidden="true"
        />
      )}
      <aside 
        className={`fixed inset-y-0 left-0 z-[1100] w-72 bg-slate-900 transform transition-transform duration-300 ease-in-out border-r border-slate-800 max-h-screen overflow-hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-indigo-500" aria-hidden="true" />
            <span className="font-black text-xl tracking-tighter text-white">EventNexus</span>
          </div>
          <button 
            onClick={closeSidebar}
            aria-label="Close sidebar menu"
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>
        <nav className="p-4 space-y-1 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 97px)', scrollbarWidth: 'thin', scrollbarColor: '#475569 #1e293b' }}>
          <SidebarItem icon={<MapIcon />} label={t.nav.map} to="/map" onClick={closeSidebar} />
          <SidebarItem icon={<Radar />} label="Live Map" to="/live-map" onClick={closeSidebar} />
          <SidebarItem icon={<Globe />} label="Event Directory" to="/directory" onClick={closeSidebar} />
          <SidebarItem icon={<PlusCircle />} label={t.nav.createEvent} to="/create" onClick={closeSidebar} />
          <SidebarItem icon={<TicketIcon />} label={t.nav.tickets} to="/profile" onClick={closeSidebar} />
          <SidebarItem icon={<Radar />} label="Nexus Radar" to="/notifications" onClick={closeSidebar} />
          <SidebarItem icon={<Gift />} label="Redeem Code" to="/redeem" onClick={closeSidebar} />
          <SidebarItem icon={<Smartphone />} label="Mobile Apps" to="/mobile" onClick={closeSidebar} />
          <SidebarItem icon={<Zap />} label={t.nav.pricing} to="/pricing" onClick={closeSidebar} />
          
          <div className="pt-6 pb-2 px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest" role="separator" aria-label="Social section">Social</div>
          <SidebarItem icon={<Users />} label="Social Feed" to="/feed" onClick={closeSidebar} />
          <SidebarItem icon={<Heart />} label="Find Friends" to="/communities" onClick={closeSidebar} />
          <SidebarItem icon={<Trophy />} label="Achievements" to="/achievements" onClick={closeSidebar} />
          
          <div className="pt-6 pb-2 px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest" role="separator" aria-label="Resources section">Resources</div>
          <SidebarItem icon={<Newspaper />} label={t.nav.blog} to="/blog" onClick={closeSidebar} />
          
          <div className="pt-6 pb-2 px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest" role="separator" aria-label="User section">User</div>
          <SidebarItem icon={<Settings />} label={t.nav.settings} to="/notifications" onClick={closeSidebar} />
          <SidebarItem icon={<LayoutDashboard />} label={t.nav.dashboard} to="/dashboard" onClick={closeSidebar} />

          {user?.role === 'admin' && (
            <>
              <div className="pt-6 pb-2 px-3 text-[10px] font-black text-orange-500 uppercase tracking-widest" role="separator" aria-label="Admin section">Admin</div>
              <SidebarItem icon={<ShieldCheck />} label="Command Center" to="/admin" onClick={closeSidebar} />
              <SidebarItem icon={<Coins />} label="Credit Manager" to="/admin/credits" onClick={closeSidebar} />
              <SidebarItem icon={<Globe />} label="Social Media" to="/social-media" onClick={closeSidebar} />
            </>
          )}
        </nav>
      </aside>
    </>
  );
};

const SidebarItem = ({ icon, label, to, onClick }: any) => (
  <Link 
    to={to} 
    onClick={onClick}
    className="flex items-center gap-4 px-4 py-3 min-h-[48px] rounded-xl hover:bg-indigo-600/10 active:bg-indigo-600/20 text-slate-300 hover:text-indigo-400 transition-all group focus:outline-none focus:ring-2 focus:ring-indigo-500"
  >
    <span className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0" aria-hidden="true">{icon}</span>
    <span className="text-sm font-bold tracking-tight">{label}</span>
  </Link>
);

export default App;
