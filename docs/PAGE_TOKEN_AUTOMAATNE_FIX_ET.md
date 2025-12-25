# Facebook Page Token Auto-Retrieval Fix (English)

This replaces the previous Estonian note. Use this guide to ensure Facebook Page tokens are captured and stored.

## Problem
The OAuth flow saved only the user token. Posting to Pages requires a Page token, but page IDs/tokens were not fetched when authorizing pages.

## Fix Summary
1. **Add OAuth scope** in `services/socialAuthHelper.ts` to include `pages_show_list` so `/me/accounts` returns pages.
2. **Exchange tokens**:
   - Short-lived user token → long-lived user token (60 days) via `/oauth/access_token`.
   - Long-lived user token → Page token list via `/me/accounts?fields=id,name,access_token,category,instagram_business_account`.
   - Select a Page token (Page tokens do not expire) and store it.
3. **Improved errors and logging** to guide admins when no pages or no Instagram business accounts are present.

## Steps to Apply
1. Ensure the code includes `pages_show_list` in the Facebook scopes.
2. Run the scope update SQL if needed: [sql/tokens/update_oauth_scope_with_pages_list.sql](../sql/tokens/update_oauth_scope_with_pages_list.sql).
3. Disconnect and reconnect Facebook in the Social Media Manager, selecting the target Pages and granting all permissions.
4. Watch console logs for the three-step exchange and Page verification.

## Testing
1. Reconnect Facebook via the admin Social Media Manager and choose a Page.
2. Post a campaign to Facebook and confirm logs show long-lived token retrieval, page listing, and page token verification.
3. Confirm database updates by posting and checking SocialMediaManager console logs for success and DB update messages.

## Notes
- Page posting requires a Facebook Page (not just a profile) and admin access to that Page.
- Instagram posting requires an Instagram Business Account linked to a Facebook Page with admin rights.

## Related Files
- `services/socialAuthHelper.ts` – OAuth scopes and token exchange
- [sql/tokens/update_oauth_scope_with_pages_list.sql](../sql/tokens/update_oauth_scope_with_pages_list.sql) – database scope update

## Support
If `/me/accounts` still returns empty, verify the Page exists, you are an admin, and all requested permissions were granted. For help: huntersest@gmail.com
