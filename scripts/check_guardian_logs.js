const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://anlivujgkjmajkcgbaxw.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function checkGuardianLogs() {
  console.log('\n🛡️ Checking Guardian Activity...\n');
  
  // Check recovery log (last 10 actions)
  const { data: logs, error } = await supabase
    .from('city_recovery_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (logs.length === 0) {
    console.log('ℹ️  No guardian actions logged yet');
    return;
  }
  
  console.log(`📝 Last ${logs.length} guardian actions:\n`);
  logs.forEach(log => {
    const status = log.success ? '✅' : '❌';
    console.log(`${status} ${log.created_at}`);
    console.log(`   City: ${log.city_id}`);
    console.log(`   Action: ${log.action}`);
    console.log(`   Reason: ${log.reason}`);
    console.log(`   State: ${log.old_state} → ${log.new_state}`);
    if (log.error_message) {
      console.log(`   Error: ${log.error_message}`);
    }
    console.log('');
  });
}

checkGuardianLogs().catch(console.error);
