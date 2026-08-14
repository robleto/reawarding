# iPhone-Feel Audit — Punch List for Beta

Code-level audit of what makes the Capacitor-wrapped app read as "website in a
shell" vs. a native iPhone app. Ranked by how loudly each item betrays web
origins to a beta tester. Visual/on-device items that couldn't be verified in
this pass are listed at the end.

Audited: 2026-08-14, against the working tree (dev server on :3000).

---

## Already right — don't touch, and take the confidence

These are the hard parts, and they're done:

- **Safe areas** — `viewportFit: 'cover'` in `src/app/layout.tsx`, header pads
  `env(safe-area-inset-top)`, tab bar pads `env(safe-area-inset-bottom)`,
  main content accounts for both (`AppShell.tsx`).
- **Standalone-aware tab bar** — `MobileTabBar.tsx` auto-hides on scroll in a
  browser tab but stays persistent in app mode. Exactly right.
- **Native status bar** — `NativeStatusBarBridge.tsx` sets style + `#0C0A08`.
- **Splash screen** — configured with the canvas color, no spinner.
- **Drag-to-rank on touch** — dnd-kit uses `activationConstraint: { delay: 200,
  tolerance: 8 }`, so scrolling doesn't fight dragging.
- **Search input** — `NavSearch.tsx` uses `text-base sm:text-sm`, so iOS won't
  zoom-on-focus.
- **Canonical cards are mobile-first** — `MovieCard.tsx` overlays are
  `opacity-100 sm:opacity-0 sm:group-hover:opacity-100`: visible on touch,
  hover-revealed only on desktop.
- **Reduced motion** respected in bespoke animations.

---

## Tier 1 — Loud tells, mostly cheap fixes

### 1. Gray tap-highlight flash on every tap — ✅ DONE 2026-08-14
No `-webkit-tap-highlight-color` anywhere. Every tappable element flashes
iOS's default gray-blue rectangle — the single loudest "this is a website"
signal, and it fires on every interaction.

**Fix** (globals.css, one rule):
```css
html { -webkit-tap-highlight-color: transparent; }
```
Pair with item 3 so taps still get *some* feedback. **Effort: minutes.**

### 2. Sticky hover states on touch — 125 of 201 components — ✅ DONE 2026-08-14 (A+B+C)
`hover:` styles apply on touch (the first tap "sticks" the hover state), and
only 10 files define `active:` pressed states. The `.light-glass` /
`.dark-glass` classes in `globals.css` also bake in `:hover` + `cursor-pointer`
unconditionally.

**Fix, part A** (one line, covers all 125 files): Tailwind 3.4 supports
```js
// tailwind.config.js
future: { hoverOnlyWhenSupported: true },
```
which compiles every `hover:` to `@media (hover: hover)`. Audit after enabling:
anything that *only* had a hover affordance now needs a touch equivalent
(the canonical cards already handle this; check admin + `[username]` profile,
the other `group-hover:opacity` holdouts).
**Fix, part B**: wrap the raw `:hover` rules on `.light-glass`/`.dark-glass`
in `@media (hover: hover)`.
**Fix, part C**: add pressed feedback (`active:scale-[0.98]` or
`active:opacity-80`, ~100ms transition) to the primary controls: tab bar
links, `SeenItButton`, `RatingModal` rows, card taps.
**Effort: A+B minutes; C a focused hour or two.**

### 3. No route-level loading states — zero `loading.tsx` files — ✅ DONE 2026-08-14
Tapping a tab or a film means a frozen screen, then a sudden full swap.
Native apps respond instantly with structure (skeleton/held layout).

**Fix**: add `loading.tsx` skeletons for the four tab routes (`/awards`,
`/films`, `/rankings`, `/lists`) plus film detail. Skeletons should echo the
real layout (poster-grid ghosts in the canvas colors — dim charcoal blocks,
no shimmer needed). **Effort: ~half a day. Highest feel-per-hour of the
structural items.**

### 4. Whole app pinch-zooms like a web page — ✅ DONE 2026-08-14
`viewport` in `layout.tsx` doesn't set `userScalable: false` / `maximumScale: 1`.
Any accidental pinch or double-tap zooms the UI chrome — apps never do this.

**Fix**: `userScalable: false, maximumScale: 1` in the viewport export.
(Accessibility note: this is standard for native-wrapped apps; iOS text-size
settings still apply via WKWebView if you support dynamic type later.)
**Effort: minutes.**

### 5. Long-press selects UI text / pops image callout — ✅ DONE 2026-08-14
Only scattered `select-none` usage. Long-pressing a button label, tab label,
or nav item offers Copy/Look Up; long-pressing a poster pops the iOS image
save callout mid-scroll.

**Fix** (globals.css): make chrome unselectable, keep content selectable:
```css
button, nav, header, [role="tab"], label { -webkit-user-select: none; user-select: none; }
img { -webkit-touch-callout: none; -webkit-user-drag: none; }
```
(Scope to the app; leave review/blurb text selectable.) **Effort: minutes.**

### 6. Overscroll & scroll-chaining unmanaged — ✅ DONE 2026-08-14
No `overscroll-behavior` anywhere. Rubber-banding at page top/bottom chains
into modal backdrops; scrolling inside `RatingModal` / `AddMovieModal` can
scroll the page behind them.

**Fix**: `overscroll-behavior-y: none` on `body` (the rubber-band still works
inside scroll containers); `overscroll-behavior: contain` on modal scroll
areas; verify body scroll-lock while modals are open. **Effort: under an hour.**

---

## Tier 2 — App infrastructure a beta tester will hit

### 7. Offline = blank white error screen (beta blocker) — ✅ FULLY DONE 2026-08-14
In-session loss: `NativeOfflineGate` (React overlay via @capacitor/network).
Cold-start offline: `server.errorPath: 'offline.html'` — a self-contained
branded page bundled from `public/offline.html`, with manual retry plus
auto-reconnect (online event + 8s probe) that redirects back to the app.
Keep its hardcoded APP_URL in sync with `server.url` if that ever changes.
`capacitor.config.ts` points the shell at `https://reawarding.com` with no
network detection and no offline fallback. First subway ride, the app is a
white WKWebView error page with your name on it.

**Fix (minimum for beta)**: install `@capacitor/network`, detect offline at
launch/navigation, show a branded "You're offline" screen with a retry button
in canvas colors. **Effort: ~half a day.**
Also note: remote-URL wrappers draw App Store review scrutiny (guideline 4.2
minimum functionality). TestFlight is more forgiving, but plan for it before
public App Store submission.

### 8. Fonts load from Google's CDN at runtime — ✅ DONE 2026-08-14
`layout.tsx` links `fonts.googleapis.com` for Inter, Unbounded, and Spline
Sans Mono. Cold start = flash of fallback type on your most identity-carrying
asset; offline = no brand type at all.

**Fix**: move all three to `next/font/google` (self-hosted at build, zero
layout shift, works offline once cached). **Effort: an hour, mostly testing
weights.**

### 9. No haptics — ✅ DONE 2026-08-14 (helper: src/lib/haptics.ts)
`@capacitor/haptics` isn't installed. Rating a film, promoting a nominee,
setting a winner — the emotional core loop — currently feels like clicking
a web page.

**Fix**: install the plugin; light impact on rate/seen-it, medium on nominee
promotion, success notification on setting a winner. Guard behind
`Capacitor.isNativePlugin` checks so web is unaffected. **Effort: ~2 hours,
outsized payoff — this is the "oh, it's a real app" moment.**

### 10. White flash possible between splash and first paint — ✅ DONE 2026-08-14
Splash background is set, but there's no top-level `backgroundColor` in
`capacitor.config.ts`, so the WKWebView itself defaults to white while
the remote page loads.

**Fix**: add `backgroundColor: '#0C0A08'` at the config root. **Effort: one
line.** Worth doing with 7, since a slow network currently means
splash → white → page.

### 11. Keyboard behavior unconfigured — ✅ DONE 2026-08-14 (resize: 'native'; verify on device, flip to 'body' if bars jump)
No `@capacitor/keyboard`. Default WKWebView resize behavior on search focus
and any comment/entry fields may shove the fixed header/tab bar around.

**Fix**: install the plugin, set `resize: 'native'` (or `'body'`), verify
`NavSearch` and modal inputs with the keyboard up. **Effort: an hour
including device testing.**

---

## Tier 3 — Polish once the above lands

### 12. `RatingModal` as a bottom sheet on phones — ✅ DONE 2026-08-14
Discovery while implementing: the `animate-in`/`animate-out` classes used in
6 components were inert — `tailwindcss-animate` was never installed. Now
installed and registered, so those authored animations (toasts, dropdowns,
this modal) actually run. Sheet slides up with safe-area padding + grabber
on phones; unchanged centered dialog at `md+`. Reduced motion respected.
It's a centered 340px dialog — fine, but the iOS-native gesture for a quick
action is a sheet rising from the bottom with a grabber. Since Rate is the
core loop's heartbeat, presenting it as a sheet on `< md` screens (keep the
dialog on desktop) would do more for perceived nativeness than any other
single-screen change.

### 13. Swipe-back-from-edge — ✅ DONE 2026-08-14
Capacitor exposes no config key for this, so `SceneDelegate.swift` now uses
a `ReawardingBridgeViewController` subclass that sets
`allowsBackForwardNavigationGestures = true` (declared inline in
SceneDelegate.swift so App.xcodeproj needed no new file reference).
Next.js client navigations are pushState entries in the WebView's
back-forward list, so the edge swipe maps to in-app "back". Verified the
shell builds for simulator. Device-check: same-document back gestures can
show a subtle snapshot quirk mid-swipe — confirm the feel is right on
hardware. (Build also surfaced a pre-existing asset warning: the Splash
imageset has 3 unassigned children.)

### 14. Tab bar pressed states + selection haptic — ✅ DONE 2026-08-14
`MobileTabBar.tsx` still uses `hover:text-gold-300` for its inactive tabs;
add `active:` feedback and a selection-changed haptic (with item 9).

### 15. Films page year navigation — ✅ ALREADY FIXED (verified 2026-08-14)
The Films page now reuses the Awards `MuseumYearTimeline` for year jumping
(`src/app/films/page.tsx`). The earlier usability finding is resolved.

---

## Couldn't verify in this pass (browser/simulator tooling blocked by security policy)

Check these by hand on a device or simulator, or after unblocking via #security-help:

- Actual rendered tap-target sizes across dense rows (44pt minimum)
- Scroll performance with backdrop-blur layers (glass cards + fixed header +
  tab bar all blur; WKWebView can drop frames with stacked blurs)
- Status-bar overlap during scroll on notched devices
- Keyboard + safe-area interaction on real hardware
- Splash → first-paint continuity timing on a cold start over LTE
- Whether swipe-back does anything today

---

## Suggested sequence

1. **The one-liners first** (items 1, 2A/B, 4, 5, 10): under an hour total,
   removes the three loudest tells.
2. **Pressed states + haptics** (2C, 9, 14): one session; this is the feel win.
3. **Loading skeletons** (3): half a day.
4. **Offline screen + self-hosted fonts + keyboard** (7, 8, 11): the
   "beta tester on a train" bundle.
5. **Sheet presentation for RatingModal** (12) and remaining polish as time
   allows before announcing.

Steps 1–2 alone will change how the app feels in hand more than everything
else combined.
