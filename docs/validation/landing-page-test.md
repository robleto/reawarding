# Landing Page Test — Oscar Completion Tracker

**Purpose:** get an external, behavioral read on the wedge before building it, and settle the positioning question Step 3a opened up.
**Created:** 2026-08-23
**Companion docs:** [Step 3a findings](#) (in session notes), [interview script](oscar-death-race-interview-script.md)

---

## What this test can and can't tell you

**Can:** whether strangers who aren't being nice to you will trade an email address for this promise, and — more valuable — **which of two framings wins.**

**Can't:** whether they'd pay, whether they'd retain past March, or whether 3% is really better than 5%. The budget doesn't buy that precision (see [Sample size reality](#sample-size-reality)). Treat this as a coarse alive/dead signal plus a framing verdict, not a forecast.

**Do not run this instead of the interviews.** A landing page tells you which words work. The interviews tell you whether the spreadsheet is a pain or a pleasure — and if it's a pleasure, a high signup rate is just proof you wrote a good headline. Run them in parallel; let the interviews override the page.

---

## The actual thing being tested

Step 3a found something worth spending real money to confirm: **"personal movie awards" has zero search demand, while Oscar-completion language has plenty.** That is a positioning question, and a two-variant test answers it directly.

| | **Variant A — The Wedge** | **Variant B — The Ritual** |
|---|---|---|
| Promise | Never lose track of the race again | Hand out your own awards |
| Hero language | completion, countdown, "X of Y seen" | your picks vs. the Academy's, Reawarding |
| Hypothesis | Tracking is the painkiller; awards are the retention layer | The personal-awards idea is the actual draw and the search data is just a vocabulary artifact |
| If it wins | Lead with the tracker. Confirms Step 3a. | Step 3a's search read was too narrow — the demand exists, people just don't have words for it |

Same audience, same traffic source, same offer, randomized 50/50. **One variable: the promise.** Do not vary design, CTA copy, or the step-2 flow between them.

A tie (both weak) is a real outcome and it means the concept, not the wording, is the problem.

---

## Variant A — "The Wedge"

**URL:** `/oscar-tracker`

> ### You've seen 34 of 57. You just don't know it.
>
> Every January you rebuild the same spreadsheet. Every March it falls apart somewhere around the Documentary Shorts.
>
> This is the version that already knows where you stand — every category, every nominee, counted for you, with the ceremony clock running.
>
> **[ Get it when nominations drop → ]**
> *One email in January. Nothing else, ever.*

**Below the fold — three blocks, no feature grid:**

1. **Every category, sorted by what you're missing.**
   Incomplete categories float to the top. Shorts and Documentary don't get quietly dropped because they're at the bottom of a spreadsheet.

2. **A countdown that means something.**
   Days to the ceremony next to films left to watch. The two numbers that actually decide your February.

3. **Your list, not a leaderboard.**
   No badges, no trophies, no streaks. A list, a count, and a date.

**Hero visual:** a screenshot-style mock of the readiness list — category rows with "3 of 5 seen," incomplete first, countdown pinned above. Static image, dark/gold to match the app. **This has to be the real design**, because it's the only thing on the page doing the persuading. Do not use a stock photo of a red carpet.

**Footer line:** *Made by one person who got tired of the spreadsheet. Not affiliated with the Academy.*

---

## Variant B — "The Ritual"

**URL:** `/your-awards`

> ### The Academy got Best Picture wrong. Again.
>
> You know what should have won. You've argued about it. You've never written it down anywhere you could go back to.
>
> Reawarding keeps your ballot next to theirs — every year, every category — so your record outlives the argument.
>
> **[ Start your ballot → ]**
> *One email in January. Nothing else, ever.*

**Below the fold:**

1. **They said. You said.**
   Two columns, one year at a time. Where you agreed, and where you handed it to someone else.

2. **A verdict that keeps.**
   Your picks stay on the record, ceremony after ceremony, instead of evaporating the day after the show.

3. **Rank what you've actually seen.**
   Your ballot only counts films you've watched — so it stays honest.

**Hero visual:** the "They said / I said" two-column comparison with the **Reawarded** stamp — the compare-tool wireframe already speced in the product notes.

---

## Shared: the two-step conversion

Email alone is a weak signal — it's free to give and free to abandon. So the page measures **two** things, and the second one is what matters.

**Step 1 (cheap):** email capture. Report as the headline conversion rate for benchmark comparison.

**Step 2 (costly) — thank-you page, immediately after signup:**

> **You're in. One more thing, and this is the part that actually helps me:**
>
> **Send me the spreadsheet you used last season.** Screenshot, Google Sheets link, Notion page, photo of a napkin — whatever it really was.
>
> **[ Upload / paste a link ]** · **[ I didn't have one ]**
>
> I'm building this because I couldn't find one that worked. Seeing how you actually did it is worth more to me than your email address.

Log both buttons. **Step-2 upload rate is the closest thing to a purchase signal in a free-app category** — it's a voluntary costly action, and it doubles as research input for the interviews. Also log "I didn't have one," which is its own finding: if most signups never had a tracker, they're not the completionist segment and the whole wedge thesis is aimed at the wrong people.

**Optional third step — only run this in January, not now:** a real Founding Member pre-order, $12/yr, with explicit "this does not exist yet" language and an automatic refund if it doesn't ship by a stated date. If you take money, honor that literally — refund on the date, unprompted, no dark patterns. Ten paid pre-orders beats a thousand emails, but don't sell an unbuilt product to off-season traffic that can't remember why it cared.

---

## Traffic plan

**The seasonality problem, stated plainly:** it's August. The high-intent searches this whole thesis rests on (`oscars death race spreadsheet`, `oscar tracker app`) have almost no August volume. A Google Search campaign right now would spend nothing and prove nothing. So the test splits in two, and only the second half produces the number you actually want.

### Wave 1 — now (framing test, interruption traffic)

Framing is testable off-season because it doesn't depend on intent.

| Channel | Budget | Targeting | Why |
|---|---|---|---|
| **Reddit Ads** | $60 | Subreddit targeting: r/oscarrace, r/Oscars, r/letterboxd, r/flicks, r/TrueFilm | The only platform where you can buy exactly the 141k people you researched. Primary channel. |
| **Meta** | $40 | Interest: Academy Awards, Letterboxd, Criterion Collection; US, 22–45 | Cheaper clicks, fuzzier audience. Cross-check only. |
| Organic | $0 | The mod-approved findings post, the Death Race Discord, your own network | Free but self-selected and biased upward. Track separately, never blend into the paid number. |

**$100 total.** Run 5–7 days. Cap daily spend so it doesn't all burn on day one.

### Wave 2 — nominations morning, **Thursday 21 January 2027** (intent test)

This is the real test. Same two pages, same instrumentation. The date is fixed,
not approximate: the Academy announced the 99th ceremony for **Sunday 14 March
2027** with nominations on **21 January 2027**, so campaigns should be live and
funded the night before — search intent for "oscar nominees" spikes within
hours of the announcement, not gradually.

| Channel | Budget | Targeting |
|---|---|---|
| **Google Search, exact match** | $150 | `oscars death race spreadsheet`, `oscars death race checklist`, `oscars death race app`, `oscar tracker app`, `track oscar nominees`, `oscar ballot printable`, `letterboxd oscar list` |
| **Reddit Ads** | $100 | Same subreddits, at peak season |

Every one of those keywords came out of the Step 3a autocomplete research — they're documented demand, not guesses. Intent traffic should convert several times better than Wave 1. **If it doesn't, that's the finding that kills this.**

---

## Instrumentation

Log to whatever's already wired up (Sentry's in the repo; a Netlify function writing to Supabase is enough — this doesn't need a product analytics vendor).

**Events:** `lp_view`, `lp_scroll_50`, `cta_click`, `email_submitted`, `step2_upload`, `step2_declined`

**Store per session:** variant (A/B), UTM source/campaign/keyword, referrer, device, timestamp.

**UTM scheme:** `?utm_source=reddit&utm_campaign=wave1&utm_content=variantA`

**Build note:** deploy these as standalone routes with **no app nav, no login, no brand chrome**, or better, a separate Netlify deploy. If the existing app shell leaks in, you're testing the app, not the promise. Variant B is the only page allowed to say "Reawarding."

---

## Sample size reality

Don't skip this and then over-read the result.

$100 on Reddit at roughly $0.50–1.50 per click buys **~100–200 clicks total, so ~50–100 per variant.** At that size:

- You **can** detect dead: 0–1 signups out of 80 is a real answer.
- You **can** detect a large framing gap: 4/80 vs. 18/80 is meaningful.
- You **cannot** distinguish 3% from 6%. The confidence interval on 4 conversions out of 80 is roughly 1%–11%. Anyone claiming a winner from a 2-point gap at this sample size is reading noise.

So: **decide on direction and magnitude, never on decimals.** If the two variants land within ~2x of each other, record "no framing verdict" and let the interviews break the tie. If you want a real A/B answer, that costs ~$400+ and should wait for January's intent traffic.

---

## Decision thresholds

The generic 1% / 2–5% / 5%+ benchmark assumes **intent-matched** traffic (someone searching for this). Cold social traffic converts lower by nature, so it needs its own bar. Two tables:

### Wave 1 — cold interruption traffic (Reddit/Meta, August)

| Email conversion | Read |
|---|---|
| **< 1%** | Dead on this framing. If *both* variants land here, the concept is the problem, not the words. |
| **1–3%** | Normal for cold off-season traffic. Inconclusive — proceed to interviews and Wave 2. |
| **3–7%** | Strong for cold traffic out of season. Real interest. |
| **> 7%** | Unusually strong. Check for bot traffic and self-selected organic bleeding into the paid number before believing it. |

### Wave 2 — search intent traffic (January)

| Email conversion | Read |
|---|---|
| **< 2%** | **Kill.** Someone typed "oscars death race spreadsheet" into Google, landed on the exact thing they searched for, and walked. There is no better traffic than that, and no headline rewrite saves it. |
| **2–5%** | Test further before committing. Probably a copy or credibility problem, not a demand problem. |
| **5–15%** | Validated. Build it. |
| **> 15%** | Build it now and get the January SMS list right, because that's a launch window. |

### Step-2 upload rate (both waves — the signal that matters most)

| Upload rate among signups | Read |
|---|---|
| **< 10%** | They gave an email to be polite. Weak. |
| **10–25%** | Real engagement. |
| **> 25%** | These are your first 20 users and your interview pipeline. Call every one of them. |
| **"I didn't have one" > 60%** | You're reaching awards-curious people, not completionists. Targeting or framing is aimed at the wrong segment — fix that before reading anything else on the page. |

---

## Go / pivot / kill

**GO** — build the tracker as the lead product if: Variant A beats B by >2x on cold traffic, **and** Wave 2 search intent converts >5%, **and** step-2 uploads clear 15%, **and** the interviews say the spreadsheet is a pain rather than a pleasure. All four, not three of four.

**PIVOT the positioning** if Variant B wins clearly. That would contradict Step 3a's search finding, and the honest response is to believe the money over the autocomplete data — behavior beats a demand proxy. Re-run the naming and ASO plan.

**KILL the wedge** if January intent traffic converts under 2%, or if both variants sit under 1% on cold traffic while the interviews are simultaneously lukewarm.

**Ambiguous, and expect this:** Wave 1 lands at 1–3% on both variants. That's the modal outcome for off-season cold traffic and it means the page hasn't told you anything yet. Don't force a decision out of it — the interviews and January are where this gets settled.

---

## What not to do

- **Don't send it to friends and count the signups.** Track organic separately or you'll poison the only unbiased number you're paying for.
- **Don't name the app in Variant A's headline.** The whole point of Step 3a was that nobody is searching for your brand or your category vocabulary.
- **Don't promise a launch date** you haven't decided. "Get it when nominations drop" is a real commitment — either keep it or don't write it.
- **Don't fake-door the pre-order.** A checkout button that takes money for something you won't ship, or that pretends to charge and doesn't, buys you a worse reputation than the data is worth.
- **Don't rewrite the headline mid-test.** Mid-flight copy changes make the whole run unreadable. Let it finish, then iterate.
- **Don't let a good conversion rate override a bad interview finding.** If death racers tell you building the spreadsheet is the fun part, a 9% signup rate means your headline is excellent and your product is still a vitamin.
