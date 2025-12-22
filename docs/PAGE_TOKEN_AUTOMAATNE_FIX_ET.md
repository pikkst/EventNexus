# Facebook Page Token Automaatne Hankimine - Parandus

## Probleem
OAuth voog salvestas USER tokeni, kuid Facebook vajab PAGE tokeni postitamiseks. Kui admin valis lehekülgi autoriseerimise ajal, ei saanud rakendus lehekülgede ID-sid ja tokeneid kätte.

## Lahendus

### 1. OAuth Scope Uuendus
**Fail:** `services/socialAuthHelper.ts`

Lisatud `pages_show_list` Facebook OAuth scope'i:
```typescript
facebook: 'pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish'
```

See tagab, et `/me/accounts` tagastab lehekülgede nimekirja.

### 2. Pikaajaliste Tokenite Vahetus
**Uus funktsioon:** 3-astmeline protsess nii Facebooki kui Instagrami jaoks

#### Facebook Voog:
```
1. Lühiajaline USER token → Pikaajaline USER token (60 päeva)
   GET /oauth/access_token?grant_type=fb_exchange_token&...
   
2. Pikaajaline USER token → PAGE tokenite nimekiri
   GET /me/accounts?fields=id,name,access_token,category
   
3. Valitakse esimene lehekülje token (PAGE tokenid ei aegu kunagi)
   Salvestatakse andmebaasi
```

#### Instagram Voog:
```
1. Lühiajaline USER token → Pikaajaline USER token (60 päeva)
   
2. Pikaajaline USER token → Lehekülgede nimekiri koos Instagram Business Account ID-dega
   GET /me/accounts?fields=id,name,access_token,instagram_business_account
   
3. Leitakse leheküljed, millel on Instagram Business Account
   
4. Kasutatakse PAGE tokenit Instagram API kutsete jaoks
```

### 3. Parandatud Veakäsitlus

**Kui `/me/accounts` tagastab tühja massiivi:**
```typescript
throw new Error(
  'No Facebook Pages found. To post to Facebook, you need:\n' +
  '1. A Facebook Page (not just personal profile)\n' +
  '2. Admin access to that Page\n' +
  '3. Select the Page during authorization\n' +
  '4. Grant all requested permissions\n\n' +
  'Create a Page at: https://www.facebook.com/pages/create'
);
```

**Kui lehekülgedel puudub Instagram Business Account:**
```typescript
throw new Error(
  'None of your Facebook Pages have an Instagram Business Account connected.\n' +
  'Connect your Instagram at: https://www.facebook.com/settings?tab=business_tools'
);
```

### 4. Üksikasjalik Logimine

Iga samm logitakse:
```javascript
console.log('🔄 Step 1: Exchanging for long-lived user token...');
console.log('✅ Got long-lived user token (expires in X seconds)');
console.log('🔄 Step 2: Fetching Facebook Pages...');
console.log('📄 Facebook Pages response:', { pageCount, pagesWithIG, error });
console.log('✅ Using Facebook Page:', { id, name, category });
console.log('🔄 Step 3: Verifying Page token...');
console.log('✅ Page token verified successfully');
```

## Testimiseks

### 1. Uuenda OAuth Scope Andmebaasis
```bash
# Käivita Supabase SQL Editoris
cat sql/update_oauth_scope_with_pages_list.sql
```

### 2. Katkesta ja Ühenda Uuesti Facebook
1. Admin paneelil → Social Media Manager
2. Katkesta Facebook ühendus
3. Klikka "Connect Facebook"
4. **OLULINE:** OAuth dialoogis **vali konkreetne Facebook leheküljed**, mida soovid kasutada
5. Anna kõik küsitud õigused

### 3. Kontrolli Konsoolilogid
Peaksid nägema:
```
🔄 Step 1: Exchanging for long-lived user token...
✅ Got long-lived user token (expires in 5183999 seconds)
🔄 Step 2: Fetching Facebook Pages...
📄 Facebook Pages response: { hasData: true, pageCount: 1, error: undefined }
✅ Using Facebook Page: { id: '864504226754704', name: 'EventNexus', category: 'Event' }
🔄 Step 3: Verifying Page token...
✅ Page token verified successfully
```

### 4. Testi Postitamist
1. Loo või vali kampaania
2. Klikka "Post to Facebook"
3. Peaksid nägema:
```
📘 Starting Facebook post...
✅ Posted to Facebook: 123456789_987654321
✅ Database updated successfully
```

## Tehnilised Detailid

### Token Tüübid
- **USER Token:** Isiklik juurdepääs, EI SAA postitada lehtedele
- **PAGE Token:** Lehekülge-spetsiifiline, SAAB postitada
- **Lühiajaline:** 1-2 tundi
- **Pikaajaline:** 60 päeva (USER tokenid) või kunagi ei aegu (PAGE tokenid)

### Miks `/me/accounts` Tagastas Varem Tühja?
Võimalikud põhjused:
1. ❌ Puudus `pages_show_list` scope
2. ❌ Admin ei valinud lehekülge OAuth dialoogis
3. ❌ Admin pole lehekülge admin
4. ❌ Lühiajaline token aegus enne `/me/accounts` kutsumist

### Parandus
✅ Lisatud `pages_show_list` scope  
✅ Vahetatakse kohe pikaajalise tokeni vastu  
✅ Selged juhised, kui lehekülgi ei leita  
✅ Logitakse iga samm debugimiseks  

## Kasutaja Nõuded

### Facebook Postitamiseks:
- Facebook leheküljed (mitte ainult isiklik profiil)
- Admin õigused lehel
- Lehekülg valitud OAuth ajal

### Instagram Postitamiseks:
- Instagram Business Account
- Ühendatud Facebook lehega
- Leheküljel admin õigused

## Failid Muudetud
- `services/socialAuthHelper.ts` - OAuth voog ja tokeni vahetus
- `sql/update_oauth_scope_with_pages_list.sql` - Andmebaasi scope uuendus

## Järgmised Sammud
1. Käivita SQL uuendus
2. Katkesta olemasolevad ühendused
3. Ühenda uuesti kõik kontod
4. Testi postitamist
5. Kontrolli `user_campaigns` ja `social_media_posts` tabeleid

## Tugi
Kui `/me/accounts` endiselt tagastab tühja:
1. Kontrolli Facebook lehekülge olemust
2. Kinnita admin rolli
3. Kontrolli OAuth õiguste andmist
4. Vaata konsoolilogisid üksikasjalike vigade jaoks
