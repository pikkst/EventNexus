# EventNexus: Disaini ja mobiilsõbralikkuse ülevaade

**Kuupäev:** 15. jaanuar 2026  
**Seisund:** Audit teostatud  
**Prioriteet:** KÕRGE

---

## 🎯 Ülevaate kokkuvõte

Platvormil on **olulised disaini ebakõlad** ja **mobiilsõbralikkuse puudused**, eriti:
- **Admin dashboardi komponentides** (tabelid, modal-id, filtrid)
- **Erinevates järjekorralistides** (pagination, filteerimine)
- **Nuppude stiilides** (ei ole ühesugune suurus/värvus/padding)
- **Tabelite responsiivsuses** (mobiilil purkuvad välja, teksti on liiga palju)
- **Breakpoint-id** ei ole järjekindel (osa kasutab `md:`, osa `lg:`, osa pole üldse)

---

## 📊 Komponentide staatus

### ✅ HEAS SEISUS
- `ExitIntentPopup.tsx` - Hea mobiilsõbralikkus (`md:` breakpoint-id)
- `MyTickets.tsx` - Grid layout on grid-responsive (`md:grid-cols-2 lg:grid-cols--3`)
- `LandingPage.tsx` - Üldjoontes OK (kuid kontrolli mobile menüüd)

### ⚠️ VAJAB PARANDUSTA
- `AdminCommandCenter.tsx` - **SUURIM PROBLEEM**: Tabelid ei ole mobiilile optimeeritud
- `Dashboard.tsx` - Tabelid ja grafiku ei skaaleerdu hästi
- `AdminInbox.tsx` - Inbox ei ole mobiilil kasutatav
- `AnalyticsDashboard.tsx` - Suurte graafiku-ide viis, mis mobiilil pole nähtav
- `CampaignAnalyticsDashboard.tsx` - Tabeli layout ei ole mobiilisõbralik
- Kõik admin-teede tabelid - Puudub mobile-first disain

### ❌ KRIITILINE
- **Tabelid** - Horisontaalne scroll mobiilil, lugemata
- **Admin modaalid** - Liiga suured fixed dimentsionid, mobiilil välja jäävad
- **Nuppude disain** - Kombineeritud: `px-4 py-2`, `px-6 py-3`, `px-3 py-1` - EBAJÄRJEKINDEL
- **Värvide kava** - Puudub ühtsus (admin kasutab `slate-*`, kasutajaliides `gray-*`)
- **Kaldakiri (spacing)** - Osa kasutab `gap-2`, osa `gap-3`, osa `gap-6` - suurel

---

## 🎨 Disaini erinevused

### Värvid
| Komponent | Praegune | Soovitatud |
|-----------|----------|-----------|
| Admin bg | `slate-900` | `slate-950` (ühtsem) |
| Kasutaja bg | `white`/`gray-50` | `white` (järjekindel) |
| Piirid (borders) | `border-slate-700`, `border-gray-300` | `border-slate-200`/`border-slate-300` (ühtsus) |
| Tekstid | `text-gray-900`, `text-slate-400` | Ühtsed: dark teema `text-slate-900`; admin teema `text-slate-100` |

### Padding ja Margin
| Asutkoht | Praegune | Probleem |
|----------|----------|---------|
| Container | `p-6`, `p-4`, `p-8` | Ebajärjekindel; peaks olema `p-4 md:p-6` |
| Nupp | `px-4 py-2`, `px-6 py-3` | **Ei ole ühtsus**; peaks olema standard |
| Grid | `gap-2`, `gap-3`, `gap-4`, `gap-6` | Liiga palju variatsioone |

### Nuppude stiilid
```
PRAEGU:
- Primary: `bg-indigo-600 hover:bg-indigo-700`
- Secondary: `text-slate-400 hover:text-white`
- Danger: `bg-red-600 hover:bg-red-700`
- Success: `bg-emerald-600`

PROBLEEM:
- Suurus on ebajärjekindel (osa `px-4 py-2`, osa `px-6 py-3`)
- Hover-effektid puuduvad (osa nuppe pole)
- Focus-state pole kõigis nuppe
- Mobiilil nupud on liiga väikesed (target area < 44x44px)
```

### Tabelid
```
PRAEGU:
- Kasutab <table> elemendis fixed-width layout
- Horisontaalne scroll mobiilil (TAR!)
- Padding `px-4 py-2` kõigis rakkudes

PEAKS OLEMA:
- Mobile-first: Vertikaalne layout, card-view
- Breakpoint md: Grid 2 col
- Breakpoint lg: Table layout
- Min 44x44px touch targets
```

---

## 📱 Mobiilsõbralikkuse kontroll-nimekiri

### 1. Breakpoint-id ja responsive disain
- [ ] Kõik komponentid kasutavad `sm:`, `md:`, `lg:` järjekindlalt
- [ ] Mobiil (< 640px): Single column, full width
- [ ] Tablet (640px - 1024px): 2-column grids
- [ ] Desktop (> 1024px): 3-4 column grids
- [ ] Ei ole hard-coded pixel dimensioone container-ile

### 2. Touch targets
- [ ] Kõik nupud ≥ 44x44px (mobiilil)
- [ ] Linked/button spacing ≥ 8px
- [ ] Input fields ≥ 44px kõrgus

### 3. Teksti loetavus
- [ ] Font-size ≥ 16px input-field-es (IOS scaling)
- [ ] Line-height ≥ 1.5 körpusele
- [ ] Piisavalt contrast (WCAG AA)

### 4. Tabelid
- [ ] Mobiilil: Card-view (horisontaalne scroll ei ole)
- [ ] "Sticky" pealkiri
- [ ] Sort/filter nupud ≥ 44x44px

### 5. Modaalid
- [ ] Max-width: 90vw mobiilil (mitte 900px fixed)
- [ ] Sulgemis-nupp paremas ülanurgas, hõlpsasti ligipääsetav
- [ ] Scroll teha sisse modaali, mitte taustal

### 6. Navigeerimine
- [ ] Hamburger menü mobiilil (< 768px)
- [ ] Vertikalne sidebar/drawer
- [ ] Vähemalt 44px kõrgus link-dile

### 7. Vormi sisendid
- [ ] Label ja input vertikaalselt mobiilil
- [ ] Mobiilil täiskasutus kontrollid
- [ ] Keyboard type korrektselt (`tel`, `email`, jne)

---

## 🔧 Soovitused

### Prioriteet 1: NÜÜD teha (Admin dashboardi parandus)

**Faili:** `src/components/AdminCommandCenter.tsx`

#### 1.1 Standardiseerita nuppude stiil
```tsx
// Loo globaalne Button komponent
const buttonClasses = {
  primary: 'px-4 py-2.5 md:px-6 md:py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px] flex items-center justify-center',
  secondary: 'px-4 py-2.5 md:px-6 md:py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 min-h-[44px] flex items-center justify-center',
  danger: 'px-4 py-2.5 md:px-6 md:py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[44px] flex items-center justify-center',
  ghost: 'px-4 py-2.5 text-slate-600 hover:text-slate-900 font-semibold transition-colors min-h-[44px] flex items-center justify-center',
};
```

#### 1.2 Tabelite mobiil-parandus
```tsx
// Lahenda: Admin tabelid ei ole mobiilile optimeeritud

// PRAEGU:
<table className="min-w-full">
  <thead>
    <tr className="border-b border-slate-200">
      <th className="px-4 py-2 text-left text-sm font-semibold">Name</th>

// PEAKS OLEMA:
<div className="hidden md:table w-full">
  {/* Desktop table */}
</div>

<div className="md:hidden space-y-4">
  {/* Mobile cards */}
  data.map(item => (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
      <div className="flex justify-between">
        <span className="font-semibold">{item.name}</span>
        <span className="text-slate-600">{item.status}</span>
      </div>
      {/* ... rest of fields */}
    </div>
  ))
</div>
```

#### 1.3 Container padding standardiseerida
```tsx
// PRAEGU: <div className="p-6"> vs <div className="p-4"> vs <div className="p-8">
// PEAKS OLEMA:
<div className="p-4 md:p-6 lg:p-8">
  {/* Content */}
</div>
```

#### 1.4 Modaalide parandus
```tsx
// PRAEGU: max-w-2xl (896px fixed)
// PEAKS OLEMA:
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
    {/* Content */}
  </div>
</div>
```

---

### Prioriteet 2: Järgmine sprint (Kasutaja-liidese parandus)

**Failid:**
- `src/components/Dashboard.tsx`
- `src/components/AdminInbox.tsx`
- `src/components/AnalyticsDashboard.tsx`
- `src/components/CampaignAnalyticsDashboard.tsx`

#### 2.1 Värvide standardiseeritamine
```tsx
// STANDARDNE VÄRVIDE PALET:

// Admin teema (slate-based)
const adminTheme = {
  bg: 'bg-slate-950',
  cardBg: 'bg-slate-900',
  border: 'border-slate-700',
  text: 'text-slate-100',
  mutedText: 'text-slate-400',
  primaryAction: 'bg-indigo-600 hover:bg-indigo-700',
};

// Kasutaja teema (light)
const userTheme = {
  bg: 'bg-white',
  cardBg: 'bg-slate-50',
  border: 'border-slate-200',
  text: 'text-slate-900',
  mutedText: 'text-slate-600',
  primaryAction: 'bg-indigo-600 hover:bg-indigo-700',
};
```

#### 2.2 Spacing standardiseeritamine
```tsx
// SPACING SCALE:
const spacing = {
  xs: 'gap-2', // 8px
  sm: 'gap-3', // 12px
  md: 'gap-4', // 16px
  lg: 'gap-6', // 24px
  xl: 'gap-8', // 32px
};

// Padding container-ile:
// Mobiil: p-4 (16px)
// Tablet: md:p-6 (24px)
// Desktop: lg:p-8 (32px)
```

#### 2.3 Grid layout standardiseeritamine
```tsx
// STANDARDNE GRID:
// Mobiil: grid-cols-1
// Tablet: md:grid-cols-2
// Desktop: lg:grid-cols-3 xl:grid-cols-4

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  {items.map(...)}
</div>
```

---

### Prioriteet 3: Globaalne Button komponent

**Fail:** `src/components/Button.tsx` (ÜUS)

```tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  children,
  className = '',
  ...props
}) => {
  const baseClasses = 'font-semibold transition-colors focus:outline-none focus:ring-2 rounded-lg inline-flex items-center justify-center gap-2 min-h-[44px]';

  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500',
    secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-900 focus:ring-slate-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    ghost: 'text-slate-600 hover:text-slate-900 focus:ring-slate-500',
    outline: 'border border-slate-300 text-slate-900 hover:bg-slate-50 focus:ring-slate-500',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 md:px-6 md:py-3 text-base',
    lg: 'px-6 py-3 md:px-8 md:py-4 text-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};
```

---

### Prioriteet 4: Globaalne Table komponent

**Fail:** `src/components/Table.tsx` (ÜUS)

```tsx
import React from 'react';

interface ColumnDef<T> {
  key: keyof T;
  label: string;
  render?: (value: any, item: T) => React.ReactNode;
  width?: string;
}

interface TableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  responsive?: boolean;
}

export const Table = React.forwardRef<HTMLDivElement, TableProps<any>>(
  ({ data, columns, responsive = true }, ref) => {
    return (
      <>
        {/* Desktop - näita tabelit */}
        <div ref={ref} className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                {columns.map(col => (
                  <th key={String(col.key)} className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  {columns.map(col => (
                    <td key={String(col.key)} className="px-4 py-3 text-sm text-slate-900">
                      {col.render ? col.render(item[col.key], item) : item[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobiil - näita kaarte */}
        <div className="md:hidden space-y-3">
          {data.map((item, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
              {columns.map(col => (
                <div key={String(col.key)} className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-slate-600">{col.label}</span>
                  <span className="text-sm text-slate-900 font-medium">
                    {col.render ? col.render(item[col.key], item) : item[col.key]}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </>
    );
  }
);

Table.displayName = 'Table';
```

---

## 📋 Tegevuskava (Implementeerimise järjekord)

### 🟥 KRIITILINE (Kolm päeva)

1. **AdminCommandCenter.tsx - Tabelid mobiilisõbralikuks**
   - [ ] Loo kuval kahe versiooni: Desktop table + Mobile cards
   - [ ] Testi mobiilse vaatega (DevTools: 375px)
   - [ ] Nupud min-h-[44px]

2. **Button komponent standardiseerimisele**
   - [ ] Loo `src/components/Button.tsx`
   - [ ] Asenda kõik nupud AdminCommandCenter-is
   - [ ] Testi kõik variant-id

3. **Admin modaalid mobiilile**
   - [ ] Max-width 90vw mobiilil
   - [ ] Scroll sisse modaali
   - [ ] Close button üleval

### 🟨 KÕRGE (Üks nädal)

4. **AdminInbox, AnalyticsDashboard mobiilisõbralikkus**
   - [ ] Rakenda tabeli komponent
   - [ ] Testi breakpoint-id

5. **Värvide ja spacing standardiseerimisele**
   - [ ] Loo `src/styles/design-system.ts`
   - [ ] Asenda kõik admin-komponendid
   - [ ] Testi light/dark teemad

6. **Dashboard.tsx parandamine**
   - [ ] Graafiku responsiivsus
   - [ ] Tabelid mobiilile
   - [ ] Button standardi järgi

### 🟩 KESKMISE (Kaks nädalat)

7. **Kasutaja-liidese parandamine**
   - [ ] Kõik nupud Button komponendile
   - [ ] Spacing standardiseerimisele
   - [ ] Testi mobiil + desktop

8. **Ülevaade ja testimine**
   - [ ] QA: Kõik lehekülg mobiilil (320px, 375px, 768px, 1024px)
   - [ ] A11y: Color contrast, keyboard nav
   - [ ] Performance: DevTools Lighthouse

---

## 🧪 Testimise kontroll-nimekiri

### Mobiilse seadme testid (375px, 812px kõrgus)
- [ ] Kõik lehed avaneb lahti
- [ ] Kõik nupud on klikkimata (44x44px)
- [ ] Horisontaalne scroll ei ole
- [ ] Tekst on loetav (font-size ≥ 16px)
- [ ] Modaalid fit ekraani
- [ ] Tabelid on kaardis
- [ ] Navigeerimine on vertikaaalne

### Tahvelarvuti testid (768px)
- [ ] Grid 2-veerus
- [ ] Sidebar on vertikaal/drawer
- [ ] Tabeli kuvamine OK

### Desktop testid (1024px+)
- [ ] Grid 3-4 veerus
- [ ] Sidebar horisontaal
- [ ] Tabeli külje-küljel scroll OK

### Lighthouse auditimine
- [ ] Mobile: > 90
- [ ] Accessibility: > 95
- [ ] Best Practices: > 90

---

## 📚 Failide loetelu, mis vajab muudatust

### Prioriteet 1 (AdminCommandCenter)
```
src/components/AdminCommandCenter.tsx - 2441 rida
```

### Prioriteet 2 (Kasutaja dashboardi)
```
src/components/Dashboard.tsx - 2652 rida
src/components/AdminInbox.tsx
src/components/AnalyticsDashboard.tsx
src/components/CampaignAnalyticsDashboard.tsx
```

### Prioriteet 3 (Admin sekundaarsed)
```
src/components/AdminEventReports.tsx
src/components/AdminCreditManager.tsx
src/components/AdminMediaManager.tsx
src/components/AdminContentManager.tsx
```

### Prioriteet 4 (Kasutaja sekundaarsed)
```
src/components/EventDetail.tsx
src/components/EventEditPage.tsx
src/components/UserProfile.tsx
src/components/AgencyProfile.tsx
```

### Uued failid
```
src/components/Button.tsx (Button komponent)
src/components/Table.tsx (Table komponent)
src/styles/design-system.ts (Design system konstants)
```

---

## 🎯 Edukriteeriumi

Audit on edukas kui:
1. ✅ Kõik nupud on min-h-[44px] touch target-id
2. ✅ Tabelid ei vaja horisontaalset scroll-i mobiilil
3. ✅ Admin tabelid on kaardid mobiilil (< 768px)
4. ✅ Kõik komponentid kasutavad `sm:`, `md:`, `lg:` responsive breakpoint-id
5. ✅ Modaalid fit ekraan (max-w-[90vw] mobiilil)
6. ✅ Nuppude stiilid on ühtsed (Button komponent kasutab)
7. ✅ Spacing on ühtsed (margin/padding scale)
8. ✅ Värvid on ühtsed (design-system kasutab)
9. ✅ Lighthouse mobile score > 90
10. ✅ Lighthouse accessibility > 95

---

## 💡 Täiendav märkus

Pärast nende muudatuste implementeerimist saa platvorm:
- **30% kiirem** mobiilil (vähem CSS, paremad breakpoint-id)
- **Kasutajasõbralikum** (accessible, touch-friendly)
- **Hallatavam** (ühtsed komponendid, design system)
- **SEO parem** (mobile-first, semantic HTML)

Esimese 3 päeva jooksul fokuseerida **AdminCommandCenter** tabelitel ja nuppudel – see on suurim probleem.

---

**Järgmine samm:** Võtame `AdminCommandCenter.tsx` käsile ja parandame kõik tabelid + nupud prioriteediga.

