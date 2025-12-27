
import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Globe, Twitter, Instagram, Share2, MapPin, Calendar, 
  ShieldCheck, Zap, ExternalLink, UserPlus, UserMinus,
  Mail, Users, Award, Link as LinkIcon, Ticket, ArrowRight,
  Star, Play, Layout, Sparkles, Headphones, Camera, Music, 
  Volume2, Lightbulb, Briefcase, Globe2, Loader2, TrendingUp,
  DollarSign, UserCheck, Target, MessageCircle, Quote, Image,
  Video, ChevronLeft, ChevronRight, Building2, Newspaper, BarChart3,
  Facebook, Linkedin
} from 'lucide-react';
import { User, EventNexusEvent } from '../types';
import { getEvents, getUserBySlug, getOrganizerRatings, OrganizerRatingStats } from '../services/dbService';
import { sendContactInquiry } from '../services/emailService';
import Footer from './Footer';

interface AgencyProfileProps {
  user: User | null;
  onToggleFollow: (orgId: string) => void;
}

// Icon mapper for dynamic services
const IconMap: any = {
  Volume2: <Volume2 />,
  Lightbulb: <Lightbulb />,
  Briefcase: <Briefcase />,
  Headphones: <Headphones />,
  Camera: <Camera />,
  Music: <Music />,
  Globe2: <Globe2 />,
  Sparkles: <Sparkles />
};

const AgencyProfile: React.FC<AgencyProfileProps> = ({ user: currentUser, onToggleFollow }) => {
  const { slug } = useParams();
  const [events, setEvents] = useState<EventNexusEvent[]>([]);
  const [organizer, setOrganizer] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showVideoReel, setShowVideoReel] = useState(false);
  const [ratings, setRatings] = useState<any[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  
  // Load events and organizer from database
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log('🔍 AgencyProfile: Loading organizer with slug:', slug);
        
        // First, try to get organizer by slug
        const fetchedOrganizer = await getUserBySlug(slug!);
        
        console.log('📦 AgencyProfile: Fetched organizer:', fetchedOrganizer ? {
          id: fetchedOrganizer.id,
          name: fetchedOrganizer.name,
          tier: fetchedOrganizer.subscription_tier,
          agencySlug: fetchedOrganizer.agencySlug,
          agency_slug: fetchedOrganizer.agency_slug
        } : 'NULL');
        
        if (!fetchedOrganizer) {
          console.error('❌ AgencyProfile: Organizer not found for slug:', slug);
          setError('Organizer not found');
          setIsLoading(false);
          return;
        }
        
        setOrganizer(fetchedOrganizer);
        
        // Load ratings
        setLoadingRatings(true);
        const organizerRatings = await getOrganizerRatings(fetchedOrganizer.id);
        setRatings(organizerRatings.slice(0, 5)); // Top 5 reviews
        setLoadingRatings(false);
        
        // Then load all events
        const allEvents = await getEvents();
        setEvents(allEvents);
        console.log(`✅ AgencyProfile: Loaded ${allEvents.length} events`);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load organizer data');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (slug) {
      loadData();
    }
  }, [slug]);
  
  const agencyEvents = useMemo(() => {
    if (!organizer) return [];
    return events.filter(e => e.organizerId === organizer.id);
  }, [events, organizer]);
  
  const isFollowing = useMemo(() => {
    if (!currentUser || !organizer) return false;
    return currentUser.followedOrganizers.includes(organizer.id);
  }, [currentUser, organizer]);
  
  const brandColor = organizer?.branding?.primaryColor || '#6366f1';
  const isEnterprise = useMemo(() => {
    if (!organizer) return false;
    const tier = organizer.subscription_tier || organizer.subscription || 'free';
    return tier === 'enterprise';
  }, [organizer]);
  
  // Auto-rotate testimonials
  useEffect(() => {
    if (!organizer?.branding?.testimonials?.length) return;
    const interval = setInterval(() => {
      setCurrentTestimonial(prev => 
        (prev + 1) % (organizer.branding?.testimonials?.length || 1)
      );
    }, 6000);
    return () => clearInterval(interval);
  }, [organizer?.branding?.testimonials]);
  
  // Auto-rotate hero slideshow for Enterprise
  useEffect(() => {
    if (!isEnterprise || !organizer?.branding?.pageConfig) return;
    const config = organizer.branding.pageConfig;
    if (config.heroType !== 'slideshow' || !Array.isArray(config.heroMedia)) return;
    
    const interval = setInterval(() => {
      setHeroSlideIndex(prev => (prev + 1) % config.heroMedia.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isEnterprise, organizer?.branding?.pageConfig]);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="text-center space-y-6">
          <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto" />
          <p className="text-slate-400 text-lg font-medium">Loading organizer profile...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !organizer) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="w-24 h-24 bg-slate-900 rounded-[32px] flex items-center justify-center mx-auto border border-slate-800">
            <ShieldCheck className="w-12 h-12 text-slate-600" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl font-black tracking-tighter text-white">Organizer Not Found</h1>
            <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-lg mx-auto">
              The organizer profile you're looking for doesn't exist or has been removed.
            </p>
          </div>

          <div className="pt-6">
            <Link 
              to="/map" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
            >
              <Globe2 className="w-4 h-4" /> Explore Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Gate free users from having public profiles
  const organizerTier = organizer.subscription_tier || organizer.subscription || 'free';
  if (organizerTier === 'free') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="w-24 h-24 bg-slate-900 rounded-[32px] flex items-center justify-center mx-auto border border-slate-800">
            <Zap className="w-12 h-12 text-orange-500" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl font-black tracking-tighter text-white">Upgrade Required</h1>
            <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-lg mx-auto">
              Public organizer profiles are a <span className="text-indigo-400 font-bold">Pro feature</span>. Upgrade to showcase your events, build your brand, and grow your audience professionally.
            </p>
            <div className="bg-slate-900/50 rounded-2xl p-6 mt-6">
              <p className="text-sm text-slate-300 font-semibold mb-3">Pro Tier Benefits:</p>
              <ul className="text-left text-sm text-slate-400 space-y-2">
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400" /> Public organizer profile page</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400" /> Custom branding & colors</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400" /> Build follower base</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400" /> Professional credibility</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-4 justify-center pt-6">
            <Link 
              to="/pricing" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
            >
              <Sparkles className="w-4 h-4" /> Upgrade to Pro
            </Link>
            <Link 
              to="/map" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
            >
              <Globe2 className="w-4 h-4" /> Explore Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Custom Domain Notice (if configured) */}
      {isEnterprise && organizer.branding?.customDomain && (
        <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 border-b border-purple-500/20 py-3 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-sm text-purple-300">
              <span className="font-black">🌐 Custom Domain:</span> This page can also be accessed via{' '}
              <code className="font-mono bg-purple-900/30 px-2 py-1 rounded">{organizer.branding.customDomain}</code>
              {' '}(DNS configuration required)
            </p>
          </div>
        </div>
      )}
      
      {/* Visual Manifesto (Hero) - Enhanced for Enterprise */}
      <section className="relative min-h-screen h-screen flex items-center justify-center overflow-hidden">
        {isEnterprise && organizer.branding?.pageConfig?.heroType === 'video' ? (
          <div className="absolute inset-0 z-0">
            <video 
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-full h-full object-cover opacity-60"
            >
              <source src={(organizer.branding.pageConfig.heroMedia as string) || organizer.branding.videoReel || organizer.branding.bannerUrl} type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/60 to-slate-950" />
          </div>
        ) : isEnterprise && organizer.branding?.pageConfig?.heroType === 'slideshow' && Array.isArray(organizer.branding.pageConfig.heroMedia) && organizer.branding.pageConfig.heroMedia.length > 0 ? (
          <div className="absolute inset-0 z-0">
            {organizer.branding.pageConfig.heroMedia.map((img, idx) => (
              <img 
                key={idx}
                src={img} 
                className={`absolute inset-0 w-full h-full object-cover opacity-50 transition-opacity duration-1000 ${
                  idx === heroSlideIndex ? 'opacity-50' : 'opacity-0'
                }`}
                alt={`Hero ${idx + 1}`}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/60 to-slate-950" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0">
            <img 
              src={(typeof organizer.branding?.pageConfig?.heroMedia === 'string' && organizer.branding.pageConfig.heroMedia) || organizer.branding?.bannerUrl || `https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&h=1080&fit=crop`} 
              className="w-full h-full object-cover opacity-50 scale-105 animate-ken-burns" 
              alt="Hero"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/60 to-slate-950" />
          </div>
        )}

        <div className="relative z-10 max-w-6xl mx-auto px-4 text-center space-y-6 sm:space-y-8 md:space-y-10">
           <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-2xl border border-white/10 px-6 py-2 rounded-full mb-4 animate-in fade-in slide-in-from-top-4 duration-700">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">
                {isEnterprise ? 'Enterprise Verified Agency' : 'Verified Agency Shard'}
              </span>
           </div>
           <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[12rem] font-black tracking-tighter leading-none animate-in fade-in slide-in-from-bottom-8 duration-1000 text-white">
             {organizer.name}
           </h1>
           <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-slate-300 font-bold max-w-3xl mx-auto leading-tight opacity-80">
             {organizer.branding?.tagline || organizer.bio || 'Creating memorable experiences for communities worldwide'}
           </p>
           
           {/* Enterprise Stats Bar */}
           {isEnterprise && organizer.branding?.stats && organizer.branding.pageConfig?.showStats !== false && (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto pt-8">
               <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6">
                 <div className="text-4xl font-black text-white">{organizer.branding.stats.totalEvents}+</div>
                 <div className="text-xs uppercase tracking-wider text-slate-400 mt-2">Events</div>
               </div>
               <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6">
                 <div className="text-4xl font-black text-white">{(organizer.branding.stats.totalAttendees / 1000).toFixed(0)}K+</div>
                 <div className="text-xs uppercase tracking-wider text-slate-400 mt-2">Attendees</div>
               </div>
               <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6">
                 <div className="text-4xl font-black text-white">{organizer.branding.stats.averageRating}</div>
                 <div className="text-xs uppercase tracking-wider text-slate-400 mt-2">Rating</div>
               </div>
               <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6">
                 <div className="text-4xl font-black text-white">{organizer.branding.stats.activeYears}+</div>
                 <div className="text-xs uppercase tracking-wider text-slate-400 mt-2">Years</div>
               </div>
             </div>
           )}
           
           <div className="flex flex-wrap items-center justify-center gap-6 pt-12">
              <button 
                onClick={() => organizer?.id && onToggleFollow(organizer.id)}
                className={`px-12 py-6 rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl active:scale-95 flex items-center gap-3 ${
                  isFollowing ? 'bg-white text-slate-950' : 'bg-indigo-600 text-white shadow-indigo-600/40'
                }`}
                style={!isFollowing ? { backgroundColor: brandColor } : {}}
              >
                {isFollowing ? <><UserMinus size={20} /> Leave Movement</> : <><UserPlus size={20} /> Join Movement</>}
              </button>
              {organizer.branding?.videoReel && (
                <button 
                  onClick={() => setShowVideoReel(true)}
                  className="px-12 py-6 rounded-3xl bg-slate-900/60 backdrop-blur-md border border-slate-800 font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-3 text-white"
                >
                   <Play size={20} /> Agency Reel
                </button>
              )}
              {isEnterprise && organizer.branding?.pageConfig?.enableContactForm && (
                <button 
                  onClick={() => setShowContactForm(true)}
                  className="px-12 py-6 rounded-3xl bg-slate-900/60 backdrop-blur-md border border-slate-800 font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-3 text-white"
                >
                   <MessageCircle size={20} /> Contact Us
                </button>
              )}
           </div>
           
           {/* Social Share Buttons */}
           {((isEnterprise && organizer.branding?.pageConfig?.enableSocialSharing !== false) || (!isEnterprise && organizer.branding?.pageConfig?.enableSocialSharing)) && (
             <div className="flex items-center gap-4 justify-center">
               <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Share:</span>
               <div className="flex gap-3">
                 <button
                   onClick={() => {
                     const url = window.location.href;
                     window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Check out ${organizer.name}!`)}`, '_blank', 'width=550,height=420');
                   }}
                   className="w-10 h-10 rounded-full bg-slate-900/60 backdrop-blur-md border border-slate-800 flex items-center justify-center hover:bg-sky-500 hover:border-sky-500 transition-all group"
                   title="Share on X (Twitter)"
                 >
                   <Twitter size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                 </button>
                 <button
                   onClick={() => {
                     const url = window.location.href;
                     window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=550,height=420');
                   }}
                   className="w-10 h-10 rounded-full bg-slate-900/60 backdrop-blur-md border border-slate-800 flex items-center justify-center hover:bg-blue-600 hover:border-blue-600 transition-all group"
                   title="Share on Facebook"
                 >
                   <Facebook size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                 </button>
                 <button
                   onClick={() => {
                     const url = window.location.href;
                     window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'width=550,height=420');
                   }}
                   className="w-10 h-10 rounded-full bg-slate-900/60 backdrop-blur-md border border-slate-800 flex items-center justify-center hover:bg-blue-700 hover:border-blue-700 transition-all group"
                   title="Share on LinkedIn"
                 >
                   <Linkedin size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                 </button>
                 <button
                   onClick={() => {
                     navigator.clipboard.writeText(window.location.href);
                     alert('✓ Link copied to clipboard!');
                   }}
                   className="w-10 h-10 rounded-full bg-slate-900/60 backdrop-blur-md border border-slate-800 flex items-center justify-center hover:bg-indigo-600 hover:border-indigo-600 transition-all group"
                   title="Copy Link"
                 >
                   <LinkIcon size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                 </button>
               </div>
             </div>
           )}
        </div>
      </section>

      {/* Enterprise Event Highlights Section */}
      {isEnterprise && organizer.branding?.eventHighlights && organizer.branding.eventHighlights.length > 0 && organizer.branding.pageConfig?.showEventHighlights !== false && (
        <section className="max-w-7xl mx-auto px-4 py-32">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black tracking-tighter text-white mb-4">Event Highlights.</h2>
            <p className="text-slate-400 text-xl">Our most memorable experiences</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {organizer.branding.eventHighlights.map(highlight => (
              <div key={highlight.id} className="group relative bg-slate-900 border border-slate-800 rounded-[40px] overflow-hidden hover:border-indigo-500/50 transition-all">
                <div className="h-64 relative overflow-hidden">
                  {highlight.videoUrl ? (
                    <video 
                      src={highlight.videoUrl} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <img 
                      src={highlight.imageUrl} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      alt={highlight.title}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                </div>
                <div className="p-8 space-y-4">
                  <h3 className="text-2xl font-black text-white">{highlight.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{highlight.description}</p>
                  {highlight.stats && (
                    <div className="flex gap-4 pt-4 border-t border-slate-800">
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <Users size={14} />
                        <span className="font-bold">{highlight.stats.attendance}</span>
                      </div>
                      <div className="flex items-center gap-2 text-yellow-500 text-xs">
                        <Star size={14} className="fill-current" />
                        <span className="font-bold">{highlight.stats.rating}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Corporate Manifesto & Services */}
      <section className="max-w-7xl mx-auto px-4 py-32 space-y-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
           <div className="space-y-8">
              <h2 className="text-5xl font-black tracking-tighter text-white">The Experience Architecture.</h2>
              <div className="space-y-6">
                <p className="text-2xl text-slate-400 leading-relaxed font-medium">
                  {organizer.bio || 'Creating unforgettable experiences and bringing people together through exceptional events.'}
                </p>
                {isEnterprise && organizer.branding?.about && organizer.branding.about !== organizer.bio && (
                  <div className="pt-4 border-t border-slate-800">
                    <p className="text-lg text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {organizer.branding.about}
                    </p>
                  </div>
                )}
              </div>
              <div className="pt-6 flex flex-wrap gap-4">
                {organizer.branding?.socialLinks && (
                  <>
                    {organizer.branding.socialLinks.website && (
                      <a href={organizer.branding.socialLinks.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                        <Globe size={16} /> Website
                      </a>
                    )}
                    {organizer.branding.socialLinks.twitter && (
                      <a href={organizer.branding.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                        <Twitter size={16} /> Twitter
                      </a>
                    )}
                    {organizer.branding.socialLinks.instagram && (
                      <a href={organizer.branding.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                        <Instagram size={16} /> Instagram
                      </a>
                    )}
                  </>
                )}
                <button 
                  onClick={async () => {
                    const name = prompt('Your name:');
                    if (!name) return;
                    const email = prompt('Your email:');
                    if (!email) return;
                    const message = prompt('Tell us about your partnership idea:');
                    if (!message) return;
                    
                    const success = await sendContactInquiry({
                      organizerId: organizer.id,
                      organizerName: organizer.name,
                      organizerEmail: organizer.email,
                      fromName: name,
                      fromEmail: email,
                      subject: 'Partnership Inquiry',
                      message: message,
                      type: 'partnership'
                    });
                    
                    if (success) {
                      alert('✓ Partnership inquiry sent! The organizer will contact you soon.');
                    } else {
                      alert('⚠️ Failed to send inquiry. Please try again.');
                    }
                  }}
                  className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-colors cursor-pointer"
                >
                   Inquire for Partnership <ArrowRight size={18} />
                </button>
              </div>
           </div>
           {organizer.branding?.services && organizer.branding.services.length > 0 && (
             <div className="grid grid-cols-2 gap-6">
                {organizer.branding.services.map((s, i) => (
                  <div key={i} className="p-8 bg-slate-900 border border-slate-800 rounded-[40px] space-y-4 hover:border-indigo-500/50 transition-all group">
                     <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                        {IconMap[s.icon] || <Zap />}
                     </div>
                     <h4 className="font-black text-white uppercase text-xs tracking-widest">{s.name}</h4>
                     <p className="text-sm text-slate-500 font-medium leading-relaxed">{s.desc}</p>
                  </div>
                ))}
             </div>
           )}
        </div>

        {/* Enterprise Team Section */}
        {isEnterprise && organizer.branding?.team && organizer.branding.team.length > 0 && organizer.branding.pageConfig?.showTeam !== false && (
          <div className="space-y-16">
            <div className="text-center">
              <h2 className="text-5xl font-black tracking-tighter text-white mb-4">Our Team.</h2>
              <p className="text-slate-400 text-xl">The people behind the magic</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {organizer.branding.team.map(member => (
                <div key={member.id} className="text-center space-y-4 group">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-slate-800 group-hover:border-indigo-500 transition-all">
                    <img src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&size=128&background=6366f1&color=fff`} alt={member.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-white">{member.name}</h4>
                    <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider">{member.role}</p>
                    {member.bio && <p className="text-xs text-slate-500 mt-2">{member.bio}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Node Grid (Events) */}
        <div className="space-y-16">
           <div className="flex justify-between items-end">
              <div>
                 <h2 className="text-6xl font-black tracking-tighter text-white">Active Nodes.</h2>
                 <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">Current Global Tour</p>
              </div>
              <Link to="/map" className="hidden md:flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white">
                 View All On Nexus Map <Globe2 size={16} />
              </Link>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {agencyEvents.map(event => (
                <div key={event.id} className="group bg-slate-900 border border-slate-800 rounded-[48px] overflow-hidden hover:border-indigo-500/50 transition-all shadow-2xl flex flex-col">
                  <div className="h-72 relative overflow-hidden">
                     <img src={event.imageUrl} className="w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-110" alt={event.name} />
                     <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                     <div className="absolute bottom-6 left-8 bg-white text-slate-950 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                        Tickets: ${event.price}
                     </div>
                  </div>
                  <div className="p-10 flex-1 flex flex-col justify-between space-y-8">
                     <div className="space-y-4">
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{event.category}</span>
                           <div className="flex items-center gap-1 text-yellow-500 text-xs font-black">
                              <Star size={12} className="fill-current" /> 4.9
                           </div>
                        </div>
                        <h3 className="text-3xl font-black leading-none tracking-tighter text-white">{event.name}</h3>
                        <div className="flex items-center gap-4 text-slate-500 text-xs font-bold">
                           <div className="flex items-center gap-1.5"><Calendar size={14} /> {event.date}</div>
                           <div className="flex items-center gap-1.5"><MapPin size={14} /> {event.location.city}</div>
                        </div>
                     </div>
                     <Link to={`/event/${event.id}`} className="w-full py-5 rounded-[24px] bg-slate-800 hover:bg-indigo-600 transition-all text-center font-black text-xs uppercase tracking-widest text-white shadow-xl">
                        Secure Access Shard
                     </Link>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* Enterprise Testimonials Section */}
      {isEnterprise && organizer.branding?.testimonials && organizer.branding.testimonials.length > 0 && organizer.branding.pageConfig?.showTestimonials !== false && (
        <section className="bg-slate-900/50 py-32">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-16">
              <Quote className="w-16 h-16 text-indigo-500 mx-auto mb-6" />
              <h2 className="text-5xl font-black tracking-tighter text-white mb-4">What People Say.</h2>
            </div>
            <div className="relative">
              <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-12 md:p-16">
                <div className="flex items-center gap-2 text-yellow-500 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={20} className={i < organizer.branding!.testimonials![currentTestimonial].rating ? 'fill-current' : ''} />
                  ))}
                </div>
                <p className="text-2xl text-slate-300 leading-relaxed mb-8 italic">
                  "{organizer.branding.testimonials[currentTestimonial].content}"
                </p>
                <div className="flex items-center gap-4">
                  <img 
                    src={organizer.branding.testimonials[currentTestimonial].avatar || `https://ui-avatars.com/api/?name=${organizer.branding.testimonials[currentTestimonial].author}&size=64&background=6366f1&color=fff`}
                    alt={organizer.branding.testimonials[currentTestimonial].author}
                    className="w-16 h-16 rounded-full"
                  />
                  <div>
                    <div className="text-xl font-black text-white">{organizer.branding.testimonials[currentTestimonial].author}</div>
                    <div className="text-sm text-slate-400">{organizer.branding.testimonials[currentTestimonial].role}</div>
                    {organizer.branding.testimonials[currentTestimonial].eventName && (
                      <div className="text-xs text-indigo-400 mt-1">Attended: {organizer.branding.testimonials[currentTestimonial].eventName}</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mt-8">
                {organizer.branding.testimonials.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentTestimonial(idx)}
                    className={`w-3 h-3 rounded-full transition-all ${idx === currentTestimonial ? 'bg-indigo-500 w-8' : 'bg-slate-700'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Enterprise Partners Section */}
      {isEnterprise && organizer.branding?.partners && organizer.branding.partners.length > 0 && organizer.branding.pageConfig?.showPartners !== false && (
        <section className="max-w-7xl mx-auto px-4 py-32">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black tracking-tighter text-white mb-4">Trusted Partners.</h2>
            <p className="text-slate-400 text-xl">Collaborating with industry leaders</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {organizer.branding.partners.map(partner => (
              <a 
                key={partner.id} 
                href={partner.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex items-center justify-center hover:border-indigo-500/50 transition-all group"
                title={partner.description}
              >
                <img src={partner.logo} alt={partner.name} className="w-full h-auto opacity-60 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Enterprise Media Coverage Section */}
      {isEnterprise && organizer.branding?.mediaCoverage && organizer.branding.mediaCoverage.length > 0 && organizer.branding.pageConfig?.showMediaCoverage !== false && (
        <section className="max-w-7xl mx-auto px-4 py-32">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black tracking-tighter text-white mb-4">In The Press.</h2>
            <p className="text-slate-400 text-xl">Featured across major media outlets</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {organizer.branding.mediaCoverage.map(coverage => (
              <a 
                key={coverage.id}
                href={coverage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 hover:border-indigo-500/50 transition-all group space-y-4"
              >
                {coverage.logo && (
                  <img src={coverage.logo} alt={coverage.outlet} className="h-8 object-contain opacity-60 group-hover:opacity-100 transition-opacity" />
                )}
                <h4 className="text-xl font-black text-white group-hover:text-indigo-400 transition-colors">{coverage.title}</h4>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>{coverage.outlet}</span>
                  <span>{new Date(coverage.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold">
                  Read Article <ExternalLink size={14} />
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Newsletter / Inner Circle */}
      {(!isEnterprise || (organizer.branding?.pageConfig?.enableNewsletter !== false)) && (
        <section className="bg-indigo-600 py-32 overflow-hidden relative">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
           <div className="max-w-4xl mx-auto px-4 text-center space-y-12 relative z-10">
              <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none">
                 Inner Circle.
              </h2>
              <p className="text-indigo-100 text-xl font-medium max-w-2xl mx-auto opacity-80">
                 Direct pipeline for secret location drops and private pre-sale keys for {organizer.name} events.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                 <input 
                   type="email" 
                   placeholder="nexus.key@identity.com" 
                   className="w-full sm:w-96 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl px-8 py-6 text-white font-bold placeholder:text-white/40 outline-none focus:bg-white/20" 
                 />
                 <button className="w-full sm:w-auto bg-white text-indigo-600 px-12 py-6 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all">
                    Sync Shard
                 </button>
              </div>
           </div>
        </section>
      )}

      {/* Video Reel Modal */}
      {showVideoReel && organizer.branding?.videoReel && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowVideoReel(false)}>
          <div className="relative max-w-6xl w-full aspect-video" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setShowVideoReel(false)}
              className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors z-10"
            >
              <span className="text-4xl">×</span>
            </button>
            <video 
              src={organizer.branding.videoReel}
              controls
              autoPlay
              className="w-full h-full rounded-2xl"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}

      {/* Enterprise Contact Form Modal */}
      {showContactForm && isEnterprise && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[48px] max-w-2xl w-full p-12 relative">
            <button 
              onClick={() => setShowContactForm(false)}
              className="absolute top-8 right-8 text-slate-400 hover:text-white transition-colors"
            >
              <span className="text-3xl">×</span>
            </button>
            <h3 className="text-4xl font-black text-white mb-8">Get In Touch.</h3>
            <form 
              className="space-y-6"
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmittingForm(true);
                
                try {
                  const formData = new FormData(e.currentTarget);
                  const success = await sendContactInquiry({
                    organizerId: organizer.id,
                    organizerName: organizer.name,
                    organizerEmail: organizer.email,
                    fromName: formData.get('name') as string,
                    fromEmail: formData.get('email') as string,
                    subject: formData.get('subject') as string,
                    message: formData.get('message') as string,
                    type: 'contact'
                  });
                  
                  if (success) {
                    alert('✓ Message sent successfully! The organizer will receive your inquiry via email.');
                    setShowContactForm(false);
                  } else {
                    alert('⚠️ Failed to send message. Please try again or contact the organizer directly.');
                  }
                } catch (error) {
                  console.error('Error sending contact form:', error);
                  alert('⚠️ An error occurred. Please try again later.');
                } finally {
                  setIsSubmittingForm(false);
                }
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input 
                  type="text" 
                  name="name"
                  placeholder="Your Name" 
                  required
                  className="bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-colors"
                />
                <input 
                  type="email" 
                  name="email"
                  placeholder="Your Email" 
                  required
                  className="bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <input 
                type="text" 
                name="subject"
                placeholder="Subject" 
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-colors"
              />
              <textarea 
                name="message"
                placeholder="Your Message" 
                rows={6}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-colors resize-none"
              />
              <button 
                type="submit"
                disabled={isSubmittingForm}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-8 py-6 rounded-3xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmittingForm ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Message'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ken-burns {
          0% { transform: scale(1.05); }
          100% { transform: scale(1.2); }
        }
        .animate-ken-burns { animation: ken-burns 30s infinite alternate ease-in-out; }
      `}} />
    </div>
  );
};

export default AgencyProfile;
