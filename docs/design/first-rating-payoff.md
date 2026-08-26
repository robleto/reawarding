# Guest Activation: Fill the Slot, Then Walk the Years

**Status:** Spec, not built.
**Created:** 2026-08-24
**Depends on:** `AcademyLedger` (extracted in `744f6a5`, shared by web + native)
**Related:** [logged-out-native-home.md](logged-out-native-home.md)

---

## The problem today

The logged-out screen promises: **YOURS — *Rate one film to fill this***.

Rate a film and it never fills. `OnboardingPickFlow` takes over and all four of
its exits navigate away (`onRateAnother`, `onTryAnotherYear`, `onSeeStanding`,
`onSignup`). Dismissing doesn't return you either — `ratedCount` flips 0 → 1 and
`NativeGuestHome` swaps `FirstOpen` for `ReturningGuest` wholesale, landing you
on a different layout with a large `AwardCard` and a trophy.

The single most satisfying moment in the product — **your poster installed
opposite the Academy's** — is the one thing the flow never shows.

---

## The strategy: breadth before depth

The instinct to fix first was "make it a real ballot" — get four more 2025 films
so the year sets. **That's the wrong second question.**

> "Name five films from 2025" is work.
> "Should something else have won in 2025?" is an opinion they already have.

Nobody holds film opinions as top-fives by year. They hold them as single strong
verdicts — *Parasite deserved it*, *The Social Network got robbed*. Harvest the
opinions that already exist before asking anyone to construct new ones.

Four acts:

| Act | Ask | Produces |
|---|---|---|
| **1. Fill** | Rate one film | The payoff — their poster opposite the Academy's |
| **2. Walk** | "2024? 2023?" one year at a time | Breadth: many years, one pick each |
| **3. Save** | Signup, against real accumulated work | An account |
| **4. Deepen** | Turn a preference into a ballot | Nominees, set ballots |

Breadth also gives better signup leverage than depth: **eight years with a pick
each feels like more to lose than five films in one year**, and it arrives
faster.

**Law 2 is honored, not skipped.** *"A single movie is a preference; a field of
movies is a ballot."* Act 2 deliberately produces preferences and says so. Act 4
converts them. What would violate Law 2 is calling a one-pick year an award —
see the provisional treatment in Act 3.

---

## Act 1 — Fill the slot

### `AcademyLedger` gains a filled state

```ts
export interface AcademyLedgerPick {
  title: string;
  posterUrl: string;
  rating: number;
}

interface AcademyLedgerProps {
  academy: AcademyLedgerReference;
  /** Absent → the empty invitation. Present → the amended record. */
  yours?: AcademyLedgerPick | null;
}
```

| | Empty | Filled |
|---|---|---|
| Slot | Dashed `#B3452F/55`, hatch, `?` | The poster, solid `#D9694E` border |
| Caption | *Rate one film to fill this* | Film title |
| Foot | *This year is still open…* | Act 2's prompt |

**Keep the two-tone contrast split.** `#B3452F` is 3.58:1 — legal for a border,
a fail for text. Text stays `#D9694E` (5.72:1). WCAG requirement, not taste;
already documented in the component.

**Motion:** poster settles into the slot on mount, one beat, ~400ms. Respect
`prefers-reduced-motion`. This is the payoff — it should be the only animated
thing on screen.

### The ledger re-keys to the year they rated

If someone rates a 1994 film, filling the *2025* slot would be a lie. After a
rating the ledger shows the Academy's winner for **that** year.

Data source is a deliberate split:

| State | Source | Why |
|---|---|---|
| Empty / first paint | `ACADEMY_REFERENCE` constant | Cold open; a round trip here costs a loading state on the one screen that can least afford it |
| Filled / post-rating | `fetchOfficialAwardWinners()` | They've already acted. One cached query returns **all years**, which Act 2 then reuses for free |

Fallbacks:
1. No matched winner for that year → their pick alone, full width, foot:
   *"The Academy hasn't been matched for {year} yet — yours stands unopposed."*
2. Their pick **is** the Academy's → don't fake a disagreement. One poster
   spanning both columns, foot: *"You and the Academy agree on {year}."* The
   compare-tool spec already calls this **Agreed** — reuse that word.

---

## Act 2 — Walk the years

Once the first year is filled, ask about the next. One question, one screen,
repeat.

```
        BEST PICTURE                          1994
        ACADEMY                    YOURS
        [ poster ]                 [ ? ]
        Forrest Gump               Seen something better?

        [ film ] [ film ] [ film ] [ film ]     ← tap to reaward
        ─────────────────────────────────
        The Academy got this one right  →      ← Agreed, equal weight
        Haven't seen enough of 1994     →      ← skip, equal weight
```

**Candidates** come from the same mechanism `/onboarding/[year]` already uses:
`useMovieDataWithGuest()` filtered by `release_year` + `isCanonicalCandidate`.
No new data source.

### Order by contested-ness, not recency

**Do not walk reverse-chronologically.** An earlier draft of this spec did, on
the theory that recall is highest for recent films. That's true for recall and
wrong for *opinions*.

Best Picture takes calcify over time. Nobody holds a settled, passionate view of
a ceremony that just happened — the discourse hasn't resolved. The years people
have heat about are the ones with cultural consensus, and those are old.
Reverse-chronological marches through the weakest years first and trips the stop
condition before the user ever reaches the good material.

Lead with an **editorial list of contested years**. Verified against the
database 2026-08-24 — all `matched`, and every marquee rival present:

| Year | Academy | The argument | Candidates |
|---|---|---|---|
| 1994 | Forrest Gump | Pulp Fiction | 39 |
| 2010 | The King's Speech | The Social Network | 113 |
| 2016 | Moonlight | La La Land (the envelope) | 120 |
| 1998 | Shakespeare in Love | Saving Private Ryan | 52 |
| 2005 | Crash | Brokeback Mountain | 66 |
| 1990 | Dances with Wolves | GoodFellas | 39 |
| 1980 | Ordinary People | Raging Bull | 24 |
| 2018 | Green Book | Roma | 126 |
| 2014 | Birdman | Boyhood | 125 |
| 1976 | Rocky | Taxi Driver | 13 |
| 1941 | How Green Was My Valley | Citizen Kane | 6 |

**Coverage is not the constraint** — opinion strength is. Even 1941 has Citizen
Kane. But years under ~20 candidates give a thin chooser row; either accept a
2-poster row for those or hold them back.

After the editorial list is exhausted, fall back to reverse-chronological from
the current Oscar year.

### Three outcomes, all equal weight

Every year must produce an artifact. If agreement is a non-event — nothing
placed, screen unchanged — two things break: people tap *something* just to make
the screen respond (poisoning the data), and the product misrepresents itself.
Reawarding is not "always disagree."

| Outcome | Result |
|---|---|
| **Reawarded** | Their pick lands in YOURS |
| **Agreed** | The Academy's poster fills both slots, stamped **Agreed** |
| **Skipped** | Nothing recorded, next year |

**Agreed** is already the compare-tool spec's word for this — reuse it, don't
invent a synonym. Skip is styled as a peer of the other two, never a dismissal
link: "haven't seen enough of 1994" is a legitimate and common answer, and if it
reads as failure people quit instead of skipping.

**Stop on the earlier of:** two consecutive skips, or ~8 years walked. Then go to
Act 3. Always leave a visible way out — this is an invitation, not a wizard.

---

## Act 3 — Save, against real work

Show what they built. This is the signup moment, and the first one that's honest.

> **You've reawarded 6 years.**
> [2025 ▸ Sinners] [2023 ▸ …] [2019 ▸ …] …
>
> **Yours to keep** — your picks come with you when you sign up.
> `[ Sign up ]`

**Law 4 — thin ballots are provisional.** A year with one pick is *not* an award.
Render these as a light compact strip, never the gilt `AwardCard`. Language stays
provisional: "your picks," not "your awards." Authority is earned in Act 4.

**Never claim permanence pre-account.** Use `GUEST_SAVE` from
`src/copy/loggedOutHome.ts` — "Yours to keep," not "Forever." Guest ratings do
persist locally and migrate on signup via `useAuthMigration`, so portability is
the true claim.

**Signup gating across the whole flow:**

| Point | Treatment |
|---|---|
| Rating 1 | **Nothing.** Let the payoff land. |
| During the walk | Nothing. Don't interrupt the rhythm. |
| End of walk (Act 3) | The real ask, against visible accumulated work. |
| Later, first set ballot | Persistent bar — app already has copy gated on `canonicalYearCount > 0`. |

---

## Act 4 — Turn a preference into a ballot

Only now: *"One film is a preference. A field of films is a ballot."*

**`/onboarding/[year]` already does exactly this** — year-scoped grid, ballot
progress, `BALLOT_THRESHOLD = 5`. It isn't wrong; it's **mis-sequenced**. Today
it's where `onRateAnother` dumps people immediately after their first rating.
Move it here, where the user has context and a reason.

Entry point: from any provisional year in their strip.

---

## Flow changes in `OnboardingPickFlow`

The modal's job ends at the rating. The reward belongs on the canvas behind it —
`CLAUDE.md`: *milestones must persist on the canvas, never a toast.*

| CTA | Now | Proposed |
|---|---|---|
| `onRateAnother` | → films page | **Close to the same screen.** Act 2 continues there. |
| `onTryAnotherYear` | → films page | Becomes Act 2's automatic next step; no separate CTA. |
| `onSeeStanding` | → ballot workspace | Keep. A real destination they explicitly asked for. |
| `onSignup` | → `/login` | **Suppress until Act 3.** |

## Don't swap layouts on rating #1

Today `ratedCount > 0` → `ReturningGuest`, which is what produces "took me back
to an awards page." One screen that evolves, not two that swap:

| State | Screen |
|---|---|
| 0 ratings | Ledger empty. *Start with a film you've seen.* |
| In the walk | Same screen. Ledger filled, next year queued. |
| Walk finished / 2+ years | The strip, then the archive. |

Law 3 — *ballots must form, never appear*. A layout swap hides formation;
filling the slot in front of them **is** the formation.

Also retire *"2025 needs 4 more to set a ballot."* That's completion framing,
which Law 8 pushes against — *progress is measured in meaning, not
completeness.*

---

---

## The decision this spec can't make for you

**Does a pick in Act 2 require a rating?**

This is the central question, not a detail. The product's loop is
Watch → Rate → ReAward, and Guardrail 10 says Watch and Rate are distinct
actions that must not collapse into one gesture. But Act 2's whole value is
speed: tap the better poster, next year.

### Fork A — the walk is the loop

Each pick requires Seen-it + a 1–10 rating, same as everywhere else.

- **For:** honest to Guardrail 10. Law 3 is satisfied — ballots visibly form
  from real ratings. Act 4 continues work already started, no backtracking.
- **Against:** two extra taps per year. Across 8 years that's ~16 extra
  interactions, and it kills the rhythm the whole act depends on. Rating a film
  you saw in 1994 on a 1–10 scale is also a genuinely harder question than "this
  one, not that one."

### Fork B — the walk is an acquisition mechanic, not the loop

A pick records a preference, no rating. Act 4 is where rating begins.

- **For:** fast, and the tap-to-choose gesture matches how the opinion is
  actually held. Beli works this way — rapid comparisons up front, structured
  detail later. Doesn't violate Guardrail 10, because no rating is *inferred*;
  a preference is stored as a preference.
- **Against:** the walk teaches a gesture the rest of the app doesn't use. Act 4
  asks people to re-engage films they've already judged. Provisional years hold
  no ratings, so nothing feeds the ranking engine (Law 1) until later.

### What must not happen

**Do not infer a rating from a tap.** That collapses Watch and Rate
(Guardrail 10) and produces ballots that appear rather than form (Law 3) — a
7+ nominee the user never scored. If the walk stores preferences, store them as
preferences and say so.

**Recommendation:** Fork B, with the provisional treatment in Act 3 doing the
honest work of saying these aren't ballots yet. But this is a decision about
what the product *is* at first contact, and it should be made deliberately
rather than discovered at Act 4.

---

## Instrumentation

The year list is the thing you'll tune, and it's the cheapest signal you'll ever
get about which opinions actually exist. Log per year offered:

`year_offered` · `year_reawarded` · `year_agreed` · `year_skipped` ·
`walk_abandoned_at` · `walk_completed`

Two questions this answers within a week of traffic:

1. **Which years earn a verdict?** That's your editorial list, empirically —
   and it's reusable well beyond onboarding.
2. **Where do people quit?** If abandonment clusters at position 2–3, the
   ordering is wrong. If it clusters after 6, the walk is simply too long.

This slots into the same instrumentation described in
[landing-page-test.md](../validation/landing-page-test.md).

---

## Remaining risks

1. **Thin chooser rows pre-1980.** 1976 has 13 candidate films, 1941 has 6.
   The marquee rival is present in both, but a 4-poster row can't be filled.
   Accept a shorter row for those years or hold them back.
2. **Walk length.** 8 is a guess.
3. **`isCanonicalCandidate` behaviour on sparse years** — untested against the
   counts above. Verify it doesn't filter 1941 down to zero.

## Open questions

1. **Candidate ordering within a year** — popularity, Academy nominees, or
   critical standing? Nominees are most on-theme but assume per-year nomination
   data that far back.
2. **Does a skipped year come back later**, or is it dismissed for good?
3. **Does Agreed count toward the stop condition?** It's engagement, not a
   skip — probably should extend the walk rather than end it.
