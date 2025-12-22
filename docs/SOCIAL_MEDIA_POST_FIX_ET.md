# Sotsiaalmeedia Postitamise Parandus

## Probleem
Kui admin genereerib turunduskampaania ja postitab selle Instagram/Facebook'i:
- Frontend näitab "success" (edu) teadet
- Postitus näib õnnestuvat sotsiaalmeedia platvormil
- **REAALSUS: Midagi ei salvestu Supabase andmebaasi**
- Andmebaasi logidesse ei jõua midagi

## Põhjus
`user_campaigns` tabelis puudusid veerud sotsiaalmeedia postituste jälgimiseks:
- `facebook_posted`, `facebook_post_id`
- `instagram_posted`, `instagram_post_id`
- `twitter_posted`, `twitter_post_id`
- `linkedin_posted`, `linkedin_post_id`
- `last_posted_at`

Kood proovis neid veerge uuendada, aga need ei eksisteerinud → vaikne andmebaasi viga.

## Lahendus

### SAMM 1: Lisa Andmebaasi Veerud (KRIITILINE!)

**Mine Supabase SQL Editor'isse:**
https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql/new

**Kopeeri ja käivita see SQL skript:**

```sql
-- Lisa sotsiaalmeedia jälgimise veerud user_campaigns tabelisse
ALTER TABLE user_campaigns 
  ADD COLUMN IF NOT EXISTS facebook_posted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS facebook_post_id TEXT,
  ADD COLUMN IF NOT EXISTS instagram_posted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS instagram_post_id TEXT,
  ADD COLUMN IF NOT EXISTS twitter_posted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS twitter_post_id TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_posted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS linkedin_post_id TEXT,
  ADD COLUMN IF NOT EXISTS last_posted_at TIMESTAMPTZ;

-- Lisa indeksid kiiremateks päringuteks
CREATE INDEX IF NOT EXISTS idx_user_campaigns_facebook_posted ON user_campaigns(facebook_posted) WHERE facebook_posted = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_campaigns_instagram_posted ON user_campaigns(instagram_posted) WHERE instagram_posted = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_campaigns_status ON user_campaigns(status);

-- Loo funktsioon postituste logimiseks
CREATE OR REPLACE FUNCTION log_user_campaign_post(
  p_campaign_id UUID,
  p_platform TEXT,
  p_post_id TEXT,
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  CASE p_platform
    WHEN 'facebook' THEN
      UPDATE user_campaigns 
      SET 
        facebook_posted = TRUE,
        facebook_post_id = p_post_id,
        status = 'published',
        last_posted_at = NOW(),
        updated_at = NOW()
      WHERE id = p_campaign_id AND user_id = p_user_id;
      
    WHEN 'instagram' THEN
      UPDATE user_campaigns 
      SET 
        instagram_posted = TRUE,
        instagram_post_id = p_post_id,
        status = 'published',
        last_posted_at = NOW(),
        updated_at = NOW()
      WHERE id = p_campaign_id AND user_id = p_user_id;
  END CASE;
  
  INSERT INTO social_media_posts (
    user_id,
    platform,
    content,
    status,
    posted_at,
    external_post_id
  ) VALUES (
    p_user_id,
    p_platform,
    (SELECT title || E'\n\n' || copy FROM user_campaigns WHERE id = p_campaign_id),
    'posted',
    NOW(),
    p_post_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_user_campaign_post TO authenticated;
```

**Vajuta "Run" nuppu** SQL Editor'is.

### SAMM 2: Testi Parandust

Pärast SQL skripti käivitamist:

1. **Mine admin lehele:**
   https://eventnexus.eu/#/admin

2. **Genereeri uus kampaania:**
   - Social Media Manager sektsioonis
   - Kliki "Generate Campaign"
   - Täida ürituse nimi ja sihtgrupp
   - AI genereerib kampaania sisu

3. **Postita Facebook'i või Instagram'i:**
   - Kliki Facebook (📘) või Instagram (📸) ikooni
   - Vaata brauseri konsoolli (F12 → Console)
   - Peaksid nägema:
     ```
     📘 Starting Facebook post...
     📘 Facebook post result: { success: true, postId: "..." }
     📘 Logging Facebook post to database...
     ✅ Database updated successfully
     ```

4. **Kontrolli andmebaasi:**
   ```sql
   SELECT 
     id, title,
     facebook_posted, facebook_post_id,
     instagram_posted, instagram_post_id,
     status, last_posted_at
   FROM user_campaigns
   ORDER BY created_at DESC
   LIMIT 5;
   ```

   Peaksid nägema:
   - `facebook_posted` = `true`
   - `facebook_post_id` = tegelik post ID
   - `status` = `'published'`
   - `last_posted_at` = timestamp

### SAMM 3: Kui Veel Ei Tööta

**Kontrolli brauseri konsoolist (F12 → Console):**
- Punased vead pärast postitamist?
- Jaga täpset veateadet

**Kontrolli Supabase loge:**
- https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/logs/explorer
- Filtreeri "Error" tüüpi logid
- Otsi RPC või õiguste vigu

**Levinud vead:**

- **"function log_user_campaign_post does not exist"**
  → SQL skript ei ole käivitatud. Mine Supabase SQL Editor'isse ja käivita.

- **"column 'facebook_posted' does not exist"**
  → SQL skript ei ole käivitatud. Mine Supabase SQL Editor'isse ja käivita.

- **"Instagram requires an image"**
  → Instagram vajab pilti. Lisa kampaaniale pilt (image_url).

## Kokkuvõte

**Mida tehti:**
1. ✅ Lisati `user_campaigns` tabelisse sotsiaalmeedia jälgimise veerud
2. ✅ Loodi `log_user_campaign_post()` funktsioon andmebaasis
3. ✅ Uuendati SocialMediaManager komponenti kasutama uut funktsiooni
4. ✅ Lisati paremad vealogid ja konsooli väljundid

**Mida pead tegema:**
1. **MINE SUPABASE SQL EDITOR'ISSE** ja käivita ülal olev SQL skript
2. Testi postitamist admin lehel
3. Kontrolli andmebaasi, kas andmed on salvestunud
4. Kui ei tööta, vaata konsooli logisid ja anna teada

**Abi:**
- Dokumentatsioon: [docs/SOCIAL_MEDIA_POST_FIX.md](SOCIAL_MEDIA_POST_FIX.md)
- Diagnostika skript: `npx tsx scripts/test-social-post.ts`
- Kontakt: huntersest@gmail.com

## Kiire Test

Pärast SQL skripti käivitamist, tee kiire test:

```bash
cd /workspaces/EventNexus
npx tsx scripts/test-social-post.ts
```

See kontrollib, kas:
- ✅ Kõik veerud on olemas
- ✅ Funktsioon on loodud
- ✅ Sotsiaalmeedia kontod on ühendatud
- ✅ OAuth seaded on paigas
