# Statement Descriptor Setup

Use a recognizable statement descriptor to reduce disputes and chargebacks.

## What is it?
The statement descriptor is the business name shown on your customers’ card statements. Stripe recommends using a name similar to your DBA or URL.

## Requirements
- Latin characters only
- 5–22 characters (shortened descriptor prefix is limited to 10)
- No `<`, `>`, `,`, `'`, `"`, `*`
- Must reflect your DBA, URL, or Legal Entity Name

## Recommended Settings for EventNexus
- Account statement descriptor (prefix): `EVENTNEXUS` (9 chars)
- Shortened descriptor (optional): `EVENTNEXUS` (<=10 chars)

With a shortened descriptor set, charges can include a dynamic suffix per payment to add context (e.g., event name).

## How to set in Stripe Dashboard
1. Go to Settings → Business Settings → Public Details.
2. Set your Statement descriptor and Shortened descriptor according to the rules above.
3. Save changes.

## Dynamic Suffix for Ticket Payments
Our checkout implementation adds a safe, short suffix from the event name for ticket purchases:
- Code location: `supabase/functions/create-checkout/index.ts`
- Field: `payment_intent_data.statement_descriptor_suffix`
- Behavior: Sanitizes the event name to A–Z, 0–9, removes spaces and disallowed characters, uppercases, and truncates to 10 characters.

Example
- Prefix (account): `EVENTNEXUS`
- Suffix (dynamic): `SUMMERFEST`
- Card statement may show: `EVENTNEXUS*SUMMERFEST`

## Subscriptions
For subscriptions (`mode: subscription`), Stripe uses invoice charges which follow your account-level descriptor. Set the account descriptor (and shortened descriptor) in the Dashboard.

## Verification
- Make a small live test charge and confirm the descriptor in your card statement or Stripe’s charge detail.
- Ensure the descriptor is recognizable and matches your business.

## Notes
- Descriptor configuration is primarily in the Stripe Dashboard; code only sets suffix for ticket payments.
- Keep descriptors aligned with brand and URL to avoid disputes.
