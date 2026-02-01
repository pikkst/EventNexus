# Keyboard Navigation Testing Checklist

## Overview
This document provides a step-by-step guide for testing keyboard navigation and accessibility across EventNexus. All tests should be performed without using a mouse.

---

## Test Environment Setup

### Prerequisites
- [ ] EventNexus running locally (`npm run dev`)
- [ ] Browser: Chrome, Firefox, Safari, or Edge
- [ ] Mouse disconnected or disabled
- [ ] Keyboard: Standard US layout (or adjust for your layout)

### Before Starting
1. Open `http://localhost:3000` in your browser
2. Open Developer Tools (F12)
3. Open Console to check for accessibility warnings
4. Maximize window for full view

---

## Keyboard Navigation Basics

### Standard Keys Used in Testing

| Key | Action |
|-----|--------|
| Tab | Move focus forward to next element |
| Shift+Tab | Move focus backward to previous element |
| Enter | Activate button/link/submit form |
| Space | Activate button/toggle checkbox/expand menu |
| Escape | Close modal/dropdown/menu |
| Arrow Keys | Navigate within menus/lists (up/down/left/right) |
| Home | Jump to first item in list/menu |
| End | Jump to last item in list/menu |

---

## Test Cases

### TEST 1: Navigation Bar Accessibility

#### 1.1 Tab Navigation
- [ ] Press Tab from page load
  - First interactive element should be visible (focus ring)
  - Focus ring should be bright blue (#6366f1)
- [ ] Press Tab repeatedly
  - Focus should move: Menu ➜ Notifications ➜ Profile ➜ Sidebar
  - No elements skipped
  - No focus "jumps" to unexpected elements
- [ ] Verify focus order is left-to-right

#### 1.2 Menu Button
- [ ] Tab until "Menu" button is focused
  - Button should have visible blue ring
- [ ] Press Enter or Space
  - Sidebar should appear
  - Aria-expanded should change to true
- [ ] Press Escape
  - Sidebar should close
  - Aria-expanded should change to false
  - Focus should return to Menu button

#### 1.3 Notifications Button
- [ ] Tab until "Notifications" button is focused
- [ ] Press Enter
  - Notification menu should open
  - aria-expanded="true"
  - Screen reader announces "Notifications menu, open"
- [ ] Press Arrow Down
  - Focus should move to first notification
- [ ] Press Arrow Down again
  - Focus should move to next notification
  - Repeats until last notification
- [ ] Press Escape
  - Menu closes
  - Focus returns to Notifications button

#### 1.4 Profile Menu Button
- [ ] Tab until "Profile" button is focused
- [ ] Press Enter
  - Profile menu opens
  - Screen reader: "Profile menu, open"
- [ ] Press Arrow Down
  - Focus moves to "Profile" option
  - Press Arrow Down again
  - Focus moves to "Settings" option
  - Press Arrow Down again
  - Focus moves to "Sign Out" option
- [ ] Press Home
  - Focus jumps to first option
- [ ] Press End
  - Focus jumps to last option
- [ ] Press Escape
  - Menu closes
  - Focus returns to Profile button

---

### TEST 2: Sidebar Navigation Accessibility

#### 2.1 Sidebar Opening
- [ ] Press Tab to Menu button
- [ ] Press Enter
  - Sidebar opens with animation
  - No focus trap yet (ready for implementation)
- [ ] Tab repeatedly
  - Focus moves through all sidebar items: Map ➜ Live Map ➜ Event Directory...
  - All items are keyboard accessible
- [ ] Press Escape
  - Sidebar closes
  - Focus returns to Menu button

#### 2.2 Sidebar Items
- [ ] Tab to any sidebar item (e.g., "Map")
  - Item should have focus ring
- [ ] Press Enter
  - Should navigate to /map
  - Page changes
- [ ] Browser back button returns to previous page

#### 2.3 Admin Menu (if logged in as admin)
- [ ] Open sidebar
- [ ] Tab down to "Command Center" item
  - Should be visible and focusable
- [ ] Press Enter
  - Navigate to /admin
  - Admin features accessible

---

### TEST 3: Form Accessibility (Login Page)

#### 3.1 Form Navigation
- [ ] Navigate to login page
- [ ] Press Tab to first form field (Email)
  - Input has focus ring
  - Label "Email Address" visible above
  - aria-required="true"
- [ ] Type valid email
  - Text appears in input
- [ ] Press Tab
  - Focus moves to password field
  - Label "Password" visible
- [ ] Press Tab
  - Focus moves to "Sign In" button
- [ ] Press Tab
  - Focus moves to "Sign Up" link

#### 3.2 Form Validation
- [ ] Leave email empty
- [ ] Press Tab to move away
  - Error message appears: "Email is required"
  - aria-invalid="true"
  - Error text has role="alert"
- [ ] Focus on email field again
  - aria-describedby includes error ID
- [ ] Type invalid email (e.g., "notanemail")
- [ ] Tab to password field
  - Error: "Please enter a valid email address"
- [ ] Enter valid email and password
  - No errors shown
  - Button enables and is clickable

#### 3.3 Password Field
- [ ] Tab to password input
- [ ] Look for visibility toggle button
  - Should have aria-label: "Show password"
- [ ] Press Tab (focus on button)
- [ ] Press Space
  - Password becomes visible (type="text")
  - Button label changes to "Hide password"
  - aria-pressed="true"
- [ ] Press Space again
  - Password hidden again
  - aria-pressed="false"

---

### TEST 4: Modal/Dialog Accessibility

#### 4.1 Opening Modal
- [ ] Navigate to create event page (or trigger any modal)
- [ ] Modal opens
  - Modal has role="dialog"
  - Modal has aria-modal="true"
- [ ] Tab to focus first element in modal
  - Focus ring visible
  - Usually a close button (X)

#### 4.2 Focus Trap in Modal
- [ ] Press Tab repeatedly while modal open
  - Focus moves through all modal elements
  - When at last focusable element, Tab goes to first element
  - Focus never leaves modal
- [ ] Press Shift+Tab
  - Focus moves backward through elements
  - At first element, Shift+Tab goes to last element
  - Focus wraps correctly

#### 4.3 Close Modal
- [ ] Press Escape
  - Modal closes
  - Focus returns to element that opened modal
- [ ] Open modal again
- [ ] Tab to close button (X)
- [ ] Press Enter or Space
  - Modal closes
  - Focus returns

---

### TEST 5: Color Contrast

#### 5.1 Navigation Elements
- [ ] Check text color on buttons
  - White text on dark background (indigo/blue)
  - Should meet 4.5:1 ratio (AA standard)
  - Use WebAIM Contrast Checker
- [ ] Check disabled button colors
  - Should still meet contrast ratio
  - Usually slightly faded

#### 5.2 Text Elements
- [ ] Check normal text on dark backgrounds
  - Light gray text on dark should be visible
  - Ratio should be at least 4.5:1
- [ ] Check placeholder text
  - Should not be the only indication of input purpose
  - Labels should be present

#### 5.3 Error States
- [ ] Trigger form error (leave field blank)
  - Error message has red text
  - Should still meet 4.5:1 contrast
  - Not relying only on color to convey error

---

### TEST 6: Responsive Keyboard Navigation

#### 6.1 Mobile Viewport (375px width)
- [ ] Press F12 to open DevTools
- [ ] Click Device Toggle (Responsive Design Mode)
- [ ] Set to 375x812 (iPhone size)
- [ ] Tab through all elements
  - All elements still accessible via keyboard
  - No touch-only buttons
  - Mobile menu also keyboard accessible
- [ ] Test on various viewports:
  - [ ] 375px (mobile)
  - [ ] 768px (tablet)
  - [ ] 1024px (desktop)
  - [ ] 1440px (large desktop)

---

### TEST 7: Link & Button Distinction

#### 7.1 Button Elements
- [ ] All buttons should:
  - [ ] Have button role or `<button>` element
  - [ ] Be activable with Space key
  - [ ] Have visible focus indicator
  - [ ] Have descriptive text or aria-label
- [ ] No `<div>` elements used as buttons
  - If found: report as accessibility issue

#### 7.2 Link Elements
- [ ] All links should:
  - [ ] Have `<a>` element with href
  - [ ] Be activable with Enter key only
  - [ ] Have underline or other visual indicator
  - [ ] Context should be clear

---

### TEST 8: Focus Visibility

#### 8.1 Focus Indicator Visibility
- [ ] Tab through entire page slowly
  - Every focused element has visible ring
  - Ring is bright blue (#6366f1)
  - Ring contrasts with background
  - Not hidden behind other elements
- [ ] Check dark backgrounds
  - Focus ring should be visible on dark
- [ ] Check light backgrounds
  - If any light backgrounds exist, ring still visible

#### 8.2 Focus Order
- [ ] Tab through page start to finish
  - Order should be logical: top-to-bottom, left-to-right
  - No jumping around unexpectedly
  - No elements skipped
- [ ] Tab through sidebar
  - Order is top-to-bottom
  - No important items skipped

---

### TEST 9: Screen Reader Announcements (NVDA/JAWS/VoiceOver)

#### 9.1 Button Announcements
- [ ] Use screen reader to tab to each button
  - Screen reader announces: "[Button text], button"
  - Example: "Notifications, button"
- [ ] Icon buttons
  - Should announce: "[aria-label], button"
  - Example: "Toggle menu, button"

#### 9.2 Menu Announcements
- [ ] Tab to notifications button
  - Announces: "Notifications, button, aria-expanded false"
- [ ] Press Enter
  - Announces: "Notifications menu opened"
  - Or: "aria-expanded true"
- [ ] Tab through notifications
  - Each announces as menu item
  - Example: "New event nearby, menu item"

#### 9.3 Form Announcements
- [ ] Tab to email field
  - Announces: "Email address, required, edit text"
- [ ] Trigger validation error
  - Announces: "Email is required, alert"
  - Error message read immediately
- [ ] Submit form
  - Success message announced (if aria-live used)

---

### TEST 10: Keyboard Shortcuts

#### 10.1 Escape Key
- [ ] Open any dropdown/modal
- [ ] Press Escape
  - Closes immediately
  - Focus returns to trigger element
  - Works on: notifications, profile menu, modals

#### 10.2 Enter/Space Keys
- [ ] Focus any button
- [ ] Press Enter
  - Button activates
  - Expected action occurs
- [ ] Focus same button
- [ ] Press Space
  - Button activates
  - Same action occurs

#### 10.3 Tab Key
- [ ] Press Tab at start of page
  - Focus moves forward one element
  - Focus ring visible
- [ ] Press Shift+Tab
  - Focus moves backward one element

#### 10.4 Arrow Keys (Menus)
- [ ] Open notification menu
- [ ] Press Arrow Down
  - Focus moves to first notification
  - Previous focus loses ring
- [ ] Press Arrow Down again
  - Focus moves to next notification
- [ ] Press Arrow Up
  - Focus moves back
- [ ] Press Home
  - Focus jumps to first item
- [ ] Press End
  - Focus jumps to last item

---

## Automated Testing Commands

### Install Accessibility Testing Tools
```bash
# Install axe accessibility scanner
npm install --save-dev @axe-core/react

# Install WAVE (WebAIM's accessibility tool)
# Chrome: https://chrome.google.com/webstore (search "WAVE")
# Firefox: https://addons.mozilla.org/firefox (search "WAVE")
```

### Run Automated Checks
```bash
# Check for accessibility violations
npm run audit:a11y

# Check contrast ratios programmatically
npx eslint --ext .tsx src --rule 'jsx-a11y/no-static-element-interactions'
```

### Manual Audit Tools
- **WAVE Browser Extension** (Chrome/Firefox)
  - Open DevTools ➜ WAVE
  - Shows all ARIA labels and issues
- **Axe DevTools** (Chrome/Firefox)
  - Open DevTools ➜ Axe DevTools
  - Reports violations by WCAG level
- **WebAIM Contrast Checker**
  - https://webaim.org/resources/contrastchecker/
  - Test color combinations

---

## Common Issues & Solutions

### Issue: Focus Ring Not Visible
**Cause:** CSS outline removed globally
**Solution:** 
```css
*:focus {
  outline: 2px solid #6366f1 !important;
}
```

### Issue: Can't Tab to Button
**Cause:** Button is a div, not native button element
**Solution:** 
```tsx
// Wrong
<div onClick={handleClick}>Click me</div>

// Correct
<button onClick={handleClick}>Click me</button>
```

### Issue: No Focus Trap in Modal
**Cause:** Focus can move outside modal
**Solution:** Use `useFocusTrap` hook from accessibilityUtils.ts

### Issue: Error Message Not Announced
**Cause:** Missing role="alert" on error element
**Solution:**
```tsx
<div role="alert" className="error-message">
  {error}
</div>
```

### Issue: Icon Button Unclear
**Cause:** Icon-only button with no text label
**Solution:**
```tsx
// Wrong
<button><BellIcon /></button>

// Correct
<button aria-label="Notifications">
  <BellIcon aria-hidden="true" />
</button>
```

---

## Reporting Results

### Create Test Report
After completing all tests, create a report:

```markdown
# Keyboard Navigation Test Report
**Date:** [Date]
**Tester:** [Name]
**Browser:** Chrome/Firefox/Safari
**Build Version:** [Version]

## Results Summary
- Total Tests: 10
- Passed: X
- Failed: X
- Issues Found: X

## Issues Found
1. **Issue Title**
   - Severity: Critical/Major/Minor
   - Location: Page/Component
   - Steps to Reproduce: ...
   - Expected Behavior: ...
   - Actual Behavior: ...
   - Fix Priority: High/Medium/Low

## Recommendations
- [ ] Fix critical issues before release
- [ ] Schedule medium issues for next sprint
- [ ] Document low-priority issues in backlog
```

---

## Accessibility Testing Standards

### WCAG 2.1 Level AA Requirements (Relevant to Keyboard)
- **2.1.1 Keyboard** - All functionality available via keyboard
- **2.1.2 No Keyboard Trap** - Focus not trapped (unless intentional)
- **2.4.3 Focus Order** - Focus moves in logical order
- **2.4.7 Focus Visible** - Focus indicator visible on all elements
- **2.5.5 Target Size** - Touch targets at least 44x44px

### Success Criteria
✅ All interactive elements accessible via keyboard
✅ No keyboard traps (except intentional focus traps in modals)
✅ Focus order logical and intuitive
✅ Focus indicator visible on all focused elements
✅ All buttons/links work with both Enter and Space
✅ All errors announced to screen readers
✅ Color contrast meets 4.5:1 AA standard
✅ Forms include proper labels and descriptions

---

## Next Steps

### After Testing
1. [ ] Document all findings
2. [ ] Prioritize issues by severity
3. [ ] Create GitHub issues for each problem
4. [ ] Schedule fixes in sprint planning
5. [ ] Re-test after fixes applied
6. [ ] Get sign-off from accessibility specialist (if available)

### Continuous Improvement
- [ ] Add unit tests for keyboard navigation
- [ ] Add E2E tests for accessibility
- [ ] Include accessibility in code review checklist
- [ ] Train team on accessibility best practices
- [ ] Monitor for accessibility regressions

---

**Last Updated:** January 30, 2026  
**Status:** Ready for Testing  
**Next Review:** After STEP 9 completion
