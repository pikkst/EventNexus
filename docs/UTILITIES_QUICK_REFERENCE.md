# Quick Reference: New Utilities Guide

## 🔐 Secure Logger (`utils/logger.ts`)

### When to Use
Replace ALL `console.log`, `console.warn`, `console.debug` calls with logger.

### Basic Usage

```typescript
import logger from '@/utils/logger';

// Instead of: console.log('User logged in:', user);
logger.log('User logged in:', user); // Auto-sanitized, dev-only

// Instead of: console.error('API failed:', error);
logger.error('API failed:', error); // Always logged, sanitized

// Instead of: console.warn('Deprecated feature used');
logger.warn('Deprecated feature used'); // Dev-only

// Debug logs
logger.debug('Component rendered with props:', props); // Dev-only

// API call tracking
logger.api('POST', '/api/events', { name: 'Event' }); // Dev-only

// User action tracking (analytics)
logger.userAction('event_created', { eventId: '123' }); // Always logged
```

### What Gets Sanitized
- Passwords → `[REDACTED]`
- Tokens → `Bearer [REDACTED]`
- Emails → `[EMAIL]`
- API keys → `[REDACTED]`
- Secrets → `[REDACTED]`

### Migration Steps
1. Find: `console.log(`
2. Replace with: `logger.log(`
3. Import at top: `import logger from '@/utils/logger';`

---

## ✅ Input Validation (`utils/validation.ts`)

### Available Validators

```typescript
import { validators, validateForm } from '@/utils/validation';

// Email validation
const emailResult = validators.email('user@example.com');
if (!emailResult.isValid) {
  console.error(emailResult.error); // "Invalid email format"
}

// URL validation
const urlResult = validators.url('https://example.com', true); // required=true
if (!urlResult.isValid) {
  console.error(urlResult.error);
}

// Text length
const textResult = validators.maxLength('Some text', 100);
const minResult = validators.minLength('Text', 5);

// Required field
const requiredResult = validators.required(value, 'Event Name');
// Error: "Event Name is required"

// Number range
const rangeResult = validators.range(price, 0, 1000);

// Phone number
const phoneResult = validators.phone('+37255512345');

// Future date
const dateResult = validators.futureDate('2026-12-31');

// Price validation
const priceResult = validators.price(29.99);

// XSS prevention
const safeResult = validators.safeText(userInput, 5000);
```

### Form Validation Example

```typescript
import { validateForm } from '@/utils/validation';

const formData = {
  name: 'My Event',
  email: 'user@example.com',
  price: 25,
  date: '2026-12-31'
};

const { isValid, errors } = validateForm(formData, {
  name: (val) => validators.required(val, 'Event name'),
  email: (val) => validators.email(val),
  price: (val) => validators.price(val),
  date: (val) => validators.futureDate(val)
});

if (!isValid) {
  console.error('Validation errors:', errors);
  // { email: "Invalid email format", ... }
}
```

### React Component Usage

```typescript
import { validators } from '@/utils/validation';
import { useState } from 'react';

function MyForm() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    const result = validators.email(value);
    setEmailError(result.isValid ? '' : result.error);
  };

  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={handleEmailChange}
        aria-invalid={!!emailError}
        aria-describedby={emailError ? "email-error" : undefined}
      />
      {emailError && (
        <p id="email-error" role="alert">
          {emailError}
        </p>
      )}
    </div>
  );
}
```

---

## ♿ Accessibility Best Practices

### Form Inputs

```typescript
// ✅ GOOD - Proper ARIA labels
<div>
  <label htmlFor="event-name">Event Name</label>
  <input
    id="event-name"
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value)}
    required
    aria-required="true"
    aria-invalid={!!errors.name}
    aria-describedby={errors.name ? "name-error" : undefined}
  />
  {errors.name && (
    <p id="name-error" role="alert" aria-live="polite">
      {errors.name}
    </p>
  )}
</div>

// ❌ BAD - No labels, no error announcement
<input
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>
{errors.name && <p>{errors.name}</p>}
```

### Buttons

```typescript
// ✅ GOOD - Icon buttons with labels
<button
  onClick={handleDelete}
  aria-label="Delete event"
>
  <Trash2 className="w-4 h-4" />
</button>

// ❌ BAD - No label for screen readers
<button onClick={handleDelete}>
  <Trash2 className="w-4 h-4" />
</button>
```

### Modals

```typescript
// ✅ GOOD - Proper modal ARIA
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Confirm Delete</h2>
  <p id="modal-description">Are you sure?</p>
  <button onClick={onClose} aria-label="Close dialog">×</button>
</div>

// ❌ BAD - No role or labels
<div className="modal">
  <h2>Confirm Delete</h2>
  <p>Are you sure?</p>
  <button onClick={onClose}>×</button>
</div>
```

### Loading States

```typescript
// ✅ GOOD - Announce loading to screen readers
{isLoading ? (
  <div role="status" aria-live="polite">
    <Loader2 className="animate-spin" />
    <span className="sr-only">Loading events...</span>
  </div>
) : (
  <EventList events={events} />
)}

// ❌ BAD - Silent loading
{isLoading ? <Loader2 className="animate-spin" /> : <EventList />}
```

### Navigation

```typescript
// ✅ GOOD - Proper navigation structure
<nav aria-label="Main navigation" role="navigation">
  <ul>
    <li><a href="/events">Events</a></li>
    <li><a href="/dashboard">Dashboard</a></li>
  </ul>
</nav>

// ❌ BAD - No semantic nav or labels
<div className="nav">
  <a href="/events">Events</a>
  <a href="/dashboard">Dashboard</a>
</div>
```

---

## 🎨 Color Contrast Fixes

### Current Issues
```css
/* ❌ FAIL - 3.2:1 ratio (needs 4.5:1) */
.text-slate-500 { color: rgb(100 116 139); } /* on bg-slate-900 */

/* ✅ PASS - 7.1:1 ratio */
.text-slate-300 { color: rgb(203 213 225); } /* on bg-slate-900 */
```

### Quick Fixes
```typescript
// Replace these classes:
className="text-slate-500" → className="text-slate-300"
className="text-slate-400" → className="text-slate-300"
className="text-gray-500"   → className="text-gray-300"

// Or use semantic colors:
className="text-slate-500" → className="text-slate-300"
```

### Test Contrast
Use: https://webaim.org/resources/contrastchecker/

---

## 🚨 Error Boundary

Already active! Wraps entire app in `index.tsx`.

### Custom Fallback (optional)

```typescript
import ErrorBoundary from '@/components/ErrorBoundary';

<ErrorBoundary fallback={<MyCustomError />}>
  <MyComponent />
</ErrorBoundary>
```

### Trigger Error for Testing

```typescript
// Throw error in component to test boundary
throw new Error('Test error boundary');
```

---

## 📝 Checklist for New Components

- [ ] Replace all `console.log` with `logger.log`
- [ ] Validate all inputs with `validators`
- [ ] Add ARIA labels to all buttons and inputs
- [ ] Use proper semantic HTML (`nav`, `main`, `article`)
- [ ] Test keyboard navigation (Tab, Enter, Esc)
- [ ] Check color contrast (4.5:1 minimum)
- [ ] Add loading states with `role="status"`
- [ ] Add error states with `role="alert"`
- [ ] Test with screen reader (NVDA/VoiceOver)

---

## 🆘 Need Help?

- **Security issues:** See `docs/PLATFORM_ANALYSIS_REPORT.md`
- **Implementation guide:** See `docs/IMPLEMENTATION_PROGRESS.md`
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Practices:** https://www.w3.org/WAI/ARIA/apg/

---

**Created:** January 8, 2026  
**For:** EventNexus Development Team
