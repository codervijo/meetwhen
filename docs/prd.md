---
project: meetwhen.xyz
prd_version: 1
project_version: v1.B
status: building
owner: Vijo
last_updated: 2026-07-30
---

# meetwhen.xyz — PRD

## 1. Problem

Finding a meeting time across timezones is mental arithmetic that nobody does
reliably: you have to hold 2–8 people's local clocks, working hours, and
daylight-saving rules in your head at once, and the failure mode is silent —
you book it, and one person quietly takes a 6am call. Existing tools convert
clocks but don't answer the actual question, which is not "what time is it
there" but "which slot costs the group least, and who pays for it."

## 2. Users

Anyone coordinating meetings across timezones: remote workers, distributed-team
managers, freelancers with international clients, and people scheduling calls
with family abroad. The sharpest early user is the person on a distributed team
who personally owns scheduling for a recurring cross-timezone meeting — they
feel the pain weekly, they get blamed for the 6am invite, and they currently
solve it with World Time Buddy, a spreadsheet, or counting on their fingers.

They are explicitly **not** a buyer. They won't expense a tool, but they will
bookmark and reshare something faster and clearer than what they use now. The
audience is defined by frequency of pain and likelihood to share, not by
willingness to pay. See `AI_AGENTS.md` § ICP for the fuller statement.

## 3. Goals & non-goals

**Goals:**
- Answer "when can we all actually meet?" faster and more clearly than any
  incumbent — ranked slots with the tradeoff named, not a grid to interpret.
- Make the cost of each slot *visible and attributable*: who takes the hit,
  and how big it is. This is the wedge; clock conversion is table stakes.
- Be correct through daylight-saving transitions by construction — every
  calculation runs against real IANA rules for the date chosen, never a
  cached UTC offset.
- Win the long tail of `[city] + [city]` scheduling queries with pages that
  *are* the tool, so an AI Overview can't substitute for them (v1.B).
- Validate the wedge on organic traffic before spending on anything else.

**Non-goals:**
- **No accounts, no login, no email.** Nothing to sign up for.
- **No calendar integration.** Not reading Google/Outlook availability, not
  writing invites. That's a different product with a different trust bar.
- **No server, no data collection.** The tool runs entirely client-side; setup
  lives in the visitor's own localStorage and never leaves the device. This is
  a stated promise in the UI, so it constrains future features.
- **No monetization work** — no paid tier, no ads, no upsell — until GSC data
  shows the traffic hypothesis holds. This is deliberately deferred, not
  rejected.
- **Not a scheduling/booking product.** No polls, no attendee responses, no
  "hold these three times." It answers the timezone question and stops.

## 4. Versions

Two-level versioning convention (canonical: `sites/portfolio/AI_AGENTS.md`):

- `vN` = major capability tier; SemVer-MAJOR semantics.
- `vN.X` = phase letter within a tier; internal slicing.

| Version | Theme | Acceptance |
|---|---|---|
| v0 | scaffold | local builds, CF wrangler.jsonc + public/_headers in place, repo initialized |
| v1 | timezone meeting planner | add 2–8 people with cities + available hours, pick a date, and get ranked fair-tradeoff meeting slots plus an aligned per-person 24h timeline |

## 5. Phases

| Phase | Theme | Features | Status |
|---|---|---|---|
| **v0.A** | scaffolded | `portfolio new bootstrap` ran; standard files written; git initialized | ✅ |
| **v1.A** | planner + timeline | per-person tradeoff scoring (d² penalty + late-night surcharge, window-wrap aware) on a 30-min scan of the chosen calendar day; ranked top-5 slots with human labels + fairness tags + no-overlap notice; aligned 48-cell per-person timelines labelled in own local time; numbered pins ↔ slot cards with two-way selection; date picker (DST-correct via IANA offsets); copy-to-clipboard; setup persisted to localStorage | ✅ |
| **v1.B** | pSEO surface | scoring extracted to `src/lib/schedule.ts` so pages and the React island can't drift; 308 static pages — 48 city hubs (`/meet/<city>/`), 253 offset-deduped city pairs (`/meet/<a>/<b>/`), 4 evergreen guides, plus `/meet/` and `/guides/` indexes; every page ships server-rendered ranked slots + timelines before hydration; `TimezoneTool` takes a `prefill` prop (non-persisting, so city pages don't clobber a visitor's saved setup); internal linking from home → indexes → hubs → pairs so crawl never depends on the sitemap alone | ✅ |

## 6. Open questions

- *(append-only log; mark answered with date but never delete)*
- **2026-07-30 — the growth hypothesis depends on a feature that doesn't
  exist.** `docs/growth.md`'s core bet is that people paste a link with the
  meeting pre-loaded into a calendar invite or chat, turning each scheduled
  meeting into an impression. There is no such link: `TimezoneTool` holds all
  state in React + localStorage, encodes nothing in the URL, and "Copy time"
  copies plain text, not a URL. The share loop cannot currently run, so that
  hypothesis is untestable as written. Either build URL-encoded state
  (`?p=london:9-17,tokyo:9-17&d=2026-08-14`), or rewrite the hypothesis to
  rest on pSEO alone. Decide before the 2026-08-27 growth review, or the
  review measures nothing.
- **2026-07-30 — `wrangler.jsonc` sets `not_found_handling:
  "single-page-application"`, but this is not an SPA.** Every unmatched URL
  serves `index.html` with HTTP 200 instead of a 404. With 308 real routes
  live, mistyped and stale URLs become soft 404s, which Google reports and
  discounts. Options: switch to `"404-page"` and add `src/pages/404.astro`,
  or `"none"`. Not changed unilaterally because it alters deploy behaviour —
  needs an explicit call.
