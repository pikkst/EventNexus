-- EventNexus Database Schema
-- Execute these SQL commands in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    bio TEXT,
    location VARCHAR(255),
    role VARCHAR(50) DEFAULT 'attendee' CHECK (role IN ('attendee', 'organizer', 'agency', 'admin')),
    subscription VARCHAR(50) DEFAULT 'free' CHECK (subscription IN ('free', 'pro', 'premium', 'enterprise')),
    avatar TEXT,
    credits INTEGER DEFAULT 0,
    agency_slug VARCHAR(100),
    followed_organizers JSONB DEFAULT '[]'::jsonb,
    branding JSONB,
    notification_prefs JSONB DEFAULT '{
        "pushEnabled": true,
        "emailEnabled": true,
        "proximityAlerts": true,
        "alertRadius": 10,
        "interestedCategories": []
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    location JSONB NOT NULL, -- {lat, lng, address, city}
    price DECIMAL(10,2) DEFAULT 0,
    visibility VARCHAR(50) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'semi-private')),
    organizer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT,
    attendees_count INTEGER DEFAULT 0,
    max_attendees INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('announcement', 'update', 'follow_alert', 'proximity_radar')),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    sender_name VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT false
);

-- Tickets table
CREATE TABLE tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    qr_code TEXT UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'cancelled')),
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id) -- One ticket per user per event
);

-- Create indexes for better performance
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_location ON events USING GIN(location);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_user ON tickets(user_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable" ON users
    FOR SELECT USING (true); -- Allow public viewing for now

-- RLS Policies for events table
CREATE POLICY "Anyone can view public events" ON events
    FOR SELECT USING (visibility = 'public' OR organizer_id = auth.uid());

CREATE POLICY "Organizers can manage their events" ON events
    FOR ALL USING (organizer_id = auth.uid());

CREATE POLICY "Anyone can create events" ON events
    FOR INSERT WITH CHECK (auth.uid() = organizer_id);

-- RLS Policies for notifications table
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for tickets table
CREATE POLICY "Users can view their own tickets" ON tickets
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create tickets for themselves" ON tickets
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Event organizers can view event tickets" ON tickets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = tickets.event_id 
            AND events.organizer_id = auth.uid()
        )
    );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();