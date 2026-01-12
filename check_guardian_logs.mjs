import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://anlivujgkjmajkcgbaxw.supabase.co',
  'sb_secret_3JjKV9b2UYMtIf6QNXJyNw_ZLQg9Sdr'
);

console.log('\n🛡️ Checking Guardian Activity...\n');

const { data: logs, error } = await supabase
  .from('city_recovery_log')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

if (logs.length === 0) {
  console.log('ℹ️  No guardian actions logged yet');
  process.exit(0);
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
    console.log(`   Error: ${log.error_message.substring(0, 200)}`);
  }
  console.log('');
});
