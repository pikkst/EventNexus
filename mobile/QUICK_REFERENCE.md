# Mobile Scanner Apps - Quick Reference

## Overview

EventNexus provides native mobile apps for iOS and Android that allow event organizers to scan and validate tickets using their mobile devices.

## Key Concepts

- **Scanner Code**: 8-character alphanumeric code (e.g., `K7Y3NP2X`)
- **Session**: Active scanning period from login to logout
- **Validation**: Real-time ticket verification via Supabase Edge Functions

## Getting Started (Organizer)

1. **Create Event** on EventNexus web platform
2. **Get Scanner Code** from event creation confirmation or dashboard
3. **Download App** - EventNexus Scanner (iOS or Android)
4. **Enter Code** in mobile app
5. **Start Scanning** tickets at your event

## Scanning Flow

```
Event Created → Scanner Code Generated → Mobile App Login → Start Scanning → Validate Tickets
```

## Scanner Code Management

### Create Code (Web Platform)

Automatically generated when creating event, or manually via:

```typescript
import { createScannerCode } from '@/services/scannerCodeService';

const code = await createScannerCode(
  eventId,
  organizerId,
  'Main Entrance Scanner'
);
// Returns: { code: 'K7Y3NP2X', ... }
```

### Manage Codes

Use `ScannerCodeManager` component in event dashboard:
- View all codes
- Create new codes
- Enable/disable codes
- Delete codes
- Track usage statistics

## Mobile App Features

### iOS (Swift)
- SwiftUI interface
- AVFoundation camera
- Real-time QR detection
- Session tracking
- Haptic feedback

### Android (Kotlin)
- Jetpack Compose UI
- CameraX + ML Kit
- Material Design 3
- Coroutines for async
- Vibration feedback

## API Integration

### Verify Scanner Code
```http
POST /rest/v1/rpc/verify_scanner_code
{ "p_code": "K7Y3NP2X" }
```

### Validate Ticket
```http
POST /functions/v1/validate-ticket
{ "qrCode": "ticket-qr-data" }
```

### Record Usage
```http
POST /rest/v1/rpc/record_scanner_usage
{ "p_scanner_code_id": "uuid" }
```

## Database Schema

```sql
-- Scanner codes table
scanner_codes (
  id,
  event_id,
  organizer_id,
  code,           -- 8-char unique code
  name,           -- Scanner device name
  is_active,
  scan_count,
  last_used_at,
  created_at
)

-- Scanner sessions table
scanner_sessions (
  id,
  scanner_code_id,
  event_id,
  device_info,
  started_at,
  last_heartbeat,
  is_active
)
```

## Security

- ✅ Unique random codes
- ✅ Active/inactive status
- ✅ Optional expiration
- ✅ Session tracking
- ✅ Device fingerprinting
- ✅ Rate limiting
- ✅ RLS policies

## Troubleshooting

### Code Not Working
- Check code is active
- Verify not expired
- Ensure event is active
- Check network connection

### Camera Issues
- Grant camera permission
- Check adequate lighting
- Ensure camera hardware working
- Try cleaning camera lens

### Validation Fails
- Verify ticket belongs to event
- Check ticket not already used
- Ensure ticket not refunded
- Verify network connection

## File Locations

### Backend
- `supabase/migrations/20260105000001_scanner_codes.sql` - Database schema
- `services/scannerCodeService.ts` - Web service layer
- `components/ScannerCodeManager.tsx` - Web UI component
- `components/EventCreationFlow.tsx` - Auto code generation

### iOS App
- `mobile/ios/EventNexusScanner/` - iOS project root
- `ScannerViewModel.swift` - Business logic
- `LoginView.swift` - Authentication
- `ScannerView.swift` - QR scanning
- `CameraPreview.swift` - Camera integration

### Android App
- `mobile/android/EventNexusScanner/` - Android project root
- `ScannerViewModel.kt` - Business logic
- `LoginScreen.kt` - Authentication
- `ScannerScreen.kt` - QR scanning
- `QrCodeAnalyzer.kt` - ML Kit integration

## Best Practices

### For Organizers
- Create scanner code per entrance/gate
- Name codes descriptively
- Disable unused codes
- Monitor scan statistics
- Keep codes secure

### For Developers
- Use throttling (3s duplicate scan prevention)
- Implement offline queue
- Log all operations
- Handle errors gracefully
- Provide clear feedback

## Performance

- **Scan Speed**: < 1 second
- **Validation**: < 500ms
- **Code Generation**: < 100ms
- **Session Duration**: Unlimited
- **Concurrent Scanners**: Unlimited

## Support

- **Documentation**: `/mobile/README.md`
- **iOS Readme**: `/mobile/ios/README.md`
- **Android Readme**: `/mobile/android/README.md`
- **Backend Setup**: `/supabase/README.md`
- **Contact**: huntersest@gmail.com
