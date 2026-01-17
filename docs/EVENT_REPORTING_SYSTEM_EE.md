# EventNexus - Ürituste Raporteerimisteema

## 📋 Eesmärk

EventNexus kasutajatel on nüüd võimalus raporteerida üritusi, mis sisaldavad vale infot, vale asukohta, spam või muul viisil probleemseid kirjeid. Korraldajad ja administraatorid saavad neid teateid hallata ja reageerida.

---

## 🎯 Funktsionaalsus

### 1. **Kasutaja - Ürituse Raporteerimine**
- **Kus?** Ürituse detaiillehekülje paremal pool, Follow nupust paremal
- **Nupul:** "Report" nagu lipu ikooniga
- **Modaal avaneb** koos 6 kategooriaga:
  - 📍 Vale asukoht
  - 📝 Vale informatsioon
  - 🔄 Duplikaat ürituse
  - 🚫 Spam
  - ⚠️ Ebakohane sisu
  - ❓ Muu

**Raporteerimisprotsess:**
1. Kasutaja valib kategooria
2. Sisestab põhjuse (kohustuslik)
3. Lisab detailsed kirjelduse (valikuline)
4. Sisestab e-maili (valikuline - anonüümne raporteerimist toetab)
5. Saadab
6. Teade edastatakse korraldajale ja kõigile adminitele

---

### 2. **Korraldaja - Ürituste Korrektsioon**
- **Kus?** Organizer Hub (Dashboard → "My Events")
- **Näitaja:** 
  - Punane hoiatusbanier ürituse peal
  - Punane märk punase numbriga (avatud teatiste arv)
  
**Tegevused:**
1. Korraldaja näeb teateid
2. Saab laiendada teatiste detaile
3. Näeb:
   - Raporti tüübi
   - Põhjuse
   - Kirjelduse
   - Raporteri e-maili või "Anonymous"
   - Raporti kuupäeva
4. Korraldaja saab muuta ürituse infot või eemaldada teate

---

### 3. **Admin - Teatiste Haldamine**
- **Kus?** Admin Command Center → "Event Reports" tab (lipu ikooni)
- **Näitajad:**
  - Kokku teateid
  - Avatud teateid (punane)
  - Tunnistatud teateid (kollane)
  - Lahendatud teateid (roheline)
  - Tagasilükatud teateid (hall)

**Tegevused:**
1. Admin filtreerib teateid (otsing, staatus)
2. Avab teatise detailid
3. Lisab lahenduse märkused
4. Valib ühe kolmest tegevusest:
   - ✅ **Acknowledge** (kollane) - märgib kui töödeldakse
   - ✅ **Resolved** (roheline) - märgib lahendatuks
   - ✅ **Dismissed** (hall) - märgib tagasilükatult
5. **Kadurid valikud:**
   - 🗑️ **Delete Event** - eemaldab ürituse andmebaasist (koos kinnitusega)

---

## 📢 Teatiste Tyyp

### Kui teatise loomisel
**Teatmine korraldajale:**
```
⚠️ Event Report
"[Ürituse nimi]" on raporteeritud: [põhjus]
```

**Teatmine kõigile adminitele:**
```
🚨 New Event Report  
Teatmine saadi "[Ürituse nimi]" kohta: [põhjus]
```

### Kui teatise staatus muutub
**Teatmine raporterile:**
```
📧 Report Acknowledged/Resolved/Dismissed
Teie teatis on kinnitatud/lahendatud/tagasilükatud
```

---

## 🗄️ Andmebaasi Struktuur

### Tabel: `event_reports`
```sql
- id: UUID (peavõti)
- event_id: FK to events
- reporter_id: FK to users (nullitav)
- reporter_email: E-post (nullitav)
- report_type: ENUM (6 tüüp)
- reason: Text (kohustuslik)
- description: Text (valikuline)
- status: ENUM (open, acknowledged, resolved, dismissed)
- resolution_notes: Märkused adminilt/korraldajalt
- resolved_by: FK to users (admin)
- resolved_at: Ajamark
- created_at, updated_at: Ajamarkid
```

### Indexes:
- `event_id` - Kiire otsimine
- `reporter_id` - Kasutaja teatiste leidmine
- `status` - Filtreerimine
- `created_at` - Sortimine kuupäeva järgi

---

## 🔐 Juurdepääsu Kontroll (RLS)

✅ **Kellel on lubatud teha raporti?**
- Kõik (autenditud ja anonüümsed kasutajad)

✅ **Kellel on lubatud näha teateid?**
- Korraldaja: oma ürituste teateid
- Admin: kõiki teateid
- Raportija: oma teateid (kui konto on olemas)

✅ **Kellel on lubatud teatise staatust muuta?**
- Korraldaja: oma ürituste teateid
- Admin: kõiki teateid

✅ **Kellel on lubatud üritusi kustutada?**
- Admin ainult

---

## 📁 Loodud/Muudetud Failid

### Loodud:
1. `supabase/migrations/20260115_event_reporting_system.sql` - Andmebaasi skeem
2. `src/components/ReportEventModal.tsx` - Raporteerimisteabe modaalne aknad
3. `src/components/AdminEventReports.tsx` - Admini haldamise liides

### Muudetud:
1. `src/types.ts` - `EventReport` tüüp lisatud, `Notification` uuendatud
2. `src/services/dbService.ts` - 6 andmebaasi funktsiooni + teatiste loogika
3. `src/components/EventDetail.tsx` - Raporti nupp ja modaali integratsioon
4. `src/components/UserProfile.tsx` - Teatiste märgi kuvamine
5. `src/components/AdminCommandCenter.tsx` - Event Reports tab lisatud

---

## 📋 Turvafunktsioonid

### Database Functions:
1. **createEventReport** - Loob teatise + saadab teatised
2. **getEventReports** - Teatiste nimekirja saamiseks
3. **getEventOpenReportsCount** - Avatud teatiste arvu
4. **updateReportStatus** - Teatise staatuse muutmine + teatmine
5. **getAllEventReports** - Kõik teatised (admin)
6. **getOrganizerEventsWithReportCounts** - Korraldaja üritused koos lugudega

### Database Triggers:
- Auto-update `events.report_count` kui teatise staatus muutub

---

## ✅ Kontrollnimekiri Testimiseks

- [ ] Kasutaja saab raporteerida üritust
- [ ] Reportsitakse teatised korraldajale
- [ ] Reportsitakse teatised kõigile adminitele
- [ ] Korraldaja näeb teatiste märki Organizer Hubis
- [ ] Admin näeb Event Reports tabi
- [ ] Admin saab staatust muuta
- [ ] Admin saab üritust kustutada (kinnitusega)
- [ ] Raportija saab teatise staatuse muutmise teatise

---

## 🚀 Rakendamise Juhiseid

1. **Migraatsioon rakendada:**
   ```bash
   supabase db push 20260115_event_reporting_system.sql
   ```

2. **Frontend juurutada:**
   ```bash
   npm run build
   npm run preview
   ```

3. **Kontrollida:**
   - event_reports tabel on olemas
   - Raporti saatmine töötab
   - Teatised saadetakse
   - Organizer Hubis näeb märke
   - Admin panel on kasutavõimalik

---

## 📞 Tugi

Probleemidest või küsimustest teatite süsteemi kohta:
- Kontrollida andmebaasi logisid: `supabase logs table event_reports`
- Kontrollida teatisi admin paneelil
- RLS poliitikad: `SELECT * FROM pg_policies WHERE tablename = 'event_reports';`

---

## 🎉 Teostus Valmis!

Ürituste raporteerimisteema on nüüd täielikult rakendatud ja valmis kasutamiseks!
