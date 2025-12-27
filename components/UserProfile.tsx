
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Ticket as TicketIcon, 
  Heart, 
  Star, 
  Settings, 
  Shield, 
  Download, 
  Share2, 
  Undo2, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Calendar,
  MapPin,
  Radar,
  ChevronRight,
  LogOut,
  Edit,
  Camera,
  Globe,
  Check,
  X,
  Zap,
  Upload,
  CreditCard,
  Pause,
  XOctagon,
  RefreshCw,
  Image as ImageIcon,
  ExternalLink,
  DollarSign,
  Bug
} from 'lucide-react';
import { User, EventNexusEvent } from '../types';
import { getUserTickets, uploadAvatar, uploadBanner, getOrganizerEvents, checkConnectStatus, getConnectDashboardLink, createConnectAccount, deleteEvent } from '../services/dbService';
import { supabase } from '../services/supabase';
import TicketCard from './TicketCard';
// TicketViewModal removed; using dedicated TicketViewPage route
import { SimplifiedSocialMediaManager } from './SimplifiedSocialMediaManager';
import BetaTesterReport from './BetaTesterReport';
import ReferralSystem from './ReferralSystem';

interface UserProfileProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (data: Partial<User>) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout, onUpdateUser }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [userTickets, setUserTickets] = useState<any[]>([]);
  // selectedTicket state removed; using navigation to ticket page
  const [organizedEvents, setOrganizedEvents] = useState<EventNexusEvent[]>([]);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [showBetaReport, setShowBetaReport] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState<string | null>(null);
  const [connectStatus, setConnectStatus] = useState<{
    hasAccount: boolean;
    onboardingComplete: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
  } | null>(null);
  const [isConnectLoading, setIsConnectLoading] = useState(false);
  const [tempUser, setTempUser] = useState<Partial<User>>({
    name: user.name,
    bio: user.bio,
    avatar: user.avatar,
    location: user.location,
    agencySlug: user.agencySlug,
    branding: user.branding
  });

  useEffect(() => {
    const loadTickets = async () => {
      const tickets = await getUserTickets(user.id);
      setUserTickets(tickets || []);
    };
    const loadOrganizedEvents = async () => {
      const events = await getOrganizerEvents(user.id);
      setOrganizedEvents(events || []);
    };
    const loadConnectStatus = async () => {
      const status = await checkConnectStatus(user.id);
      if (status) {
        setConnectStatus(status);
      }
    };
    loadTickets();
    loadOrganizedEvents();
    if (user.subscription_tier !== 'free') {
      loadConnectStatus();
    }
  }, [user.id, user.subscription_tier]);

  // Removed debug logging

  const handleDeleteEvent = async (eventId: string, eventName: string, ticketsSold: number) => {
    // Only allow deletion if no tickets sold
    if (ticketsSold > 0) {
      alert('Cannot delete events with sold tickets. Please contact support for assistance.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${eventName}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeletingEvent(eventId);
    try {
      const success = await deleteEvent(eventId);
      if (success) {
        setOrganizedEvents(prev => prev.filter(e => e.id !== eventId));
        alert('Event deleted successfully');
      } else {
        alert('Failed to delete event. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    } finally {
      setIsDeletingEvent(null);
    }
  };

  const handleOpenStripeDashboard = async () => {
    setIsConnectLoading(true);
    try {
      if (!connectStatus?.hasAccount) {
        // Need to start onboarding first
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user?.email) {
          alert('Unable to retrieve email. Please try again.');
          return;
        }

        const result = await createConnectAccount(user.id, userData.user.email);
        if (result?.url) {
          window.location.href = result.url;
        } else {
          alert('Failed to create Connect account. Please try again.');
        }
      } else {
        // Open dashboard
        const url = await getConnectDashboardLink(user.id);
        if (url) {
          window.open(url, '_blank');
        } else {
          alert('Unable to access dashboard. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error with Stripe Connect:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsConnectLoading(false);
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Increased limit to 10MB but we'll compress larger images
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Compress and resize image if needed
      const processedFile = await compressAndResizeImage(file);
      
      const avatarUrl = await uploadAvatar(user.id, processedFile);
      if (avatarUrl) {
        setTempUser({ ...tempUser, avatar: avatarUrl });
      } else {
        alert('Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload image');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Helper function to compress and resize images
  const compressAndResizeImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Target size for avatars (reasonable for profile pics)
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          const MAX_FILE_SIZE = 500 * 1024; // Target 500KB max
          
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions maintaining aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = height * (MAX_WIDTH / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = width * (MAX_HEIGHT / height);
              height = MAX_HEIGHT;
            }
          }
          
          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Draw image with smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          
          // Try different quality levels to get under target size
          const tryCompress = (quality: number) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to compress image'));
                  return;
                }
                
                // If still too large and quality can be reduced, try again
                if (blob.size > MAX_FILE_SIZE && quality > 0.5) {
                  tryCompress(quality - 0.1);
                  return;
                }
                
                // Create new file from blob
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                
                console.log(`Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
                resolve(compressedFile);
              },
              'image/jpeg',
              quality
            );
          };
          
          // Start with 0.9 quality
          tryCompress(0.9);
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Increased limit to 10MB but we'll compress larger images
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setIsUploadingBanner(true);
    try {
      // Compress and resize banner (wider dimensions for banner)
      const processedFile = await compressAndResizeBanner(file);
      
      const bannerUrl = await uploadBanner(user.id, processedFile);
      if (bannerUrl) {
        setTempUser({
          ...tempUser,
          branding: {
            ...tempUser.branding!,
            bannerUrl,
            primaryColor: tempUser.branding?.primaryColor || '#6366f1',
            accentColor: tempUser.branding?.accentColor || '#818cf8'
          }
        });
      } else {
        alert('Failed to upload banner image');
      }
    } catch (error) {
      console.error('Error uploading banner:', error);
      alert('Failed to upload banner image');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  // Helper function to compress and resize banner images (wider aspect ratio)
  const compressAndResizeBanner = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Target size for banners (wider format)
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 400;
          const MAX_FILE_SIZE = 800 * 1024; // Target 800KB max for banners
          
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions maintaining aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = height * (MAX_WIDTH / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = width * (MAX_HEIGHT / height);
              height = MAX_HEIGHT;
            }
          }
          
          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Draw image with smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          
          // Try different quality levels to get under target size
          const tryCompress = (quality: number) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to compress banner'));
                  return;
                }
                
                // If still too large and quality can be reduced, try again
                if (blob.size > MAX_FILE_SIZE && quality > 0.5) {
                  tryCompress(quality - 0.1);
                  return;
                }
                
                // Create new file from blob
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                
                console.log(`Banner compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
                resolve(compressedFile);
              },
              'image/jpeg',
              quality
            );
          };
          
          // Start with 0.9 quality
          tryCompress(0.9);
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleSaveProfile = () => {
    onUpdateUser(tempUser);
    setIsEditModalOpen(false);
  };

  const isPro = (user.subscription_tier || user.subscription) !== 'free';
  
  // Helper to show what features user would get with upgrade
  const getUpgradeFeatures = (currentTier: string) => {
    const features: Record<string, string[]> = {
      'free': [
        'Create up to 20 events per month',
        'Revenue & attendance analytics',
        'Public organizer profile',
        'AI-powered marketing tools',
        'Social media integrations'
      ],
      'pro': [
        'Create up to 100 events',
        'Featured map placement',
        'Custom branding & logos',
        'Advanced analytics',
        'Affiliate program access'
      ],
      'premium': [
        'Unlimited events',
        'White-labeled dashboard',
        'Dedicated success manager',
        'Full API access',
        'Custom domain support'
      ]
    };
    return features[currentTier] || [];
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Profile Header */}
      <div className="relative mb-16">
        <div 
          className="h-64 rounded-[40px] border border-slate-800 overflow-hidden relative"
          style={{ 
            background: user.branding?.primaryColor 
              ? `linear-gradient(to bottom right, ${user.branding.primaryColor}22, #020617)` 
              : 'linear-gradient(to bottom right, #1e293b, #020617)' 
          }}
        >
          {user.branding?.bannerUrl && (
            <img src={user.branding.bannerUrl} className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay" alt="" />
          )}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>
        
        <div className="absolute -bottom-12 left-8 flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-left">
          <div className="relative group">
            <div className="absolute inset-0 bg-indigo-500 rounded-[32px] blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
            <img src={user.avatar} className="w-32 h-32 rounded-[32px] border-4 border-slate-950 shadow-2xl relative z-10" alt="avatar" />
            <div className="absolute -bottom-2 -right-2 bg-indigo-600 p-2.5 rounded-2xl border-4 border-slate-950 z-20 shadow-xl">
              <Shield className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mb-4 space-y-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter">{user.name}</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 md:gap-4">
              <div className={`px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 border ${
                user.subscription_tier === 'enterprise' 
                  ? 'bg-orange-600/10 border-orange-500/30 text-orange-400' 
                  : user.subscription_tier === 'premium'
                  ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400'
                  : user.subscription_tier === 'pro'
                  ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  user.subscription_tier === 'enterprise' 
                    ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' 
                    : user.subscription_tier === 'premium'
                    ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                    : user.subscription_tier === 'pro'
                    ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                    : 'bg-slate-500'
                }`} />
                Nexus {user.subscription_tier || user.subscription} • {user.role}
              </div>
              {user.subscription_tier === 'free' && (
                <div className="px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 border bg-orange-600/10 border-orange-500/30 text-orange-400">
                  <Zap className="w-3 h-3" />
                  {user.credits_balance || 0} Credits
                </div>
              )}
              {user.location && (
                <p className="text-slate-500 text-sm font-bold flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> {user.location}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="absolute top-4 right-8 flex items-center gap-3">
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-xl px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest border border-white/20 transition-all flex items-center gap-2 text-white"
          >
            <Edit className="w-4 h-4" /> Edit Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-20 sm:mt-16">
        <div className="lg:col-span-2 space-y-8">
          {/* Bio Section */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-[40px] p-8 space-y-4">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Biography</h3>
             <p className="text-slate-300 font-medium leading-relaxed">
               {user.bio || "No biography provided yet. Tell the Nexus network about yourself!"}
             </p>
          </div>

          {/* Referral System */}
          <ReferralSystem user={user} />

          {/* Organized Events Section - Only show for paid users */}
          {isPro && (
            <div className="bg-slate-900 border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
                <h3 className="font-black text-xl tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-indigo-600/20 rounded-xl">
                    <Calendar className="w-5 h-5 text-indigo-400" />
                  </div>
                  My Organized Events
                </h3>
                <span className="text-xs font-bold text-slate-500">{organizedEvents.length} events</span>
              </div>
              <div className="divide-y divide-slate-800">
                {organizedEvents.length > 0 ? (
                  organizedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-6 hover:bg-slate-800/30 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => navigate(`/event/${event.id}`)}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                              {event.category}
                            </span>
                            <span className="text-xs text-slate-600">•</span>
                            <span className="text-xs text-slate-500 font-medium">
                              {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          <h4 className="font-bold text-lg mb-1 group-hover:text-indigo-400 transition-colors">{event.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {event.location?.city || 'Location TBA'}
                            </span>
                            <span className="flex items-center gap-1">
                              <TicketIcon className="w-4 h-4" />
                              {event.attendeesCount || 0}/{event.maxAttendees || 0}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.attendeesCount === 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEvent(event.id, event.name, event.attendeesCount);
                              }}
                              disabled={isDeletingEvent === event.id}
                              className="p-2 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 rounded-xl transition-all disabled:opacity-50 group/del"
                              title="Delete event (0 tickets sold)"
                            >
                              {isDeletingEvent === event.id ? (
                                <RefreshCw className="w-4 h-4 text-red-400 animate-spin" />
                              ) : (
                                <XOctagon className="w-4 h-4 text-red-400 group-hover/del:text-red-300" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/event/${event.id}`)}
                            className="p-2 hover:bg-slate-700/50 rounded-xl transition-all"
                          >
                            <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-bold">No events organized yet</p>
                    <p className="text-sm mt-2">Create your first event to get started</p>
                    <button
                      onClick={() => navigate('/create-event')}
                      className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-sm transition-all"
                    >
                      Create Event
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Social Media Manager - Only for Enterprise/Premium users */}
          {(user.subscription_tier === 'enterprise' || user.subscription_tier === 'premium') && (
            <div className="bg-slate-900 border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl p-8">
              <SimplifiedSocialMediaManager user={user} />
            </div>
          )}

          {/* Tickets Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
              <h3 className="font-black text-xl tracking-tight flex items-center gap-3">
                <div className="p-2 bg-indigo-600/20 rounded-xl">
                  <TicketIcon className="w-5 h-5 text-indigo-400" />
                </div>
                My Tickets
              </h3>
              <span className="px-3 py-1.5 bg-indigo-600/20 text-indigo-400 rounded-full text-sm font-bold">
                {userTickets.length}
              </span>
            </div>
            <div className="p-6">
              {userTickets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userTickets.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onExpand={() => navigate('/ticket', { state: { ticket } })}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500">
                  <TicketIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-bold">No tickets yet</p>
                  <p className="text-sm mt-2">Purchase tickets to events and they'll appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {user.is_beta_tester && (
            <div className="bg-gradient-to-br from-indigo-900/70 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-[40px] p-8 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300">
                    <Bug className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-300">Beta Tester</p>
                    <h3 className="text-lg font-black text-white">Report a bug or idea</h3>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                  Priority channel
                </span>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                Send issues, feedback, or feature ideas directly to the admin inbox. Responses within 24 hours for beta testers.
              </p>

              <button
                onClick={() => setShowBetaReport(true)}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-5 py-3 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Bug className="w-4 h-4" />
                Open Beta Report Form
              </button>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 shadow-xl">
            <h3 className="font-black text-lg mb-6 uppercase tracking-widest text-slate-500 text-xs">Radar Status</h3>
            <div 
              onClick={() => navigate('/notifications')}
              className="p-5 rounded-3xl bg-slate-800/30 border border-slate-700/50 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${user.notification_prefs.proximityAlerts ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                  <Radar size={20} />
                </div>
                <div>
                  <h4 className="font-black text-xs text-white">Radar {user.notification_prefs.proximityAlerts ? 'Active' : 'Off'}</h4>
                  <p className="text-[9px] text-slate-500 font-bold">{user.notification_prefs.alertRadius}km radius</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-600 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Subscription Management - For paid tiers */}
          {isPro && (
            <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg uppercase tracking-widest text-slate-500 text-xs">Subscription</h3>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  user.subscription_status === 'active' 
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : user.subscription_status === 'trialing'
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : 'bg-orange-500/20 text-orange-400'
                }`}>
                  {user.subscription_status || 'active'}
                </div>
              </div>

              <div className="space-y-4">
                <div className={`p-6 rounded-3xl border-2 ${
                  user.subscription_tier === 'enterprise'
                    ? 'bg-orange-600/10 border-orange-500/30'
                    : user.subscription_tier === 'premium'
                    ? 'bg-emerald-600/10 border-emerald-500/30'
                    : 'bg-indigo-600/10 border-indigo-500/30'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-black text-2xl tracking-tighter ${
                      user.subscription_tier === 'enterprise'
                        ? 'text-orange-400'
                        : user.subscription_tier === 'premium'
                        ? 'text-emerald-400'
                        : 'text-indigo-400'
                    }`}>
                      {user.subscription_tier === 'enterprise' ? 'Enterprise' : user.subscription_tier === 'premium' ? 'Premium' : 'Pro'}
                    </h4>
                    <p className="text-2xl font-black text-white">
                      €{user.subscription_tier === 'enterprise' ? '149.99' : user.subscription_tier === 'premium' ? '49.99' : '19.99'}
                      <span className="text-xs text-slate-500 font-medium">/mo</span>
                    </p>
                  </div>
                  {user.subscription_end_date && (
                    <p className="text-xs text-slate-400 font-medium">
                      Next billing: {new Date(user.subscription_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/pricing')}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-5 h-5 text-indigo-400" />
                      <span className="font-bold text-sm text-white">Change Plan</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-600 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => setIsSubscriptionModalOpen(true)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-red-500/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <XOctagon className="w-5 h-5 text-red-400" />
                      <span className="font-bold text-sm text-white group-hover:text-red-400 transition-colors">Manage Subscription</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-600 group-hover:translate-x-1 group-hover:text-red-400 transition-all" />
                  </button>

                  {/* Stripe Connect Payout Dashboard */}
                  <button
                    onClick={handleOpenStripeDashboard}
                    disabled={isConnectLoading}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-600/10 border border-emerald-500/30 hover:bg-emerald-600/20 transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-emerald-400" />
                      <div className="text-left">
                        <span className="font-bold text-sm text-white block">
                          {connectStatus?.onboardingComplete ? 'Manage Payouts' : 'Set Up Payouts'}
                        </span>
                        {connectStatus?.onboardingComplete && (
                          <span className="text-[10px] text-emerald-400 font-medium">Bank account & payout settings</span>
                        )}
                      </div>
                    </div>
                    <ExternalLink size={16} className="text-emerald-600 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isPro && (
            <div className="bg-indigo-600 rounded-[40px] p-8 text-white relative overflow-hidden group shadow-2xl shadow-indigo-600/30">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:scale-125 transition-transform duration-700" />
              <h3 className="font-black mb-2 text-2xl tracking-tighter">Nexus Pro</h3>
              <p className="text-sm text-indigo-100 mb-6 leading-relaxed font-medium">Create your own events and discover more. Only $19.99/mo.</p>
              <button
                onClick={() => navigate('/pricing')}
                className="w-full bg-white text-indigo-600 font-black py-4 rounded-2xl text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl active:scale-95"
              >
                Upgrade Plan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Subscription Management Modal */}
      {isSubscriptionModalOpen && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setIsSubscriptionModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black tracking-tighter">Manage Subscription</h2>
                <button onClick={() => setIsSubscriptionModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500">
                  <X />
                </button>
              </div>

              <div className="space-y-6">
                {/* Current Plan Info */}
                <div className={`p-6 rounded-3xl border-2 ${
                  user.subscription_tier === 'enterprise'
                    ? 'bg-orange-600/10 border-orange-500/30'
                    : user.subscription_tier === 'premium'
                    ? 'bg-emerald-600/10 border-emerald-500/30'
                    : 'bg-indigo-600/10 border-indigo-500/30'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className={`font-black text-2xl tracking-tighter ${
                        user.subscription_tier === 'enterprise'
                          ? 'text-orange-400'
                          : user.subscription_tier === 'premium'
                          ? 'text-emerald-400'
                          : 'text-indigo-400'
                      }`}>
                        {user.subscription_tier === 'enterprise' ? 'Enterprise' : user.subscription_tier === 'premium' ? 'Premium' : 'Pro'} Plan
                      </h3>
                      <p className="text-sm text-slate-400 font-medium mt-1">
                        €{user.subscription_tier === 'enterprise' ? '149.99' : user.subscription_tier === 'premium' ? '49.99' : '19.99'}/month
                      </p>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-xs font-black uppercase ${
                      user.subscription_status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {user.subscription_status}
                    </div>
                  </div>
                  {user.subscription_end_date && (
                    <p className="text-xs text-slate-400 font-medium">
                      {user.subscription_status === 'active' ? 'Renews' : 'Expires'} on {new Date(user.subscription_end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {/* Warning Box */}
                <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-3xl space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                    <div className="space-y-2">
                      <h4 className="font-black text-sm text-red-400">Cancel Subscription</h4>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        Cancelling will downgrade your account to the Free tier at the end of your billing period. You'll lose access to:
                      </p>
                      <ul className="text-xs text-slate-400 space-y-1 ml-4 list-disc">
                        <li>Event creation capabilities</li>
                        <li>Advanced analytics & insights</li>
                        <li>Premium features & customization</li>
                        {user.subscription_tier === 'enterprise' && <li>White-label branding & dedicated support</li>}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/pricing')}
                    className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Change to Different Plan
                  </button>
                  
                  <button
                    onClick={async () => {
                      if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) return;
                      
                      setIsCancelling(true);
                      try {
                        const { supabase } = await import('../services/supabase');
                        const { error } = await supabase.functions.invoke('cancel-subscription', {
                          body: { userId: user.id }
                        });
                        
                        if (error) throw error;
                        
                        alert('Subscription cancelled. You will retain access until ' + new Date(user.subscription_end_date!).toLocaleDateString());
                        setIsSubscriptionModalOpen(false);
                        window.location.reload();
                      } catch (error) {
                        console.error('Cancel error:', error);
                        alert('Failed to cancel subscription. Please contact support.');
                      } finally {
                        setIsCancelling(false);
                      }
                    }}
                    disabled={isCancelling}
                    className="w-full py-4 rounded-2xl bg-red-600/10 border-2 border-red-500/30 text-red-400 font-black text-xs uppercase tracking-widest hover:bg-red-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCancelling ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <XOctagon className="w-4 h-4" /> Cancel Subscription
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setIsSubscriptionModalOpen(false)}
                    className="w-full py-3 rounded-2xl text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Keep My Subscription
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Beta Tester Report Modal */}
      {showBetaReport && (
        <div className="fixed inset-0 z-[2150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setShowBetaReport(false)} />
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="p-8">
              <BetaTesterReport user={user} onClose={() => setShowBetaReport(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="p-10 space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black tracking-tighter">Edit Identity</h2>
                {/* Fixed: Added missing X import */}
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500"><X /></button>
              </div>

              <div className="space-y-8">
                {/* Avatar & Basic Info */}
                <div className="flex flex-col sm:flex-row gap-8 items-center">
                   <div className="relative group">
                      <img src={tempUser.avatar} className="w-24 h-24 rounded-[32px] border-2 border-slate-800 shadow-xl" alt="" />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="absolute inset-0 bg-black/40 rounded-[32px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer disabled:cursor-not-allowed"
                      >
                        {isUploadingAvatar ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                        ) : (
                          <Upload className="w-6 h-6 text-white" />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                   </div>
                   <div className="flex-1 space-y-4 w-full">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                         <input 
                           type="text" 
                           value={tempUser.name}
                           onChange={(e) => setTempUser({...tempUser, name: e.target.value})}
                           className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-3 text-white outline-none focus:border-indigo-500"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Location</label>
                         <input 
                           type="text" 
                           value={tempUser.location}
                           onChange={(e) => setTempUser({...tempUser, location: e.target.value})}
                           className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-3 text-white outline-none focus:border-indigo-500"
                           placeholder="City, Country"
                         />
                      </div>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Biography</label>
                   <textarea 
                     value={tempUser.bio}
                     onChange={(e) => setTempUser({...tempUser, bio: e.target.value})}
                     className="w-full bg-slate-950 border border-slate-800 rounded-3xl px-6 py-4 text-white outline-none focus:border-indigo-500 min-h-[120px]"
                     placeholder="Tell the world about yourself..."
                   />
                </div>

                {/* Tiered Customization: Branding */}
                {isPro ? (
                  <div className="p-8 bg-indigo-600/5 border border-indigo-500/20 rounded-[40px] space-y-6">
                    <div className="flex items-center gap-3">
                      {/* Fixed: Added missing Zap import */}
                      <Zap className="w-5 h-5 text-indigo-400" />
                      <h3 className="font-black text-sm uppercase tracking-widest">Nexus Elite Customization</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Theme Primary Color</label>
                        <div className="flex gap-4 items-center">
                          <input 
                            type="color" 
                            value={tempUser.branding?.primaryColor || '#6366f1'}
                            onChange={(e) => setTempUser({...tempUser, branding: { ...tempUser.branding!, primaryColor: e.target.value, accentColor: tempUser.branding?.accentColor || '#818cf8' }})}
                            className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer"
                          />
                          <span className="font-mono text-xs text-slate-400">{tempUser.branding?.primaryColor}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Banner Image</label>
                        <div className="flex items-center gap-4">
                          {tempUser.branding?.bannerUrl && (
                            <img 
                              src={tempUser.branding.bannerUrl} 
                              alt="Banner preview" 
                              className="w-32 h-10 object-cover rounded-lg border border-slate-700"
                            />
                          )}
                          <label className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl hover:border-indigo-500 transition-all">
                              <ImageIcon className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {isUploadingBanner ? 'Uploading...' : tempUser.branding?.bannerUrl ? 'Change Banner' : 'Upload Banner'}
                              </span>
                            </div>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleBannerUpload}
                              disabled={isUploadingBanner}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-slate-500 ml-1">Recommended: 1200×400px, max 10MB (auto-compressed)</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Public Tagline</label>
                       <input 
                         type="text" 
                         value={tempUser.branding?.tagline}
                         onChange={(e) => setTempUser({...tempUser, branding: { ...tempUser.branding!, tagline: e.target.value, primaryColor: tempUser.branding?.primaryColor || '#6366f1', accentColor: tempUser.branding?.accentColor || '#818cf8' }})}
                         className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-3 text-white outline-none focus:border-indigo-500 text-sm"
                         placeholder="One line to define your brand"
                       />
                    </div>

                    {/* Enterprise: White-Label Landing Page Configuration */}
                    {user.subscription_tier === 'enterprise' && (
                      <div className="p-8 bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/30 rounded-3xl space-y-6 mt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Globe className="w-5 h-5 text-purple-400" />
                            <h3 className="font-black text-sm uppercase tracking-widest text-purple-300">White-Label Landing Page</h3>
                          </div>
                          {user.agencySlug && (
                            <a 
                              href={`/#/agency/${user.agencySlug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-white text-xs font-bold transition-all"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View Public Page
                            </a>
                          )}
                        </div>

                        {/* Public URL Status */}
                        <div className="p-6 bg-gradient-to-r from-emerald-500/10 to-purple-500/10 border border-emerald-500/30 rounded-2xl space-y-3">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                            <div>
                              <div className="text-sm font-black text-white">Your Page is Live! 🎉</div>
                              <div className="text-xs text-slate-400 mt-1">Publicly accessible at:</div>
                            </div>
                          </div>
                          {user.agencySlug && (
                            <div className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-xl">
                              <code className="flex-1 text-sm text-purple-300 font-mono">
                                {window.location.origin}/#/agency/{user.agencySlug}
                              </code>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/#/agency/${user.agencySlug}`);
                                  alert('Link copied to clipboard!');
                                }}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-xs font-bold text-white transition-all"
                              >
                                Copy Link
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Agency Name Display */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agency Name (Public Display)</label>
                          <div className="p-4 bg-slate-900/50 border border-purple-500/30 rounded-xl">
                            <div className="text-2xl font-black text-white">{user.name || 'Your Agency'}</div>
                            <p className="text-xs text-slate-500 mt-1">This is displayed as your agency name on the public page</p>
                          </div>
                        </div>

                        {/* URL Configuration */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Public URL Slug</label>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-sm">eventnexus.eu/#/agency/</span>
                              <input 
                                type="text" 
                                value={tempUser.agencySlug || ''}
                                onChange={(e) => {
                                  const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
                                  setTempUser({...tempUser, agencySlug: slug});
                                }}
                                className="flex-1 px-4 py-2 bg-slate-900/70 border border-purple-500/30 rounded-xl text-white text-sm font-mono outline-none focus:border-purple-400"
                                placeholder="your-agency-name"
                              />
                            </div>
                            <p className="text-[10px] text-slate-500 ml-1">Your unique URL path (letters, numbers, and dashes only)</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custom Domain (Optional)</label>
                          <input 
                            type="text" 
                            value={tempUser.branding?.customDomain || ''}
                            onChange={(e) => setTempUser({...tempUser, branding: { ...tempUser.branding!, customDomain: e.target.value, primaryColor: tempUser.branding?.primaryColor || '#6366f1', accentColor: tempUser.branding?.accentColor || '#818cf8' }})}
                            className="w-full bg-slate-900/50 border border-purple-500/30 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-purple-400"
                            placeholder="events.yourbrand.com"
                          />
                          <p className="text-[10px] text-slate-500 ml-1">Point your own domain to your landing page</p>
                        </div>

                        {/* Hero Type Selection */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hero Section Type</label>
                          <div className="grid grid-cols-3 gap-3">
                            {['image', 'video', 'slideshow'].map((type) => (
                              <button
                                key={type}
                                onClick={() => setTempUser({
                                  ...tempUser, 
                                  branding: { 
                                    ...tempUser.branding!, 
                                    pageConfig: {
                                      ...tempUser.branding?.pageConfig,
                                      heroType: type as any
                                    }
                                  }
                                })}
                                className={`p-4 rounded-xl border-2 transition-all ${
                                  tempUser.branding?.pageConfig?.heroType === type
                                    ? 'border-purple-500 bg-purple-500/20'
                                    : 'border-slate-700 bg-slate-900/30 hover:border-slate-600'
                                }`}
                              >
                                <div className="text-xs font-bold text-white capitalize">{type}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Display Toggles */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Page Sections</label>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { key: 'showStats', label: 'Statistics Bar' },
                              { key: 'showEventHighlights', label: 'Event Highlights' },
                              { key: 'showTestimonials', label: 'Testimonials' },
                              { key: 'showTeam', label: 'Team Section' },
                              { key: 'showPartners', label: 'Partners Grid' },
                              { key: 'showMediaCoverage', label: 'Media Coverage' },
                            ].map((section) => (
                              <label key={section.key} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl cursor-pointer hover:bg-slate-900/70 transition-all">
                                <input
                                  type="checkbox"
                                  checked={tempUser.branding?.pageConfig?.[section.key] !== false}
                                  onChange={(e) => setTempUser({
                                    ...tempUser,
                                    branding: {
                                      ...tempUser.branding!,
                                      pageConfig: {
                                        ...tempUser.branding?.pageConfig,
                                        [section.key]: e.target.checked
                                      }
                                    }
                                  })}
                                  className="w-4 h-4 rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-xs text-slate-300 font-medium">{section.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Landing Page Bio */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Landing Page Bio (Public "About" Section)</label>
                          <textarea 
                            value={tempUser.branding?.about || tempUser.bio || ''}
                            onChange={(e) => setTempUser({
                              ...tempUser,
                              branding: {
                                ...tempUser.branding!,
                                about: e.target.value
                              }
                            })}
                            className="w-full bg-slate-900/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-400 min-h-[120px]"
                            placeholder="Tell your story... What makes your events special? What's your mission? This will be displayed on your public landing page."
                          />
                          <p className="text-[10px] text-slate-500 ml-1">This rich description appears in the "About" section of your public page (defaults to your bio if empty)</p>
                        </div>

                        {/* Video Reel URL */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agency Video Reel URL</label>
                          <input 
                            type="url" 
                            value={tempUser.branding?.videoReel || ''}
                            onChange={(e) => setTempUser({
                              ...tempUser,
                              branding: {
                                ...tempUser.branding!,
                                videoReel: e.target.value
                              }
                            })}
                            className="w-full bg-slate-900/50 border border-purple-500/30 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-purple-400"
                            placeholder="https://example.com/video.mp4"
                          />
                          <p className="text-[10px] text-slate-500 ml-1">Video URL for your agency reel/showcase</p>
                        </div>

                        {/* Features Toggles */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Interactive Features</label>
                          <div className="space-y-2">
                            <label className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl cursor-pointer hover:bg-slate-900/70 transition-all">
                              <input
                                type="checkbox"
                                checked={tempUser.branding?.pageConfig?.enableChat !== false}
                                onChange={(e) => setTempUser({
                                  ...tempUser,
                                  branding: {
                                    ...tempUser.branding!,
                                    pageConfig: {
                                      ...tempUser.branding?.pageConfig,
                                      enableChat: e.target.checked
                                    }
                                  }
                                })}
                                className="w-4 h-4 rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                              />
                              <div className="flex-1">
                                <div className="text-xs text-white font-medium">Contact Form</div>
                                <div className="text-[10px] text-slate-500">Allow visitors to send direct inquiries</div>
                              </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl cursor-pointer hover:bg-slate-900/70 transition-all">
                              <input
                                type="checkbox"
                                checked={tempUser.branding?.pageConfig?.enableNewsletter !== false}
                                onChange={(e) => setTempUser({
                                  ...tempUser,
                                  branding: {
                                    ...tempUser.branding!,
                                    pageConfig: {
                                      ...tempUser.branding?.pageConfig,
                                      enableNewsletter: e.target.checked
                                    }
                                  }
                                })}
                                className="w-4 h-4 rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                              />
                              <div className="flex-1">
                                <div className="text-xs text-white font-medium">Newsletter Signup</div>
                                <div className="text-[10px] text-slate-500">Inner Circle email collection</div>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="pt-4 border-t border-slate-700 space-y-3">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quick Actions</div>
                          <div className="grid grid-cols-2 gap-3">
                            <a 
                              href={`/#/agency/${user.agencySlug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-bold text-white transition-all border border-slate-700"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Preview Page
                            </a>
                            <button 
                              onClick={() => window.open('/docs/ENTERPRISE_CUSTOMIZATION_GUIDE.md', '_blank')}
                              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-bold text-white transition-all border border-slate-700"
                            >
                              <Globe className="w-4 h-4" />
                              Setup Guide
                            </button>
                          </div>
                        </div>

                        {/* Help Text */}
                        <div className="flex items-start gap-3 p-4 bg-purple-500/10 rounded-2xl">
                          <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                          <div className="text-[11px] text-slate-300 space-y-1">
                            <div className="font-bold text-purple-300">White-Label Features Activated</div>
                            <div>• Public landing page with custom branding</div>
                            <div>• Event showcase with your design</div>
                            <div>• Team, partners, and testimonials sections</div>
                            <div>• Media coverage and event highlights</div>
                            <div>• Custom domain support (configure in DNS)</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 bg-slate-800/20 border border-slate-800 rounded-[40px] text-center space-y-4">
                     <p className="text-slate-500 text-sm font-medium">Upgrade to Pro to unlock custom colors, banners, and verified branding on your profile.</p>
                     <button className="text-indigo-400 font-black text-[10px] uppercase tracking-widest hover:underline">View Plans</button>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl bg-slate-800 text-slate-400 font-black text-xs uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Save Changes

                        {/* Ticket modal removed; using dedicated route */}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TicketItem = ({ name, date, location, qrValue, customBranding }: any) => {
  const brandColor = customBranding?.primaryColor || '#6366f1';
  const brandLogo = customBranding?.logo;
  
  return (
    <div className={`p-8 flex flex-col sm:flex-row items-center gap-8 group transition-all relative overflow-hidden hover:bg-slate-800/20`}>
      {/* Premium Custom Branding Indicator */}
      {customBranding && (
        <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1">
          <Star className="w-3 h-3 fill-current" /> Premium Event
        </div>
      )}
      
      <div className="w-24 h-24 bg-white p-2.5 rounded-[24px] shadow-2xl shrink-0" style={customBranding ? { backgroundColor: brandColor } : {}}>
        <div className="w-full h-full bg-slate-950 flex items-center justify-center rounded-xl">
           {brandLogo ? (
             <img src={brandLogo} alt="Brand" className="w-12 h-12 rounded-lg object-cover" />
           ) : (
             <div className="w-10 h-10 rounded-sm" style={{ backgroundColor: brandColor }} />
           )}
        </div>
      </div>

      <div className="flex-1 text-center sm:text-left space-y-1">
        <h4 className="font-black text-2xl tracking-tighter text-white">{name}</h4>
        <div className="space-y-1">
          <p className="text-sm font-bold flex items-center justify-center sm:justify-start gap-2" style={customBranding ? { color: brandColor } : { color: '#818cf8' }}>
            <Calendar className="w-4 h-4" /> {date}
          </p>
          <p className="text-xs text-slate-400 font-bold flex items-center justify-center sm:justify-start gap-2">
            <MapPin className="w-4 h-4" style={customBranding ? { color: brandColor } : { color: '#6366f1' }} /> {location}
          </p>
        </div>
      </div>

      <div className="flex flex-row sm:flex-col gap-3">
         <button className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all text-slate-400">
            <Download className="w-5 h-5" />
         </button>
         <button className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all text-slate-400">
            <Share2 className="w-5 h-5" />
         </button>
      </div>
    </div>
  );
};

export default UserProfile;
