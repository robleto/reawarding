# Logged-Out Home — Native vs. Web Split

**Status:** Spec, not built. Awaiting review.
**Created:** 2026-08-23
**Replaces:** the six-panel guest funnel in `src/app/page.tsx:767–818`
**Companion docs:** [landing-page-test.md](../validation/landing-page-test.md) · [PRODUCT_DESIGN_PRINCIPLES.md](../../PRODUCT_DESIGN_PRINCIPLES.md)

---

## The problem in one sentence

`capacitor.config.ts` points the iOS WebView at `https://reawarding.com`, so a
user who already downloaded the app from the App Store is served six
viewport-heights of acquisition marketing built to convince a cold web visitor
to try the product.

They already tried it. That's why they're here.

This violates the product's own stated goal — `PROJECT_CONTEXT.md` §5: *"A brand
new user can create or influence a Best Picture award in under 30 seconds. If
this is not possible, the design is wrong."* And §8: *"New users see an action
screen — one primary CTA, minimal distraction."*

`isNativeRequest()` already exists in `src/lib/platform.ts:11` and is currently
used only by a settings debug panel.

---

## The decision this spec makes

**Split the surface by platform.** Native logged-out and web logged-out are
different jobs for different audiences.

| | **Web logged-out** | **Native logged-out** |
|---|---|---|
| Who | Cold visitor, arrived from search/social | Already downloaded, already opened |
| Their question | "What is this and why should I care?" | "OK — what do I do?" |
| Job of the screen | Convince | Activate |
| Scroll budget | 3 panels | 1 screen |
| Success metric | Starts a rating | First rating in <30s |

---

## The decision this spec deliberately does NOT make

`docs/validation/landing-page-test.md` has an unresolved A/B test between two
positionings:

- **Variant A "The Wedge"** — Oscar-completion tracking (has search demand)
- **Variant B "The Ritual"** — personal awards / Reawarding (zero search demand,
  but may be the actual draw)

**This spec does not pick a winner.** The native screen serves people who already
downloaded — they've cleared the acquisition hurdle the test is about, so it
shouldn't be blocked on the result.

**But it must be built to flip.** Exactly one string on the native screen carries
the positioning: the eyebrow (`PROMISE` slot below). Author it as a single
exported constant so the January verdict is a one-line change, not a redesign.

```ts
// src/copy/loggedOutHome.ts
export const PROMISE_LINE = {
  ritual: "The Academy had its say. Now so do you.",
  wedge:  "Every nominee. Every category. Counted.",
} as const;
```

---

## The structural move

On the current hero, the **pitch is the H1** and the **action is a placeholder
inside a search box**:

> H1 — "The Academy had its say. Now so do you."
> placeholder — "Search for a film you've watched"

On native, invert that. The pitch demotes to an eyebrow; the instruction becomes
the headline.

> eyebrow — "The Academy had its say. Now so do you."
> H1 — "Start with a film you've seen."

One move, and the screen changes from a pitch to a doorway. This is the whole
spec in miniature.

---

## Screen 1 — Native, first open (no ratings yet)

Five slots, in order, one screen, no scroll-jacking.

| Slot | Element | Copy |
|---|---|---|
| `PROMISE` | Eyebrow, gold, small caps-ish, Unbounded | **The Academy had its say. Now so do you.** |
| `INSTRUCTION` | H1, Unbounded, largest thing on screen | **Start with a film you've seen.** |
| `MECHANIC` | Body, gray-300 | **Rate it 1–10. Anything you score 7 or higher becomes a nominee — and that year's ballot starts forming.** |
| `ACTION` | `MovieSearchPicker`, full width, autofocus off | placeholder: **Search a film you've watched** |
| `ASSURANCE` | Microcopy under search | **No account needed.** |
| `PROOF` | Caption + existing `HeroReveal` award card | caption: **One year, once it's formed:** |
| `ESCAPE` | Quiet text link, bottom | **How Reawarding works** |

### Notes per slot

**`PROMISE`** — the only positioning string. Small, gold, one line. It nods at
why they downloaded without re-arguing it.

**`INSTRUCTION`** — an imperative, not a claim. This is the single biggest change
from the current page.

**`MECHANIC`** — the one thing the current hero never says plainly: *what happens
when you rate something.* Currently the user has to infer the 7+ threshold. Say
it. It's the product's actual rule (`CLAUDE.md`, primary loop) and it makes the
first action feel consequential instead of arbitrary.

**`ACTION`** — do **not** autofocus. Popping the keyboard on cold app open covers
the proof card and feels aggressive on iOS.

**`PROOF`** — reuse `HeroReveal`'s card and its single crossfade beat as-is. It's
the strongest asset on the current page: real `AwardCard`, real `MovieCard`, no
bespoke marketing chrome. Keep the crossfade; it demonstrates "reawarding" in
one gesture without a paragraph explaining it.

**`ESCAPE`** — the how-it-works content doesn't disappear, it stops being
mandatory. Route to a real page or expand in place. Four forced screens becomes
one optional tap.

---

## Screen 2 — Native, returning guest (has ratings, no account)

**Current behavior is the worst case in the app:** a returning guest gets a save
banner *and then the full hero and all five marketing panels again*
(`page.tsx:790–817`). They've already said yes. Stop pitching.

Replace entirely. No `PROMISE`, no `MECHANIC`, no `PROOF` — they've seen the
proof, they made some.

| Slot | Copy |
|---|---|
| `STATE` (H1) | **{n} films rated.** |
| `NEXT` (sub) | With a year in reach: **{year} needs {k} more to set a ballot.**<br>Otherwise: **Add another and watch a year take shape.** |
| `ACTION` | placeholder: **Search a film you've watched** |
| `THEIR WORK` | Their forming ballot(s) — the real `EditableYearSection`, same as logged-in |
| `SAVE` | See "The Forever fix" below |

`{k}` = `5 - nomineeCount` for the closest year to setting. "Set" = 5+ nominees,
per `CLAUDE.md`.

---

## The Forever fix (ships regardless of everything else)

`PanelReassurance.tsx:28–32` currently promises:

> **Forever** — Your canon, on record. **Permanent.**

…on a surface where the user has no account. The app itself contradicts it three
screens later: *"These don't auto-save"* (`page.tsx:1165`).

**What's actually true:** guest ratings live in a Zustand store and **do** migrate
to the account on signup — `useAuthMigration` is wired globally in
`providers.tsx:14`. So the honest claim isn't *permanent*, it's *portable*.

Rewrite that card:

| | Before | After |
|---|---|---|
| stat | Forever | **Yours to keep** |
| label | Your canon, on record | **Sign up whenever** |
| sub | Your picks. Your history. Permanent. | **Your picks come with you when you do.** |

Same fix in the returning-guest `SAVE` slot — promise portability, never
permanence, until there's an account.

---

## Guest navigation

**Correction (2026-08-23).** This section originally claimed guests saw two dead
tabs — that tapping the lit **Awards** tab on the logged-out home threw a login
wall. **That bug did not exist.** `AppShell.tsx` gated `<MobileTabBar/>` on
`isAuthenticated`, so guests had no tab bar at all and no tab to tap. The
`GUEST_TABS` lineup shipped in the first pass was unreachable dead code until
the gate was changed. Caught in review; recorded here because the original
framing is in the commit message for `0a9430d`.

What's true, and what the code now does:

- `MobileTabBar.tsx` renders **Awards · Films · Rankings · Lists**, and
  `middleware.ts` protects `/awards` and `/rankings`. Those two would bounce a
  guest to `/login` *if a guest ever saw them* — so the guest lineup is
  **Home · Films · Lists**, all public.
- The real change is **granting** guests navigation, which is a product
  decision, not a bugfix.

**The rule:** signed in → always. Guest → only once they've rated something.

The logged-out first-open screen is a single activation surface — one
instruction, one search box — and a bottom nav there is three more things to tap
instead of the one that matters. Once a guest has rated a film, `NativeGuestHome`
swaps to its returning-guest state and navigation starts earning its place. The
predicate is deliberately the same one driving that swap (a numeric rating, not
`seenIt` or `hasInteracted`), so the bar appears exactly when the screen changes.

Implemented in `src/hooks/useShowMobileTabBar.ts`, which is the single source for
all three things that key off it — the bar, `main`'s bottom padding, and
`BackToTopButton`'s offset. They must agree or the layout reserves space for a
bar that isn't there.

Covered by two tests in `tests/prelogin.spec.ts` — absent on first open, present
after a seeded rating.

---

## Web logged-out — cut 6 panels to 3

Native is the priority; this is the same content, re-scoped. Keep a funnel — cold
traffic genuinely needs one — but the current six panels make six different
arguments and never land one.

**Current:** hero *(disagree with the Academy)* → how it works *(just rate
movies)* → hook *(it's not just you)* → timeline *(build your timeline)* →
reassurance *(no rules)* → final CTA *(the record doesn't write itself)*

Six panels, six pitches. A visitor can't repeat back what the app does.

**Proposed:**

1. **Hero** — unchanged. It works. Search above the fold, real product artifact.
2. **How it works** — keep the 4 steps, drop the pinned-scroll mechanic.
3. **Final CTA** — keep, with the corrected assurance copy.

Cut `PanelHook`, `PanelTimeline`, `PanelReassurance` from the default path. Fold
the one genuinely persuasive line from `PanelHook` — *"The 2010 Academy chose The
King's Speech. Most of the internet disagreed."* — into the hero as social proof
if it tests well. It's the only panel making an argument the hero doesn't.

Also drop the six-dot scroll-progress rail (`page.tsx:770–784`). It's a
website affordance and with three panels it's noise.

### On the pinned-scroll panels

`PanelReassurance.tsx:43` already bails out of its pinned progressive reveal
below 640px — so on a phone that panel is four static cards, i.e. the desktop
design with the interesting part removed. It was never designed for mobile; it
was de-scoped for it. Scroll-jacked pinning is a desktop-web idiom that reads as
broken scrolling inside a WKWebView with rubber-banding. Don't port it.

---

## Testing the native screen from a browser

`useIsNativeApp()` wraps `Capacitor.isNativePlatform()`, which is false in any
ordinary browser — so without help, `NativeGuestHome` is reachable only from a
real device or simulator, and never gets browser regression coverage.

`src/hooks/useIsNativeApp.ts` carries a dev-only override:

| URL | Effect |
|---|---|
| `/?native=1` | Force the native screen |
| `/?native=0` | Force the web funnel (useful from inside the shell) |

The choice persists to `sessionStorage` so it survives client-side navigation,
not just the load that carried the param.

**Inert in production.** The guard is `process.env.NODE_ENV === "production"`,
which Next.js replaces statically at build time, so the rest of the function is
unreachable and gets stripped. Verified: `reawarding-native-override` appears
**0 times** in `.next/static/chunks` after `npm run build`. Re-check that if the
guard is ever refactored.

---

## Voice rules for this surface

| Do | Don't |
|---|---|
| Imperative verbs — "Start with…", "Rate it" | Rhetorical questions — "Ever disagree with…?" |
| One claim, repeated | Six claims, each once |
| Name the mechanic (7+ becomes a nominee) | Leave the rule to be inferred |
| "Yours to keep" | "Forever", "Permanent", "On record" pre-account |
| "Your ballot" | "Your canon" — untranslated jargon on a first screen |

`PRODUCT_LAWS.md` Law 8 is *Identity Over Completion*. The native screen honors it
by leading with an act of taste ("a film you've seen"), not a progress bar.

---

## What's deliberately not here

- **A tracker/countdown surface.** Belongs to the Oscar-readiness feature, and its
  seasonal promotion is already speced. Not a logged-out concern.
- **Social proof / testimonials.** Nothing to quote yet. Don't fake it.
- **App Store review prompt.** Not before the first rating.
- **Sign-up wall.** "No account needed" is the strongest thing this screen says.

---

## Open questions for review

1. **Eyebrow framing now** — ship with Ritual (current voice) and flip in January
   if Wave 2 says Wedge? That's the assumption baked in above.
2. **`ESCAPE` link destination** — route to a `/how-it-works` page, or expand the
   4 steps inline?
3. **Web cut depth** — 3 panels as speced, or keep `PanelTimeline` as a 4th? It's
   the best-looking of the three being cut.
4. **Dead tabs** — hide Awards/Rankings for guests, or keep them visible and let
   the login wall do the converting? Hiding is cleaner; showing is a (harsh)
   upgrade prompt.
