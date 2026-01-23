# Live Map PWA Implementation Guide

## Overview
The Live Map PWA is a real-time event discovery application that enables users to find nearby events using proximity-based geolocation and push notifications. It's designed as a progressive web app (PWA) that can be installed on any device and works offline.

## Architecture

### Core Components

#### 1. **useGeolocation Hook** (`src/hooks/useGeolocation.ts`)
- **Purpose**: Provides continuous GPS tracking via `navigator.geolocation.watchPosition()`
- **Features**:
  - Real-time latitude/longitude updates
  - Accuracy tracking (in meters)
  - Error handling (permission denied, unavailable, timeout)
  - 5-second maximum age for fresh position data
  - Automatic cleanup on unmount
- **Returns**:
  ```typescript
  {
    coords: { lat, lng, accuracy, timestamp },
    error: string | null,
    isLoading: boolean
  }
  ```

#### 2. **useWebNotifications Hook** (`src/hooks/useWebNotifications.ts`)
- **Purpose**: Manages Web Notifications API and service worker integration
- **Features**:
  - Requests browser notification permission
  - Sends notifications via service worker (background support)
  - Handles notification click events
  - Prevents duplicate notifications by tag
  - Graceful fallback if notifications unsupported
- **Returns**:
  ```typescript
  {
    isSupported: boolean,
    permission: NotificationPermission,
    requestPermission: () => Promise<boolean>,
    sendNotification: (options) => boolean,
    isGranted: boolean
  }
  ```

#### 3. **LiveMapApp Component** (`src/components/LiveMapApp.tsx`)
- **Purpose**: Main UI for event discovery via proximity radar
- **Features**:
  - Interactive Leaflet map with user location marker
  - Radius circle visualization (100m - 50km)
  - Real-time event markers with color coding by category
  - Category filter grid (8 categories)
  - Event detail slide-up panel
  - Buy ticket integration (Stripe checkout)
  - Auto-refresh every 30 seconds
  - Notification tracking and badges
- **Auth Gating**: Routes to LandingPage if user not logged in

### Service Worker Enhancement (`public/service-worker.js`)
- **New Features**:
  - Message handler for app-to-worker communication
  - `SHOW_NOTIFICATION` message type support
  - Notification click event handler
  - Navigation to event detail page on notification click
  - Background notification display
  - Tag-based notification deduplication

### App Routing Integration (`src/App.tsx`)
- **Route**: `/live-map`
- **Auth Gating**: Requires user login (redirects to LandingPage otherwise)
- **Sidebar Entry**: "Live Map" with Radar icon
- **Lazy Loading**: Reduces initial bundle size

## Feature Details

### 1. Proximity Radar Integration
- **Edge Function**: `proximity-radar` (existing)
- **Input Parameters**:
  ```typescript
  {
    user_id: string,
    lat: number,
    lng: number,
    radius_km: number,
    categories: string[],
    lang: string
  }
  ```
- **Output**: Array of events with distance calculations
- **Throttle**: 30-second minimum interval between requests

### 2. Radius Slider
- **Range**: 0.1 km (100m) to 50 km
- **Step**: 0.1 km (100m increments)
- **Display Format**:
  - Below 1 km: "100m", "500m", etc.
  - 1 km and above: "1km", "5km", "50km", etc.

### 3. Category Filtering
- **Available Categories**:
  1. 🎵 Music
  2. ⚽ Sports
  3. 🎨 Arts
  4. 💻 Tech
  5. 🍽️ Food
  6. 🌙 Nightlife
  7. 💼 Business
  8. 📚 Education

- **UI**: Grid of toggleable filter buttons
- **Multiple Selection**: Users can select any combination

### 4. Real-Time Notifications
- **Trigger**: New events entering the proximity radius
- **Limit**: Up to 3 notifications per update cycle
- **Notification Content**:
  ```
  Title: 🎯 Event Found: {event_name}
  Body: {distance} away • {event_date}
  Icon: Event image or favicon
  ```
- **Interactive**: Click to navigate to event detail page

### 5. Event Detail Panel
- **Slide-up UI**: Appears from bottom of screen
- **Information**:
  - Event name, image, category
  - Description
  - Location with map pin icon
  - Date/time with lightning icon
  - Distance from user
  - Button group: Buy Ticket, Like (heart), Share
- **Buy Ticket Flow**:
  1. User clicks "Buy Ticket"
  2. App calls `create-checkout` Edge Function
  3. Stripe session created
  4. User redirected to checkout
  5. Post-purchase ticket stored in user profile

## User Flow

### First-Time Setup
1. User navigates to `/live-map`
2. Component requests geolocation permission
3. Browser prompts for location access
4. Once granted, map centers on user location
5. Proximity radar automatically fetches events
6. User can adjust radius and filter categories

### Notification Permission
1. Optional: User clicks "Enable notifications"
2. Browser prompts for notification permission
3. Once granted:
   - Notifications badge appears in control panel
   - App sends notifications for new events
   - Notifications persist with count badge

### Event Discovery
1. User adjusts radius slider (100m - 50km)
2. Map updates with event markers
3. Proximity radar queries run every 30s (throttled)
4. New events trigger notifications (if enabled)
5. User clicks event marker or notification
6. Event detail panel slides up
7. User reviews event and purchases ticket

## Technical Implementation

### State Management
```typescript
const [radiusKm, setRadiusKm] = useState(5);                    // Current search radius
const [selectedCategories, setSelectedCategories] = useState(['music', 'sports']); // Active filters
const [proximityEvents, setProximityEvents] = useState([]); // Events from radar
const [selectedEvent, setSelectedEvent] = useState(null);   // Currently viewed event
const [showEventDetail, setShowEventDetail] = useState(false); // Detail panel visibility
const [isBuyingTicket, setIsBuyingTicket] = useState(false);    // Checkout loading
const [notificationCount, setNotificationCount] = useState(0);  // Badge count
const [lastUpdate, setLastUpdate] = useState(0);                // Rate limiting
```

### Hooks Order (Critical for Production)
1. `useGeolocation()` - for GPS tracking
2. `useWebNotifications()` - for notification API
3. All `useState()` declarations
4. All `useEffect()` declarations
5. All `useCallback()` declarations
6. All `useMemo()` declarations

### Key Functions

#### `fetchProximityEvents()`
- Called automatically on location/settings change
- Throttled to 30-second intervals
- Detects new events and sends notifications
- Updates map markers

#### `handleBuyTicket()`
- Invokes `create-checkout` Edge Function
- Passes event_id, user_id, quantity
- Redirects to Stripe on success
- Shows error alert on failure

#### `handleCategoryToggle()`
- Toggles category in filter array
- Triggers immediate radar refresh
- Updates event markers

### PWA Features

#### Manifest Entry (`public/manifest.webmanifest`)
```json
{
  "name": "EventNexus Live Map",
  "short_name": "Live Map",
  "description": "Discover nearby events in real-time",
  "start_url": "./live-map?source=pwa",
  "icons": [...]
}
```

#### Service Worker Support
- Offline access to cached pages
- Background notification display
- Message passing from app to worker
- Notification click handling with navigation

#### Install Prompt
- Browser shows "Add to Home Screen" or "Install App"
- Users can install like native app
- Standalone mode (fullscreen, no address bar)
- Auto-launch to `/live-map?source=pwa`

## Performance Optimizations

### Throttling
- Proximity radar: 30-second minimum interval
- Prevents excessive API calls
- Location updates: Every 5 seconds (watchPosition)

### Lazy Loading
- Component loaded only when route accessed
- Reduces initial bundle size
- Geolocation initialized on demand

### Memory Management
- Event subscription cleanup on unmount
- Auto-cleanup of geolocation watchers
- Notification count reset strategy

### Notification Limit
- Maximum 3 notifications per update
- Additional events tracked in badge
- Prevents notification spam

## Troubleshooting

### Geolocation Issues
**Problem**: "Location Access Denied"
**Solution**: 
- Check browser permissions
- For localhost: Requires HTTPS (except localhost)
- For production: Must be HTTPS
- Reset permissions in browser settings

### Notifications Not Appearing
**Problem**: No notifications despite enabling
**Solution**:
- Check browser notification permissions
- Ensure service worker registered
- Verify browser supports Notifications API
- Check browser notification settings for domain

### Map Not Loading
**Problem**: Blank/grey map area
**Solution**:
- Verify Leaflet library loaded
- Check OpenStreetMap tile server availability
- Inspect console for CORS errors
- Verify map container has dimensions

### Proximity Radar No Results
**Problem**: No events showing despite location active
**Solution**:
- Check selected categories (try all)
- Increase radius (try 50km)
- Verify events exist in database
- Check proximity-radar function logs

## Deployment Checklist

- [ ] `useGeolocation` hook deployed
- [ ] `useWebNotifications` hook deployed
- [ ] `LiveMapApp` component deployed
- [ ] Service worker message handlers added
- [ ] `/live-map` route added to App.tsx
- [ ] Sidebar navigation link added
- [ ] Lazy loading configured
- [ ] Build succeeds without errors
- [ ] Testing on actual device (mobile recommended)
- [ ] Geolocation permission prompt working
- [ ] Notifications permission working
- [ ] Event markers appearing on map
- [ ] Radius slider functioning (100m - 50km)
- [ ] Category filters working
- [ ] Ticket purchase flow complete
- [ ] Notification badges showing correctly
- [ ] Service worker registered

## API Integration

### proximity-radar Edge Function
- **Endpoint**: `supabase.functions.invoke('proximity-radar')`
- **Method**: POST
- **Requires**: Service role for unauthenticated access (if needed)
- **Rate Limit**: App-side throttle 30s

### create-checkout Edge Function
- **Endpoint**: `supabase.functions.invoke('create-checkout')`
- **Payload**: `{ event_id, user_id, quantity }`
- **Response**: `{ url: string }` (Stripe checkout URL)

## Browser Support

- **Modern Browsers**: ✅ Full support
- **iOS Safari**: ⚠️ Limited notifications (iOS 16+)
- **Android Chrome**: ✅ Full support including Web Push
- **Firefox**: ✅ Full support
- **Edge**: ✅ Full support

## Security Considerations

1. **Auth Gating**: `/live-map` requires user login
2. **User ID**: Proximity queries include `user_id` for analytics
3. **Service Role**: `proximity-radar` may use service role (bypass auth)
4. **Notification Data**: Event IDs safe in notification clicks
5. **HTTPS Only**: Geolocation and notifications require secure context

## Future Enhancements

- [ ] Real-time subscriptions for live event updates
- [ ] Advanced map clustering for dense event areas
- [ ] Custom notification sounds
- [ ] Event sharing with social media
- [ ] Saved search preferences
- [ ] Event alerts based on criteria
- [ ] Analytics dashboard for organizers
- [ ] Proximity-based special offers/discounts
- [ ] Friend/nearby indicator
- [ ] Event recommendations based on history

## Testing Recommendations

### Manual Testing Checklist
- [ ] Geolocation accuracy on mobile device
- [ ] Notification permissions flow
- [ ] Notifications appear and are clickable
- [ ] Map panning and zooming smooth
- [ ] Radius slider responsive (0.1 - 50 km)
- [ ] Category filters toggle smoothly
- [ ] Event detail panel slides up/down
- [ ] Ticket purchase redirects to Stripe
- [ ] PWA install prompt shows on supported browsers
- [ ] Offline functionality works (cached pages)

### Edge Cases
- [ ] User denies geolocation permission
- [ ] Proximity radar returns no results
- [ ] User rapidly changes radius (throttle test)
- [ ] Notifications disabled in browser settings
- [ ] Multiple rapid category changes
- [ ] Network connection drops during checkout
- [ ] Service worker offline mode fallback

---

**Last Updated**: 2024-01
**Version**: 1.0
**Status**: Production Ready ✅
