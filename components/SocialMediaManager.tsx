/**
 * Social Media Manager Component
 * Reusable component for both Admin and Enterprise users to manage social media connections
 * and post promotional content to connected platforms
 */

import React, { useState, useEffect } from 'react';
import { Share2, Key, CheckCircle2, X, LinkIcon as LinkIcon2, Globe2, Sparkles, Download } from 'lucide-react';
import { supabase } from '../services/supabase';
import type { User } from '../types';

interface ConnectedAccount {
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin';
  accountId: string;
  accountName: string;
  accessToken: string;
  isConnected: boolean;
}

interface Campaign {
  id: string;
  title: string;
  copy: string;
  cta: string;
  imageUrl?: string;
  image_url?: string;
  status: string;
  facebook_posted?: boolean;
  instagram_posted?: boolean;
  twitter_posted?: boolean;
  linkedin_posted?: boolean;
  facebook_post_id?: string;
  instagram_post_id?: string;
  twitter_post_id?: string;
  linkedin_post_id?: string;
}

interface SocialMediaManagerProps {
  user: User;
  /** If true, shows full campaign engine. If false, shows simplified posting UI */
  showCampaignEngine?: boolean;
}

export const SocialMediaManager: React.FC<SocialMediaManagerProps> = ({ 
  user, 
  showCampaignEngine = true 
}) => {
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Load connected accounts
  useEffect(() => {
    loadConnectedAccounts();
    loadUserCampaigns();
  }, [user.id]);

  const loadConnectedAccounts = async () => {
    try {
      const { getConnectedAccounts } = await import('../services/socialAuthHelper');
      const accounts = await getConnectedAccounts();
      setConnectedAccounts(accounts);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('user_campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  };

  // Generate new campaign with AI
  const handleGenerateCampaign = async (eventName: string, audienceType: string) => {
    try {
      const { generatePlatformGrowthCampaign } = await import('../services/geminiService');
      const campaign = await generatePlatformGrowthCampaign(eventName, audienceType);
      
      // Save to database
      const { data: savedCampaign, error } = await supabase
        .from('user_campaigns')
        .insert({
          user_id: user.id,
          title: campaign.title,
          copy: campaign.copy,
          cta: campaign.cta,
          image_url: campaign.imageUrl,
          tracking_code: campaign.trackingCode,
          status: 'draft',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      setCampaigns(prev => [savedCampaign, ...prev]);
      alert('✅ Campaign generated!');
    } catch (error) {
      alert('❌ Failed to generate campaign: ' + (error as Error).message);
    }
  };

  // Post to social media
  const handlePost = async (campaign: Campaign, platform: 'facebook' | 'instagram') => {
    try {
      const { publishToConnectedPlatforms } = await import('../services/socialAuthHelper');
      
      if (platform === 'facebook') {
        console.log('📘 Starting Facebook post...', { 
          campaignId: campaign.id, 
          title: campaign.title,
          hasImage: !!(campaign.imageUrl || campaign.image_url)
        });
        
        const result = await publishToConnectedPlatforms({
          facebook: {
            content: `${campaign.title}\n\n${campaign.copy}\n\n👉 ${campaign.cta}`,
            imageUrl: campaign.imageUrl || campaign.image_url,
            eventUrl: 'https://www.eventnexus.eu'
          }
        });
        
        console.log('📘 Facebook post result:', result);
        
        // Check if posting was successful
        if (result.facebook?.success) {
          // Update campaign status in database
          const { error } = await supabase
            .from('user_campaigns')
            .update({ 
              facebook_posted: true,
              facebook_post_id: result.facebook.postId,
              status: 'published'
            })
            .eq('id', campaign.id);
          
          if (error) {
            console.error('Failed to update campaign status:', error);
            throw new Error('Database update failed: ' + error.message);
          }
          
          // Update local state
          setCampaigns(prev => prev.map(c => 
            c.id === campaign.id 
              ? { ...c, facebook_posted: true, facebook_post_id: result.facebook!.postId, status: 'published' } 
              : c
          ));
          
          alert(`✅ Posted to Facebook!\nPost ID: ${result.facebook.postId}`);
        } else {
          throw new Error(result.facebook?.error || 'Facebook posting failed');
        }
        
      } else if (platform === 'instagram') {
        console.log('📸 Starting Instagram post...', { 
          campaignId: campaign.id, 
          title: campaign.title,
          hasImage: !!(campaign.imageUrl || campaign.image_url)
        });
        
        const imageUrl = campaign.imageUrl || campaign.image_url;
        if (!imageUrl) {
          throw new Error('Instagram requires an image. Please add an image to this campaign.');
        }
        
        const result = await publishToConnectedPlatforms({
          instagram: {
            caption: `${campaign.title}\n\n${campaign.copy}\n\n🔗 www.eventnexus.eu\n\n#EventNexus #Events`,
            imageUrl: imageUrl
          }
        });
        
        console.log('📸 Instagram post result:', result);
        
        // Check if posting was successful
        if (result.instagram?.success) {
          // Update campaign status in database
          const { error } = await supabase
            .from('user_campaigns')
            .update({ 
              instagram_posted: true,
              instagram_post_id: result.instagram.postId,
              status: 'published'
            })
            .eq('id', campaign.id);
          
          if (error) {
            console.error('Failed to update campaign status:', error);
            throw new Error('Database update failed: ' + error.message);
          }
          
          // Update local state
          setCampaigns(prev => prev.map(c => 
            c.id === campaign.id 
              ? { ...c, instagram_posted: true, instagram_post_id: result.instagram!.postId, status: 'published' } 
              : c
          ));
          
          alert(`✅ Posted to Instagram!\nPost ID: ${result.instagram.postId}`);
        } else {
          throw new Error(result.instagram?.error || 'Instagram posting failed');
        }
      }
    } catch (error) {
      console.error('❌ Post failed:', error);
      alert('❌ Failed to post: ' + (error as Error).message);
    }
  };

  // Download generated material
  const handleDownload = async (campaign: Campaign) => {
    if (!campaign.imageUrl && !campaign.image_url) {
      alert('⚠️ No image to download');
      return;
    }

    try {
      const imageUrl = campaign.imageUrl || campaign.image_url;
      const response = await fetch(imageUrl!);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${campaign.title.replace(/\s+/g, '_')}_flyer.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      alert('✅ Downloaded!');
    } catch (error) {
      alert('❌ Download failed: ' + (error as Error).message);
    }
  };

  if (loading) {
    return <div className="text-slate-400 text-center py-8">Loading social media connections...</div>;
  }

  const fbConnected = connectedAccounts.some(a => a.platform === 'facebook' && a.isConnected);
  const igConnected = connectedAccounts.some(a => a.platform === 'instagram' && a.isConnected);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Social Media Manager</h2>
          <p className="text-slate-400 text-sm">Connect platforms and promote your events</p>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-black mb-4 flex items-center gap-2">
          <Share2 size={20} />
          Connected Platforms
        </h3>
        
        {!fbConnected && !igConnected && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-4">
            <p className="text-orange-300 text-sm">
              ⚠️ No platforms connected. Use manual connection form below to connect Facebook and Instagram.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl border ${fbConnected ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-800 border-slate-700'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-xl">
                  📘
                </div>
                <div>
                  <h4 className="font-bold text-white">Facebook</h4>
                  <p className="text-xs text-slate-400">
                    {fbConnected ? connectedAccounts.find(a => a.platform === 'facebook')?.accountName : 'Not connected'}
                  </p>
                </div>
              </div>
              {fbConnected ? (
                <CheckCircle2 size={20} className="text-green-400" />
              ) : (
                <X size={20} className="text-slate-500" />
              )}
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${igConnected ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-800 border-slate-700'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-600 to-purple-800 rounded-lg flex items-center justify-center text-xl">
                  📸
                </div>
                <div>
                  <h4 className="font-bold text-white">Instagram</h4>
                  <p className="text-xs text-slate-400">
                    {igConnected ? connectedAccounts.find(a => a.platform === 'instagram')?.accountName : 'Not connected'}
                  </p>
                </div>
              </div>
              {igConnected ? (
                <CheckCircle2 size={20} className="text-green-400" />
              ) : (
                <X size={20} className="text-slate-500" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Connection Form */}
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-6">
        <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
          <Key size={20} />
          🔧 Connect Your Social Media
        </h3>
        <p className="text-slate-400 mb-4 text-sm">
          Get PAGE ACCESS TOKEN from <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener" className="text-blue-400 underline">Graph API Explorer</a> and enter below:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Facebook Manual */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h4 className="font-bold text-white mb-3 flex items-center gap-2">
              📘 Facebook Page
            </h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Page ID (e.g., 864504226754704)"
                id="user-fb-page-id"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              />
              <input
                type="text"
                placeholder="Page Name"
                id="user-fb-page-name"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              />
              <input
                type="password"
                placeholder="Page Access Token"
                id="user-fb-access-token"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              />
              <button
                onClick={async () => {
                  const pageId = (document.getElementById('user-fb-page-id') as HTMLInputElement).value.trim();
                  const pageName = (document.getElementById('user-fb-page-name') as HTMLInputElement).value.trim();
                  const token = (document.getElementById('user-fb-access-token') as HTMLInputElement).value.trim();
                  
                  if (!pageId || !pageName || !token) {
                    alert('⚠️ Fill all fields');
                    return;
                  }
                  
                  try {
                    // Delete old accounts
                    await supabase.from('social_media_accounts')
                      .delete()
                      .eq('user_id', user.id)
                      .eq('platform', 'facebook');
                    
                    const { error } = await supabase.from('social_media_accounts').insert({
                      user_id: user.id,
                      platform: 'facebook',
                      account_id: pageId,
                      account_name: pageName,
                      access_token: token,
                      is_connected: true,
                      expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                      updated_at: new Date().toISOString()
                    });
                    
                    if (error) throw error;
                    
                    await loadConnectedAccounts();
                    alert('✅ Facebook connected!');
                  } catch (error) {
                    alert('❌ Error: ' + (error as Error).message);
                  }
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-bold"
              >
                💾 Save Facebook
              </button>
            </div>
          </div>

          {/* Instagram Manual */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h4 className="font-bold text-white mb-3 flex items-center gap-2">
              📸 Instagram Business
            </h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="IG Business Account ID"
                id="user-ig-account-id"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              />
              <input
                type="text"
                placeholder="Instagram Username"
                id="user-ig-username"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              />
              <input
                type="password"
                placeholder="Access Token (same as Facebook)"
                id="user-ig-access-token"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              />
              <button
                onClick={async () => {
                  const accountId = (document.getElementById('user-ig-account-id') as HTMLInputElement).value.trim();
                  const username = (document.getElementById('user-ig-username') as HTMLInputElement).value.trim();
                  const token = (document.getElementById('user-ig-access-token') as HTMLInputElement).value.trim();
                  
                  if (!accountId || !username || !token) {
                    alert('⚠️ Fill all fields');
                    return;
                  }
                  
                  try {
                    // Delete old accounts
                    await supabase.from('social_media_accounts')
                      .delete()
                      .eq('user_id', user.id)
                      .eq('platform', 'instagram');
                    
                    const { error } = await supabase.from('social_media_accounts').insert({
                      user_id: user.id,
                      platform: 'instagram',
                      account_id: accountId,
                      account_name: username,
                      access_token: token,
                      is_connected: true,
                      expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                      updated_at: new Date().toISOString()
                    });
                    
                    if (error) throw error;
                    
                    await loadConnectedAccounts();
                    alert('✅ Instagram connected!');
                  } catch (error) {
                    alert('❌ Error: ' + (error as Error).message);
                  }
                }}
                className="w-full py-2 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-sm font-bold"
              >
                💾 Save Instagram
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-xs text-blue-300">
            <strong>⚠️ How to get values:</strong><br/>
            1. Go to <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener" className="underline">Graph API Explorer</a><br/>
            2. Select your App<br/>
            3. Click "Get Token" → <strong className="text-yellow-300">"Get Page Access Token"</strong> (NOT "Get User Access Token"!)<br/>
            4. Select your Page<br/>
            5. Copy <strong className="text-yellow-300">PAGE ACCESS TOKEN</strong> (long string starting with EAA...)<br/>
            6. Use SAME token for both Facebook and Instagram
          </p>
        </div>
      </div>

      {/* Campaign List (if any exist) */}
      {campaigns.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-black mb-4">Your Campaigns</h3>
          <div className="space-y-4">
            {campaigns.map(campaign => (
              <div key={campaign.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-lg font-black text-white mb-1">{campaign.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2">{campaign.copy}</p>
                    
                    {/* Posting status badges */}
                    <div className="flex gap-2 mt-2">
                      {campaign.facebook_posted && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                          📘 Posted to Facebook
                        </span>
                      )}
                      {campaign.instagram_posted && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-pink-500/20 text-pink-400">
                          📸 Posted to Instagram
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-700 text-slate-400">
                    {campaign.status}
                  </span>
                </div>

                {campaign.imageUrl || campaign.image_url ? (
                  <img 
                    src={campaign.imageUrl || campaign.image_url} 
                    alt={campaign.title}
                    className="w-full h-48 object-cover rounded-lg mb-3"
                  />
                ) : null}

                <div className="flex gap-2">
                  {fbConnected && (
                    <button
                      onClick={() => handlePost(campaign, 'facebook')}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-black uppercase transition-all"
                    >
                      📘 Post to Facebook
                    </button>
                  )}
                  {igConnected && (
                    <button
                      onClick={() => handlePost(campaign, 'instagram')}
                      className="flex-1 py-2 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-xs font-black uppercase transition-all"
                    >
                      📸 Post to Instagram
                    </button>
                  )}
                  {(campaign.imageUrl || campaign.image_url) && (
                    <button
                      onClick={() => handleDownload(campaign)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-2"
                      title="Download promotional material"
                    >
                      <Download size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign Generator (for Enterprise users) */}
      {showCampaignEngine && user.subscription_tier === 'enterprise' && (
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-6">
          <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
            <Sparkles size={20} className="text-purple-400" />
            AI Campaign Generator
          </h3>
          <p className="text-slate-400 mb-4 text-sm">
            Generate professional promotional content for your events using AI
          </p>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Event name (e.g., Summer Music Festival)"
              id="event-name-input"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white"
            />
            <select
              id="audience-type-input"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white"
            >
              <option value="attendees">Target Attendees</option>
              <option value="organizers">Target Organizers</option>
              <option value="sponsors">Target Sponsors</option>
              <option value="vendors">Target Vendors</option>
            </select>
            <button
              onClick={async () => {
                const eventName = (document.getElementById('event-name-input') as HTMLInputElement).value;
                const audienceType = (document.getElementById('audience-type-input') as HTMLSelectElement).value;
                
                if (!eventName) {
                  alert('⚠️ Enter event name');
                  return;
                }
                
                await handleGenerateCampaign(eventName, audienceType);
              }}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-black uppercase text-sm transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              Generate Campaign
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
