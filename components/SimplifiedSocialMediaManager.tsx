/**
 * Simplified Social Media Manager - Admin Token Setup
 * Simple UI for connecting Facebook & Instagram with manual token entry
 */

import React, { useState, useEffect } from 'react';
import { Facebook, Instagram, Linkedin, RefreshCw, CheckCircle2, AlertCircle, Settings, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabase';
import type { User } from '../types';

interface SocialAccount {
  platform: string;
  account_id: string;
  account_name: string;
  is_connected: boolean;
  expires_at: string;
}

interface SimplifiedSocialMediaManagerProps {
  user: User;
}

export const SimplifiedSocialMediaManager: React.FC<SimplifiedSocialMediaManagerProps> = ({ user }) => {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Setup form state
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [userToken, setUserToken] = useState('');
  const [setupStatus, setSetupStatus] = useState('');

  useEffect(() => {
    console.log('👤 User changed, loading accounts...', { userId: user.id, userEmail: user.email });
    loadAccounts();
  }, [user.id]);

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true);
      setLoadError(null);
      console.log('📱 Loading social media accounts for user:', user.id);
      
      const { data, error } = await supabase
        .from('social_media_accounts')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Supabase error:', error);
        setLoadError(`Error loading accounts: ${error.message}`);
        throw error;
      }
      
      console.log('✅ Loaded accounts:', data?.length || 0, 'records');
      data?.forEach(acc => {
        console.log(`  - ${acc.platform}: ${acc.account_name} (expires: ${acc.expires_at})`);
      });
      setAccounts(data || []);
    } catch (error) {
      console.error('❌ Failed to load accounts:', error);
      setLoadError(`Failed to load accounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleAutoSetup = async () => {
    if (!appId || !appSecret || !userToken) {
      alert('❌ Please fill in all fields');
      return;
    }

    setLoading(true);
    setSetupStatus('🔄 Step 1: Exchanging for long-lived user token...');

    try {
      // Step 1: Get long-lived user token
      const tokenExchangeUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userToken}`;
      
      const tokenResponse = await fetch(tokenExchangeUrl);
      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        throw new Error(`Token exchange failed: ${tokenData.error.message}`);
      }

      const longLivedUserToken = tokenData.access_token;
      setSetupStatus('✅ Got long-lived user token\n🔄 Step 2: Fetching Facebook Page...');

      // Step 2: Get Facebook Page ID (hardcoded EventNexus page)
      const pageId = '864504226754704';
      const pageUrl = `https://graph.facebook.com/v18.0/${pageId}?fields=access_token,instagram_business_account&access_token=${longLivedUserToken}`;
      
      const pageResponse = await fetch(pageUrl);
      const pageData = await pageResponse.json();

      if (pageData.error) {
        throw new Error(`Cannot access page: ${pageData.error.message}`);
      }

      const pageToken = pageData.access_token;
      const instagramAccountId = pageData.instagram_business_account?.id;

      setSetupStatus('✅ Got Facebook Page token\n🔄 Step 3: Saving to database...');

      // Step 3: Delete old entries
      await supabase
        .from('social_media_accounts')
        .delete()
        .eq('user_id', user.id)
        .in('platform', ['facebook', 'instagram']);

      // Step 4: Insert Facebook
      const { error: fbError } = await supabase
        .from('social_media_accounts')
        .insert({
          user_id: user.id,
          platform: 'facebook',
          account_id: pageId,
          account_name: 'EventNexus',
          access_token: pageToken,
          expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
          is_connected: true
        });

      if (fbError) {
        console.error('❌ Facebook insert error:', fbError);
        throw new Error(`Failed to save Facebook account: ${fbError.message}`);
      }
      console.log('✅ Facebook account saved successfully');

      // Step 5: Insert Instagram (if found)
      if (instagramAccountId) {
        setSetupStatus('✅ Facebook connected\n🔄 Step 4: Setting up Instagram...');

        // Get Instagram username
        const igUrl = `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=username&access_token=${pageToken}`;
        const igResponse = await fetch(igUrl);
        const igData = await igResponse.json();

        const { error: igError } = await supabase
          .from('social_media_accounts')
          .insert({
            user_id: user.id,
            platform: 'instagram',
            account_id: instagramAccountId,
            account_name: igData.username || 'Instagram',
            access_token: pageToken,
            expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            is_connected: true
          });

        if (igError) {
          console.error('❌ Instagram insert error:', igError);
          throw new Error(`Failed to save Instagram account: ${igError.message}`);
        }
        console.log('✅ Instagram account saved successfully');
        setSetupStatus('✅ Instagram connected!');
      } else {
        console.log('⚠️ No Instagram Business Account found on this page');
        setSetupStatus('✅ Facebook connected!\n⚠️ No Instagram Business Account found on this page.');
      }

      // Reload accounts
      console.log('🔄 Reloading accounts...');
      await loadAccounts();
      console.log('✅ Accounts reloaded successfully');
      
      setTimeout(() => {
        setSetupStatus('');
        setShowSetup(false);
        setUserToken(''); // Clear sensitive data
        setAppSecret('');
      }, 3000);

    } catch (error) {
      console.error('Setup failed:', error);
      setSetupStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (platform: string) => {
    if (!confirm(`Disconnect ${platform}?`)) return;

    try {
      const { error } = await supabase
        .from('social_media_accounts')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', platform);

      if (error) throw error;
      await loadAccounts();
    } catch (error) {
      alert(`Failed to disconnect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const fbAccount = accounts.find(a => a.platform === 'facebook');
  const igAccount = accounts.find(a => a.platform === 'instagram');
  const liAccount = accounts.find(a => a.platform === 'linkedin');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Social Media Connections</h2>
          <p className="text-sm text-slate-400">Connect Facebook, Instagram & LinkedIn to enable automatic post publishing from Marketing Studio</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAccounts()}
            disabled={loadingAccounts}
            className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            title="Refresh accounts"
          >
            <RefreshCw className={`w-4 h-4 ${loadingAccounts ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Settings className="w-4 h-4" />
            {showSetup ? 'Hide Setup' : 'Setup Tokens'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm"><strong>⚠️ Error:</strong> {loadError}</p>
          <button
            onClick={() => loadAccounts()}
            className="mt-2 text-sm px-3 py-1 bg-red-200 text-red-900 rounded hover:bg-red-300"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loadingAccounts && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">🔄 Loading social media accounts...</p>
        </div>
      )}

      {/* No Accounts State */}
      {!loadingAccounts && accounts.length === 0 && !loadError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            📱 <strong>No connected accounts yet.</strong> Click "Setup Tokens" above to connect your Facebook, Instagram and LinkedIn accounts for automated posting.
          </p>
        </div>
      )}

      {/* Setup Panel */}
      {showSetup && (
        <div className="bg-gradient-to-br from-purple-100 to-blue-100 border-2 border-purple-300 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🔐 Manual Token Setup</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Facebook App ID
              </label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                placeholder="Enter your App ID (e.g., 1527493881796179)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                App Secret
              </label>
              <input
                type="password"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                placeholder="Enter your Facebook App Secret"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get from: <a href="https://developers.facebook.com/apps/1527493881796179/settings/basic/" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Facebook Developer Console</a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                User Access Token
              </label>
              <textarea
                value={userToken}
                onChange={(e) => setUserToken(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm text-gray-900"
                placeholder="EAAVtP2I4llM..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Get from: <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Graph API Explorer</a>
                {' '}(Select "EventNexus" app → Get Token → Get User Access Token)
              </p>
            </div>

            <button
              onClick={handleAutoSetup}
              disabled={loading || !appId || !appSecret || !userToken}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Auto-Connect Facebook & Instagram
                </>
              )}
            </button>

            {setupStatus && (
              <div className={`p-4 rounded-lg ${
                setupStatus.includes('❌') ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'
              }`}>
                <pre className="text-sm whitespace-pre-wrap font-mono">{setupStatus}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connected Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Facebook */}
        <div className={`p-6 rounded-xl border-2 ${fbAccount ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${fbAccount ? 'bg-blue-600' : 'bg-gray-400'}`}>
                <Facebook className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Facebook</h3>
                <p className="text-sm text-gray-600">
                  {fbAccount ? fbAccount.account_name : 'Not Connected'}
                </p>
              </div>
            </div>
            {fbAccount ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-gray-400" />
            )}
          </div>

          {fbAccount && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Account ID:</span>
                <span className="font-mono text-gray-900">{fbAccount.account_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expires:</span>
                <span className="text-gray-900">
                  {new Date(fbAccount.expires_at).toLocaleDateString()}
                </span>
              </div>
              <button
                onClick={() => handleDisconnect('facebook')}
                className="w-full mt-3 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Instagram */}
        <div className={`p-6 rounded-xl border-2 ${igAccount ? 'bg-pink-50 border-pink-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${igAccount ? 'bg-gradient-to-br from-purple-600 to-pink-600' : 'bg-gray-400'}`}>
                <Instagram className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Instagram</h3>
                <p className="text-sm text-gray-600">
                  {igAccount ? `@${igAccount.account_name}` : 'Not Connected'}
                </p>
              </div>
            </div>
            {igAccount ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-gray-400" />
            )}
          </div>

          {igAccount && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Account ID:</span>
                <span className="font-mono text-gray-900">{igAccount.account_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expires:</span>
                <span className="text-gray-900">
                  {new Date(igAccount.expires_at).toLocaleDateString()}
                </span>
              </div>
              <button
                onClick={() => handleDisconnect('instagram')}
                className="w-full mt-3 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* LinkedIn */}
        <div className={`p-6 rounded-xl border-2 ${liAccount ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${liAccount ? 'bg-blue-700' : 'bg-gray-400'}`}>
                <Linkedin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">LinkedIn</h3>
                <p className="text-sm text-gray-600">
                  {liAccount ? liAccount.account_name : 'Not Connected'}
                </p>
              </div>
            </div>
            {liAccount ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-gray-400" />
            )}
          </div>

          {liAccount ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Account ID:</span>
                <span className="font-mono text-gray-900">{liAccount.account_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expires:</span>
                <span className="text-gray-900">
                  {new Date(liAccount.expires_at).toLocaleDateString()}
                </span>
              </div>
              <button
                onClick={() => handleDisconnect('linkedin')}
                className="w-full mt-3 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-gray-600">LinkedIn integration coming soon. For now, you can post directly on LinkedIn.</p>
              <a
                href="https://www.linkedin.com/company/eventnexus-eu"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-block text-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Visit LinkedIn Page
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">📝 Setup Instructions:</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Get your <strong>App Secret</strong> from Facebook Developer Console</li>
          <li>Get a <strong>User Access Token</strong> from Graph API Explorer (select EventNexus app)</li>
          <li>Click "Setup Tokens" and paste all three values</li>
          <li>Click "Auto-Connect" - it will fetch Page tokens automatically</li>
          <li>Tokens are valid for 60 days</li>
        </ol>
      </div>
    </div>
  );
};
