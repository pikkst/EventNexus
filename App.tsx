
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
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
  Edit
} from 'lucide-react';
import HomeMap from './components/HomeMap';
import EventCreationFlow from './components/EventCreationFlow';
import Dashboard from './components/Dashboard';
import UserProfile from './components/UserProfile';
import EventDetail from './components/EventDetail';
import LandingPage from './components/LandingPage';
import TicketScanner from './components/TicketScanner';
import PricingPage from './components/PricingPage';
import AgencyProfile from './components/AgencyProfile';
import AdminCommandCenter from './components/AdminCommandCenter';
import Footer from './components/Footer';
import HelpCenter from './components/HelpCenter';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import CookieSettings from './components/CookieSettings';
import GDPRCompliance from './components/GDPRCompliance';
import NotificationSettings from './components/NotificationSettings';
import AuthModal from './components/AuthModal';
import { User, Notification, EventNexusEvent } from './types';
import { CATEGORIES } from './constants';
import { supabase } from './services/supabase';
import { 
  getEvents, 
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
    // Try to restore user from cache immediately
    try {
      const cached = localStorage.getItem('eventnexus-user-cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if cache is less than 5 minutes old
        if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          console.log('⚡ Using cached user data');
          // Mark that we already have user data from cache
          return parsed.user;
        }
      }
    } catch (e) {
      console.warn('Failed to load user cache:', e);
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
      console.warn('Failed to load notifications cache:', e);
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
          console.log('⚡ Using cached events data');
          return parsed.events;
        }
      }
    } catch (e) {
      console.warn('Failed to load events cache:', e);
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(true);

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
      console.warn('Failed to cache user data:', e);
    }
  };

  // Helper to cache notifications
  const cacheNotifications = (notifs: Notification[]) => {
    try {
      sessionStorage.setItem('eventnexus-notifications-cache', JSON.stringify(notifs));
    } catch (e) {
      console.warn('Failed to cache notifications:', e);
    }
  };

  // Helper to cache events
  const cacheEvents = (eventsData: EventNexusEvent[]) => {
    try {
      sessionStorage.setItem('eventnexus-events-cache', JSON.stringify({
        events: eventsData,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Failed to cache events:', e);
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
  
  useEffect(() => {
    let mounted = true;
    
    const loadInitialData = async () => {
      // Prevent multiple restoration attempts
      if (sessionRestoreAttempted.current) return;
      sessionRestoreAttempted.current = true;
      
      // If session already restored from cache, skip
      if (sessionRestored) {
        console.log('✅ Using cached session, skipping restoration');
        setIsLoading(false);
        return;
      }
      
      try {
        // Check for existing session FIRST
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && mounted && !user) {
          console.log('🔄 Restoring session on mount...');
          try {
            const userData = await getUser(session.user.id);
            if (userData && mounted) {
              setUser(userData);
              cacheUserData(userData);
              setSessionRestored(true);
              
              const userNotifications = await getNotifications(userData.id);
              if (mounted) {
                setNotifications(userNotifications);
                cacheNotifications(userNotifications);
              }
              console.log('✅ Session restored:', userData.email);
            } else {
              // If user data fails to load, sign out
              console.error('Failed to load user data, signing out');
              await supabase.auth.signOut();
              sessionRestoreAttempted.current = false;
            }
          } catch (userError) {
            console.error('Error loading user data:', userError);
            await supabase.auth.signOut();
            sessionRestoreAttempted.current = false;
          }
        } else {
          // No session to restore, mark as complete
          setSessionRestored(true);
        }
        
        // Load events (public data) - in background if we have cache
        if (events.length === 0 || !sessionStorage.getItem('eventnexus-events-cache')) {
          const eventsData = await getEvents();
          if (mounted) {
            setEvents(eventsData);
            cacheEvents(eventsData);
          }
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadInitialData();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      
      // Skip SIGNED_IN during initial mount - it's already handled by loadInitialData
      if (event === 'INITIAL_SESSION') {
        console.log('✅ Session restored:', session?.user?.email || 'No session');
        return;
      }
      
      // Only handle SIGNED_IN if it's a truly new login (not from cache or initial restore)
      // Skip if we already have user data (from cache or previous load)
      if (event === 'SIGNED_IN' && session?.user && mounted && !user) {
        console.log('User signed in (new login), loading data...');
        try {
          const userData = await getUser(session.user.id);
          if (userData && mounted) {
            setUser(userData);
            cacheUserData(userData);
            
            const userNotifications = await getNotifications(userData.id);
            if (mounted) {
              setNotifications(userNotifications);
              cacheNotifications(userNotifications);
            }
          } else {
            console.error('Failed to load user data after sign in');
            await supabase.auth.signOut();
          }
        } catch (userError) {
          console.error('Error loading user data:', userError);
          await supabase.auth.signOut();
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user && mounted) {
        console.log('✅ Token refreshed successfully');
      } else if (event === 'SIGNED_OUT' && mounted) {
        console.log('User signed out');
        setUser(null);
        setNotifications([]);
        cacheUserData(null);
        sessionStorage.removeItem('eventnexus-notifications-cache');
        setSessionRestored(false);
        sessionRestoreAttempted.current = false;
      } else if (event === 'USER_UPDATED' && session?.user && mounted) {
        console.log('User updated, reloading data...');
        const userData = await getUser(session.user.id);
        if (userData && mounted) {
          setUser(userData);
          cacheUserData(userData);
        }
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user || !user.notification_prefs?.proximityAlerts || !("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition((position) => {
      const { latitude, longitude } = position.coords;
      
      events.forEach(event => {
        if (notifiedEventIds.has(event.id)) return;
        if (!user.notification_prefs || 
            !Array.isArray(user.notification_prefs.interestedCategories) ||
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
    }, (err) => console.error(err), { enableHighAccuracy: true });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user, notifiedEventIds]);

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
    
    const updatedUser = await updateUser(user.id, updatedData);
    if (updatedUser) {
      setUser(updatedUser);
    }
  };

  const handleMarkRead = async (id: string) => {
    const success = await markNotificationRead(id);
    if (success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    }
  };

  const handleDeleteNotification = async (id: string) => {
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
      type: notif.type || 'update',
      senderName: notif.senderName || 'Nexus System',
      timestamp: new Date().toISOString(),
      isRead: false,
      eventId: notif.eventId
    });
    
    if (newNotif) {
      setNotifications(prev => [newNotif, ...prev]);
    }
  };

  const handleToggleFollow = (organizerId: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
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

  const handleUpdatePrefs = (newPrefs: any) => {
    if (!user) return;
    setUser(prev => prev ? ({ ...prev, notification_prefs: newPrefs }) : null);
  };

  return (
    <Router>
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
          user={user} 
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onDelete={handleDeleteNotification}
          onLogout={handleLogout}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />
        <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} user={user} />
        
        <main className="pt-16 flex-grow">
          <Routes>
            <Route path="/" element={<LandingPage user={user} onOpenAuth={() => setIsAuthModalOpen(true)} />} />
            <Route path="/map" element={<HomeMap />} />
            <Route path="/create" element={user ? <EventCreationFlow user={user} /> : <LandingPage user={user} onOpenAuth={() => setIsAuthModalOpen(true)} />} />
            <Route path="/create-event" element={user ? <EventCreationFlow user={user} /> : <LandingPage user={user} onOpenAuth={() => setIsAuthModalOpen(true)} />} />
            <Route path="/dashboard" element={user ? <Dashboard user={user} onBroadcast={handleAddNotification} onUpdateUser={handleUpdateUser} /> : <LandingPage user={user} onOpenAuth={() => setIsAuthModalOpen(true)} />} />
            <Route path="/profile" element={user ? <UserProfile user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} /> : <LandingPage user={user} onOpenAuth={() => setIsAuthModalOpen(true)} />} />
            <Route path="/event/:id" element={<EventDetail user={user} onToggleFollow={handleToggleFollow} onOpenAuth={() => setIsAuthModalOpen(true)} />} />
            <Route path="/scanner" element={user ? <TicketScanner user={user} /> : <LandingPage user={user} onOpenAuth={() => setIsAuthModalOpen(true)} />} />
            <Route path="/pricing" element={<PricingPage user={user} onUpgrade={(t) => setUser(prev => prev ? ({ ...prev, subscription: t }) : null)} onOpenAuth={() => setIsAuthModalOpen(true)} />} />
            <Route path="/org/:slug" element={<AgencyProfile user={user} onToggleFollow={handleToggleFollow} />} />
            <Route path="/admin" element={user?.role === 'admin' ? <AdminCommandCenter user={user} /> : <LandingPage user={user} onOpenAuth={() => setIsAuthModalOpen(true)} />} />
            <Route path="/help" element={<HelpCenter user={user || undefined} onOpenAuth={() => setIsAuthModalOpen(true)} />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/cookies" element={<CookieSettings />} />
            <Route path="/gdpr" element={<GDPRCompliance />} />
            <Route path="/notifications" element={user ? <NotificationSettings user={user} onUpdatePrefs={handleUpdatePrefs} /> : <LandingPage user={user} onOpenAuth={() => setIsAuthModalOpen(true)} />} />
          </Routes>
        </main>

        <ConditionalFooter />
        
        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
          onLogin={handleLogin} 
        />
      </div>
    </Router>
  );
};

// Component to handle footer visibility
const ConditionalFooter = () => {
  const location = useLocation();
  // Don't show global footer on Agency Profile as it has its own branded footer
  if (location.pathname.startsWith('/org/')) return null;
  return <Footer />;
}

const Navbar = ({ toggleSidebar, user, notifications, onMarkRead, onDelete, onLogout, onOpenAuth }: any) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] h-16 border-b bg-slate-950/80 border-slate-800 backdrop-blur-md text-white">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={toggleSidebar} className="p-2 hover:bg-slate-800/20 rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
          <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tighter">
            <img 
              src="/logo for eventnexus.png" 
              alt="EventNexus Logo" 
              className="h-10 w-auto object-contain"
            />
            <span className="hidden sm:inline">EventNexus</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <>
              <div className="relative">
                <button 
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="p-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 transition-all relative text-white"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-slate-950">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifs && (
                  <div className="absolute top-full mt-4 right-0 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                      <h4 className="font-black text-xs uppercase tracking-[0.2em] text-indigo-400">Notification Center</h4>
                      <button onClick={() => setShowNotifs(false)}><X className="w-4 h-4 text-slate-500" /></button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-800 scrollbar-hide">
                      {notifications.length === 0 ? (
                        <div className="p-10 text-center text-slate-600 italic text-sm">No notifications yet.</div>
                      ) : (
                        notifications.map((n: any) => (
                          <div 
                            key={n.id} 
                            className={`block p-5 space-y-3 transition-colors ${n.isRead ? 'opacity-60' : 'bg-indigo-600/5'}`} 
                            onClick={() => { onMarkRead(n.id); }}
                          >
                            <div className="flex justify-between items-start gap-3">
                              <Link 
                                to={n.eventId ? `/event/${n.eventId}` : '#'}
                                className="space-y-1"
                                onClick={() => setShowNotifs(false)}
                              >
                                <div className="flex items-center gap-2">
                                  {n.type === 'proximity_radar' && <Radar className="w-3 h-3 text-indigo-400" />}
                                  <h5 className="font-black text-sm text-white">{n.title}</h5>
                                </div>
                                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{n.senderName}</p>
                              </Link>
                              <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(n.id); }}
                                className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
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
                  className="flex items-center gap-2 bg-slate-800/50 p-1 pr-3 rounded-full hover:bg-slate-800 transition-all border border-slate-700 group"
                >
                  <img src={user.avatar} className="w-8 h-8 rounded-full border border-indigo-500" alt="avatar" />
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                </button>

                {showProfileMenu && (
                  <div className="absolute top-full mt-4 right-0 w-64 bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-6 border-b border-slate-800 bg-slate-950/50">
                      <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">{user.subscription_tier} plan</p>
                      <h4 className="font-black text-white truncate">{user.name}</h4>
                    </div>
                    <div className="p-2">
                      <ProfileMenuItem 
                        icon={<UserIcon />} 
                        label="My Profile" 
                        onClick={() => { setShowProfileMenu(false); navigate('/profile'); }} 
                      />
                      <ProfileMenuItem 
                        icon={<Settings />} 
                        label="Settings" 
                        onClick={() => { setShowProfileMenu(false); navigate('/notifications'); }} 
                      />
                      <div className="h-px bg-slate-800 my-2 mx-4" />
                      <ProfileMenuItem 
                        icon={<LogOut />} 
                        label="Log Out" 
                        variant="danger"
                        onClick={() => { setShowProfileMenu(false); onLogout(); navigate('/'); }} 
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
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

const ProfileMenuItem = ({ icon, label, onClick, variant }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-bold ${
      variant === 'danger' ? 'text-red-400 hover:bg-red-400/10' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <span className="shrink-0">{React.cloneElement(icon, { size: 18 })}</span>
    {label}
  </button>
);

const Sidebar = ({ isOpen, closeSidebar, user }: any) => {
  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1050]" onClick={closeSidebar} />}
      <aside className={`fixed inset-y-0 left-0 z-[1100] w-72 bg-slate-900 transform transition-transform duration-300 ease-in-out border-r border-slate-800 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-indigo-500" />
            <span className="font-black text-xl tracking-tighter text-white">EventNexus</span>
          </div>
          <button onClick={closeSidebar} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 space-y-1">
          <SidebarItem icon={<MapIcon />} label="Explore Map" to="/map" onClick={closeSidebar} />
          <SidebarItem icon={<PlusCircle />} label="Create Event" to="/create" onClick={closeSidebar} />
          <SidebarItem icon={<TicketIcon />} label="My Tickets" to="/profile" onClick={closeSidebar} />
          <SidebarItem icon={<Radar />} label="Nexus Radar" to="/notifications" onClick={closeSidebar} />
          <SidebarItem icon={<Zap />} label="Pricing" to="/pricing" onClick={closeSidebar} />
          
          <div className="pt-6 pb-2 px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">User</div>
          <SidebarItem icon={<Settings />} label="Settings" to="/notifications" onClick={closeSidebar} />
          <SidebarItem icon={<LayoutDashboard />} label="Organizer Hub" to="/dashboard" onClick={closeSidebar} />

          {user?.role === 'admin' && (
            <>
              <div className="pt-6 pb-2 px-3 text-[10px] font-black text-orange-500 uppercase tracking-widest">Admin</div>
              <SidebarItem icon={<ShieldCheck />} label="Command Center" to="/admin" onClick={closeSidebar} />
            </>
          )}
        </div>
      </aside>
    </>
  );
};

const SidebarItem = ({ icon, label, to, onClick }: any) => (
  <Link 
    to={to} 
    onClick={onClick}
    className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-indigo-600/10 text-slate-300 hover:text-indigo-400 transition-all group"
  >
    <span className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors">{icon}</span>
    <span className="text-sm font-bold tracking-tight">{label}</span>
  </Link>
);

export default App;
