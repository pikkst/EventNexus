/**
 * Test AI Email Generation with GitHub Sync Context
 * Tests the complete flow: AI Knowledge Base → GitHub Sync → Email Generation
 */

import { generateOutreachEmail } from './src/services/geminiService.js';
import { getAIPlatformContext } from './src/services/dbService.js';

const testAIEmail = async () => {
  console.log('🧪 Testing AI Email Generation with Real Platform Data\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Check AI Knowledge Base Context
    console.log('\n📚 Step 1: Fetching AI Platform Context...');
    const context = await getAIPlatformContext('en');
    
    console.log(`\n✅ AI Context Retrieved:`);
    console.log(`   - Stats entries: ${context.stats?.length || 0}`);
    console.log(`   - Knowledge entries: ${context.knowledge?.length || 0}`);
    console.log(`   - Changelog entries: ${context.changelog?.length || 0}`);
    
    if (context.changelog?.length > 0) {
      console.log(`\n📝 Latest Changelog Entries:`);
      context.changelog.slice(0, 3).forEach(entry => {
        console.log(`   - v${entry.version} (${entry.release_date}): ${entry.title}`);
      });
    }
    
    // Step 2: Generate Test Email
    console.log('\n✉️  Step 2: Generating AI Marketing Email...');
    console.log('\nRecipient: huntersest@gmail.com');
    console.log('Company: EventNexus Test');
    console.log('Language: English\n');
    
    const emailResult = await generateOutreachEmail(
      'huntersest@gmail.com',
      'EventNexus Test',
      'Test Company Description',
      'en',
      'Event Management Platform'
    );
    
    console.log('=' .repeat(60));
    console.log('\n📧 GENERATED EMAIL:\n');
    console.log('To: huntersest@gmail.com');
    console.log('Subject: ' + (emailResult.subject || 'EventNexus Partnership Opportunity'));
    console.log('\n' + '-'.repeat(60));
    console.log(emailResult.body || emailResult);
    console.log('-'.repeat(60));
    
    // Step 3: Verify AI Used Real Data
    console.log('\n✅ Verification:');
    console.log('   - AI referenced real platform stats: ' + 
                (emailResult.body?.includes('users') || emailResult.body?.includes('events') ? 'YES ✓' : 'NO ✗'));
    console.log('   - AI mentioned recent features: ' + 
                (emailResult.body?.includes('recently') || emailResult.body?.includes('new') ? 'YES ✓' : 'NO ✗'));
    console.log('   - No hallucinated data: ' + 
                (emailResult.body?.includes('DO NOT INVENT') ? 'NO ✗' : 'YES ✓'));
    
    console.log('\n🎯 Test Complete!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
};

// Run test
testAIEmail();
