import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://anlivujgkjmajkcgbaxw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubGl2dWpna2ptYWprY2diYXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTY0OTQsImV4cCI6MjA4MTU3MjQ5NH0.5SzkZg_PMqgdMClS1ftg4ZT_Ddyq1zOi-ZOLe1yuRgY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserCount() {
  try {
    // Count users in public.users table
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Error counting users:', error);
      return;
    }
    
    console.log('Total users in database:', count);
    
    // Get platform stats to see what it returns
    const { data: stats, error: statsError } = await supabase.rpc('get_platform_statistics');
    
    if (statsError) {
      console.error('Error getting platform stats:', statsError);
    } else {
      console.log('Platform stats totalUsers:', stats.totalUsers);
    }
    
    // List all users
    const { data: users, error: listError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .order('created_at', { ascending: false });
    
    if (listError) {
      console.error('Error listing users:', listError);
    } else {
      console.log('\nCurrent users:');
      users.forEach((user, i) => {
        console.log(`${i + 1}. ${user.email} (${user.name}) - ${user.role}`);
      });
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

checkUserCount();
