# Friend Beta: Onboarding & Core Flows QA Checklist

## Test Environment Setup
- [ ] Desktop browser (Chrome/Firefox/Safari)
- [ ] Mobile browser (iOS Safari/Chrome, Android Chrome)
- [ ] Clear browser cache and localStorage before each test session
- [ ] Test in both light and dark modes

---

## 1. Guest Mode Experience

### First Visit (Desktop)
- [ ] Welcome banner appears after 1 second delay
- [ ] Banner messaging is clear about guest mode functionality
- [ ] "Create free account" button works
- [ ] "Got it, continue as guest" dismisses banner
- [ ] Dismissed banner doesn't reappear on page refresh
- [ ] No hydration flicker on page load

### First Visit (Mobile)
- [ ] Welcome banner is fully readable
- [ ] Buttons are tappable (min 44x44px)
- [ ] Banner doesn't obstruct critical content
- [ ] Dismiss button is reachable

### Guest Mode Interactions
- [ ] Can rate movies without account
- [ ] Ratings persist across page refreshes
- [ ] Can view personal rankings page
- [ ] Can create custom lists
- [ ] Guest data banner appears after 3-5 interactions
- [ ] Banner counts interactions accurately
- [ ] Migration CTA messaging is clear

---

## 2. Signup Flow

### Email Signup (Desktop)
- [ ] Email field validates format
- [ ] Password strength indicator appears
- [ ] Password shows weak/good/strong states correctly
- [ ] Weak password (< 6 chars) shows "Too short"
- [ ] Medium password (6-7 chars) shows "Good"
- [ ] Strong password (10+ chars with uppercase and number) shows "Strong"
- [ ] Confirm password validates match
- [ ] Error messages are clear and specific
- [ ] "Passwords do not match" error shows correctly
- [ ] Success message appears on signup
- [ ] Email confirmation notice is clear
- [ ] "Already have an account?" link switches to login
- [ ] OAuth buttons (Google/Facebook/GitHub) work

### Email Signup (Mobile)
- [ ] Form fields are reachable with keyboard open
- [ ] Password visibility toggle works
- [ ] Submit button stays visible above keyboard
- [ ] Error messages don't get hidden by keyboard
- [ ] Form doesn't jump when keyboard appears

### Guest Data Migration on Signup
- [ ] Migration progress indicator appears
- [ ] Success message shows number of migrated items
- [ ] Migrated data appears in user account
- [ ] No duplicate data created
- [ ] Guest localStorage cleared after migration
- [ ] Redirect to rankings page after signup

---

## 3. Login Flow

### Email Login (Desktop)
- [ ] Email and password fields work correctly
- [ ] "Forgot password?" link is visible and works
- [ ] Link navigates to dedicated forgot password page
- [ ] Invalid credentials show clear error
- [ ] Unconfirmed email error shows resend option
- [ ] Resend confirmation works and shows success
- [ ] Password visibility toggle works
- [ ] "Don't have an account?" switches to signup
- [ ] OAuth login buttons work

### Email Login (Mobile)
- [ ] Form is fully usable with mobile keyboard
- [ ] Forgot password link is tappable
- [ ] Error messages are fully visible
- [ ] Login button accessible above keyboard

### Guest Data Migration on Login
- [ ] "Saving your picks..." message appears during migration
- [ ] Success toast shows migrated count
- [ ] Redirect happens after migration completes
- [ ] No loading state hangs

---

## 4. Password Reset Flow

### Forgot Password Page
- [ ] Page loads without errors
- [ ] Email field validates format
- [ ] "Send reset link" button works
- [ ] Success message shows after submission
- [ ] "Back to login" link works
- [ ] Error messages are specific

### Reset Password Page
- [ ] Page loads from email link
- [ ] New password field works
- [ ] Confirm password field validates match
- [ ] Password requirements shown clearly
- [ ] "Update password" button works
- [ ] Success state shows before redirect
- [ ] Redirect to /rankings after success
- [ ] Invalid/expired link shows clear error

---

## 5. Core Flow: Rate a Movie

### Desktop
- [ ] Can find movies via browse/search
- [ ] Rating interface is intuitive
- [ ] 1-10 scale is clear
- [ ] "Seen it" checkbox works
- [ ] Rating saves immediately
- [ ] Success feedback is visible
- [ ] Can edit existing rating
- [ ] Empty state shows helpful message

### Mobile
- [ ] Movie cards are tappable
- [ ] Rating modal scrolls properly
- [ ] Rating buttons are touch-friendly
- [ ] Modal close button is reachable
- [ ] Rating persists after modal close

---

## 6. Core Flow: Create/Edit List

### Create List (Desktop)
- [ ] "Create List" button is visible
- [ ] Modal opens smoothly
- [ ] Name field is pre-focused
- [ ] Description field is optional
- [ ] Public/private toggle works
- [ ] Save button creates list
- [ ] Success feedback appears
- [ ] Redirects to new list page

### Create List (Mobile)
- [ ] Modal is fully visible
- [ ] Fields are accessible with keyboard
- [ ] Save button above keyboard
- [ ] Modal scrolls if needed

### Edit List
- [ ] Edit button opens modal with existing data
- [ ] Changes save correctly
- [ ] Cancel button works without saving
- [ ] Delete list has confirmation

### Add Movies to List
- [ ] Search within list works
- [ ] Movies can be added
- [ ] Duplicate prevention works
- [ ] Drag-to-reorder works (desktop)
- [ ] Remove movie button works
- [ ] Empty list shows helpful state

---

## 7. Core Flow: Search & Filters

### Desktop
- [ ] Search bar is prominent
- [ ] Search results appear quickly
- [ ] Can filter by year
- [ ] Can filter by rating
- [ ] Can sort by various criteria
- [ ] Clear filters button works
- [ ] Filter states persist across navigation
- [ ] Empty search results show helpful message

### Mobile
- [ ] Search bar is accessible
- [ ] Filter menu is reachable
- [ ] Filter chips are tappable
- [ ] Results don't require horizontal scroll
- [ ] Reset filters button is visible

---

## 8. Core Flow: Share Link

### Desktop
- [ ] Share button is visible on lists/rankings
- [ ] Share modal opens
- [ ] Copy link button works
- [ ] Success feedback shows ("Copied!")
- [ ] Link format is correct
- [ ] Shared link works in incognito/different browser
- [ ] Social share buttons work (if present)

### Mobile
- [ ] Share button is tappable
- [ ] Native share sheet appears (if supported)
- [ ] Copy link fallback works
- [ ] Share URL includes correct parameters

---

## 9. Empty States Review

### Rankings Page Empty
- [ ] Shows welcome message
- [ ] Explains how rankings work
- [ ] CTA to browse films is clear
- [ ] Visual interest (icon/illustration)

### Lists Page Empty
- [ ] Explains custom lists feature
- [ ] "Create List" CTA is prominent
- [ ] Shows example list ideas
- [ ] Link to browse films

### Search No Results
- [ ] Message is encouraging
- [ ] Suggests trying different terms
- [ ] Shows search query that was tried

---

## 10. Loading States

### Page Loads
- [ ] Loading spinner appears quickly
- [ ] Loading doesn't flash for fast loads
- [ ] Content doesn't jump when loaded
- [ ] Skeleton loaders used where appropriate

### Action Feedback
- [ ] Buttons show loading state during API calls
- [ ] Loading text is clear ("Saving...", "Loading...")
- [ ] Button disabled during loading
- [ ] Success/error feedback after loading

---

## 11. Mobile Responsiveness

### Critical Buttons (Mobile)
- [ ] All primary CTAs reachable without scrolling
- [ ] Fixed headers don't overlap content
- [ ] Bottom navigation (if any) doesn't hide buttons
- [ ] Floating action buttons positioned correctly

### Modal Behavior (Mobile)
- [ ] Modals scroll properly
- [ ] Modal content fits viewport
- [ ] Close buttons are reachable
- [ ] Forms work with keyboard open
- [ ] No horizontal scroll in modals

### Touch Targets
- [ ] All buttons ≥ 44x44px
- [ ] Adequate spacing between tappable elements
- [ ] Links in text are easy to tap
- [ ] Checkbox/radio controls are large enough

### Text & Readability
- [ ] Font sizes readable without zoom
- [ ] Line height appropriate for mobile
- [ ] Contrast meets WCAG AA standards
- [ ] No text cutoff or overflow

---

## 12. Error Handling

### Network Errors
- [ ] Offline state shows clear message
- [ ] Retry option available
- [ ] User data preserved during errors

### Validation Errors
- [ ] Inline validation on blur
- [ ] Error messages are specific
- [ ] Error styling is clear
- [ ] Form can be corrected and resubmitted

### API Errors
- [ ] Error messages user-friendly (not technical)
- [ ] Suggest next action
- [ ] Toast/alert is dismissible
- [ ] Errors don't break page layout

---

## 13. Cross-Browser Testing

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] iOS Safari (latest)
- [ ] iOS Chrome
- [ ] Android Chrome
- [ ] Samsung Internet (if available)

---

## 14. Edge Cases

### Long Content
- [ ] Long movie titles don't break layout
- [ ] Long list descriptions truncate properly
- [ ] Many rated movies don't slow down page

### Unusual Data
- [ ] 0 ratings handled gracefully
- [ ] 100+ ratings load properly
- [ ] Special characters in titles/searches work

### Session Management
- [ ] Session expiry handled gracefully
- [ ] Re-login preserves intended action
- [ ] Guest data persists across browser restart

---

## Testing Notes Template

**Date:** _______________  
**Tester:** _______________  
**Device:** _______________  
**Browser:** _______________  

### Issues Found:
1. 
2. 
3. 

### Suggested Improvements:
1. 
2. 
3. 

---

## Severity Levels

- **Critical**: Blocks core functionality (signup, login, rating)
- **High**: Degrades UX significantly (slow, confusing, error-prone)
- **Medium**: Minor UX issues (unclear messaging, inconsistent styling)
- **Low**: Polish items (animations, micro-copy improvements)

---

## Success Criteria

- ✅ All critical and high severity issues resolved
- ✅ All core flows work on desktop AND mobile
- ✅ Guest mode works flawlessly with clear migration path
- ✅ Error messages are helpful, not technical
- ✅ Loading states provide clear feedback
- ✅ Empty states guide users to next action
