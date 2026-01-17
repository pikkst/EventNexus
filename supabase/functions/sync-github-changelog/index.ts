// GitHub Changelog Sync - Automatically updates AI knowledge base with latest commits
// Deno Edge Function for Supabase

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
    };
  };
}

// Parse semantic commit messages (feat:, fix:, docs:, etc.)
function parseCommit(message: string): {
  category: string;
  title: string;
  description: string;
  isPublic: boolean;
} | null {
  const lines = message.split('\n');
  const firstLine = lines[0].trim();
  
  // Match semantic commit format: type(scope): subject
  const match = firstLine.match(/^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(?:\(([^)]+)\))?:\s*(.+)$/i);
  
  if (!match) return null;
  
  const [, type, scope, subject] = match;
  const description = lines.slice(1).join('\n').trim() || subject;
  
  // Map commit types to changelog categories
  const categoryMap: Record<string, string> = {
    'feat': 'feature',
    'fix': 'bugfix',
    'docs': 'improvement',
    'perf': 'improvement',
    'refactor': 'improvement',
    'security': 'security',
    'breaking': 'breaking_change',
  };
  
  // Decide if commit is public-facing (hide internal/dev stuff)
  const isPublic = !['test', 'build', 'ci', 'chore', 'style'].includes(type.toLowerCase());
  
  return {
    category: categoryMap[type.toLowerCase()] || 'improvement',
    title: scope ? `${scope}: ${subject}` : subject,
    description: description.substring(0, 500), // Limit length
    isPublic,
  };
}

// Generate version number from date (e.g., 1.3.2)
function generateVersion(commits: any[], existingVersion: string = '1.3.1'): string {
  const [major, minor, patch] = existingVersion.split('.').map(Number);
  
  // Increment patch version
  return `${major}.${minor}.${patch + 1}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body (optional: specify since date)
    const { sinceDays = 7 } = await req.json().catch(() => ({}));

    // Calculate date range
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - sinceDays);
    const since = sinceDate.toISOString();

    console.log(`Fetching commits since ${since}`);

    // Fetch commits from GitHub API
    const githubUrl = `https://api.github.com/repos/pikkst/EventNexus/commits?since=${since}&per_page=50`;
    const githubResponse = await fetch(githubUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'EventNexus-Changelog-Sync',
      },
    });

    if (!githubResponse.ok) {
      throw new Error(`GitHub API error: ${githubResponse.status} ${githubResponse.statusText}`);
    }

    const commits: GitHubCommit[] = await githubResponse.json();
    console.log(`Fetched ${commits.length} commits`);

    // Get latest version from database
    const { data: latestEntry } = await supabase
      .from('ai_platform_changelog')
      .select('version')
      .order('release_date', { ascending: false })
      .limit(1)
      .single();

    const currentVersion = latestEntry?.version || '1.3.1';
    console.log(`Current version: ${currentVersion}`);

    // Parse commits and group by date
    const newEntries: Array<{
      version: string;
      release_date: string;
      title: string;
      description: string;
      category: string;
      is_public: boolean;
    }> = [];

    const commitsByDate: Map<string, any[]> = new Map();

    for (const commit of commits) {
      const parsed = parseCommit(commit.commit.message);
      if (!parsed) continue;

      const date = commit.commit.author.date.split('T')[0]; // YYYY-MM-DD
      
      if (!commitsByDate.has(date)) {
        commitsByDate.set(date, []);
      }
      
      commitsByDate.get(date)!.push({
        ...parsed,
        sha: commit.sha.substring(0, 7),
        date,
      });
    }

    // Create changelog entries (one per day with multiple features)
    let versionCounter = 0;
    for (const [date, dayCommits] of Array.from(commitsByDate.entries()).reverse()) {
      const publicCommits = dayCommits.filter(c => c.isPublic);
      if (publicCommits.length === 0) continue;

      // Group by category
      const features = publicCommits.filter(c => c.category === 'feature');
      const improvements = publicCommits.filter(c => c.category === 'improvement');
      const bugfixes = publicCommits.filter(c => c.category === 'bugfix');
      const security = publicCommits.filter(c => c.category === 'security');

      // Determine main category
      const mainCategory = features.length > 0 ? 'feature' 
        : security.length > 0 ? 'security'
        : bugfixes.length > 0 ? 'bugfix' 
        : 'improvement';

      // Create title from commits
      const mainCommits = publicCommits.filter(c => c.category === mainCategory);
      const title = mainCommits.length === 1 
        ? mainCommits[0].title
        : `${mainCategory === 'feature' ? 'New Features' : mainCategory === 'bugfix' ? 'Bug Fixes' : 'Improvements'} (${publicCommits.length} updates)`;

      // Create description listing all changes
      const description = publicCommits.map((c, i) => 
        `${i + 1}. ${c.title}${c.description !== c.title ? ': ' + c.description : ''}`
      ).join('\n').substring(0, 500);

      // Generate version
      const [major, minor, patch] = currentVersion.split('.').map(Number);
      const newPatch = patch + versionCounter + 1;
      const version = `${major}.${minor}.${newPatch}`;
      versionCounter++;

      newEntries.push({
        version,
        release_date: date,
        title,
        description,
        category: mainCategory,
        is_public: true,
      });
    }

    console.log(`Parsed ${newEntries.length} new changelog entries`);

    // Insert new entries (skip duplicates by version)
    if (newEntries.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('ai_platform_changelog')
        .upsert(newEntries, { 
          onConflict: 'version',
          ignoreDuplicates: false 
        })
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log(`Inserted ${inserted?.length || 0} new entries`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Synced ${inserted?.length || 0} new changelog entries from GitHub`,
          entries: inserted,
          totalCommits: commits.length,
          parsedCommits: newEntries.length,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No new public commits found',
          totalCommits: commits.length,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

  } catch (error: any) {
    console.error('Error syncing changelog:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
