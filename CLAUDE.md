# Farm Dashboard — Agricultural Intelligence App

## Project Overview

A comprehensive agricultural intelligence dashboard for Irish farmers, policy makers, and the agri-food industry. Combines publicly available Irish data from DAFM, Teagasc, CSO, EPA, Met Eireann, Marine Institute and more into a unified app with 4 tabs:

1. **My Land** — LPIS parcels, soil types, nitrate zones, BER ratings, CAP payments
2. **Markets & Income** — Farm income trends, livestock prices, export stats, cattle breeding
3. **Weather & Water** — Agricultural weather, OPW water levels, historical weather, warnings
4. **Environment & Compliance** — EPA water quality, biodiversity records, nitrate compliance, carbon

## Session Start

Always run at session start:
```bash
bd ready
bd list
```
Then `bd show <issue-id>` on any in-progress or ready issues to understand current state.

## Key Data Source APIs (all free, no auth unless noted)

| API | Endpoint | Notes |
|-----|----------|-------|
| CSO PxStat | `https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/{TABLE}/JSON-stat/2.0/en` | 150+ agriculture tables, no auth |
| Met Eireann Ag Weather | `https://prodapi.metweb.ie/agriculture/today` | Daily agricultural weather, no auth |
| Met Eireann Observations | `https://prodapi.metweb.ie/observations/{station}/today` | 25 stations, no auth |
| OPW Water Levels | `http://waterlevel.ie/geojson/latest/` | 537 stations, 15-min updates, GeoJSON |
| Marine Institute ERDDAP | `https://erddap.marine.ie/erddap/` | 86 datasets, multiple output formats |
| EPA GeoServer WFS | `https://gis.epa.ie/geoserver/EPA/wfs` | 839 layers, GeoJSON output |
| data.gov.ie CKAN | `https://data.gov.ie/api/3/action/package_search?q=agriculture` | 698+ agriculture datasets |
| DAFM Open Data | Via data.gov.ie | LPIS, CAP beneficiaries, forestry, nitrates |
| NBDC Biodiversity | `https://maps.biodiversityireland.ie/` | 9.1M records, 19,497 species |

## Research Reports

Detailed research for each data domain is in `../ideas_and_research/ireland_data/`. The most relevant reports for this project:

| Report | Key Content |
|--------|------------|
| `ireland-agriculture-data-sources.md` | **Primary** — 55+ sources, DAFM, Teagasc, CSO farm tables, Marine Institute, ICBF, Bord Bia |
| `ireland-environmental-data-sources.md` | EPA water quality, air quality, OPW water levels, biodiversity, Met Eireann |
| `ireland-gis-data-sources.md` | Tailte Eireann boundaries (townlands, EDs), GeoHive, GSI soil/geology maps |
| `ireland-open-data-report.md` | CSO PxStat API patterns, data.gov.ie CKAN usage, code examples |
| `ireland-energy-data-sources.md` | SEAI BER data, wind resource maps (secondary relevance) |

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + Tailwind CSS v4 + shadcn/ui + Tremor
- **Charts**: ECharts 6.0 (primary) + Recharts (via Tremor)
- **Maps**: MapLibre GL JS v5 + deck.gl 9.2 + PMTiles on Cloudflare R2
- **API**: Hono + tRPC v11 (SSE for real-time)
- **Database**: Supabase Postgres (EU) + DuckDB
- **Python pipeline**: FastAPI + Polars + DuckDB
- **Client analytics**: DuckDB-WASM + Parquet on R2
- **Deploy**: Fly.io Dublin (API) + Cloudflare Pages (frontend) + R2 (data/tiles)
- **Tooling**: Biome, TypeScript 5.7
- **Reference**: `../ideas_and_research/technology_stack/08_recommended_stack.md`

## Skills Available

- **Web research**: `python3 ~/.claude/skills/web-research/scripts/search_fetch.py "query"` and `python3 ~/.claude/skills/web-research/scripts/smart_fetch.py "url"` for any further API investigation
- **Beads**: `bd` CLI for issue tracking (see `.beads/` in this directory)

## Project Structure

```
farm-dashboard/
├── CLAUDE.md          ← you are here
├── .beads/            ← issue tracker (bd CLI)
└── (app code TBD)
```

Parent workspace: `../ideas_and_research/` contains the master ideas bead (`ideas_and_research-7vf`) with all 7 app concepts. Research reports are in `../ideas_and_research/ireland_data/`.
