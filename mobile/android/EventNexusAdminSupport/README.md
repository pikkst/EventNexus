# EventNexus Admin Support App (Android)

Mobile rakendus administraatoritele, et vastata kasutajate toe küsimustele telefonis.

## Funktsioonid

- 🔔 **Push-teavitused**: Saab teavituse iga uue kasutaja sõnumi peale
- 💬 **Reaalajas vestlus**: Kohene suhtlus kasutajatega
- 📱 **Mobiilne töölaud**: Vastamine liikvel olles
- 🔐 **Admin autentimine**: Turvaline sisselogimine admin kontoga
- 📊 **Vestluste haldus**: Kõigi avatud vestluste ülevaade
- 🤖 **AI abistaja**: Kiire juurdepääs AI genereeritud vastustele
- 🌐 **Offline-tugi**: Tööd teha ka ilma internetiühenduseta (järjekord)

## Tehnoloogia

- **Keel**: Kotlin
- **UI**: Jetpack Compose
- **Teavitused**: Firebase Cloud Messaging (FCM)
- **Backend**: Supabase Realtime + Edge Functions
- **Autentimine**: Supabase Auth
- **Minimaalne Android versioon**: 8.0 (API 26)

## Installimine

1. Lae alla APK fail rakenduse veebilehelt
2. Luba "Unknown sources" oma telefonis
3. Installi APK
4. Logi sisse oma admin kontoga
5. Luba push-teavitused

## Kasutamine

1. **Sisselogimine**: Kasuta oma admin emaili ja parooli
2. **Teavitused**: Saa koheselt teate uutest sõnumitest
3. **Vastamine**: Vajuta teavitusele, kirjuta vastus
4. **AI abi**: Kasuta AI nuppu kiire vastuse saamiseks
5. **Vestluste vahetamine**: Navigeeri erinevate vestluste vahel

## Arendamine

### Seadistamine

```bash
cd /workspaces/EventNexus/mobile/android/EventNexusAdminSupport
./gradlew assembleDebug
```

### Testimine

```bash
./gradlew test
./gradlew connectedAndroidTest
```

### APK ehitamine

```bash
./gradlew assembleRelease
```

## Arhitektuur

```
app/
├── src/main/java/eu/eventnexus/adminsupport/
│   ├── MainActivity.kt              # Peamine tegevus
│   ├── ui/
│   │   ├── screens/
│   │   │   ├── LoginScreen.kt       # Admin sisselogimine
│   │   │   ├── ChatListScreen.kt    # Vestluste nimekiri
│   │   │   └── ChatScreen.kt        # Üksik vestlus
│   │   └── components/
│   │       ├── MessageBubble.kt     # Sõnumi komponent
│   │       └── ChatInput.kt         # Sisestusväli
│   ├── data/
│   │   ├── models/
│   │   │   ├── SupportChat.kt       # Vestluse mudel
│   │   │   └── ChatMessage.kt       # Sõnumi mudel
│   │   ├── repository/
│   │   │   └── ChatRepository.kt    # Andmete haldus
│   │   └── remote/
│   │       └── SupabaseClient.kt    # Supabase ühendus
│   ├── services/
│   │   ├── FcmService.kt            # Firebase push-teavitused
│   │   └── RealtimeService.kt       # Reaalajas sync
│   └── utils/
│       └── NotificationHelper.kt     # Teavituste abi
└── build.gradle                      # Projekti konfiguratsioon
```

## Turvalisus

- ✅ SSL Pinning Supabase API'le
- ✅ Turvaliselt salvestatud mandaadid (EncryptedSharedPreferences)
- ✅ Admin-ainult juurdepääs (RLS policies)
- ✅ Session management ja automaatne välja logimine
- ✅ Turvaline FCM token haldus

## Litsents

Vaata projekti juurfaili LICENSE.md

## Kontakt

Probleemide või küsimuste korral: huntersest@gmail.com
