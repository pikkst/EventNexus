/**
 * Social Media Post Testing Script
 * Tests the complete flow of posting to Facebook/Instagram
 * Run with: npx tsx scripts/test-social-post.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env.local
function loadEnvFile(): { url: string; key: string } {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    
    const lines = envContent.split('\n');
    let url = '';
    let key = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
        url = trimmed.split('=')[1].trim();
      } else if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
        key = trimmed.split('=')[1].trim();
      }
    }
    
    if (!url || !key) {
      throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
    }
    
    return { url, key };
  } catch (error) {
    console.error('❌ Failed to load .env.local file:', error);
    console.log('\n⚠️ Make sure .env.local exists in the project root with:');
    console.log('   VITE_SUPABASE_URL=https://anlivujgkjmajkcgbaxw.supabase.co');
    console.log('   VITE_SUPABASE_ANON_KEY=your_anon_key_here');
    process.exit(1);
  }
}

const { url: SUPABASE_URL, key: SUPABASE_ANON_KEY } = loadEnvFile();
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSocialPostFlow() {
  console.log('🧪 Testing Social Media Post Flow\n');
  console.log('=====================================\n');

  // Step 1: Check if user_campaigns table has social media columns
  console.log('📋 Step 1: Checking user_campaigns table structure...');
  try {
    const { data, error } = await supabase
      .from('user_campaigns')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error querying user_campaigns:', error);
      return;
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('✅ Columns found:', columns.join(', '));
      
      const socialColumns = [
        'facebook_posted',
        'facebook_post_id',
        'instagram_posted',
        'instagram_post_id',
        'twitter_posted',
        'twitter_post_id',
        'linkedin_posted',
        'linkedin_post_id',
        'last_posted_at'
      ];
      
      const missingColumns = socialColumns.filter(col => !columns.includes(col));
      if (missingColumns.length > 0) {
        console.error('❌ Missing columns:', missingColumns.join(', '));
        console.log('\n⚠️ You need to run the migration:');
        console.log('   supabase/migrations/20250122000000_add_social_tracking_to_user_campaigns.sql');
        return;
      } else {
        console.log('✅ All social media columns exist');
      }
    } else {
      console.log('⚠️ No campaigns in database yet - cannot verify columns');
      console.log('   Testing by attempting to query specific columns...');
      
      // Try to query the columns directly to see if they exist
      const { error: colError } = await supabase
        .from('user_campaigns')
        .select('facebook_posted, instagram_posted, facebook_post_id, instagram_post_id')
        .limit(0);
      
      if (colError) {
        console.error('❌ Social media columns are missing!');
        console.log('   Error:', colError.message);
        console.log('\n⚠️ You need to run the migration in Supabase SQL Editor:');
        console.log('   https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql/new');
        console.log('   Copy and paste the SQL from:');
        console.log('   supabase/migrations/20250122000000_add_social_tracking_to_user_campaigns.sql');
        return;
      } else {
        console.log('✅ Social media columns exist (verified via query)');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('\n');

  // Step 2: Check if log_user_campaign_post function exists
  console.log('📋 Step 2: Testing log_user_campaign_post function...');
  try {
    // Try to call the function with dummy data
    const { data, error } = await supabase.rpc('log_user_campaign_post', {
      p_campaign_id: '00000000-0000-0000-0000-000000000000',
      p_platform: 'facebook',
      p_post_id: 'test_post_123',
      p_user_id: '00000000-0000-0000-0000-000000000000'
    });

    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.error('❌ Function log_user_campaign_post does not exist');
        console.log('\n⚠️ You need to run the migration to create this function');
        return;
      } else {
        // Expected error (campaign doesn't exist), but function exists
        console.log('✅ Function exists (test call failed as expected)');
      }
    } else {
      console.log('✅ Function executed successfully');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n');

  // Step 3: Check social_media_accounts table
  console.log('📋 Step 3: Checking social media accounts...');
  try {
    const { data, error } = await supabase
      .from('social_media_accounts')
      .select('platform, account_id, account_name, is_connected')
      .eq('is_connected', true);

    if (error) {
      console.error('❌ Error querying social_media_accounts:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No active social media accounts found');
      console.log('   Please connect Facebook/Instagram accounts first');
    } else {
      console.log('✅ Active accounts:');
      data.forEach(account => {
        console.log(`   - ${account.platform}: ${account.account_name} (${account.account_id})`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n');

  // Step 4: Check system configuration for OAuth
  console.log('📋 Step 4: Checking OAuth configuration...');
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('key, value')
      .in('key', [
        'facebook_app_id',
        'facebook_app_secret',
        'instagram_app_id',
        'instagram_app_secret'
      ]);

    if (error) {
      console.error('❌ Error querying system_config:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No OAuth credentials found in system_config');
      console.log('   You need to set up Facebook/Instagram app credentials');
    } else {
      console.log('✅ OAuth configuration found:');
      data.forEach(config => {
        const value = config.value as string;
        const masked = value ? value.substring(0, 8) + '...' : 'NOT SET';
        console.log(`   - ${config.key}: ${masked}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n');
  console.log('=====================================');
  console.log('✅ Diagnostic complete!');
  console.log('\n📝 Summary:');
  console.log('   1. Make sure migration is applied to database');
  console.log('   2. Verify social media accounts are connected');
  console.log('   3. Check OAuth credentials in system_config');
  console.log('   4. Test actual post with real campaign data');
}

// Run the test
testSocialPostFlow().catch(console.error);
