import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://anlivujgkjmajkcgbaxw.supabase.co',
  'sb_secret_3JjKV9b2UYMtIf6QNXJyNw_ZLQg9Sdr'
);

console.log('\n🔍 Checking get_active_cron_jobs function...\n');

const { data, error } = await supabase.rpc('get_active_cron_jobs');

if (error) {
  console.error('❌ Function missing or error:', error);
  console.log('\n📝 Need to create this function in production database');
  process.exit(1);
}

console.log('✅ Function exists and works!');
console.log(`📊 Active CRON jobs: ${data?.length || 0}\n`);

if (data && data.length > 0) {
  data.forEach(job => {
    console.log(`  • ${job.jobname}`);
    console.log(`    Schedule: ${job.schedule}`);
    console.log(`    Command: ${job.command?.substring(0, 60)}...`);
    console.log('');
  });
} else {
  console.log('  (No active cron jobs)');
}
