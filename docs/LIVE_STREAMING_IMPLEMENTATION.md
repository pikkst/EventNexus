# Live Streaming & Online Events - Implementation Guide

## 📋 Overview

EventNexus now supports **live online events** for **Premium** and **Enterprise** tier users. This feature enables event organizers to host virtual events with live streaming, real-time chat, interactive polls, and comprehensive analytics.

---

## ✨ Features by Tier

### Premium Tier (€49.99/month)
- ✅ Create online and hybrid events
- ✅ Up to 500 concurrent viewers per stream
- ✅ Live chat with real-time messaging
- ✅ Interactive polls during streams
- ✅ Stream recording and replay
- ✅ Detailed streaming analytics
- ✅ Ticket sales for online events

### Enterprise Tier (€149.99/month)
- ✅ All Premium features +
- ✅ **Unlimited concurrent viewers**
- ✅ Multi-platform streaming (simultaneous)
- ✅ White-label streaming player
- ✅ AI-powered chat moderation
- ✅ Custom branding on player
- ✅ Advanced geographic analytics

---

## 🏗️ Architecture

### Database Schema

**New Tables:**
- `live_stream_analytics` - Real-time metrics for streams
- `live_stream_sessions` - Individual viewer sessions
- `live_chat_messages` - Chat messages during streams
- `live_polls` - Interactive polls
- `live_reactions` - Emoji reactions

**New Columns in `events` table:**
```sql
- is_online (BOOLEAN) - Legacy compatibility flag
- event_type (VARCHAR) - 'physical' | 'online' | 'hybrid'
- streaming_url (TEXT) - Direct URL to live stream
- streaming_platform (VARCHAR) - 'youtube' | 'vimeo' | 'twitch' | 'zoom' | 'custom'
- streaming_embed_code (TEXT) - Custom embed code
- max_online_attendees (INTEGER) - Viewer limit
- requires_registration (BOOLEAN) - Ticket required?
- stream_starts_at (TIMESTAMPTZ) - Stream start time
- stream_ends_at (TIMESTAMPTZ) - Stream end time
- replay_available (BOOLEAN) - Recording available?
- replay_url (TEXT) - URL to replay
```

### Components

**1. LiveStreamPlayer** (`/src/components/LiveStreamPlayer.tsx`)
- Embeds streams from YouTube, Vimeo, Twitch, Zoom, or custom RTMP
- Real-time viewer count display
- Auto-detects platform and generates embed code
- Handles stream status (upcoming, live, ended)
- Fullscreen support

**2. LiveChat** (`/src/components/LiveChat.tsx`)
- Real-time messaging with Supabase real-time
- Emoji reactions
- Message pinning (organizer)
- Message moderation (organizer)
- User avatars and timestamps

### TypeScript Types

All streaming-related types are defined in [src/types.ts](src/types.ts):
```typescript
- EventType
- StreamingPlatform
- LiveStreamAnalytics
- LiveStreamSession
- LiveChatMessage
- LivePoll
- LiveReaction
```

---

## 🚀 Getting Started

### 1. Database Migration

Run the migration to add streaming support:

```bash
# In Supabase SQL Editor
supabase/migrations/20260202_add_live_streaming_support.sql
```

This creates:
- All streaming tables
- RLS policies for security
- Database functions for analytics
- Triggers for real-time updates

### 2. Update Tier Configuration

The `SUBSCRIPTION_TIERS` in [src/constants.tsx](src/constants.tsx) now includes streaming limits:

```typescript
premium: {
  liveStreaming: true,
  maxConcurrentViewers: 500,
  streamingAnalytics: true,
  liveChat: true,
  livePolls: true,
  streamRecording: true,
}
```

### 3. Create an Online Event

**Event Creation Form** should include:

```tsx
// Event Type Selection
<select name="event_type">
  <option value="physical">In-Person Event</option>
  <option value="online">Online Event</option>
  <option value="hybrid">Hybrid Event</option>
</select>

// If event_type === 'online' or 'hybrid', show:
<input 
  type="text" 
  name="streaming_url" 
  placeholder="https://youtube.com/watch?v=..."
/>

<select name="streaming_platform">
  <option value="youtube">YouTube Live</option>
  <option value="vimeo">Vimeo Live</option>
  <option value="twitch">Twitch</option>
  <option value="zoom">Zoom Meeting</option>
  <option value="custom">Custom RTMP/HLS</option>
</select>

<input 
  type="number" 
  name="max_online_attendees" 
  placeholder="Max viewers (leave empty for unlimited)"
/>
```

### 4. Display Stream on Event Page

```tsx
import LiveStreamPlayer from '@/components/LiveStreamPlayer';
import LiveChat from '@/components/LiveChat';

// In your event detail page:
{event.event_type !== 'physical' && (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Main stream player */}
    <div className="lg:col-span-2">
      <LiveStreamPlayer 
        event={event}
        showChat={false}
        showAnalytics={true}
        autoplay={false}
      />
    </div>
    
    {/* Live chat sidebar */}
    <div>
      <LiveChat
        eventId={event.id}
        currentUser={user}
        isOrganizer={user?.id === event.organizerId}
      />
    </div>
  </div>
)}
```

---

## 📊 Analytics Tracking

### Real-Time Metrics

The system automatically tracks:
- **Concurrent viewers** (updated every 10 seconds)
- **Total unique viewers**
- **Average watch time**
- **Peak viewers**
- **Chat messages count**
- **Reactions count**
- **Geographic distribution**
- **Stream quality metrics**

### Database Functions

**Get current viewers:**
```sql
SELECT get_concurrent_viewers('event_id_here');
```

**Update analytics manually:**
```sql
SELECT update_stream_analytics('event_id_here');
```

**Trigger (automatic):**
- Analytics update automatically when sessions change
- Runs on INSERT/UPDATE/DELETE of `live_stream_sessions`

---

## 🔐 Tier Restrictions

### Enforcement Logic

```typescript
// Check if user can create online events
const canCreateOnlineEvent = (user: User): boolean => {
  const tier = SUBSCRIPTION_TIERS[user.subscription_tier];
  return tier.liveStreaming === true;
};

// Check viewer limit
const canAddViewer = (event: EventNexusEvent, currentViewers: number): boolean => {
  if (!event.max_online_attendees) return true; // Unlimited
  return currentViewers < event.max_online_attendees;
};
```

### UI Gating

```tsx
{/* Show upgrade prompt if user tries to create online event */}
{!canCreateOnlineEvent(user) && (
  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
    <p className="text-amber-300">
      🎥 Live streaming requires Premium or Enterprise tier
    </p>
    <button onClick={handleUpgrade}>Upgrade Now</button>
  </div>
)}
```

---

## 🎬 Supported Platforms

### YouTube Live
- URL: `https://youtube.com/watch?v=VIDEO_ID`
- Embed: Automatic via iframe
- Features: Full player controls, quality selection

### Vimeo Live
- URL: `https://vimeo.com/VIDEO_ID`
- Embed: Automatic via iframe
- Features: Custom player styling

### Twitch
- URL: `https://twitch.tv/CHANNEL_NAME`
- Embed: Automatic via iframe
- Features: Chat integration, low latency

### Zoom
- URL: Zoom meeting link
- Display: Join button (no embed)
- Features: Direct meeting link

### Custom RTMP/HLS
- URL: `rtmp://` or `.m3u8` playlist
- Player: HTML5 video with Video.js
- Features: Full control, custom branding

---

## 🧪 Testing Guide

### 1. Create Test Event
```typescript
const testEvent: EventNexusEvent = {
  id: 'test-event-id',
  name: 'Live Coding Session',
  event_type: 'online',
  streaming_url: 'https://youtube.com/watch?v=jfKfPfyJRdk', // Rick Astley test
  streaming_platform: 'youtube',
  max_online_attendees: 100,
  requires_registration: true,
  stream_starts_at: new Date().toISOString(),
  // ... other event fields
};
```

### 2. Test Player
- Verify embed loads correctly
- Check live indicator appears
- Confirm viewer count updates
- Test fullscreen mode

### 3. Test Chat
- Send messages as different users
- Test emoji reactions
- Verify organizer moderation
- Check real-time updates

### 4. Test Analytics
- Join stream as multiple users
- Verify concurrent viewers update
- Leave stream and check session end
- Review analytics in database

---

## 🐛 Troubleshooting

### Stream Not Loading
1. Check `streaming_url` is valid
2. Verify platform is supported
3. Check if stream is actually live
4. Review browser console for errors

### Chat Not Updating
1. Verify Supabase real-time is enabled
2. Check RLS policies on `live_chat_messages`
3. Confirm user is authenticated
4. Review network tab for WebSocket connection

### Viewer Count Not Accurate
1. Run `SELECT get_concurrent_viewers('event_id')`
2. Check `live_stream_sessions` table for active sessions
3. Verify trigger is enabled on sessions table
4. Review session timeout logic (5 minute threshold)

### Tier Restrictions Not Working
1. Verify `user.subscription_tier` is correct
2. Check `SUBSCRIPTION_TIERS` configuration
3. Review tier gating logic in components
4. Confirm database has latest migrations

---

## 🔄 Real-Time Updates

### Supabase Subscriptions

```typescript
// Subscribe to new chat messages
const chatChannel = supabase
  .channel(`live_chat:${eventId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'live_chat_messages',
    filter: `event_id=eq.${eventId}`
  }, (payload) => {
    setMessages(prev => [...prev, payload.new]);
  })
  .subscribe();

// Subscribe to viewer count updates
const analyticsChannel = supabase
  .channel(`analytics:${eventId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'live_stream_analytics',
    filter: `event_id=eq.${eventId}`
  }, (payload) => {
    setAnalytics(payload.new);
  })
  .subscribe();
```

---

## 📈 Future Enhancements

### Planned Features
- [ ] Screen sharing for presentations
- [ ] Breakout rooms for networking
- [ ] Q&A queue management
- [ ] Live transcriptions/captions
- [ ] Multi-camera support
- [ ] NDI integration for professional setups
- [ ] Stream scheduling and automation
- [ ] Advanced monetization (pay-per-view)

### API Integration Opportunities
- [ ] OBS Studio integration
- [ ] Streamlabs alerts
- [ ] StreamYard partnership
- [ ] Restream.io multi-streaming
- [ ] Mux video infrastructure

---

## 📞 Support

For issues or questions:
- **Technical Support:** huntersest@gmail.com
- **Documentation:** See inline code comments
- **Database Schema:** Check migration file for details
- **Production Site:** https://www.eventnexus.eu

---

## ✅ Checklist for Launch

- [x] Database migration completed
- [x] TypeScript types defined
- [x] LiveStreamPlayer component created
- [x] LiveChat component created
- [x] Tier restrictions configured
- [x] Analytics tracking implemented
- [ ] Event creation form updated
- [ ] Event detail page integration
- [ ] Real-time subscriptions configured
- [ ] Testing completed
- [ ] Documentation reviewed
- [ ] Production deployment

---

**Last Updated:** 2026-02-02  
**Version:** 1.0.0  
**Status:** Implementation Complete - Awaiting Frontend Integration
