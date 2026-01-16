import { createClient } from '@supabase/supabase-js';

// Direct environment variables (loaded by Vite in dev, hardcode for script)
const supabaseUrl = 'https://anlivujgkjmajkcgbaxw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubGl2dWpna2ptYWprY2diYXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTY0OTQsImV4cCI6MjA4MTU3MjQ5NH0.5SzkZg_PMqgdMClS1ftg4ZT_Ddyq1zOi-ZOLe1yuRgY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function bootstrapQualityScores() {
  console.log('🔄 Bootstrapping quality scores for all events...\n');

  try {
    // Call the populate_initial_quality_scores function
    const { data: result, error: rpcError } = await supabase.rpc(
      'populate_initial_quality_scores'
    );

    if (rpcError) {
      console.error('❌ Error calling bootstrap function:', rpcError);
      return;
    }

    console.log(`✅ Successfully bootstrapped quality scores for ${result} events\n`);

    // Verify the results
    const { data: scores, error: queryError } = await supabase
      .from('event_quality_scores')
      .select('quality_score');

    if (queryError) {
      console.error('❌ Error querying quality scores:', queryError);
      return;
    }

    if (scores && scores.length > 0) {
      const avgScore = scores.reduce((sum, s) => sum + s.quality_score, 0) / scores.length;
      const highQuality = scores.filter(s => s.quality_score >= 0.60).length;
      const lowQuality = scores.filter(s => s.quality_score < 0.60).length;

      console.log('📊 Quality Score Statistics:');
      console.log(`   Total events scored: ${scores.length}`);
      console.log(`   Average quality: ${avgScore.toFixed(3)}`);
      console.log(`   High quality (≥0.60): ${highQuality} (${((highQuality / scores.length) * 100).toFixed(1)}%)`);
      console.log(`   Low quality (<0.60): ${lowQuality} (${((lowQuality / scores.length) * 100).toFixed(1)}%)`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

bootstrapQualityScores();
