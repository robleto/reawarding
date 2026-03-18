# Reawarding — Project Context & Product Philosophy

---

## 1. Product One-Line

Reawarding lets people rewrite film award history based on what they actually watched and how films aged over time.

---

## 2. Origin

Inspired by cultural re-awarding concepts (ex: retrospective Oscar re-evaluations with hindsight).

Core idea:
Institutional awards capture a moment in time.  
Reawarding captures *lived audience history*.

---

## 3. Core Product Truth

Reawarding is:

- Opinion-first
- Emotion-first
- Hindsight-aware
- Lightweight and personal
- Not completion-driven
- Not database-driven

Users should be able to express taste immediately.

---

## 4. The Primary Loop (Updated March 2026)

**Primary loop:**
Watch → Rate → ReAward

- Watch a film (seen_it = true)
- Rate it 1–10
- Films scored 7+ auto-emerge as award contenders
- Your ballot forms. Your winner rises.

Awards are FIRST-CLASS objects — they are the *output* of this loop, not a prerequisite for it.

**The original concern this replaced:**
An earlier framing said "Opinion → Award" was the entry point to prevent ratings from *gating* awards. That protection still applies — awards must FORM from ratings (emergence), not be UNLOCKED by them (gating). The distinction is critical. What changed: Watch and Rate are now explicitly the primary UX path, because that's how users naturally experience films.

**The anti-pattern that remains forbidden:**
- Ratings required *before* an award can exist
- Awards hidden behind activity thresholds
- Ballots appearing fully-formed without visible formation

---

## 5. V1 Core Experience Goal

A brand new user can create or influence a Best Picture award in under 30 seconds.

If this is not possible, the design is wrong.

---

## 6. The Onboarding Flow

Primary onboarding action:

"Find a film you've seen."

System response:

→ Marks film as watched (seen_it = true)
→ Prompts for a rating (1–10)
→ If rated 7+: film becomes a contender for its year
→ Shows the forming ballot for that year
→ Invites rating more films from the same year
→ Invites starting another year

No gating.
No required ranking before the ballot appears.
No fully-formed ballot presented without visible formation.

System demonstrates how Watch → Rate → ReAward works — it does not skip formation.

---

## 7. Ballot Formation Philosophy (New)

Ballots are living structures, not instant outputs.

Ballots evolve through observable states:

Seed → Forming → Established → Mature

Thin ballots produce provisional authority.  
Thick ballots produce canonical authority.

Users should always feel ballots are forming, not appearing fully assembled.

---

## 8. Canonical Award Rule (New)

For Best Picture V1:

One year = One canonical award outcome.

System may track revisions internally, but users should always experience a single authoritative award state.

---

## 9. Homepage Philosophy

Homepage is STATEFUL.

---

### New Users
Homepage = Action Screen

Primary CTA:
Pick a movie you love

Minimal distraction.  
No dashboards.  
No stats walls.  
No empty tables.  

---

### Established Users
Homepage = Control Room

May include:
- Greeting + quick actions
- Current awards
- Awards timeline
- Rankings snapshot
- Suggestions
- Stats (secondary)

---

## 10. What Reawarding Is NOT

Not a social network.  
Not a film logging database competitor.  
Not Letterboxd.  
Not IMDb.  
Not gamification-first.  
Not completion-driven.  

Social features may exist later but are NOT core value.

---

## 11. Data Model Principles

Awards must be creatable from a single movie selection.

Awards may exist without:
- Full rankings
- Full ratings
- Full seen history

Partial data is valid data.  
Messy opinions are valid product output.

---

## 12. UX Principles

Design for:
Fast emotional reward  
Opinion expression  
Low friction  
Clarity over completeness  
Progressive depth  
Visible ballot formation  

Avoid:
Empty states with no action  
Locked feature gates  
Long onboarding flows  
"Complete profile first" style UX  

---

## 13. Success Metrics (V1)

Primary:
User creates first award  

Secondary:
User adds nominee  
User creates second award  
User edits winner  

Not Primary:
Total movies logged  
Total ratings volume  
Collection completion  

---

## 14. Tone of Product

Reawarding should feel:

Light  
Curious  
Inviting  
Opinion-validating  
Not competitive  
Not "prove you're a real cinephile"  

---

## 15. Implementation Guardrails

If a design introduces:

- Mandatory tracking before awards
- Mandatory ranking before awards
- Heavy onboarding
- Feature gating based on data volume
- Instant fully-formed ballots with no formation visibility

Stop and re-evaluate.

---

## 16. Future Expansion (Not V1)

Possible later:
Social graph  
Collections  
Badges  
Journaling  
Community awards  

Only AFTER core loop is strong.

---

## 17. The North Star Question

Can a new user express an opinion about film history immediately?

If yes → Correct direction  
If no → Redesign required  

---

## 18  Home Surface Interaction Principle

Home emphasizes active creative work, not total historical coverage.

Home should prioritize:

- Recently edited or evolving awards
- In-progress ballots
- Fast entry into opinion expression
- Immediate continuation of user taste activity

Home should avoid becoming:

- A complete historical archive
- A full year-by-year award index
- A substitute for the Awards timeline view

Full historical browsing belongs to the Awards page.

---
