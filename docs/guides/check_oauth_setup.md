# Facebook OAuth Seadistamise Kontroll-nimekiri

Kui Facebook OAuth annab vea "URL on blokeeritud", kontrolli kõiki neid punkte:

## ✅ Facebook Developer Console

### 1. App'i põhiseaded
- [ ] Mine: https://developers.facebook.com/apps
- [ ] Vali oma EventNexus rakendus
- [ ] **Settings** → **Basic**
  - [ ] **App Mode** on **Live** ✅ (mitte Development 🔴)
  - [ ] **Privacy Policy URL** on lisatud: `https://www.eventnexus.eu/#/privacy`
  - [ ] **Terms of Service URL** on lisatud: `https://www.eventnexus.eu/#/terms`
  - [ ] **User Data Deletion** on lisatud: `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/data-deletion`
  - [ ] **App Domain** sisaldab: `eventnexus.eu` ja `supabase.co`

### 2. Facebook Login seaded
- [ ] Mine **Products** → **Facebook Login** → **Settings**
- [ ] **Client OAuth Login** on sisse lülitatud ✅
- [ ] **Web OAuth Login** on sisse lülitatud ✅
- [ ] **Valid OAuth Redirect URIs** sisaldab KÕIKI neid URLe:
  ```
  https://anlivujgkjmajkcgbaxw.supabase.co/auth/v1/callback
  https://www.eventnexus.eu/oauth-callback.html
  https://eventnexus.eu/oauth-callback.html
  https://www.eventnexus.eu/EventNexus/
  https://www.eventnexus.eu/
  http://localhost:3000/
  ```
- [ ] Salvesta muudatused (ära unusta!)

### 3. App Review
- [ ] Mine **App Review** → **Permissions and Features**
- [ ] Kontrolli, et järgmised õigused on saadaval:
  - [ ] `email` - Approved/Available
  - [ ] `public_profile` - Approved/Available

## ✅ Supabase Dashboard

- [ ] Mine: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw
- [ ] Mine **Authentication** → **Providers** → **Facebook**
  - [ ] **Facebook enabled** on sisse lülitatud ✅
  - [ ] **Client ID** (Facebook App ID) on sisestatud
  - [ ] **Client Secret** (Facebook App Secret) on sisestatud
- [ ] Mine **Authentication** → **URL Configuration**
  - [ ] **Redirect URLs** sisaldab:
    ```
    https://www.eventnexus.eu/EventNexus/#/profile
    https://www.eventnexus.eu/#/profile
    http://localhost:3000/#/profile
    ```

## ✅ Koodi kontrollimine

- [ ] Fail `services/dbService.ts` sisaldab õiget redirect URLi
- [ ] Fail `public/oauth-callback.html` eksisteerib ja on õigesti seadistatud
- [ ] Produktsioon: `https://www.eventnexus.eu/oauth-callback.html` ✅ (Primary)
- [ ] Fallback: `https://www.eventnexus.eu/EventNexus/#/profile`
- [ ] Development: `http://localhost:3000/#/profile`

## Testimine

### Lokaalne testimine
```bash
npm run dev
```
1. Ava `http://localhost:3000`
2. Kliki **Login** → **Facebook** nupp
3. Peaksid nägema Facebook'i nõusoleku ekraani
4. Pärast nõusolekut suunatakse tagasi `/profile` lehele

### Produktsiooni testimine
1. Ava `https://www.eventnexus.eu`
2. Kliki **Login** → **Facebook** nupp
3. Peaksid nägema Facebook'i nõusoleku ekraani
4. Pärast nõusolekut suunatakse tagasi `/EventNexus/#/profile` lehele

## Levinud vead ja lahendused

### ❌ "URL on blokeeritud"
**Põhjus:** Facebook'i Valid OAuth Redirect URIs ei sisalda õiget URLi

**Lahendus:**
1. Lisa KÕIK nõutavad URLid Facebook Developer Console'is
2. Veendu, et app on **Live** režiimis (mitte Development)
3. Salvesta muudatused ja oota 1-2 minutit

### ❌ "App Not Set Up: This app is still in development mode"
**Põhjus:** Facebook app ei ole Live režiimis

**Lahendus:**
1. Lisa Privacy Policy ja Terms of Service URLid
2. Lülita App Mode → **Live**

### ❌ "Invalid OAuth access token"
**Põhjus:** Vale Client ID või Client Secret Supabase'is

**Lahendus:**
1. Kontrolli Facebook Developer Console → Settings → Basic
2. Kopeeri õige App ID ja App Secret
3. Uuenda Supabase Authentication → Providers → Facebook

## Vajadusel võta ühendust

- **EventNexus Support:** huntersest@gmail.com
- **Facebook Developer Support:** https://developers.facebook.com/support/
- **Supabase Support:** https://supabase.com/support
