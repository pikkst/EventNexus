# Production Secrets Setup for Ticket System

## Overview

The ticket system requires a secret key (`TICKET_HASH_SECRET`) for generating secure QR codes. Since you run the site live via GitHub Pages without `.env.local`, you need to configure secrets in two places:

1. **GitHub Actions** - For client-side code (build time)
2. **Supabase Edge Functions** - For webhook (runtime)

## 1. GitHub Actions Secrets

### Add Secret to Repository

1. Go to your GitHub repository: `https://github.com/pikkst/EventNexus`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add:
   - **Name**: `TICKET_HASH_SECRET`
   - **Value**: Generate a secure random string (see below)

### Generate Secure Secret

Run this command to generate a secure random secret:

```bash
openssl rand -base64 32
```

Example output: `kJ8h3nF9mK2pL4qW7vX0zR5tY6uI1oP3sA4dB8cE9gH=`

### Update GitHub Actions Workflow

Your `.github/workflows/deploy.yml` should expose the secret during build:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: 
          node-version: '20'
      
      - run: npm ci
      
      - name: Build with secrets
        env:
          TICKET_HASH_SECRET: ${{ secrets.TICKET_HASH_SECRET }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: npm run build
      
      - uses: actions/upload-pages-artifact@v3
        with: 
          path: 'dist'

  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    steps:
      - uses: actions/deploy-pages@v4
```

## 2. Supabase Edge Function Secrets

### Set Secret in Supabase

The webhook needs the same secret for generating QR codes after payment.

#### Via Supabase CLI:

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref anlivujgkjmajkcgbaxw

# Set the secret (use the SAME value as GitHub Actions)
supabase secrets set TICKET_HASH_SECRET=kJ8h3nF9mK2pL4qW7vX0zR5tY6uI1oP3sA4dB8cE9gH=

# Verify it's set
supabase secrets list
```

#### Via Supabase Dashboard:

1. Go to: `https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/settings/functions`
2. Find **Edge Function Secrets** section
3. Add:
   - **Name**: `TICKET_HASH_SECRET`
   - **Value**: (same value as GitHub Actions secret)
4. Click **Save**

### Redeploy Webhook

After setting the secret, redeploy the webhook:

```bash
supabase functions deploy stripe-webhook
```

## 3. Verify Setup

### Test Client-Side

Build should succeed without warnings:
```bash
npm run build
# Check that process.env.TICKET_HASH_SECRET is defined
```

### Test Webhook

After a ticket purchase, check Supabase Function logs:
```bash
supabase functions logs stripe-webhook
```

You should see:
```
Generated secure QR codes for N tickets (session: cs_...)
```

### Test End-to-End

1. **Purchase a ticket** on live site
2. **Check user profile** - ticket should have QR code
3. **Scan QR code** - should validate successfully

## Security Best Practices

### ✅ DO:
- Use a strong, random secret (32+ characters)
- Keep the same secret in both GitHub and Supabase
- Store secrets in repository secrets (not in code)
- Rotate secrets periodically (every 90 days)

### ❌ DON'T:
- Never commit secrets to Git
- Don't store secrets in database
- Don't use weak/predictable values
- Don't share secrets via email/chat

## Troubleshooting

### Build fails with "TICKET_HASH_SECRET undefined"
- Check GitHub Actions secret is set correctly
- Verify workflow exposes secret as env variable
- Check vite.config.ts has `process.env.TICKET_HASH_SECRET`

### QR codes not generating after purchase
- Check Supabase Edge Function secret is set
- Verify webhook is deployed after secret was added
- Check function logs for errors

### QR validation fails
- Secrets must match in GitHub Actions and Supabase
- Old tickets with different secret won't validate
- Regenerate QR codes after secret change

## Current Configuration

### vite.config.ts
```typescript
define: {
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.TICKET_HASH_SECRET': JSON.stringify(env.TICKET_HASH_SECRET)
}
```

### stripe-webhook/index.ts
```typescript
const TICKET_HASH_SECRET = Deno.env.get('TICKET_HASH_SECRET') || 'fallback-secret';
```

### ticketService.ts
```typescript
const TICKET_HASH_SECRET = process.env.TICKET_HASH_SECRET || 'dev-secret';
```

## Quick Setup Script

```bash
#!/bin/bash
# Setup ticket system secrets

# Generate secret
SECRET=$(openssl rand -base64 32)
echo "Generated secret: $SECRET"

# Set in Supabase
supabase secrets set TICKET_HASH_SECRET="$SECRET"

# Instructions for GitHub
echo ""
echo "Now add this to GitHub Actions:"
echo "1. Go to: https://github.com/pikkst/EventNexus/settings/secrets/actions"
echo "2. Click 'New repository secret'"
echo "3. Name: TICKET_HASH_SECRET"
echo "4. Value: $SECRET"
echo ""
echo "Then commit and push to trigger rebuild."
```

## Support

Issues? Contact huntersest@gmail.com
