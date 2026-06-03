# Server code — dropped during Astro port

The source (`genai/`) is a TanStack Start app with server-side entry points and
framework-specific glue. Astro's static-output model has no equivalent, so the
following were **not** ported. They are listed here as TODOs in case any
server-side behavior needs to be reintroduced (e.g. via an Astro endpoint, a
Cloudflare Worker, or `wrangler.jsonc` deploy config).

## Dropped files

- `genai/src/server.ts` — TanStack Start server entry. No equivalent in a
  static Astro build. **TODO:** if SSR/API behavior is needed, add an Astro
  endpoint under `src/pages/api/` or a Worker.
- `genai/src/start.ts` — TanStack Start client/server bootstrap. **TODO:** n/a;
  Astro owns the entry/hydration lifecycle.
- `genai/src/router.tsx`, `genai/src/routeTree.gen.ts` — TanStack Router config
  and generated route tree. Replaced by Astro's file-based routing in
  `src/pages/`. **TODO:** none.
- `genai/src/routes/__root.tsx` — TanStack root route (QueryClientProvider,
  `<HeadContent>`, 404 + error boundaries). The operator-visible 404/error copy
  was framework chrome; Astro handles 404 via `src/pages/404.astro` if needed.
  **TODO:** add a `src/pages/404.astro` if a custom not-found page is wanted.
- `genai/src/lib/config.server.ts` — server-only config. **TODO:** move any
  needed values to build-time env (`import.meta.env`) or Worker bindings.
- `genai/src/lib/api/example.functions.ts` — TanStack server functions
  (`@tanstack/react-query` data layer). No data fetching is used by the ported
  UI (the tool runs entirely client-side). **TODO:** none.
- `genai/src/lib/lovable-error-reporting.ts`, `error-capture.ts`,
  `error-page.ts` — Lovable.dev dev-time error reporting. Not operator-visible.
  **TODO:** none.

## Not ported (unused boilerplate)

- `genai/src/components/ui/*` — the full shadcn/ui component library (~48 files)
  ships with the scaffold but **none** are imported by the single rendered page
  (`routes/index.tsx` → `TimezoneTool`). Skipped to avoid pulling in ~30 Radix
  packages for dead code. **TODO:** copy individual components from `genai/` if
  future pages need them.
- `genai/src/hooks/use-mobile.tsx` — only consumed by the unused `ui/sidebar`.
  **TODO:** port alongside any component that needs it.
- `genai/src/lib/utils.ts` (`cn()`) — only used by the unused `ui/*` components;
  `TimezoneTool` uses template strings directly. **TODO:** add back (plus
  `clsx` + `tailwind-merge` deps) if porting `ui/*`.
