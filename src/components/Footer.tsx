
import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Twitter, Instagram, Linkedin, Facebook, Github, Mail, Globe, ShieldCheck, Rss, MessageCircle } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

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
    aria-label={`Visit EventNexus on ${href.includes('facebook') ? 'Facebook' : href.includes('instagram') ? 'Instagram' : href.includes('linkedin') ? 'LinkedIn' : href.includes('reddit') ? 'Reddit' : 'social media'}`}
  >
    {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
  </a>
);

const Footer: React.FC = () => {
  const t = useTranslation();
  
  return (
    <footer className="bg-slate-950 border-t border-slate-900 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-2 font-bold text-2xl tracking-tighter text-white" aria-label="EventNexus home">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Compass className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <span>EventNexus</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs font-medium">
              {t.landing.footer.tagline}
            </p>
            <div className="flex items-center gap-4">
              <SocialLink icon={<Facebook />} href="https://www.facebook.com/profile.php?id=61585668350154" />
              <SocialLink icon={<Instagram />} href="https://www.instagram.com/blogpieesti/" />
              <SocialLink icon={<Linkedin />} href="https://www.linkedin.com/company/eventnexus-eu" />
              <SocialLink icon={<MessageCircle />} href="https://www.reddit.com/r/EventNexus/" />
            </div>
          </div>

          {/* Platform Links */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{t.landing.footer.platform}</h4>
            <ul className="space-y-4">
              <FooterLink to="/browse">{t.landing.footer.browseEvents}</FooterLink>
              <FooterLink to="/map">{t.landing.footer.eventMap}</FooterLink>
              <FooterLink to="/create">{t.landing.footer.hostEvent}</FooterLink>
              <FooterLink to="/pricing">{t.landing.footer.pricingPlans}</FooterLink>
              <FooterLink to="/dashboard">{t.landing.footer.organizerHub}</FooterLink>
              <FooterLink to="/blog">{t.landing.footer.blogNews}</FooterLink>
            </ul>
          </div>

          {/* Support & Legal */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{t.landing.footer.governance}</h4>
            <ul className="space-y-4">
              <FooterLink to="/help">{t.landing.footer.helpCenter}</FooterLink>
              <FooterLink to="/terms">{t.landing.footer.terms}</FooterLink>
              <FooterLink to="/privacy">{t.landing.footer.privacy}</FooterLink>
              <FooterLink to="/cookies">{t.landing.footer.cookieSettings}</FooterLink>
              <FooterLink to="/gdpr">{t.landing.footer.gdprCompliance}</FooterLink>
            </ul>
            <div className="pt-4 border-t border-slate-900 space-y-3">
              <h5 className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{t.landing.footer.rssFeeds}</h5>
              <div className="flex flex-col gap-2">
                <a 
                  href="https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/feed" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 text-xs font-medium transition-colors"
                  aria-label="RSS feed for events and blog posts"
                >
                  <Rss className="w-3.5 h-3.5" />
                  <span>{t.landing.footer.rss}</span>
                </a>
                <a 
                  href="https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/feed?format=atom" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 text-xs font-medium transition-colors"
                  aria-label="Atom feed for events and blog posts"
                >
                  <Rss className="w-3.5 h-3.5" />
                  <span>{t.landing.footer.atom}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Contact / Newsletter */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{t.landing.footer.nexusUpdates}</h4>
            <p className="text-slate-400 text-xs font-medium">{t.landing.footer.subscribeText}</p>
            <div className="relative group">
              <input 
                type="email" 
                placeholder={t.landing.footer.emailPlaceholder}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-indigo-500 transition-all"
                aria-label="Email address for newsletter updates"
              />
              <button className="absolute right-2 top-2 bottom-2 bg-indigo-600 px-4 rounded-xl text-[10px] font-black uppercase text-white shadow-lg" aria-label="Subscribe to newsletter">{t.landing.footer.joinButton}</button>
            </div>
          </div>
        </div>

        <div className="pt-10 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4" /> {t.landing.footer.allRightsReserved}
            </div>
            <div className="text-slate-500 text-[10px] font-medium">
              {t.landing.footer.addressLabel}
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-6">
             <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold">
               <Globe className="w-3.5 h-3.5" /> {t.landing.footer.language}
             </div>
             <div className="flex flex-col gap-1">
               <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold">
                 <Mail className="w-3.5 h-3.5" /> {t.landing.footer.contactEmail}
               </div>
               <div className="text-slate-600 text-[9px] font-medium">
                 {t.landing.footer.responseTime}
               </div>
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
