
import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Twitter, Instagram, Linkedin, Facebook, Github, Mail, Globe, ShieldCheck } from 'lucide-react';

// Define helper components before the main Footer component to ensure they are available
// and use PropsWithChildren to explicitly allow children in the props type, fixing TS errors.
const FooterLink = ({ to, children }: React.PropsWithChildren<{ to: string }>) => (
  <li>
    <Link to={to} className="text-slate-400 hover:text-white text-sm font-semibold transition-colors">
      {children}
    </Link>
  </li>
);

const SocialLink = ({ icon, href }: { icon: React.ReactNode, href: string }) => (
  <a 
    href={href} 
    target="_blank" 
    rel="noopener noreferrer" 
    className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
    aria-label={`Visit EventNexus on ${href.includes('facebook') ? 'Facebook' : href.includes('instagram') ? 'Instagram' : href.includes('linkedin') ? 'LinkedIn' : 'social media'}`}
  >
    {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
  </a>
);

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-2 font-bold text-2xl tracking-tighter text-white">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Compass className="w-6 h-6 text-white" />
              </div>
              <span>EventNexus</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs font-medium">
              Discover, Create, and Experience Events — Anywhere, Anytime. The world's first map-first discovery engine.
            </p>
            <div className="flex items-center gap-4">
              <SocialLink icon={<Facebook />} href="https://www.facebook.com/profile.php?id=61585668350154" />
              <SocialLink icon={<Instagram />} href="https://www.instagram.com/blogpieesti/" />
              <SocialLink icon={<Linkedin />} href="https://www.linkedin.com/company/eventnexus-eu" />
            </div>
          </div>

          {/* Platform Links */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Platform</h4>
            <ul className="space-y-4">
              <FooterLink to="/map">Event Map</FooterLink>
              <FooterLink to="/create">Host an Event</FooterLink>
              <FooterLink to="/pricing">Pricing & Plans</FooterLink>
              <FooterLink to="/dashboard">Organizer Hub</FooterLink>
            </ul>
          </div>

          {/* Support & Legal */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Governance</h4>
            <ul className="space-y-4">
              <FooterLink to="/help">Help Center</FooterLink>
              <FooterLink to="/terms">Terms of Service</FooterLink>
              <FooterLink to="/privacy">Privacy Policy</FooterLink>
              <FooterLink to="/cookies">Cookie Settings</FooterLink>
              <FooterLink to="/gdpr">GDPR Compliance</FooterLink>
            </ul>
          </div>

          {/* Contact / Newsletter */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Nexus Updates</h4>
            <p className="text-slate-400 text-xs font-medium">Subscribe for early access to secret events and organizer tips.</p>
            <div className="relative group">
              <input 
                type="email" 
                placeholder="email@nexus.com" 
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-indigo-500 transition-all"
              />
              <button className="absolute right-2 top-2 bottom-2 bg-indigo-600 px-4 rounded-xl text-[10px] font-black uppercase text-white shadow-lg">Join</button>
            </div>
          </div>
        </div>

        <div className="pt-10 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" /> © 2024 EventNexus Global. All Rights Reserved.
          </div>
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold">
               <Globe className="w-3.5 h-3.5" /> English (US)
             </div>
             <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold">
               <Mail className="w-3.5 h-3.5" /> support@mail.eventnexus.eu
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
