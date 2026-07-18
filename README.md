# AgriView

AgriView is a saved-farm weekly action brief for Irish farmers. It turns a
small set of public weather, land, water, scheme, and market sources into three
traceable priorities, then keeps the underlying evidence available in focused
drill-downs.

The product is intentionally a screening and planning aid. It does not claim
field ownership, official Eircode precision, scheme eligibility, agronomic
permission, or legal compliance.

## Product workflow

1. Choose an approximate routing area and place a manual farm pin.
2. Select the main enterprise and the week’s focus.
3. Start on **This week**: one lead priority and two supporting checks.
4. Open the evidence disclosure to inspect scope, confidence, observation time,
   source, and the deterministic rule.
5. Drill into **Land**, **Conditions**, **Calendar**, **Markets**, or
   **Environment** only when the decision needs more context.

The farm profile is stored in the current browser with Zustand. There is no
account, database, analytics SDK, advertising tracker, or AI model.

## What is live

- Open-Meteo seven-day point forecast at the saved coordinate.
- Met Éireann active official warnings.
- DAFM LPIS 2024 nearby reference parcels.
- DAFM current nitrates/derogation screening collection.
- DAFM CAP 2025 county aggregates, parsed and cached server-side.
- EPA Water Framework Directive 2019–2024 nearby classifications.
- OPW current water-level sensor readings near the pin.
- CSO AEA01 agricultural output and AHM05 output price indices.
- A small, manually verified 2026 DAFM deadline watchlist.

Unavailable or structurally invalid data stays unavailable. AgriView does not
replace it with demo, sample, or synthetic values.

## Architecture

- Next.js App Router, React, and TypeScript.
- Tailwind CSS with a locally owned responsive design system.
- MapLibre and `react-map-gl` for the saved-farm reference map.
- ECharts for the two national market series.
- TanStack Query for client request state and Zustand for the local farm
  profile.
- Route handlers as the public-data trust boundary.
- Source adapters normalize provenance, scope, freshness, confidence, units,
  and degraded state before values reach decision UI.

See [docs/architecture.md](docs/architecture.md) and
[docs/source-contracts.md](docs/source-contracts.md).

## Local development

Requires Node.js 22 or a current supported Node.js release.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No environment variables are required. Public sources are accessed from
server-side route handlers where CORS, payload size, caching, or normalization
requires it.

## Quality gates

```bash
npm run lint
npx tsc --noEmit
npm test
npm run check:sources
npm run build
npm audit
```

`npm run check:sources` validates ten upstream contracts without writing or
repairing external state. The same report-only check runs weekly and on demand
in `.github/workflows/source-contracts.yml`.

## Important limitations

- A routing key is an approximate search aid. The manual pin is the saved
  working location; neither is an official property or Eircode lookup.
- LPIS, nitrate, waterbody, and soil layers near the pin do not prove that a
  feature belongs to the holding.
- Forecasts are model estimates. OPW readings belong to their sensor locations.
- CAP figures are county-level published context, not a payment or entitlement
  estimate.
- CSO series are national and lagged. They are not a farm price, margin, or
  trading recommendation.
- The calendar is a curated watchlist, not a universal compliance system.
- Biodiversity data is deliberately omitted until a maintained,
  redistributable source and a recurring farmer decision are both established.

## Deployment

The repository is linked to Vercel. Use preview deployments for verification;
promoting a release candidate to production is a deliberate release action.
