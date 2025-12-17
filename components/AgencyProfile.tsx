
import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Globe, Twitter, Instagram, Share2, MapPin, Calendar, 
  ShieldCheck, Zap, ExternalLink, UserPlus, UserMinus,
  Mail, Users, Award, Link as LinkIcon, Ticket, ArrowRight,
  Star, Play, Layout, Sparkles, Headphones, Camera, Music, 
  Volume2, Lightbulb, Briefcase, Globe2
} from 'lucide-react';
import { User, EventNexusEvent } from '../types';
import { MOCK_EVENTS } from '../constants';
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
  
  // In a real app, this would fetch the agency by the slug.
  // For demo, we use the currentUser's data if it matches or a default mock agency.
  const organizer: Partial<User> = useMemo(() => {
    if (currentUser?.agencySlug === slug) return currentUser;
    
    return {
      id: 'u2',
      name: 'Rivera Productions',
      bio: 'Pioneering immersive experiences across the global Nexus network. We specialize in transforming industrial spaces into cultural hubs through light, sound, and flavor. Our events are more than gatherings—they are shared memories written in light.',
      avatar: 'https://picsum.photos/seed/rivera/200',
      subscription: 'enterprise',
      location: 'New York, NY',
      branding: {
        primaryColor: '#6366f1',
        accentColor: '#10b981',
        tagline: 'Orchestrating the Extraordinary.',
        bannerUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop',
        customDomain: 'rivera.nexus.events',
        socialLinks: {
          twitter: 'riveraprod',
          instagram: 'rivera_events',
          website: 'rivera.events'
        },
        services: [
          { id: 's1', icon: 'Volume2', name: 'Heli-Audio Design', desc: 'Custom soundscapes for industrial spaces.' },
          { id: 's2', icon: 'Lightbulb', name: 'Visual Mapping', desc: 'Projection mapping and custom lighting rigs.' },
          { id: 's3', icon: 'Briefcase', name: 'Node Strategy', desc: 'Strategic event placement and map promotion.' },
          { id: 's4', icon: 'Headphones', name: 'Artist Booking', desc: 'Access to elite Nexus-exclusive artists.' }
        ]
      }
    };
  }, [slug, currentUser]);

  const agencyEvents = useMemo(() => MOCK_EVENTS.filter(e => e.organizerId === organizer.id), [organizer.id]);
  const isFollowing = currentUser?.followedOrganizers.includes(organizer.id!) || false;
  const brandColor = organizer.branding?.primaryColor || '#6366f1';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Visual Manifesto (Hero) */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={organizer.branding?.bannerUrl} 
            className="w-full h-full object-cover opacity-50 scale-105 animate-ken-burns" 
            alt="Hero"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/60 to-slate-950" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 text-center space-y-10">
           <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-2xl border border-white/10 px-6 py-2 rounded-full mb-4 animate-in fade-in slide-in-from-top-4 duration-700">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Verified Agency Shard</span>
           </div>
           <h1 className="text-8xl md:text-[12rem] font-black tracking-tighter leading-none animate-in fade-in slide-in-from-bottom-8 duration-1000 text-white">
             {organizer.name}
           </h1>
           <p className="text-2xl md:text-3xl text-slate-300 font-bold max-w-3xl mx-auto leading-tight opacity-80">
             {organizer.branding?.tagline}
           </p>
           <div className="flex flex-wrap items-center justify-center gap-6 pt-12">
              <button 
                onClick={() => onToggleFollow(organizer.id!)}
                className={`px-12 py-6 rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl active:scale-95 flex items-center gap-3 ${
                  isFollowing ? 'bg-white text-slate-950' : 'bg-indigo-600 text-white shadow-indigo-600/40'
                }`}
                style={!isFollowing ? { backgroundColor: brandColor } : {}}
              >
                {isFollowing ? <><UserMinus size={20} /> Leave Movement</> : <><UserPlus size={20} /> Join Movement</>}
              </button>
              <button className="px-12 py-6 rounded-3xl bg-slate-900/60 backdrop-blur-md border border-slate-800 font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-3 text-white">
                 <Play size={20} /> Agency Reel
              </button>
           </div>
        </div>
      </section>

      {/* Corporate Manifesto & Services */}
      <section className="max-w-7xl mx-auto px-4 py-32 space-y-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
           <div className="space-y-8">
              <h2 className="text-5xl font-black tracking-tighter text-white">The Experience Architecture.</h2>
              <p className="text-2xl text-slate-400 leading-relaxed font-medium">
                {organizer.bio}
              </p>
              <div className="pt-6">
                <button className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-colors">
                   Inquire for Partnership <ArrowRight size={18} />
                </button>
              </div>
           </div>
           <div className="grid grid-cols-2 gap-6">
              {organizer.branding?.services?.map((s, i) => (
                <div key={i} className="p-8 bg-slate-900 border border-slate-800 rounded-[40px] space-y-4 hover:border-indigo-500/50 transition-all group">
                   <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                      {IconMap[s.icon] || <Zap />}
                   </div>
                   <h4 className="font-black text-white uppercase text-xs tracking-widest">{s.name}</h4>
                   <p className="text-sm text-slate-500 font-medium leading-relaxed">{s.desc}</p>
                </div>
              ))}
           </div>
        </div>

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

      {/* Newsletter / Inner Circle */}
      <section className="bg-indigo-600 py-32 overflow-hidden relative">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
         <div className="max-w-4xl mx-auto px-4 text-center space-y-12 relative z-10">
            <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none">
               Inner Circle.
            </h2>
            <p className="text-indigo-100 text-xl font-medium max-w-2xl mx-auto opacity-80">
               Direct pipeline for secret location drops and private pre-sale keys for {organizer.name} nodes.
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
