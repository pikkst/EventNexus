// Admin user creation script for Supabase
// This creates an admin user through Supabase Auth, then adds profile data

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://anlivujgkjmajkcgbaxw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubGl2dWpna2ptYWprY2diYXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTY0OTQsImV4cCI6MjA4MTU3MjQ5NH0.5SzkZg_PMqgdMClS1ftg4ZT_Ddyq1zOi-ZOLe1yuRgY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminSeed() {
  try {
    console.log('🔐 Creating admin user...');
    
    // Create admin user through Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'admin@eventnexus.com',
      password: 'AdminPass123!',
      options: {
        data: {
          full_name: 'Rivera Productions'
        }
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      if (authError.message.includes('already registered')) {
        console.log('✅ Admin user already exists, trying to sign in...');
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'admin@eventnexus.com',
          password: 'AdminPass123!'
        });
        
        if (signInError) {
          console.error('Sign in error:', signInError);
          return;
        }
        
        console.log('✅ Signed in as admin');
        await createAdminProfile(signInData.user.id);
      }
      return;
    }

    if (authData.user) {
      console.log('✅ Admin auth user created:', authData.user.email);
      await createAdminProfile(authData.user.id);
    }

  } catch (error) {
    console.error('❌ Error creating admin:', error);
  }
}

async function createAdminProfile(userId) {
  try {
    console.log('👤 Creating admin profile...');
    
    // Check if profile already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (existingUser) {
      console.log('✅ Admin profile already exists');
      return;
    }
    
    // Create admin profile
    const adminProfile = {
      id: userId,
      name: 'Rivera Productions',
      email: 'admin@eventnexus.com',
      bio: 'Pioneering immersive experiences across the global Nexus network. We specialize in transforming industrial spaces into cultural hubs through light, sound, and flavor.',
      location: 'New York, NY',
      role: 'admin',
      subscription: 'enterprise',
      avatar: 'https://picsum.photos/seed/rivera/100',
      credits: 1000,
      agency_slug: 'rivera-productions',
      followed_organizers: [],
      branding: {
        primaryColor: '#6366f1',
        accentColor: '#818cf8',
        tagline: 'The Future of Events is Map-First.',
        customDomain: 'rivera.nexus.events',
        bannerUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop',
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
      },
      notification_prefs: {
        pushEnabled: true,
        emailEnabled: true,
        proximityAlerts: true,
        alertRadius: 10,
        interestedCategories: ['Party', 'Concert']
      }
    };

    const { data, error } = await supabase
      .from('users')
      .insert([adminProfile])
      .select()
      .single();

    if (error) {
      console.error('Profile creation error:', error);
      return;
    }

    console.log('✅ Admin profile created successfully');
    
    // Create a sample event for the admin
    await createSampleEvent(userId);
    
    // Create a sample notification
    await createSampleNotification(userId);
    
  } catch (error) {
    console.error('❌ Error creating admin profile:', error);
  }
}

async function createSampleEvent(organizerId) {
  try {
    console.log('🎉 Creating sample event...');
    
    const sampleEvent = {
      name: 'Private Rooftop Soirée',
      category: 'Party',
      description: 'Exclusive celebration with city views and premium entertainment.',
      date: '2024-12-30',
      time: '19:00',
      location: {
        lat: 40.7580,
        lng: -73.9855,
        address: 'Top Floor, Sky Tower',
        city: 'New York'
      },
      price: 0.00,
      visibility: 'private',
      organizer_id: organizerId,
      image_url: 'https://picsum.photos/seed/rooftop/800/600',
      attendees_count: 25,
      max_attendees: 50
    };

    const { data, error } = await supabase
      .from('events')
      .insert([sampleEvent])
      .select()
      .single();

    if (error) {
      console.error('Event creation error:', error);
      return null;
    }

    console.log('✅ Sample event created');
    return data;
    
  } catch (error) {
    console.error('❌ Error creating sample event:', error);
    return null;
  }
}

async function createSampleNotification(userId) {
  try {
    console.log('🔔 Creating sample notification...');
    
    const sampleNotification = {
      user_id: userId,
      title: 'Welcome to EventNexus!',
      message: 'Your admin account has been set up successfully. You can now manage events and users.',
      type: 'announcement',
      sender_name: 'EventNexus System',
      timestamp: new Date().toISOString(),
      is_read: false
    };

    const { error } = await supabase
      .from('notifications')
      .insert([sampleNotification]);

    if (error) {
      console.error('Notification creation error:', error);
      return;
    }

    console.log('✅ Sample notification created');
    
  } catch (error) {
    console.error('❌ Error creating sample notification:', error);
  }
}

// Run the admin creation
console.log('🚀 Setting up admin seed data...');
console.log('📧 Email: admin@eventnexus.com');
console.log('🔑 Password: AdminPass123!');
console.log('');

createAdminSeed().then(() => {
  console.log('');
  console.log('🎊 Admin setup complete!');
  console.log('You can now sign in to the app with:');
  console.log('📧 Email: admin@eventnexus.com');
  console.log('🔑 Password: AdminPass123!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Start the app: npm run dev');
  console.log('2. Open: http://localhost:3000/EventNexus/');
  console.log('3. Sign in with the admin credentials');
  console.log('4. Test the app functionality');
});