/**
 * EXAMPLE: How to integrate UI translations into existing components
 * This file shows step-by-step how to add multilingual support
 */

// ============================================
// STEP 1: Import the translation hook
// ============================================
import { useTranslation } from '../i18n/useTranslation';
import { UILanguageSelector } from './UILanguageSelector';

// ============================================
// STEP 2: Use translations in your component
// ============================================

// BEFORE (hardcoded English):
const NavbarBefore = () => {
  return (
    <nav>
      <a href="/">Home</a>
      <a href="/events">Events</a>
      <a href="/map">Map</a>
      <button>Sign In</button>
      <button>Sign Up</button>
    </nav>
  );
};

// AFTER (with translations):
const NavbarAfter = () => {
  const t = useTranslation(); // Get translations
  
  return (
    <nav>
      <a href="/">{t.nav.home}</a>
      <a href="/events">{t.nav.events}</a>
      <a href="/map">{t.nav.map}</a>
      <button>{t.nav.signIn}</button>
      <button>{t.nav.signUp}</button>
      
      {/* Add language selector */}
      <UILanguageSelector compact={true} />
    </nav>
  );
};

// ============================================
// STEP 3: Forms with translations
// ============================================

// BEFORE:
const LoginFormBefore = () => {
  return (
    <form>
      <label>Email</label>
      <input type="email" placeholder="Enter your email" />
      
      <label>Password</label>
      <input type="password" placeholder="Enter your password" />
      
      <button type="submit">Sign In</button>
      <button type="button">Cancel</button>
      
      <a href="/forgot-password">Forgot Password?</a>
      <p>Don't have an account? <a href="/signup">Sign Up</a></p>
    </form>
  );
};

// AFTER:
const LoginFormAfter = () => {
  const t = useTranslation();
  
  return (
    <form>
      <label>{t.auth.email}</label>
      <input type="email" placeholder={t.auth.email} />
      
      <label>{t.auth.password}</label>
      <input type="password" placeholder={t.auth.password} />
      
      <button type="submit">{t.auth.signIn}</button>
      <button type="button">{t.common.cancel}</button>
      
      <a href="/forgot-password">{t.auth.forgotPassword}</a>
      <p>{t.auth.noAccount} <a href="/signup">{t.auth.signUp}</a></p>
    </form>
  );
};

// ============================================
// STEP 4: Dashboard with translations
// ============================================

// BEFORE:
const DashboardBefore = ({ stats }: any) => {
  return (
    <div>
      <h1>Dashboard</h1>
      
      <div className="stats">
        <div>
          <h3>Total Events</h3>
          <p>{stats.totalEvents}</p>
        </div>
        <div>
          <h3>Upcoming Events</h3>
          <p>{stats.upcomingEvents}</p>
        </div>
        <div>
          <h3>Past Events</h3>
          <p>{stats.pastEvents}</p>
        </div>
      </div>
      
      <button>Create Event</button>
      <button>View Analytics</button>
    </div>
  );
};

// AFTER:
const DashboardAfter = ({ stats }: any) => {
  const t = useTranslation();
  
  return (
    <div>
      <h1>{t.dashboard.title}</h1>
      
      <div className="stats">
        <div>
          <h3>{t.dashboard.totalEvents}</h3>
          <p>{stats.totalEvents}</p>
        </div>
        <div>
          <h3>{t.dashboard.upcomingEvents}</h3>
          <p>{stats.upcomingEvents}</p>
        </div>
        <div>
          <h3>{t.dashboard.pastEvents}</h3>
          <p>{stats.pastEvents}</p>
        </div>
      </div>
      
      <button>{t.events.createNew}</button>
      <button>{t.dashboard.analytics}</button>
    </div>
  );
};

// ============================================
// STEP 5: Landing Page Hero
// ============================================

// BEFORE:
const HeroBefore = () => {
  return (
    <div>
      <h1>Discover Your Next Experience</h1>
      <p>Find amazing events near you. From concerts to conferences.</p>
      <button>Get Started Free</button>
      <button>Explore Events</button>
    </div>
  );
};

// AFTER:
const HeroAfter = () => {
  const t = useTranslation();
  
  return (
    <div>
      <h1>{t.landing.hero.title}</h1>
      <p>{t.landing.hero.subtitle}</p>
      <button>{t.landing.hero.ctaPrimary}</button>
      <button>{t.landing.hero.ctaSecondary}</button>
    </div>
  );
};

// ============================================
// STEP 6: Event List with translations
// ============================================

// BEFORE:
const EventListBefore = ({ events }: any) => {
  return (
    <div>
      <h2>Events</h2>
      
      <div className="filters">
        <select>
          <option>Category</option>
          <option>Music</option>
          <option>Sports</option>
        </select>
        
        <input type="date" placeholder="Date" />
        <input type="text" placeholder="Location" />
        <button>Filter</button>
      </div>
      
      {events.length === 0 ? (
        <p>No events found</p>
      ) : (
        events.map((event: any) => (
          <div key={event.id}>
            <h3>{event.name}</h3>
            <p>{event.price > 0 ? `$${event.price}` : 'Free'}</p>
            <button>View Details</button>
          </div>
        ))
      )}
      
      <button>Load More</button>
    </div>
  );
};

// AFTER:
const EventListAfter = ({ events }: any) => {
  const t = useTranslation();
  
  return (
    <div>
      <h2>{t.events.title}</h2>
      
      <div className="filters">
        <select>
          <option>{t.events.category}</option>
          <option>Music</option>
          <option>Sports</option>
        </select>
        
        <input type="date" placeholder={t.events.date} />
        <input type="text" placeholder={t.events.location} />
        <button>{t.common.filter}</button>
      </div>
      
      {events.length === 0 ? (
        <p>{t.events.noEventsFound}</p>
      ) : (
        events.map((event: any) => (
          <div key={event.id}>
            <h3>{event.name}</h3>
            <p>{event.price > 0 ? `$${event.price}` : t.events.free}</p>
            <button>{t.common.viewDetails}</button>
          </div>
        ))
      )}
      
      <button>{t.events.loadMore}</button>
    </div>
  );
};

// ============================================
// STEP 7: Complete App.tsx Navigation Example
// ============================================

const AppNavigationExample = () => {
  const t = useTranslation();
  
  return (
    <nav className="navbar">
      {/* Logo */}
      <div className="logo">
        <Link to="/">EventNexus</Link>
      </div>
      
      {/* Main Navigation */}
      <div className="nav-links">
        <Link to="/">{t.nav.home}</Link>
        <Link to="/events">{t.nav.events}</Link>
        <Link to="/map">{t.nav.map}</Link>
        <Link to="/communities">{t.nav.communities}</Link>
        <Link to="/blog">{t.nav.blog}</Link>
      </div>
      
      {/* User Menu */}
      <div className="user-menu">
        {user ? (
          <>
            <Link to="/dashboard">{t.nav.dashboard}</Link>
            <Link to="/profile">{t.nav.profile}</Link>
            <Link to="/create">{t.nav.createEvent}</Link>
            <button onClick={handleLogout}>{t.nav.signOut}</button>
          </>
        ) : (
          <>
            <button onClick={openAuthModal}>{t.nav.signIn}</button>
            <button onClick={openAuthModal}>{t.nav.signUp}</button>
          </>
        )}
        
        {/* Language Selector */}
        <UILanguageSelector compact={true} theme="dark" />
      </div>
    </nav>
  );
};

// ============================================
// STEP 8: Settings Page with Language Selector
// ============================================

const SettingsPageExample = () => {
  const t = useTranslation();
  
  return (
    <div className="settings-page">
      <h1>{t.profile.settings}</h1>
      
      <section>
        <h2>{t.profile.account}</h2>
        <form>
          <label>{t.forms.name}</label>
          <input type="text" />
          
          <label>{t.auth.email}</label>
          <input type="email" />
          
          <button type="submit">{t.common.save}</button>
          <button type="button">{t.common.cancel}</button>
        </form>
      </section>
      
      <section>
        <h2>{t.profile.language}</h2>
        <p className="help-text">
          Choose your preferred language for the platform interface
        </p>
        {/* Full language selector for settings page */}
        <UILanguageSelector compact={false} theme="dark" />
      </section>
      
      <section>
        <h2>{t.profile.notifications}</h2>
        {/* Notification settings... */}
      </section>
      
      <section>
        <h2>{t.profile.security}</h2>
        {/* Security settings... */}
      </section>
    </div>
  );
};

// ============================================
// TRANSLATION KEY REFERENCE
// ============================================

/**
 * Available translation keys:
 * 
 * NAVIGATION:
 * - t.nav.home
 * - t.nav.events
 * - t.nav.map
 * - t.nav.dashboard
 * - t.nav.profile
 * - t.nav.settings
 * - t.nav.signIn
 * - t.nav.signUp
 * - t.nav.signOut
 * - t.nav.createEvent
 * 
 * LANDING PAGE:
 * - t.landing.hero.title
 * - t.landing.hero.subtitle
 * - t.landing.hero.ctaPrimary
 * - t.landing.hero.ctaSecondary
 * - t.landing.features.title
 * - t.landing.features.liveMap.title
 * - t.landing.features.liveMap.description
 * 
 * COMMON:
 * - t.common.loading
 * - t.common.save
 * - t.common.cancel
 * - t.common.delete
 * - t.common.edit
 * - t.common.search
 * - t.common.filter
 * - t.common.viewDetails
 * 
 * EVENTS:
 * - t.events.title
 * - t.events.createNew
 * - t.events.upcoming
 * - t.events.past
 * - t.events.category
 * - t.events.date
 * - t.events.location
 * - t.events.free
 * - t.events.noEventsFound
 * 
 * AUTH:
 * - t.auth.signIn
 * - t.auth.signUp
 * - t.auth.email
 * - t.auth.password
 * - t.auth.forgotPassword
 * - t.auth.noAccount
 * 
 * FORMS:
 * - t.forms.name
 * - t.forms.description
 * - t.forms.required
 * - t.forms.optional
 * 
 * DASHBOARD:
 * - t.dashboard.title
 * - t.dashboard.totalEvents
 * - t.dashboard.upcomingEvents
 * - t.dashboard.pastEvents
 */

export {
  NavbarAfter,
  LoginFormAfter,
  DashboardAfter,
  HeroAfter,
  EventListAfter,
  AppNavigationExample,
  SettingsPageExample
};
