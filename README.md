# Farm Dashboard

Scaffolded with Next.js 16 + React 19 + Tailwind v4 + Turbopack.

## Stack

- UI: shadcn/ui foundation + Tremor
- Maps: MapLibre GL JS + react-map-gl
- Charts: ECharts 6
- Data layer: TanStack Query + Zustand
- API: tRPC + Hono skeleton
- Tooling: Biome

## Commands

```bash
npm install
npm run dev
npm run lint
npm run format
npm run build
```

## Environment

Copy `.env.example` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
