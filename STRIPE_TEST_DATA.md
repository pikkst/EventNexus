# Stripe Connect Test Data

Use these test values when completing Stripe Connect onboarding in **TEST MODE**:

## Personal Information (Individual)
- **First Name:** `Test`
- **Last Name:** `User`
- **Date of Birth:** `01/01/1990`
- **Phone:** `+37200000000`

## Address
- **Country:** `Estonia (EE)`
- **City:** `Tallinn`
- **Address Line 1:** `Test Street 1`
- **Address Line 2:** `Apt 2`
- **Postal Code:** `10111`

## Business Information
- **Business Type:** `Individual`
- **Business URL:** `https://www.eventnexus.eu`
- **MCC Code:** `7922` (Theatrical Producers/Ticket Agencies)
- **Business Name:** `Test Event Organizer`

## Bank Account (SEPA - Estonia)
- **IBAN:** `EE382200221020145685` (Stripe test IBAN)
- **Account Holder:** `Test User`
- **Country:** `EE`

## Identity Verification
In test mode, use Stripe's test verification values:
- **ID Number:** Use test ID that Stripe provides in test dashboard
- **OR** Upload test document (Stripe provides test files)

## Important Notes
1. ✅ Use generic test names like "Test User" - not real names
2. ✅ Stripe validates test data against internal test database
3. ✅ Real names like "Villu Künnap" will fail in test mode
4. ✅ After onboarding, check `charges_enabled` and `payouts_enabled`

## Debugging Failed Onboarding
If you see `verification_failed_keyed_identity`:
- Clear cookies and restart onboarding
- Use simpler test data (Test User, Test Street)
- Check Stripe Dashboard → Connect → Accounts for error details
- Verify you're in TEST mode (not live mode)

## Production Setup
For production, use REAL data:
- Real legal name
- Real ID/passport
- Real bank account
- Real business information
