# Bulk City Import - Visual UI Guide

## UI Location

```
https://eventnexus.eu/admin/ai-agents
    ↓
[Manage Cities] tab
    ↓
[Add Country] button (green)
```

## UI Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Manage Cities & Event Sources                        [ ][ ] │
│                                           [Add Country][Add City]
└─────────────────────────────────────────────────────────────┘
                         │
                         │ Click "Add Country"
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 🌍 Bulk Import Cities by Country                           │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ Select a country and the system will use AI to find all    │
│ major cities with coordinates and timezones.                │
│                                                              │
│ Country Name *                                              │
│ ┌──────────────────────────────────┐ ┌──────────────┐      │
│ │ Germany, France, USA, Japan...   │ │[🔍Find Cities]│      │
│ └──────────────────────────────────┘ └──────────────┘      │
│ 💡 Tip: AI will find ~20 major cities                       │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ Enter "Germany" + Click "Find Cities"
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 🔄 Fetching cities from AI...                              │
│ [Spinner animation]                                         │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ AI returns results (5-10 sec)
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Found 20 cities in Germany                                  │
│                        [Select All New][Deselect All]       │
│ ┌───────────────────────────┬──────────────────────────┐   │
│ │ ☑ Berlin                  │ ☑ Hamburg                │   │
│ │ 52.5200, 13.4050          │ 53.5511, 9.9937          │   │
│ │ Europe/Berlin             │ Europe/Berlin            │   │
│ ├───────────────────────────┼──────────────────────────┤   │
│ │ ☑ Munich                  │ ☑ Cologne                │   │
│ │ 48.1351, 11.5820          │ 50.9375, 6.9603          │   │
│ │ Europe/Berlin             │ Europe/Berlin            │   │
│ ├───────────────────────────┼──────────────────────────┤   │
│ │ ☑ Frankfurt               │ ☐ Stuttgart [Exists]     │   │
│ │ 50.1109, 8.6821           │ 48.7758, 9.1829          │   │
│ │ Europe/Berlin             │ Europe/Berlin            │   │
│ └───────────────────────────┴──────────────────────────┘   │
│ ... (scroll for more)                                       │
│                                                              │
│ 15 cities selected for import      [Import 15 Cities]      │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ Click "Import 15 Cities"
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Confirm Dialog                                              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ 🌍 Bulk Import Cities?                                      │
│                                                              │
│ Country: Germany                                            │
│ Cities to import: 15                                        │
│                                                              │
│ • Berlin                                                    │
│ • Munich                                                    │
│ • Hamburg                                                   │
│ • Frankfurt                                                 │
│ ... (all selected cities)                                   │
│                                                              │
│ Each city will be:                                          │
│ 1. Added to the database                                    │
│ 2. Auto-bootstrapped for event sources                      │
│ 3. Added to the discovery pipeline                          │
│                                                              │
│ This may take a few minutes. Continue?                      │
│                                                              │
│                              [Cancel]  [OK]                 │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ Click "OK"
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 🔄 Importing Cities... 5/15                                 │
│ Current: Hamburg, Germany                                   │
│ ━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░  33%                 │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ Import completes
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Results Dialog                                              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ 🌍 Bulk Import Complete!                                    │
│                                                              │
│ ✅ Successfully imported: 14                                │
│ ❌ Failed: 1                                                │
│                                                              │
│ Successful cities:                                          │
│ ✓ Berlin, Germany                                           │
│ ✓ Munich, Germany                                           │
│ ✓ Hamburg, Germany                                          │
│ ✓ Frankfurt, Germany                                        │
│ ... (all successful)                                        │
│                                                              │
│ Failed cities:                                              │
│ ✗ Stuttgart, Germany: Duplicate entry                       │
│                                                              │
│ 🤖 Auto-bootstrap will start within 5 minutes.              │
│ Check Agent Logs to monitor progress.                       │
│                                                              │
│                                    [OK]                     │
└─────────────────────────────────────────────────────────────┘
```

## Button States

### Add Country Button
```
┌──────────────────┐
│ 🌐 Add Country   │  ← Normal state (green bg)
└──────────────────┘

┌──────────────────┐
│ ❌ Cancel        │  ← When form is open
└──────────────────┘
```

### Find Cities Button
```
┌──────────────────┐
│ 🔍 Find Cities   │  ← Ready to search
└──────────────────┘

┌──────────────────┐
│ 🔄 Fetching...   │  ← Loading state (disabled)
└──────────────────┘
```

### Import Button
```
┌──────────────────────┐
│ ⬇️ Import 0 Cities   │  ← Disabled (no selection)
└──────────────────────┘

┌──────────────────────┐
│ ⬇️ Import 15 Cities  │  ← Active (cities selected)
└──────────────────────┘
```

## City Card States

### New City (Can be imported)
```
┌───────────────────────────┐
│ ☑ Berlin                  │ ← Green border when checked
│ 52.5200, 13.4050          │   White border when unchecked
│ Europe/Berlin             │
└───────────────────────────┘
```

### Existing City (Cannot be imported)
```
┌───────────────────────────┐
│ ☐ Stuttgart [Already exists] │ ← Gray background
│ 48.7758, 9.1829           │   Disabled checkbox
│ Europe/Berlin             │   Opacity: 60%
└───────────────────────────┘
```

## Progress Bar

### During Import
```
━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░  33%
█████████████░░░░░░░░░░░░░░░░░░░░░░░░  (Green fill)
```

### Complete
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  100%
██████████████████████████████████████  (Full green)
```

## Color Scheme

### Buttons
- **Add Country**: Green (`bg-green-600` / `hover:bg-green-700`)
- **Add City**: Indigo (`bg-indigo-600` / `hover:bg-indigo-700`)
- **Find Cities**: Green (`bg-green-600` / `hover:bg-green-700`)
- **Import**: Green (`bg-green-600` / `hover:bg-green-700`)

### Form Sections
- **Border**: Green (`border-green-200`)
- **Background**: Light green (`bg-green-50`)
- **Headers**: Gray-900 (`text-gray-900`)

### City Cards
- **Selected**: Green border (`border-green-500`), Light green bg (`bg-green-50`)
- **Unselected**: Gray border (`border-gray-200`), White bg (`bg-white`)
- **Existing**: Gray border (`border-gray-200`), Gray bg (`bg-gray-50`)
- **Hover**: Green border (`hover:border-green-300`)

### Progress Bar
- **Background**: Light green (`bg-green-200`)
- **Fill**: Dark green (`bg-green-600`)

## Icons Used

| Icon | Usage | Source |
|------|-------|--------|
| 🌐 Globe | Add Country button | lucide-react |
| 🔍 Search | Find Cities button | lucide-react |
| ⬇️ Download | Import button | lucide-react |
| 🔄 RefreshCw | Loading spinner | lucide-react (animated) |
| ❌ X | Cancel button | lucide-react |

## Responsive Design

### Desktop (md+)
```
┌─────────────┬─────────────┐
│ City 1      │ City 2      │
├─────────────┼─────────────┤
│ City 3      │ City 4      │
└─────────────┴─────────────┘
(2 columns)
```

### Mobile
```
┌─────────────┐
│ City 1      │
├─────────────┤
│ City 2      │
├─────────────┤
│ City 3      │
└─────────────┘
(1 column)
```

## Scrolling

### City Grid
```
Max height: 384px (max-h-96)
Overflow: Scrollable (overflow-y-auto)

If > 10 cities, scroll appears:
┌───────────────┐
│ City 1        │
│ City 2        │  ⤶ Scrollable
│ City 3        │  │ area
│ ...           │  ⤷
└───────────────┘
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Enter | Trigger "Find Cities" (when in country input) |
| Space | Toggle city checkbox (when focused) |
| Tab | Navigate between elements |
| Esc | Close form (future enhancement) |

## Accessibility

### ARIA Labels
- Input field: `placeholder="Germany, France, United States, Japan..."`
- Buttons: Text labels for screen readers
- Checkboxes: Associated with city names

### Visual Feedback
- Loading spinner for fetching
- Progress bar for import
- Success/error messages
- Disabled states clearly visible

## Animation

### Loading States
```css
/* Spinner */
.animate-spin {
  animation: spin 1s linear infinite;
}

/* Progress bar */
.transition-all {
  transition: all 0.3s ease;
}
```

### Transitions
- Button hover: Smooth color change
- Card selection: Border color transition
- Progress bar: Width animation

## Example Screenshots

### 1. Initial State
```
Empty form with country input field and "Find Cities" button
```

### 2. Fetching State
```
Loading spinner with "Fetching..." text, disabled input
```

### 3. Results State
```
Grid of 20 cities, some checked, some existing (grayed out)
"Select All New" and "Deselect All" buttons visible
Import button shows count of selected cities
```

### 4. Importing State
```
Progress bar showing 33% completion
Text: "Importing Cities... 5/15"
"Current: Hamburg, Germany"
```

### 5. Complete State
```
Results dialog with:
- Success count (14)
- Failed count (1)
- List of successful cities
- List of failed cities with errors
- Next steps message
```

## Tips Section

```
┌─────────────────────────────────────────────────────────┐
│ 💡 Tip: AI will find ~20 major cities. For Germany,    │
│    this would include Berlin, Munich, Hamburg, etc.     │
└─────────────────────────────────────────────────────────┘
```

## Error States

### No Results
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ No cities found for "InvalidCountry"                 │
│                                                          │
│ Please try:                                             │
│ • Different country name variant                        │
│ • Check spelling                                        │
│ • Use English country name                              │
└─────────────────────────────────────────────────────────┘
```

### API Error
```
┌─────────────────────────────────────────────────────────┐
│ ❌ Failed to fetch cities: Network error                │
│                                                          │
│ Please try again or contact support if the issue        │
│ persists.                                               │
└─────────────────────────────────────────────────────────┘
```

### Import Error
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Some cities failed to import                         │
│                                                          │
│ ✓ Successful: 12                                        │
│ ✗ Failed: 3                                             │
│                                                          │
│ Failed cities:                                          │
│ • Berlin, Germany: Duplicate entry                      │
│ • Munich, Germany: Database error                       │
│ • Hamburg, Germany: Invalid coordinates                 │
└─────────────────────────────────────────────────────────┘
```

---

## Summary

**UI Components**: 9 major components
**States**: 5 distinct UI states
**Colors**: Green theme for bulk import (differentiates from blue "Add City")
**Icons**: 5 lucide-react icons
**Responsive**: Mobile (1 col) and Desktop (2 col)
**Accessibility**: Full keyboard navigation, ARIA labels
**Animations**: Spinners, transitions, progress bar

**Design Goal**: Clear, intuitive, visually distinct from single city add
**User Feedback**: Multiple touchpoints (loading, progress, results)
**Error Handling**: Graceful with actionable messages

---

*Visual Guide Created: January 14, 2026*
