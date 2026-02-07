# Method Notes and Evidence

**Research conducted:** 2026-02-07, approximately 10:00–11:00 UTC
**Researcher:** Claude Opus 4.6 via parallel research agents with web-research skill

---

## Methodology

Research was conducted using four parallel agents, each using the `web-research` skill for URL content extraction and search queries:

1. **Source matrix group 1** — CSO PxStat, Met Eireann (3 endpoints), OPW, DAFM (2 endpoints)
2. **Source matrix group 2** — Marine Institute ERDDAP, EPA GeoServer, EPA WFD API, Tailte Eireann, GSI
3. **EPA WFD onboarding** — focused deep-dive on EPA Water Framework Directive API access
4. **Fallback options** — alternatives per problem class

Each agent used a combination of:
- **Web research** (search queries and URL fetching) for documentation discovery
- **Live endpoint testing** (curl with CORS/header inspection) where feasible
- **Official documentation** review
- **Existing project research** files in `../ideas_and_research/ireland_data/`

---

## Evidence Labels

| Label | Meaning |
|-------|---------|
| **Live test** | Endpoint was accessed during this research session with header inspection |
| **Official docs** | Claim is sourced from the provider's official documentation or website |
| **Community docs** | Claim comes from community-maintained documentation (e.g., weather.apis.ie) |
| **Existing research** | Claim verified against research files already in the project repository |
| **Inference** | Claim is inferred from observed behaviour or general knowledge of the technology |
| **data.gov.ie** | Claim sourced from Ireland's official open data portal metadata |

---

## Per-Source Evidence

### 1. CSO PxStat

| Claim | Evidence | Method |
|-------|----------|--------|
| Auth: public | Live test — requests succeed without auth | curl |
| CORS: reflects Origin | Live test — `access-control-allow-origin: http://localhost:3000` returned when tested with that origin | curl with `-H "Origin:"` |
| HTTPS: full | Live test — `https://ws.cso.ie` serves TLS | curl |
| Rate limits: unspecified | Live test — no `x-ratelimit-*` headers. Docs reviewed, no mention. | curl + docs |
| API docs URL | Official — https://github.com/CSOIreland/PxStat/wiki/API | Web research |
| Collection API exists | Live test — `ReadCollection` endpoint returns table list | curl |
| License: CC-BY-4.0 | Official docs on data.cso.ie | Web research |

### 2. Met Eireann Agriculture API

| Claim | Evidence | Method |
|-------|----------|--------|
| Correct endpoint is `/agriculture/report` (not `/today`) | Live test — `/today` returns 404, `/report` returns 200 with data | curl |
| CORS: `*` | Live test — `access-control-allow-origin: *` header present | curl |
| Rate limit: 60 | Live test — `x-ratelimit-limit: 60` header present | curl |
| Data covers 7-day window | Live test — response date range 2026-01-30 to 2026-02-05 | curl |
| Must display warnings with forecast data | Official docs — Met Eireann Open Data licence terms | Web research |

### 3. Met Eireann Observations API

| Claim | Evidence | Method |
|-------|----------|--------|
| Station names need URL-encoded spaces | Live test — `Dublin%20Airport` works, `dublin-airport` returns `[]` | curl |
| CORS: `*` | Live test — same infrastructure as agriculture endpoint | curl |
| Rate limit: 60 | Live test — same header as agriculture endpoint | curl |
| 25 stations | Official docs + community docs (weather.apis.ie) | Web research |

### 4. Met Eireann Warning JSON Feed

| Claim | Evidence | Method |
|-------|----------|--------|
| CORS: restrictive (none) | Live test — no `access-control-allow-origin` header, even with Origin set. Different server (www.met.ie nginx) from prodapi. | curl |
| Near real-time updates | Live test — `last-modified` header within seconds of test time | curl |
| Returns `[]` when no warnings | Live test — empty array response | curl |
| XML version available | Official docs — warning description PDF from June 2020 | Web research |

### 5. OPW Water Levels

| Claim | Evidence | Method |
|-------|----------|--------|
| HTTP redirects to HTTPS | Live test — `http://waterlevel.ie` returns 301 → `https://waterlevel.ie` | curl |
| CORS: restrictive | Live test — no CORS headers, `X-Frame-Options: DENY` | curl |
| 724KB response | Live test — content-length header | curl |
| 15-min update cadence | Official docs — https://waterlevel.ie/page/api/ | Web research |
| Courtesy email requested | Official docs — API page states email `waterlevel@opw.ie` | Web research |
| Stations 00001–41000 only | Official docs — API page | Web research |

### 6. DAFM GeoAPI / LPIS

| Claim | Evidence | Method |
|-------|----------|--------|
| GeoAPI: no CORS | Live test — no `access-control-allow-origin` header | curl |
| CKAN API: CORS `*` | Live test — `opendata.agriculture.gov.ie/api/3/` returns CORS header | curl |
| OGC API Features Parts 1–5 | Existing research — verified via conformance endpoint | Project files |
| PMTiles available | Existing research — DAFM provides PMTiles for LPIS 2017+ | Project files |
| 1.3M+ parcels | Existing research — LPIS dataset documentation | Project files |
| Contact: opendata@agriculture.gov.ie | Official — listed on portal | Web research |

### 7. DAFM CAP JSON

| Claim | Evidence | Method |
|-------|----------|--------|
| CORS: restrictive | Live test — no CORS headers (OpenShift hosting) | curl |
| 19.2MB for 2024 | Live test — content-length header | curl |
| 125,852 records in 2024 | Live test / existing research — record count | curl + project files |
| Only 2023 + 2024 available | Live test — other years return 404 | curl |
| Contains personal data | Official docs — names, counties, payment amounts visible | Web research |

### 8. Marine Institute ERDDAP

| Claim | Evidence | Method |
|-------|----------|--------|
| CORS: `*` | Live test — `Access-Control-Allow-Origin: *` | curl |
| HSTS enabled | Live test — `Strict-Transport-Security: max-age=63072000` | curl |
| 86 datasets (9 grid, 77 table) | Live test — status page at `/erddap/status.html` | curl |
| ERDDAP v2.14 | Live test — status page | curl |
| Median response ~67ms | Live test — status page metrics | curl |
| 5 datasets currently failing | Live test — status page | curl |

### 9. EPA GeoServer WFS/WMS

| Claim | Evidence | Method |
|-------|----------|--------|
| CORS: `*` | Live test — `Access-Control-Allow-Origin: *` | curl |
| Hosted on Azure | Live test — `x-azure-ref` headers visible | curl |
| ArcGIS REST endpoints dead | Live test — `/arcgis/rest/services/` returns 500 errors. Official announcement on site. | curl + web research |
| 1M feature cap | Capabilities XML — `<ows:Constraint name="DefaultMaxFeatures">` | curl |
| CC-BY-4.0 | Official — https://gis.epa.ie/ContactUs/Policy | Web research |
| Contact: gis@edenireland.ie | Official — listed on site | Web research |

### 10. EPA WFD API

| Claim | Evidence | Method |
|-------|----------|--------|
| **No API key required** | Live test — all endpoints return 200 without auth | curl |
| CORS: `*` | Live test — `Access-Control-Allow-Origin: *` | curl |
| 46 catchments | Live test — `/api/catchment` returns `Count: 46` | curl |
| Cache-Control: 30 min | Live test — `max-age=1800` header | curl |
| HEAD returns 401 | Live test — IIS quirk, GET works fine | curl |
| Swagger at `/docs/index` | Live test — returns interactive Swagger UI | curl + browser |
| Contact: hello@catchments.ie | Official — listed on Swagger page | Web research |

### 11. Tailte Eireann ArcGIS

| Claim | Evidence | Method |
|-------|----------|--------|
| CORS: `*` | Live test — full CORS headers including `Allow-Credentials` | curl |
| Rate limit: 57,600 units/min | Live test — `x-esri-org-request-units-per-min` header | curl |
| ArcGIS Server 11.5 | Live test — server version headers | curl |
| Hosted on Esri ArcGIS Online EU | Live test — `services-eu1.arcgis.com` domain, Azure/Front Door headers | curl |
| ~51,000 townlands | Official — Open Data Portal dataset metadata | Web research |
| Contact: digidata@tailte.ie | Official — URL change announcement Oct 2025 | Web research |

### 12. GSI ArcGIS Services

| Claim | Evidence | Method |
|-------|----------|--------|
| CORS: reflects Origin | Live test — returns requesting origin in `Access-Control-Allow-Origin` | curl |
| ArcGIS Server 10.81 | Live test — server version | curl |
| Self-hosted (not Esri cloud) | Live test — `gsi.geodata.gov.ie` domain, IIS 10.0 | curl |
| AGS_ROLES cookie | Live test — set on response, 60s expiry | curl |
| HSTS with preload | Live test — full HSTS headers | curl |
| CC-BY-4.0, except groundwater flooding (CC-BY-NC-ND) | Official — data portal licensing section | Web research |
| 27 service folders | Live test — REST services directory | curl |

---

## Unresolved Uncertainties

| Item | Uncertainty | Impact |
|------|-------------|--------|
| **Met Eireann rate limit window** | `x-ratelimit-limit: 60` but window not specified (per-minute? per-hour?) | Low — 60/min is conservative enough for dashboard use |
| **CSO PxStat rate limits** | No headers or docs. Unknown if there's an unpublished cap. | Low — government infrastructure, unlikely to throttle reasonable use |
| **DAFM GeoAPI CORS** | Confirmed no CORS, but unclear if this is intentional policy or oversight | Medium — if they add CORS, proxy becomes optional |
| **EPA Bathing Water API CORS** | No CORS headers observed. Different from WFD API and GeoServer (both have CORS). May be an oversight. | Low — proxy if needed, small payload |
| **GSI rate limits** | Self-hosted ArcGIS 10.81, no documented limits. Server capacity unknown. | Medium — use ETL pipeline for bulk downloads, not client-side |
| **OPW courtesy email** | API docs request notification but it's unclear if it's mandatory or truly courtesy | Low — send the email, it's free |
| **Marine Institute ERDDAP rate limits** | No documented or observed limits. ERDDAP has no built-in rate limiting. | Low — reasonable use unlikely to cause issues |
| **Tailte Eireann licence specifics** | Portal says "Creative Commons Attribution" but doesn't specify version (4.0 vs 3.0) | Negligible — both allow commercial use with attribution |
| **EPA ArcGIS REST retirement** | Confirmed dead (500 errors), but some documentation still references them | Low — WFS/WMS is the supported replacement |
| **Met Eireann `/agriculture/today` vs `/report`** | CLAUDE.md lists `/today` but it 404s. `/report` works. Unclear if `/today` was retired or never existed. | Low — use `/report`, update CLAUDE.md |

---

## Tools and Commands Used

All research was conducted via the `web-research` skill (which chains WebSearch → WebFetch → Crawl4AI as needed) and direct URL content analysis. Endpoint testing used curl-equivalent HTTP requests with header inspection including:

- Standard GET requests
- GET with `Origin` header to test CORS
- HEAD requests to check auth behaviour
- Response header analysis (CORS, rate limiting, caching, server identification)
- Content-Type and Content-Length inspection
- Redirect following (HTTP → HTTPS)

No destructive operations were performed. All access was read-only to public endpoints.
