# AgriView engineering guide

AgriView is a saved-farm weekly action brief, not a general Irish public-data
gallery. Preserve that product shape when changing the app.

## Session start

```bash
bd ready
bd list
```

Inspect `farm-dashboard-922` while the 9.5 programme is active.

## Product invariants

- The weekly brief is the primary workflow.
- One saved manual pin is the location source of truth.
- Routing keys are approximate and never described as exact Eircodes.
- Nearby, county, and national evidence never becomes field-specific in copy.
- Missing is not zero; unavailable is not sample data.
- Decision-bearing values expose source, scope, freshness, and confidence.
- Compliance copy is a prompt to verify, not a legal determination.
- Deterministic rules come before any proposed AI layer.
- New public data needs a recurring farmer decision use-case, a redistribution
  check, a normalized contract, and a degraded-state design.

## Architecture

- Next.js App Router route handlers form the ingestion boundary.
- `lib/sources/` owns normalization for external feeds.
- `lib/contracts/source-snapshot.ts` is the shared provenance envelope.
- `lib/briefing/` derives the weekly brief with visible deterministic rules.
- TanStack Query owns request state; Zustand persists the browser-local farm
  profile.
- MapLibre uses the locally controlled style in `lib/map/style.ts`.
- The UI uses Newsreader for editorial hierarchy and IBM Plex Sans for data and
  controls.

Do not reintroduce Tremor, Recharts, GenUI, Hono, tRPC, Supabase, sample charts,
or disabled scaffolding without a new, evidenced product need.

## Verification

Before committing a coherent chunk:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run check:sources
npm run build
npm audit
```

Use the in-app Browser to verify real flows, responsive layout, degraded states,
keyboard semantics, and console output. A screenshot alone is not a gate.

The report-only source monitor is
`.github/workflows/source-contracts.yml`. Update its validators in the same
change as any source schema or endpoint change.

## Source and product documentation

- `docs/architecture.md`
- `docs/source-contracts.md`
- `docs/reference/api-source-validation-2026-02-07.md` is historical research,
  not runtime truth.
