// Make user administrator via Supabase client
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://anlivujgkjmajkcgbaxw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubGl2dWpna2ptYWprY2diYXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTY0OTQsImV4cCI6MjA4MTU3MjQ5NH0.5SzkZg_PMqgdMClS1ftg4ZT_Ddyq1zOi-ZOLe1yuRgY';

const supabase = createClient(supabaseUrl, supabaseKey);

const userId = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807';

async function makeUserAdmin() {
  console.log('Making user admin...');
  
  // Upsert user with admin role
  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: userId,
      name: 'Admin User',
      email: 'huntersest@gmail.com',
      role: 'admin',
      subscription: 'premium',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      followed_organizers: [],
      notification_prefs: {
        pushEnabled: true,
        emailEnabled: true,
        proximityAlerts: true,
        alertRadius: 25,
        interestedCategories: ["Conference", "Workshop", "Party", "Concert", "Sports", "Cultural", "Business", "Community"]
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'id'
    })
    .select();

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('Success! User is now an admin:', data);
  
  // Verify
  const { data: userData, error: verifyError } = await supabase
    .from('users')
    .select('id, email, role, subscription')
    .eq('id', userId)
    .single();
    
  if (verifyError) {
    console.error('Verification error:', verifyError);
  } else {
    console.log('Verified user data:', userData);
  }
}

makeUserAdmin();
