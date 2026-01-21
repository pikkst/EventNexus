# Ticket & Event Display Templates System

## Ülevaade / Overview

EventNexus'is on nüüd tier-põhine pileti ja ürituse kaardi markerite kujunduse süsteem. Kasutajad saavad valida erinevaid template'e vastavalt oma subscription tier'ile ja lisaks osta premium template'id platvormi krediitide eest.

## Funktsioonid / Features

### 1. Pileti Template'd (Ticket Templates)
- **Free Tier**: Basic white ja basic gray (€0/mo)
- **Pro Tier**: Silver border, Modern Gradient (€19.99/mo, up to 20 events)
- **Premium Tier**: Gold VIP (€49.99/mo, up to 100 events)
- **Enterprise Tier**: Holographic, Royal Purple (€149.99/mo, unlimited)

Igal template'il on:
- Border style (none, silver, gold, gradient, animated)
- Background style (solid, gradient, pattern, image)
- Shadow effects (none, light, medium, heavy, glow)
- Overlay effects (shine, holographic, watermark)
- Kohandatavad värvid ja fondid

### 2. Kaardi Markerite Template'd (Event Marker Templates)
- **Free Tier**: Standard Pin
- **Pro Tier**: Pulse Circle (pulssefektiga)
- **Premium Tier**: Glow Star (helendusega)
- **Enterprise Tier**: Premium Crown (pulss + glow)

Igal template'il on:
- Marker style (standard, pin, circle, custom)
- Animatsioonid (pulse, glow, bounce on hover)
- Kohandatavad värvid ja suurused
- Lucide ikoonid tugi

### 3. Template Marketplace (Tulevikus)
- Kasutajad saavad osta premium template'id krediitide eest
- Free tier kasutajad saavad upgrade'ida piletite välimust ilma tier upgrade'ita

## Andmebaasi Struktuur

### Tabelid
1. **ticket_templates** - Pileti kujunduste template'd
2. **event_marker_templates** - Kaardi markerite template'd
3. **user_purchased_templates** - Kasutajate ostetud premium template'd
4. **event_template_selections** - Ürituste valitud template'd

### Funktsioonid
- `user_has_template_access(user_id, template_type, template_id)` - Kontrollib kasutaja juurdepääsu
- `get_user_available_templates(user_id, template_type)` - Tagastab kõik saadaolevad template'd

## Kasutamine / Usage

### 1. Ürituse Loomisel (Event Creation)

```tsx
import TemplateSelector from './Templates/TemplateSelector';

<TemplateSelector
  userId={user.id}
  userTier={user.subscription_tier}
  templateType="ticket"
  ticketType="standard"
  selectedTemplateId={selectedId}
  onSelect={setSelectedId}
  eventDetails={{
    name: eventName,
    date: eventDate,
    location: eventLocation
  }}
/>
```

### 2. Pileti Renderdimine (Ticket Rendering)

```tsx
import TemplatedTicket from './Templates/TemplatedTicket';

<TemplatedTicket
  ticket={ticketData}
  event={eventData}
  templateId={templateId}
  showActions={true}
  size="large"
/>
```

### 3. Kaardi Marker (Map Marker)

```tsx
import TemplatedEventMarker from './Templates/TemplatedEventMarker';

<TemplatedEventMarker
  event={eventData}
  templateId={markerTemplateId}
  onClick={handleMarkerClick}
/>
```

## Template'ide Lisamine (Adding Templates)

### SQL-ga (Recommended)
```sql
INSERT INTO public.ticket_templates (
  name, 
  display_name, 
  description, 
  template_type,
  border_style,
  background_style,
  background_colors,
  required_tier,
  sort_order
) VALUES (
  'my-template',
  '{"en": "My Template", "et": "Minu Kujundus", "ru": "Мой Шаблон"}',
  '{"en": "Description", "et": "Kirjeldus", "ru": "Описание"}',
  'premium',
  'gradient',
  'gradient',
  '["#FF6B6B", "#4ECDC4"]',
  'pro',
  10
);
```

### Premium Template (Ostetav krediitidega)
```sql
INSERT INTO public.ticket_templates (
  name,
  display_name,
  description,
  template_type,
  required_tier,
  is_premium,
  credit_price,
  sort_order
) VALUES (
  'platinum-exclusive',
  '{"en": "Platinum Exclusive", "et": "Plaatina Eksklusiv", "ru": "Платиновый Эксклюзив"}',
  '{"en": "Ultra-premium ticket design", "et": "Ülipremium pileti disain", "ru": "Ультра-премиум дизайн билета"}',
  'luxury',
  'free',  -- Anyone can buy
  TRUE,
  50,  -- Costs 50 credits
  20
);
```

## Tier Access Logic

Template'idele juurdepääs töötab järgmiselt:

1. **Tier-Based Access**: Kui kasutaja tier on võrdne või kõrgem kui template `required_tier`
2. **Purchased Access**: Kui kasutaja on template krediitidega ostnud (`is_premium = TRUE`)
3. **Free Tier Upgrade**: Free tier kasutajad saavad osta premium template'id ilma tier upgrade'ita

Tier järjekord: `free < pro < premium < enterprise`

## Template Properties

### Ticket Template Properties
```typescript
{
  template_type: 'standard' | 'premium' | 'vip' | 'luxury',
  border_style: 'none' | 'silver' | 'gold' | 'gradient' | 'animated',
  border_color: '#HEX',
  background_style: 'solid' | 'gradient' | 'pattern' | 'image',
  background_colors: ['#HEX1', '#HEX2'],
  background_pattern: 'dots' | 'lines' | 'waves' | 'geometric',
  text_color: '#HEX',
  accent_color: '#HEX',
  font_family: 'Inter' | 'Arial' | ...,
  corner_radius: 8,
  shadow_effect: 'none' | 'light' | 'medium' | 'heavy' | 'glow',
  overlay_effect: 'shine' | 'holographic' | 'watermark',
  qr_code_style: 'standard' | 'rounded' | 'dotted' | 'custom'
}
```

### Marker Template Properties
```typescript
{
  marker_style: 'standard' | 'pin' | 'circle' | 'custom',
  marker_color: '#HEX',
  marker_icon: 'MapPin' | 'Star' | 'Crown' | ... (Lucide icons),
  marker_size: 'small' | 'medium' | 'large' | 'xl',
  pulse_effect: boolean,
  glow_effect: boolean,
  bounce_on_hover: boolean,
  border_width: 2,
  border_color: '#HEX',
  shadow_style: 'none' | 'light' | 'medium' | 'heavy',
  icon_color: '#HEX'
}
```

## CSS Patterns

Template'id toetavad 4 taustamustrit:

1. **dots** - Punktmuster
2. **lines** - Triipudega muster
3. **waves** - Lainemuster
4. **geometric** - Geomeetriline muster

Mustrid on defineeritud `src/styles/tailwind.css` failis.

## Animatsioonid

### Marker Animations
- **pulse** - Markeri pulssefekt
- **markerBounce** - Hüppefekt hover'il
- **holographic** - Holograafiline värviefekt

### Ticket Animations
- **borderPulse** - Äärte pulssefekt animeeritud template'idel
- **holographic** - Holograafiline overlay effect

## Database Migration

Migratsiooni fail: `supabase/migrations/20260121_ticket_event_templates.sql`

Käivita:
```bash
# Supabase SQL Editor'is või
supabase db push
```

## Tulevased Täiendused (Future Enhancements)

1. **Template Marketplace**
   - Kasutajad saavad luua ja müüa oma template'id
   - Platvormi commission iga müügi pealt

2. **AI-Generated Templates**
   - Gemini AI genereerimine custom template'id kasutaja brand'iga

3. **Template Preview Generator**
   - Automaatne preview image'ide genereerimine template'idele

4. **Seasonal Templates**
   - Jõulu, uusaasta, suvi jne spetsiaalsed template'd

5. **Animated Tickets**
   - CSS/SVG animatsioonid piletitel (lux tier)

6. **Custom Fonts Support**
   - Google Fonts integratsioon

## Troubleshooting

### Template ei ilmu
- Kontrolli, et `is_active = TRUE`
- Kontrolli, et kasutaja tier on piisav
- Kontrolli RLS policies't

### Preview ei renderdu
- Veendu, et kõik required field'id on täidetud
- Kontrolli console'i error'eid
- Veendu, et background_colors on valid JSON array

### Marker ei ilmu kaardil
- Kontrolli, et Lucide icon nimi on õige
- Veendu, et marker_color on valid hex color
- Kontrolli, et event location coordinates on õiged

## Support

Probleemide korral:
1. Kontrolli console'i error'eid
2. Vaata Supabase logs'e
3. Testi template'id SQL Editor'is
4. Kontakteeru: huntersest@gmail.com

---

**Loodud:** 2026-01-21  
**Versioon:** 1.0.0  
**Autor:** EventNexus Development Team
