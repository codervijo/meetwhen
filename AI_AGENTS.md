# AI Agent Context — meetwhen.xyz

## Summary

*one paragraph: what this site is, what it does*

meetwhen.xyz solves the everyday friction of scheduling across timezones: you add 2–8 people with their cities and (optionally) working hours, and the tool visualizes each person's local day on a 24-hour timeline, highlights the window where everyone is awake and working, and ranks the best meeting slots — flagging which ones force someone into an early-morning or late-night call. It runs entirely client-side, requires no account or calendar connection, and is built to be the fastest, clearest way to answer "when can we all actually meet?" without back-and-forth email or mental math. The value is immediate and self-evident on first use, which is the whole point: it's a utility, not a platform.

## Audience

*one sentence: who this is for (broad demographic)*

Anyone coordinating meetings across timezones — remote workers, distributed-team managers, freelancers with international clients, and people scheduling calls with friends or family abroad.

## ICP

*the specific ideal customer — demographics, pain points, what they use today. More detail than Audience: Audience is the broad demo ("homeowners with EV chargers"), ICP is the specific targetable subset ("Tesla owners in CA who installed in last 90d, paid $2k+")*

The sharpest early user is an individual contributor or manager on a distributed team who personally owns scheduling for recurring cross-timezone meetings — say someone in the US coordinating a standup or client call with colleagues in Europe and Asia. They feel the pain weekly, they're the one who gets blamed for the 6am invite, and they currently solve it with World Time Buddy, a spreadsheet, or counting on their fingers. They're not a buyer — they won't expense a tool — but they will bookmark and reshare something that's faster and clearer than what they use now, and they're the seed for word-of-mouth inside teams. This is a top-of-funnel utility audience, not a monetization target; the ICP is defined by frequency of pain and likelihood to share, not willingness to pay.

## Goals

*1-2 sentences: primary business / product goal*

Become the tool people reach for (and link to) when they need to find a meeting time across zones, measured by repeat usage and organic/referral traffic. Validate that the overlap-visualization wedge is meaningfully better than incumbents before investing in any paid or account-based features.

## Tech stack

Astro project under the sites/* workspace. Build path goes
through the parent `sites/Makefile` (Docker-orchestrated) which delegates
per-stack work to the central builder at `~/work/projects/builder/`.

## Project structure

- `src/` — application source
- `public/` — static assets copied to `dist/` at build (favicons, OG images, `_headers`)
- `docs/` — PRD, Prompts log
- `Makefile` — thin forwarder to `../Makefile`
- `wrangler.jsonc` — Cloudflare deploy config
- `scripts/` *(if present)* — ingester or build-time helpers

## Building info

All dev work runs inside the parent `sites1` docker container. The host doesn't
need Node/pnpm installed; the container does. The parent `Makefile`
(`../Makefile` from this dir) is the canonical entry point.

### Why docker

- Pinned Node + pnpm versions match Cloudflare's build env.
- Avoids polluting the host with per-project node_modules.
- Same image serves every sibling project under sites/.

### Common Makefile targets

This project's local `Makefile` forwards every target to `../Makefile` with
`proj=meetwhen.xyz`, so these all work either from this dir or from `sites/`:

| Command | What it does |
|---|---|
| `make buildsh` *(from `sites/`)* | Drop into a bash shell inside the docker container at `/usr/src/app` (= `sites/` mounted in). |
| `make run` *(from here)* / `make run proj=meetwhen.xyz` *(from `sites/`)* | `pnpm install` then start dev server (auto-detected). |
| `make check-vite proj=meetwhen.xyz` | Start the dev server, skipping install. |
| `make test proj=meetwhen.xyz` | `pnpm install` + `pnpm build` + `pnpm test`. **Hard-fails outside docker** — `make buildsh` first, or `docker exec`. |
| `make deps` | Install pnpm globally (image bootstrap). |
| `make clean` *(from `sites/`)* | Remove root `package.json`, lockfile, node_modules. Don't run inside a project dir. |

### Running Make targets from a Claude Code session

The Bash tool runs on the host as `vijo`, not inside docker. To execute a
target inside the container, find the running container and `docker exec` in:

```bash
docker ps                                               # find the sites1 container name
docker exec -w /usr/src/app <name> make test proj=meetwhen.xyz
```

## Deployment info

- **Platform:** Cloudflare Workers (Static Assets) — *not* Vercel.
- **Config:** `wrangler.jsonc` at the repo root — points `assets.directory` at `./dist` and uses `not_found_handling: "single-page-application"` for SPA client-side routing.
- **Headers:** `public/_headers` — cache (`/assets/*` immutable, HTML no-cache) + security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`). Vite copies `public/` into `dist/` at build, so the file ships with the assets.
- **Build:** `pnpm build` → `dist/`. Wrangler picks up `dist/` via `wrangler.jsonc`.
- **Deploy:** `wrangler deploy` (locally) or via Cloudflare's Git integration on push.
  Initial GitHub repo + CF Pages project setup is automated by the portfolio CLI:
  `cd ../portfolio && make run ARGS="deploy meetwhen.xyz"` runs `gh repo create` and
  POSTs to the CF Pages API with `build_command="pnpm run build"` set explicitly
  (avoids the bun-detection trap kwizicle.com hit). Idempotent; safe to re-run.
- **Vite version:** must be ≥ 6.0.0 — Wrangler's Vite integration rejects Vite 5.
- **Env vars:** set `VITE_*` vars (e.g. `VITE_GA_ID`) in the Cloudflare Workers project's environment-variable settings — they're inlined at build time.
- **Live URL:** https://meetwhen.xyz/  *(update once first deploy succeeds)*
- **Legacy:** if a `vercel.json` or `.vercelignore` is present from a Lovable export, it's inert on Cloudflare and safe to delete.

## Content strategy

*what content this site needs — page types, initial topics, format mix (long-form vs reference vs tool)*

Lead with programmatic, intent-matched pages targeting the long tail of timezone-meeting queries — "best time to meet between [city] and [city]," "[city] to [city] meeting planner," "what time to schedule a call with [country]" — each rendering a pre-filled version of the tool plus a short, genuinely useful explainer (DST caveats, typical working hours, a sane default suggestion). This is the same pSEO [cityA]/[cityB] pattern you've used elsewhere, and it's defensible here because the page *is* the tool, not just text an AI Overview can replace. Pair the pSEO layer with a handful of evergreen guides ("how to run a fair rotating meeting across 3+ timezones") to anchor topical authority. Critical constraint: every page must serve real, crawlable HTML — not a CSR shell — or the entire strategy fails at indexation, same root cause as the lamillrentals/airsucks problem.

### Post-deploy checklist (do these once after the first successful deploy)

- [ ] Verify in **Google Search Console** at https://search.google.com/search-console — add as `sc-domain:meetwhen.xyz` property; verify via DNS TXT record. Until this is done, no SEO traffic data is observable for this site (and the workspace-wide `30 commercial sites with traffic` goal can't credit it).
- [ ] Submit the sitemap (`https://meetwhen.xyz/sitemap.xml`) inside GSC.
- [ ] Update the **Live URL** above with the actual deploy URL.
- [ ] Run `make run ARGS="cleanup"` from `sites/portfolio/` so `data/portfolio.json` reflects the new project's state (and `project status meetwhen.xyz` resolves cleanly).

## How to run

```bash
# from this dir, after `make buildsh` from sites/:
make deps      # → pnpm install via the central builder
make run       # → dev server
make build     # → dist/
make test      # → pnpm install + build + test (must be inside container)
```

## How this project is checked

This project is enforced against shared sites/* conventions by
`portfolio project check meetwhen.xyz` (run from `sites/portfolio/`).
Conformance is driven by the universal check catalog (CHECK_*) —
e.g. CHECK_020 (own-git-repo), CHECK_002 (has-ai-agents-md),
CHECK_007 (has-docs-prompts), CHECK_008 (has-docs-growth — `docs/growth.md`
exists — the per-project growth-experiment log; see Growth log section
below), CHECK_001 (has-readme), CHECK_009 (has-gitignore), CHECK_035
(vite-version-ok), CHECK_003 / CHECK_004 (AI_AGENTS.md `## Building info` +
`## Deployment info` headings). See the full catalog with
`portfolio check catalog`. The bootstrap output satisfies all of these on
day zero — keep it that way.

If `project check` flags a regression, fix it. v6.C's `portfolio project fix`
will eventually auto-fix; until then, hand-edit.

## Growth log — per-project experiment tracker

`docs/growth.md` is this project's append-only log of growth experiments
(content, SEO, marketing, structural changes). Each entry is a dated H2
with a measurable hypothesis + KPI + observation window (default 28d).
Read **the full workflow inside `docs/growth.md`** — it's self-sustaining
so you don't have to remember the lifecycle from outside the file.

Update it whenever you do something growth-relevant on this site. The
data source is GSC (`portfolio gsc sync` from the portfolio dir); this
file narrates *why*.

## Strategy reminder — ship fast, let the market decide

This sites/* workspace is shipping commercial sites toward a
**30-site SEO-traffic goal**. The convention is **build & ship fast,
then let GSC data drive what to invest more in.** Don't over-polish
before launch. Get a minimum-viable version live, indexed, then
iterate on whichever sites actually attract traffic.

Translation for this project: prefer shipping over perfection. The
SEO baseline files (`public/robots.txt`, `public/sitemap.xml`),
deploy config, and dev tooling (`vitest`) are pre-scaffolded so you
can ship today.

## Versioning

This project follows the sites/* **canonical versioning convention** (defined
in `sites/portfolio/AI_AGENTS.md`):

- **`vN`** — major capability tier. Each is a coherent shipped capability and
  may break compat with the previous tier. SemVer-MAJOR semantics.
- **`vN.X`** — phase letter within a tier (A / B / C / …). Internal slicing of
  build work; signals "order/scope can shift." Each phase still ships
  independently.
- **`vN.X.Y`** — numeric sub-phase for follow-up work that lands AFTER `vN.X`
  shipped (e.g. polish, bug fixes, scope cuts).

Two-layer notation separates **external version** (what consumers see) from
**internal phasing** (how the team slices work). Letters signal *un-promised* —
nobody mistakes `v1.B` for a SemVer minor release.

**Always use this numbering when planning or shipping work on this project.**
Specifically:

- Every entry in `docs/prd.md`'s phases table uses `vN.X` (or `vN.X.Y`).
- Every commit message that ships a phase mentions its version (e.g.
  `v1.B — auth flow`).
- Every entry in `docs/Prompts.md` references the version of the work it
  describes when relevant.

Don't introduce a parallel scheme (no `0.1.0` / `Sprint 3` / etc.). When in
doubt, the canonical statement is `sites/portfolio/AI_AGENTS.md`.

Track this project's progress in `docs/prd.md` against this taxonomy. v0.A is
the bootstrap (this scaffold); v1.A is the first real shipped capability.

## Conventions

- Stack: astro
- **Package manager: pnpm only.** No `bun.lockb`, no `package-lock.json`, no `yarn.lock` — they cause CF Pages to pick the wrong manager and break the build. The `pnpm-lock.yaml` is the only lockfile that should ever be committed.
- Build path: this project's `Makefile` → `../Makefile` → `~/work/projects/builder/`
- Cloudflare deploy constraints: Vite ≥ 6, frozen-lockfile install, no `_redirects` SPA fallback (handled by `wrangler.jsonc`'s `not_found_handling` instead).
- **Versioning**: two-level `vN` / `vN.X` — see Versioning section above and `sites/portfolio/AI_AGENTS.md` for the canonical statement.

## Out of scope / don't touch

- *(leave blank — fill in when something is)*
