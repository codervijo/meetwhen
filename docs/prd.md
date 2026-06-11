---
project: meetwhen.xyz
prd_version: 1
project_version: v1.A
status: building
owner: Vijo
last_updated: 2026-06-11
---

# meetwhen.xyz — PRD

## 1. Problem

<1-2 sentence problem statement — fill in: what user-facing problem
does this site solve? Who has it? Why does it matter?>

## 2. Users

<who uses this — target user, what they care about, rough audience size>

## 3. Goals & non-goals

**Goals:**
- <fill in>

**Non-goals:**
- <fill in>

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

## 6. Open questions

- *(append-only log; mark answered with date but never delete)*
