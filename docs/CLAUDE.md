# CLAUDE.md — meetwhen.xyz

Per-project orientation for Claude. Read this first when picking up
work on this site. Index of conventions, deferred decisions, and
non-features that aren't obvious from the code or git history.

## Project

meetwhen.xyz is a client-side timezone meeting planner: add 2–8 people with
their cities and working hours, and it ranks the day's slots by how small and
how evenly shared the compromise is, on an aligned per-person 24h timeline.
The user is anyone who owns scheduling for a cross-timezone meeting. Stack is
Astro 5 (static output) + a single React island + luxon + Tailwind 4, on the
sites/* shared infra: pnpm, Makefile forwarding to the central builder,
deployed to Cloudflare Workers static assets via `wrangler.jsonc`.

Two layers, and the split matters:

- **The tool** — `src/components/TimezoneTool.tsx`, one React island, the only
  interactive thing on the site.
- **The pSEO surface** — 308 static pages under `/meet/` and `/guides/` that
  server-render the same ranked slots as real HTML, then hydrate the tool
  pre-filled to match. Built in v1.B.

Both compute through `src/lib/schedule.ts`. That shared module is the whole
reason the static HTML and the hydrated tool can't disagree — see Conventions.

## Commands

```bash
# Build / dev (forwards to the parent Makefile)
make deps           # install deps via the central builder
make dev            # local dev server
make build          # production build → dist/

# Test (per-stack — adjust as needed)
make test           # if a test suite is wired in

# Deploy
git push            # Cloudflare Pages auto-builds on push to main
```

## Conventions

  - Build path: this project's `Makefile` → `../Makefile` (parent
    workspace) → `~/work/projects/builder/` (central builder).
  - Stack: pnpm-only. No `package-lock.json` / `bun.lockb` / `yarn.lock`.
  - Deploy: Cloudflare Pages via `wrangler.jsonc`. No `_redirects`
    SPA fallback (uses CF's `not_found_handling` instead).

## Heading hygiene

**Before adding any section, subsection, or heading to a Markdown
file, output the file's current heading outline first:**

```bash
grep -nE '^#+ ' path/to/file.md
```

Then confirm — in the chat — that the planned new heading's:

1. **Depth** (`#`, `##`, `###`, …) is the intended depth, not
   accidentally one level too shallow.
2. **Label** doesn't collide with existing headings — no duplicate
   `## 1. <title>`, no `### N.X` subsection labels that look like
   `vN.X` phase identifiers.

Only after that confirmation, write.

Applies especially to long-lived docs: `docs/prd.md`, `AI_AGENTS.md`,
`docs/architecture.md`, `docs/CLAUDE.md`.

**Why:** structural drift is invisible in any single editing session
— it only becomes obvious in the aggregate, by which time the doc is
hard to fix. The pre-edit outline ritual catches collisions and depth
mistakes at the point of writing, not at quarterly cleanup time.

## Deferred decisions

Things deliberately *not* shipped, with rationale, so future sessions don't
re-propose them. Append entries; don't rewrite existing ones.

### Dropped during the TanStack → Astro port (v1.A)

The source app in `genai/` was a TanStack Start project. `src/lib/server-todo.md`
is the authoritative record of what didn't come across — read it before
reintroducing anything server-side. Summary:

- **Server entry points and server functions** (`server.ts`, `start.ts`,
  `config.server.ts`, the react-query data layer). Astro's static output has no
  equivalent and the tool fetches nothing. If SSR is ever needed, it's an Astro
  endpoint under `src/pages/api/` or a Worker — not a framework change.
- **The full shadcn/ui library** (~48 components, ~30 Radix packages). None were
  imported by the rendered page. Copy individual components across if a future
  page needs them; don't restore the set wholesale.
- **`cn()` / `clsx` / `tailwind-merge`.** Only the unported `ui/*` components
  used them; templates use plain template strings.

### From the pSEO surface work (v1.B)

- **Full N×N pair matrix (~1,100 pages) rejected in favour of ~250.** Hub
  cities are deduped by computed offset signature, so cities keeping an
  identical clock all year (Berlin/Paris, Toronto/New York, Seoul/Tokyo,
  Shanghai + Hong Kong/Singapore) resolve to one page. Two pages with identical
  numbers are duplicate content, and this domain has no authority to spend on
  it. **Adding a city to `HUB_CANDIDATE_SLUGS` only creates pages if its clock
  is genuinely distinct** — that's working as intended, not a bug.
- **`OFFSET_REFERENCE_YEAR` is pinned, deliberately.** Deriving it from the
  current year would reshuffle live URLs every January. Bump it by hand, aware
  that it changes which pairs exist.
- **Pages compute against build date, not a frozen date.** They state the date
  explicitly rather than implying "today", so a stale deploy is visibly stale
  rather than quietly wrong. The tradeoff is that offsets drift from reality
  between deploys; the hydrated tool always uses the visitor's real today.
- **Pre-filled pages don't write to localStorage.** Browsing city pages must
  not clobber the setup a visitor built on the home page. `TimezoneTool`'s
  `prefill` prop suppresses both the restore and the persist path.
- **No `src/pages/404.astro`.** Was a TODO from the port; now entangled with the
  `not_found_handling` question — see `docs/prd.md` § 6.

### Product-level, from `AI_AGENTS.md` § Goals

- **No accounts, no calendar integration, no server-side data.** Not "not yet
  built" — a positioning choice, and the no-data promise is stated in the UI.
- **No monetization until GSC data justifies it.** Deferred pending the traffic
  hypothesis, not rejected on principle.
- **No analytics wired.** `AI_AGENTS.md` § Deployment documents `VITE_GA_ID` as
  available, but nothing reads it and no script is injected. GSC is the only
  measurement surface today. Adding client analytics would need reconciling
  with the "no tracking" line in the site footer.
