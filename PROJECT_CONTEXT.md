# Reawarding — Project Context

---

## 1. One-Line

Reawarding lets people rewrite film award history based on what they actually watched and how films aged over time.

## 2. Origin

Inspired by cultural re-awarding concepts — retrospective Oscar re-evaluations with the benefit of hindsight.

Institutional awards capture a moment in time. Reawarding captures *lived audience history*.

## 3. Core Product Truth

Reawarding is opinion-first, emotion-first, and hindsight-aware. Users should be able to express taste immediately. The product is not completion-driven and not database-driven.

## 4. The Primary Loop

**Watch → Rate → ReAward**

A user watches a film, rates it 1–10, and films scored 7+ auto-emerge as award contenders. The ballot forms. The winner rises.

Awards are first-class objects — they are the *output* of this loop, not a prerequisite for it.

**What this replaced:** An earlier framing said "Opinion → Award" was the entry point, to prevent ratings from gating awards. That protection still applies — awards must *form* from ratings (emergence), not be *unlocked* by them (gating). What changed: Watch and Rate are now explicitly the primary UX path, because that's how users naturally experience films.

**The anti-pattern that remains forbidden:** Ratings required before an award can exist. Awards hidden behind activity thresholds. Ballots appearing fully-formed without visible formation.

## 5. V1 Core Experience Goal

A brand new user can create or influence a Best Picture award in under 30 seconds.

If this is not possible, the design is wrong.

## 6. Onboarding Flow

Primary action: "Find a film you've seen."

The system marks the film as watched, prompts for a rating, and if rated 7+, the film becomes a contender for its year. The user sees the forming ballot, gets invited to rate more films from the same year, then to start another year.

No gating. No required ranking before the ballot appears. No fully-formed ballot presented without visible formation. The system demonstrates how Watch → Rate → ReAward works — it does not skip formation.

## 7. Product Character

**The product should feel:** Light, curious, inviting, opinion-validating. Not competitive. Not "prove you're a real cinephile."

**Design for:** Fast emotional reward, opinion expression, low friction, clarity over completeness, progressive depth, visible ballot formation.

**Data philosophy:** Awards must be creatable from a single movie selection. Awards may exist without full rankings, ratings, or seen history. Partial data is valid data. Messy opinions are valid product output.

## 8. Home Surface

Homepage is stateful.

**New users** see an action screen — one primary CTA ("Pick a movie you love"), minimal distraction, no dashboards, no stats walls, no empty tables.

**Established users** see a control room — recently edited awards, in-progress ballots, fast entry into opinion expression. Home emphasizes active creative work, not total historical coverage. Full historical browsing belongs to the Awards page.

## 9. What Reawarding Is Not

Not a social network. Not a film logging database. Not Letterboxd. Not IMDb. Not gamification-first. Not completion-driven. Social features may exist later but are not core value.

## 10. Success Metrics (V1)

**Primary:** User creates first award.

**Secondary:** User adds a nominee. User creates a second award. User edits a winner.

**Not primary:** Total movies logged. Total ratings volume. Collection completion.

## 11. Ballot Formation & Award Rules

Ballot formation philosophy, canonical award rules, and authority scaling are governed by the Product Laws. See Laws 3, 4, 6, and 7.

## 12. The North Star Question

Can a new user express an opinion about film history immediately?

If yes → correct direction. If no → redesign required.

## 13. Future Expansion (Not V1)

Possible later: Social graph, collections, badges, journaling, community awards. Only after the core loop is strong.