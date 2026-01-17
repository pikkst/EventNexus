import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://anlivujgkjmajkcgbaxw.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

console.log('\n🔍 Checking all CRON jobs...\n');

const { data, error } = await supabase.rpc('get_active_cron_jobs');

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

console.log(`📊 Total active CRON jobs: ${data?.length || 0}\n`);

const jobNames = [
  'city-guardian-cron',
  'ai_agent_city_guardian', 
  'ai_agent_fetch_sources',
  'ai_agent_parse_events',
  'ai_agent_validate_events',
  'run-autonomous-operations-6h'
];

jobNames.forEach(name => {
  const found = data?.find(j => j.jobname === name);
  if (found) {
    console.log(`✅ ${name}`);
    console.log(`   Schedule: ${found.schedule}`);
  } else {
    console.log(`❌ ${name} - MISSING`);
  }
});
