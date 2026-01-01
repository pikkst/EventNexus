# Facebook Data Deletion Endpoint

This document explains the data deletion endpoint required for Facebook OAuth compliance.

## Overview

Facebook requires all apps to provide a data deletion callback URL where users can request deletion of their data. This is mandatory for app review and GDPR compliance.

## Endpoint Details

**URL:** `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/data-deletion`

**Methods:**
- `POST` - Accept deletion requests from Facebook
- `GET` - Display deletion status page

## Facebook Configuration

Add this URL in your Facebook App settings:

1. Go to [Facebook Developers Console](https://developers.facebook.com/apps)
2. Select your EventNexus app
3. Go to **Settings** → **Basic**
4. Find **User Data Deletion** field
5. Enter: `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/data-deletion`
6. Save changes

## How It Works

### User Initiates Deletion

1. User disconnects EventNexus from Facebook settings
2. Facebook sends a POST request to our endpoint with a signed request
3. Our endpoint processes the deletion

### Deletion Process

The endpoint performs these actions:

1. **Validates** the signed request from Facebook
2. **Identifies** the user by email or Facebook user ID
3. **Soft deletes** the user record:
   - Sets `deleted_at` timestamp
   - Anonymizes email to `deleted_{uuid}@eventnexus.eu`
4. **Removes** auth record from Supabase Auth
5. **Returns** confirmation code to Facebook

### Confirmation Response

Facebook expects this JSON response:

```json
{
  "url": "https://www.eventnexus.eu/#/data-deletion-status?code=UUID",
  "confirmation_code": "UUID"
}
```

The URL points to a status page where users can verify their deletion request.

## Testing

### Test the Endpoint

```bash
# Test POST request (with user email)
curl -X POST https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/data-deletion \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Test GET request (status page)
curl https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/data-deletion
```

### Expected Response

```json
{
  "url": "https://www.eventnexus.eu/#/data-deletion-status?code=123e4567-e89b-12d3-a456-426614174000",
  "confirmation_code": "123e4567-e89b-12d3-a456-426614174000"
}
```

## User Flow

1. **User disconnects** EventNexus from Facebook
2. **Facebook notifies** our endpoint
3. **Endpoint processes** deletion request
4. **User receives** confirmation code
5. **Data is deleted** within 30 days (soft delete immediately, hard delete scheduled)

## Status Page

Users can check their deletion status at:

`https://www.eventnexus.eu/#/data-deletion-status?code={confirmation_code}`

Or directly via the Edge Function:

`https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/data-deletion?code={confirmation_code}`

## Security

- ✅ Validates Facebook's signed request
- ✅ Uses service role key for admin operations
- ✅ CORS headers properly configured
- ✅ Soft delete prevents accidental data loss
- ✅ Unique confirmation codes for tracking

## GDPR Compliance

This endpoint ensures compliance with:

- **Right to erasure** (Article 17)
- **Data portability** (Article 20)
- **Transparency** (Article 12-14)

## Monitoring

Check Edge Function logs in Supabase Dashboard:

https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/functions/data-deletion

## Troubleshooting

### "Invalid URL" in Facebook settings

- Ensure the URL is exactly: `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/data-deletion`
- No trailing slash
- Must be HTTPS

### Deletion not working

1. Check Edge Function logs in Supabase
2. Verify service role key is set
3. Test with curl command above

### User not found

- Endpoint handles missing users gracefully
- Returns success response even if user doesn't exist
- Facebook doesn't need to know if user exists in our system

## Support

For issues with data deletion:
- **Email:** huntersest@gmail.com
- **Facebook Support:** https://developers.facebook.com/support/
- **Supabase Docs:** https://supabase.com/docs/guides/functions

## Related Documentation

- [OAUTH_SETUP_GUIDE.md](../OAUTH_SETUP_GUIDE.md) - Complete OAuth setup
- [check_oauth_setup.md](../check_oauth_setup.md) - Setup checklist
- [GDPR Compliance](https://www.eventnexus.eu/#/privacy) - Privacy policy
