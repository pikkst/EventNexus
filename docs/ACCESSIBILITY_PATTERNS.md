# Quick Reference: Accessibility Pattern Library

Use these patterns when adding ARIA labels and improving accessibility.

## Form Inputs

```typescript
<div>
  <label 
    htmlFor="field-id"
    className="block text-sm font-bold mb-2"
  >
    Field Name <span className="text-red-500" aria-label="required">*</span>
  </label>
  
  <input
    id="field-id"
    type="text"
    name="fieldName"
    required
    aria-required="true"
    aria-invalid={!!errors.fieldName}
    aria-describedby={errors.fieldName ? "field-error" : "field-hint"}
    placeholder="Enter value"
  />
  
  {!errors.fieldName && (
    <p id="field-hint" className="text-sm text-slate-400 mt-1">
      Helpful hint text
    </p>
  )}
  
  {errors.fieldName && (
    <p id="field-error" className="text-sm text-red-500 mt-1" role="alert">
      {errors.fieldName}
    </p>
  )}
</div>
```

## Icon Buttons

```typescript
<button
  onClick={handleAction}
  aria-label="Clear descriptive action"
  className="p-2 hover:bg-slate-800 rounded-lg"
>
  <Icon className="w-5 h-5" aria-hidden="true" />
</button>
```

## Icon Buttons with Text

```typescript
<button
  onClick={handleAction}
  className="flex items-center gap-2"
>
  <Icon className="w-5 h-5" aria-hidden="true" />
  <span>Button Text</span>
</button>
```

## Modals/Dialogs

```typescript
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
  className="fixed inset-0 z-50 flex items-center justify-center"
>
  <div className="bg-slate-900 rounded-2xl p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 id="dialog-title" className="text-xl font-bold">
        Dialog Title
      </h2>
      <button 
        onClick={onClose}
        aria-label="Close dialog"
      >
        <X className="w-5 h-5" aria-hidden="true" />
      </button>
    </div>
    
    <p id="dialog-description" className="text-slate-400 mb-6">
      Dialog description text
    </p>
    
    {/* Dialog content */}
  </div>
</div>
```

## Toggle Buttons (Show/Hide)

```typescript
<button
  type="button"
  onClick={() => setIsVisible(!isVisible)}
  aria-label={isVisible ? "Hide content" : "Show content"}
  aria-expanded={isVisible}
  aria-controls="content-id"
>
  {isVisible ? <EyeOff /> : <Eye />}
</button>

<div id="content-id" hidden={!isVisible}>
  {/* Toggleable content */}
</div>
```

## Loading States

```typescript
{isLoading ? (
  <div role="status" aria-live="polite" aria-busy="true">
    <LoadingSkeleton />
    <span className="sr-only">Loading data, please wait...</span>
  </div>
) : (
  <div role="region" aria-label="Data content">
    {/* Loaded content */}
  </div>
)}
```

## Navigation Links

```typescript
<nav aria-label="Main navigation">
  <ul role="list">
    <li>
      <Link 
        to="/dashboard"
        aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
      >
        Dashboard
      </Link>
    </li>
  </ul>
</nav>
```

## Images

```typescript
{/* Decorative images */}
<img src={decorativeImage} alt="" aria-hidden="true" />

{/* Informative images */}
<img 
  src={eventPoster} 
  alt={`Promotional poster for ${event.name} on ${event.date}`}
/>

{/* Complex images */}
<figure>
  <img 
    src={chart} 
    alt="Bar chart showing revenue trends"
    aria-describedby="chart-description"
  />
  <figcaption id="chart-description">
    Detailed description of the chart data...
  </figcaption>
</figure>
```

## Lists

```typescript
<ul role="list" aria-label="Event list">
  {events.map(event => (
    <li key={event.id}>
      <article aria-labelledby={`event-${event.id}-title`}>
        <h3 id={`event-${event.id}-title`}>{event.name}</h3>
        {/* Event content */}
      </article>
    </li>
  ))}
</ul>
```

## Status Messages

```typescript
{/* Success */}
<div role="status" aria-live="polite" className="bg-green-500/10">
  <CheckCircle aria-hidden="true" />
  <span>Success message</span>
</div>

{/* Error */}
<div role="alert" aria-live="assertive" className="bg-red-500/10">
  <AlertCircle aria-hidden="true" />
  <span>Error message</span>
</div>

{/* Info */}
<div role="status" aria-live="polite" className="bg-blue-500/10">
  <Info aria-hidden="true" />
  <span>Info message</span>
</div>
```

## Skip Links

```typescript
{/* At the top of the page */}
<a 
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
>
  Skip to main content
</a>

{/* Main content */}
<main id="main-content" tabIndex={-1}>
  {/* Page content */}
</main>
```

## Dropdown Menus

```typescript
<div className="relative">
  <button
    onClick={() => setIsOpen(!isOpen)}
    aria-expanded={isOpen}
    aria-haspopup="true"
    aria-controls="dropdown-menu"
  >
    Menu <ChevronDown />
  </button>
  
  {isOpen && (
    <ul
      id="dropdown-menu"
      role="menu"
      aria-orientation="vertical"
    >
      <li role="none">
        <button role="menuitem" onClick={handleAction1}>
          Option 1
        </button>
      </li>
      <li role="none">
        <button role="menuitem" onClick={handleAction2}>
          Option 2
        </button>
      </li>
    </ul>
  )}
</div>
```

## Search/Filter

```typescript
<form role="search" onSubmit={handleSearch}>
  <label htmlFor="search-input" className="sr-only">
    Search events
  </label>
  <input
    id="search-input"
    type="search"
    placeholder="Search events..."
    aria-label="Search events"
  />
  <button type="submit" aria-label="Search">
    <Search aria-hidden="true" />
  </button>
</form>
```

## Progress Indicators

```typescript
<div
  role="progressbar"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Upload progress"
>
  <div style={{ width: `${progress}%` }} />
</div>
```

## Tabs

```typescript
<div>
  <div role="tablist" aria-label="Account settings tabs">
    <button
      role="tab"
      aria-selected={activeTab === 'profile'}
      aria-controls="profile-panel"
      id="profile-tab"
      onClick={() => setActiveTab('profile')}
    >
      Profile
    </button>
    <button
      role="tab"
      aria-selected={activeTab === 'security'}
      aria-controls="security-panel"
      id="security-tab"
      onClick={() => setActiveTab('security')}
    >
      Security
    </button>
  </div>
  
  <div
    role="tabpanel"
    id="profile-panel"
    aria-labelledby="profile-tab"
    hidden={activeTab !== 'profile'}
  >
    {/* Profile content */}
  </div>
  
  <div
    role="tabpanel"
    id="security-panel"
    aria-labelledby="security-tab"
    hidden={activeTab !== 'security'}
  >
    {/* Security content */}
  </div>
</div>
```

## Screen Reader Only Text

```typescript
{/* Add to tailwind.config.js */}
module.exports = {
  theme: {
    extend: {}
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.sr-only': {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: '0',
        },
        '.not-sr-only': {
          position: 'static',
          width: 'auto',
          height: 'auto',
          padding: '0',
          margin: '0',
          overflow: 'visible',
          clip: 'auto',
          whiteSpace: 'normal',
        },
      })
    }
  ]
}

{/* Usage */}
<span className="sr-only">Additional context for screen readers</span>
```

---

## Testing Checklist

- [ ] Test with keyboard only (no mouse)
- [ ] Test with NVDA screen reader
- [ ] Test with JAWS screen reader
- [ ] Test with VoiceOver (macOS)
- [ ] Verify focus indicators visible
- [ ] Check color contrast (4.5:1 minimum)
- [ ] Run Lighthouse accessibility audit
- [ ] Run axe DevTools scan
- [ ] Test with browser zoom at 200%
- [ ] Verify responsive on mobile

---

## Common WCAG 2.1 AA Requirements

- ✅ All images have alt text
- ✅ Form inputs have associated labels
- ✅ Interactive elements are keyboard accessible
- ✅ Focus indicators are visible
- ✅ Color is not the only means of conveying information
- ✅ Text has 4.5:1 contrast ratio (7:1 for AAA)
- ✅ Touch targets are at least 44x44 pixels
- ✅ Error messages are programmatically associated with inputs
- ✅ Page has proper heading hierarchy (h1, h2, h3...)
- ✅ Skip links provided for keyboard navigation
