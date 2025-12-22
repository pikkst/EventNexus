/**
 * Debug script to find Instagram Business Account ID
 * Run this in browser console with your Facebook access token
 */

const ACCESS_TOKEN = 'EAAVtP2I4llMBQXKLXD17fgAqgr0FdYO0ae5DrkK25ToAC9ZB3ErQVvJZAEDPa0IO97TE3PnjiZCwVaVZA3xA41uJAPQNi8kRCMZB7wTLFIzLUvy1KjrANksA3caGm0R8my0Lw131ZANK1TUbTZAT32dKSPmpyMlgHzkStBifXCWYOrv3OBaSR2zPWdTMIKAJJIGc5ShQbXo4OrunZAxk4RYLY96Obz22ImksS9FXB13kSmthHxFwN4Nj8ZC1joaepiOechx9XxB2lpotNRLYSeJE0Dq1Hmc0ZAOnlZB';

async function debugInstagramAccount() {
  console.log('🔍 Debugging Instagram Business Account setup...\n');

  // Step 1: Get user info
  console.log('Step 1: Getting user info...');
  const userResponse = await fetch(
    `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${ACCESS_TOKEN}`
  );
  const userData = await userResponse.json();
  console.log('User:', userData);

  // Step 2: Get Facebook Pages
  console.log('\nStep 2: Getting Facebook Pages managed by this user...');
  const pagesResponse = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${ACCESS_TOKEN}`
  );
  const pagesData = await pagesResponse.json();
  console.log('Pages:', pagesData);

  if (!pagesData.data || pagesData.data.length === 0) {
    console.error('❌ No Facebook Pages found! You need to:');
    console.log('1. Create a Facebook Page');
    console.log('2. Convert your Instagram to a Business Account');
    console.log('3. Connect Instagram Business Account to the Facebook Page');
    console.log('\nGuide: https://www.facebook.com/business/help/898752960195806');
    return;
  }

  // Step 3: Find page with Instagram Business Account
  console.log('\nStep 3: Checking each page for Instagram Business Account...');
  for (const page of pagesData.data) {
    console.log(`\n📄 Page: ${page.name} (ID: ${page.id})`);
    
    if (page.instagram_business_account) {
      console.log('✅ Has Instagram Business Account:', page.instagram_business_account);
      
      // Step 4: Get Instagram account details
      const igAccountId = page.instagram_business_account.id;
      const igResponse = await fetch(
        `https://graph.facebook.com/v18.0/${igAccountId}?fields=id,username,name,profile_picture_url&access_token=${page.access_token}`
      );
      const igData = await igResponse.json();
      console.log('Instagram Account Details:', igData);
      
      console.log('\n🎯 CORRECT VALUES TO SAVE:');
      console.log(`account_id: "${igAccountId}"`);
      console.log(`account_name: "${igData.username || igData.name}"`);
      console.log(`access_token: "${page.access_token}"`);
      
      return {
        pageId: page.id,
        pageName: page.name,
        igAccountId: igAccountId,
        igUsername: igData.username,
        pageAccessToken: page.access_token
      };
    } else {
      console.log('❌ No Instagram Business Account connected to this page');
    }
  }

  console.error('\n❌ No Instagram Business Account found on any page!');
  console.log('\nTO FIX:');
  console.log('1. Go to your Instagram app settings');
  console.log('2. Switch to Professional Account → Business');
  console.log('3. Connect to your Facebook Page');
  console.log('4. Guide: https://help.instagram.com/502981923235522');
}

// Run the debug
debugInstagramAccount().catch(console.error);
