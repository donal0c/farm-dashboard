# Farm Dashboard

Farm Dashboard is an agricultural intelligence web app for Irish farm operations.
It combines map-based farm context, market and income analytics, weather and water indicators, and environmental/compliance views into a single interface.

## What the app does

- Lets users locate farm context using Irish routing keys / Eircodes.
- Shows CAP, LPIS, nitrates, weather, and market data through charts and map overlays.
- Provides a tabbed workflow for day-to-day farm planning and monitoring.
- Includes a feature-gated GenUI sidebar scaffold (disabled by default).

## Main tabs

### 1) My Land

- Eircode/routing-key search and farm-area location.
- Interactive map (pan/zoom/click) with:
  - LPIS parcel overlay
  - EPA soil WMS overlay
  - Nitrates overlay
- CAP county summary cards and parcel preview.

### 2) Markets & Income

- CSO + DAFM market/income charts and KPI cards.
- Region and year filters.
- Core analytics load by default.
- Extended analytics are loaded on demand to keep the page responsive.

### 3) Weather & Water

- Weather signals and ag-report data views.
- Water-level related indicators from OPW-proxied data routes.

### 4) Environment & Compliance

- Environmental/compliance indicators and biodiversity-related views.

## GenUI status

- GenUI sidebar scaffold exists but is behind a feature flag.
- Default: hidden.
- Enable with: `NEXT_PUBLIC_ENABLE_GENUI=true`.

## Tech stack

- Framework: Next.js 16 + React 19 + TypeScript
- Styling/UI: Tailwind CSS v4 + shadcn/ui + Tremor
- Charts: ECharts
- Maps: MapLibre GL + react-map-gl
- State/Data: TanStack Query + Zustand
- API routes: Next.js Route Handlers (+ Hono/tRPC scaffolding)
- Tooling: Biome

## Project structure (high level)

- `app/(tabs)/...` tab pages and UI screens
- `app/api/data/...` data proxy endpoints
- `components/...` reusable UI, map, and layout components
- `lib/...` utilities, data helpers, JSON-stat decode helpers
- `docs/reference/...` source validation notes
- `docs/research/...` research artifacts

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env.local
```

3. Start dev server:

```bash
npm run dev
```

4. Open:

- [http://localhost:3000](http://localhost:3000)

## Environment variables

From `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_ENABLE_GENUI` (optional, default `false`)

## Scripts

```bash
npm run dev
npm run lint
npm run format
npm run build
```

## Notes and limitations

- Exact full-Eircode geocoding precision depends on geocoding provider coverage/quality.
- Some upstream public datasets can be slow or intermittently unavailable; API proxy routes include fallbacks where possible.
