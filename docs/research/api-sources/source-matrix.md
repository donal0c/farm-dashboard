# API Source Matrix — Deep Validation

**Research Date:** 2026-02-07 UTC
**Methodology:** Live endpoint testing (curl with CORS/header inspection), official documentation review, web research, existing project research files

---

## Summary Table

| # | Source | Auth | CORS | HTTPS | Rate Limit | Freshness | Recommendation |
|---|--------|------|------|-------|-----------|-----------|----------------|
| 1 | CSO PxStat | Public | Permissive (reflects Origin) | Full | Unspecified | Quarterly–Annual | `use-direct` |
| 2 | Met Eireann Agriculture API | Public | Permissive (`*`) | Full | 60 req/window | Weekly | `use-direct` |
| 3 | Met Eireann Observations API | Public | Permissive (`*`) | Full | 60 req/window | Hourly | `use-direct` |
| 4 | Met Eireann Warning JSON | Public | Restrictive (none) | Full | Unspecified | Near real-time | `use-via-proxy` |
| 5 | OPW Water Levels | Public | Restrictive (none) | Redirects HTTP→HTTPS | 15-min courtesy | 15-min intervals | `use-via-proxy` |
| 6 | DAFM GeoAPI / LPIS | Public | Restrictive (none) | Full | Unspecified | Annual | `use-via-proxy` |
| 7 | DAFM CAP JSON | Public | Restrictive (none) | Full | Unspecified | Annual (May) | `use-via-proxy` |
| 8 | Marine Institute ERDDAP | Public | Permissive (`*`) | Full | Unspecified | ~15-min dataset reload | `use-direct` |
| 9 | EPA GeoServer WMS/WFS | Public | Permissive (`*`) | Full | Unspecified (1M cap) | Varies by layer | `use-direct` |
| 10 | EPA WFD API | Public | Permissive (`*`) | Full | Unspecified (30-min cache) | Multi-year cycle | `use-direct` |
| 11 | Tailte Eireann ArcGIS | Public | Permissive (`*`) | Full | Explicit (57,600 units/min) | Infrequent | `use-direct` |
| 12 | GSI ArcGIS | Public | Permissive (reflects Origin) | Full | Unspecified | Static/rare updates | `use-direct` |

---

## 1. CSO PxStat

**Base URL:** `https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/{TABLE}/JSON-stat/2.0/en`

| Field | Value | Evidence |
|-------|-------|----------|
| **Official docs** | https://github.com/CSOIreland/PxStat/wiki/API | Official |
| **Data portal** | https://data.cso.ie/ | Official |
| **Contact** | GitHub Issues: https://github.com/CSOIreland/PxStat/issues | Official |
| **Auth model** | Public — no API key required | Live test |
| **CORS** | Permissive — reflects requesting Origin (tested with `localhost:3000`). Without Origin header, returns empty `access-control-allow-origin:` (still present). Supports credentials. | Live test |
| **HTTPS** | Fully HTTPS | Live test |
| **Rate limits** | Unspecified — no `x-ratelimit-*` headers, no documented limits. Cache: `no-cache,public` with `expires` and `last-modified` headers. | Live test |
| **Response time** | ~290ms for small table (54KB) | Live test |
| **Output formats** | JSON-stat 2.0, CSV, PX, XLSX | Docs |
| **Freshness** | Varies by table — CSO publishes on a statistical release calendar (quarterly to annual) | Docs |
| **Collection API** | `https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadCollection` lists all tables with metadata | Live test |
| **Reliability** | PxStat is open-source (MIT). Maintained by CSO Ireland directly. Running continuously since at least 2019. No public status page. | Docs + inference |
| **Licensing** | Creative Commons Attribution 4.0. Attribution to "Central Statistics Office, Ireland" required. No commercial restrictions. | Official |
| **Recommendation** | **`use-direct`** | |

**Key agriculture tables:** `AAA` (Agricultural Output/Income), `AKA`/`AKM` (Price Indices), `ASA` (Crops & Livestock Survey), `AQA` (Farm Structure), `AVA` (Milk Statistics), `AGA` (Land Sales/Prices). 150+ agriculture-specific tables available.

---

## 2. Met Eireann Agriculture Report API

**Endpoint:** `https://prodapi.metweb.ie/agriculture/report`

> **Note:** The endpoint `/agriculture/today` returns 404. The correct endpoint is `/agriculture/report`.

| Field | Value | Evidence |
|-------|-------|----------|
| **Official docs** | https://www.met.ie/about-us/specialised-services/open-data | Official |
| **Community docs** | https://weather.apis.ie/docs/ (comprehensive, by Marie) | Community |
| **data.gov.ie** | https://data.gov.ie/dataset/agricultural-data-report | Official |
| **Contact** | Open Data Liaison Officer via met.ie contact page | Official |
| **Auth model** | Public — no API key required | Live test |
| **CORS** | Permissive — `access-control-allow-origin: *`, `access-control-allow-methods: POST, GET, OPTIONS, PUT, DELETE`, `access-control-max-age: 86400` | Live test |
| **HTTPS** | Fully HTTPS (nginx/1.18.0 Ubuntu) | Live test |
| **Rate limits** | Explicit header — `x-ratelimit-limit: 60`, `x-ratelimit-remaining: 60`. Window unspecified (likely per-minute). | Live test |
| **Response time** | ~191ms for report.json (6.4KB) | Live test |
| **Freshness** | Updated weekly (covers past 7 days). Report verified as covering 2026-01-30 to 2026-02-05. | Live test |
| **Data content** | 15 synoptic stations: air temp (vs normal), rainfall (mm + %), sunshine (hours + %), soil temp (10cm), wind speed, solar radiation | Live test |
| **Reliability** | Active, returning current data. Met Eireann production infrastructure. Disclaimer: "Data may be subject to dropouts and temporary interruptions." | Live test + docs |
| **Licensing** | CC-BY-4.0 for most datasets. Met Eireann Custom Open Data Licence for live forecasts/warnings. **Mandatory:** if you display forecast data, you must also display their weather warnings. | Official |
| **Recommendation** | **`use-direct`** | |

---

## 3. Met Eireann Observations API

**Endpoint:** `https://prodapi.metweb.ie/observations/{StationName}/today`

| Field | Value | Evidence |
|-------|-------|----------|
| **Docs/Contact** | Same as source #2 | — |
| **Auth model** | Public — no API key required | Live test |
| **CORS** | Permissive — `access-control-allow-origin: *` | Live test |
| **HTTPS** | Fully HTTPS | Live test |
| **Rate limits** | Explicit — `x-ratelimit-limit: 60` | Live test |
| **Response time** | ~185ms | Live test |
| **Station format** | URL-encoded with spaces: `Dublin%20Airport` (not hyphenated). Incorrect names return empty `[]`. | Live test |
| **Station count** | 25 main synoptic stations (5 manned + 20 automatic) | Docs |
| **Freshness** | Hourly observations. Data available only after the hour has passed. | Live test |
| **Data content** | Hourly: temperature, symbol code, weather description, wind speed/gust/direction, humidity, rainfall, pressure | Live test |
| **Additional endpoints** | `/observations/{station}/yesterday`, `/monthly-data/{station}` | Docs |
| **Licensing** | Same as source #2 | — |
| **Recommendation** | **`use-direct`** | |

---

## 4. Met Eireann Weather Warning JSON Feed

**Endpoint:** `https://www.met.ie/Open_Data/json/warning_IRELAND.json`

| Field | Value | Evidence |
|-------|-------|----------|
| **Official docs** | https://www.met.ie/Open_Data/Warnings/Met_Eireann_Warning_description_June2020.pdf | Official |
| **data.gov.ie** | https://data.gov.ie/dataset/weather-warnings | Official |
| **Community docs** | https://weather.apis.ie/docs/ (Weather Warnings section) | Community |
| **Auth model** | Public — no API key required | Live test |
| **CORS** | **Restrictive** — no `access-control-allow-origin` header. Served by nginx on `www.met.ie` (static file hosting, not prodapi). | Live test |
| **HTTPS** | Fully HTTPS | Live test |
| **Rate limits** | Unspecified — static JSON file, no rate limit headers | Live test |
| **Freshness** | Near real-time — `last-modified` header showed update within seconds of test. File regenerated continuously. | Live test |
| **Data content** | `[]` when no active warnings. Structured warning objects with `issueTime`, `validFromTime`, `validToTime`, `header`, `warnText`, severity, regions. | Live test + docs |
| **Related feeds** | XML: `https://www.met.ie/Open_Data/xml/xWarningPage.xml`, RSS also available | Docs |
| **Reliability** | Static file updated automatically. Format documented since June 2020 — stable schema. | Docs |
| **Licensing** | Met Eireann Custom Open Data Licence. High Value Dataset (HVD) under EU regulation. | Official |
| **Recommendation** | **`use-via-proxy`** — no CORS. Tiny payload, trivial to proxy. Also available via community GraphQL API at weather.apis.ie. | |

---

## 5. OPW Water Levels (waterlevel.ie)

**Endpoint:** `https://waterlevel.ie/geojson/latest/`

| Field | Value | Evidence |
|-------|-------|----------|
| **Official API docs** | https://waterlevel.ie/page/api/ | Official |
| **data.gov.ie** | https://data.gov.ie/dataset/opw-hydrometric-network-water-level-data-latest-reading | Official |
| **Contact** | waterlevel@opw.ie, (+353) 46 942 2372 | Official |
| **Auth model** | Public — no API key. OPW requests a courtesy email to `waterlevel@opw.ie` with IP and URL before automated access. | Official docs |
| **CORS** | **Restrictive** — no CORS headers. `Cross-Origin-Opener-Policy: same-origin`, `X-Frame-Options: DENY`. | Live test |
| **HTTPS** | Mixed — documented as `http://` but 301-redirects to `https://`. Use `https://` directly. | Live test |
| **Rate limits** | Documented courtesy — "do not take a bulk upload more frequently than once every 15 minutes." Reserve right to block excessive use. | Official docs |
| **Response size** | 724KB for full latest GeoJSON | Live test |
| **Response time** | ~834ms | Live test |
| **Freshness** | Real-time — 15-minute station intervals. Verified processed at 2026-02-07 10:14:16 UTC. | Live test |
| **Station count** | ~537+ stations (GeoJSON features) | Live test |
| **Data content** | GeoJSON FeatureCollection: station_ref, station_name, sensor_ref, region_id, datetime (UTC), value, coordinates (WGS84) | Live test |
| **Additional endpoints** | `/geojson/` (locations only), `/data/{period}/{station}_{sensor}.csv` (history), `/data/group/group_{n}.csv` | Official docs |
| **Important** | Only stations 00001–41000 cleared for republication. Higher numbers need OPW permission. All data UTC. | Official docs |
| **Reliability** | Government service, operational for many years. Active maintenance (backup station changes documented 2025-11-18). No status page. | Docs + inference |
| **Licensing** | CC-BY-4.0. High Value Dataset (HVD) under EU regulation. | Official |
| **Recommendation** | **`use-via-proxy`** — no CORS, 724KB payload. Proxy with 15-min TTL cache. Send courtesy email before deployment. | |

---

## 6. DAFM GeoAPI / LPIS Datasets

**GeoAPI:** `https://geoapi.opendata.agriculture.gov.ie/shps/`
**CKAN Portal:** `https://opendata.agriculture.gov.ie/`

| Field | Value | Evidence |
|-------|-------|----------|
| **DAFM portal** | https://opendata.agriculture.gov.ie/dataset/ | Official |
| **data.gov.ie** | https://data.gov.ie/organization/department-of-agriculture-food-and-the-marine | Official |
| **datacatalogue.gov.ie** | https://datacatalogue.gov.ie/dataset/land-parcel-identification-system-land-parcel-data | Official |
| **Contact** | opendata@agriculture.gov.ie | Official |
| **Auth model** | Public — no API key for any endpoint | Live test |
| **CORS (GeoAPI)** | **Restrictive** — no CORS headers | Live test |
| **CORS (CKAN API)** | Permissive — `access-control-allow-origin: *` on `opendata.agriculture.gov.ie/api/3/` | Live test |
| **HTTPS** | Fully HTTPS | Live test |
| **Rate limits** | Unspecified | Live test |
| **GeoAPI features** | OGC API Features compliant. GeoJSON with `limit`, `offset`, `bbox` parameters. Conforms to Parts 1–5. | Existing research |
| **Data content** | Full polygon geometries for every declared agricultural parcel (1.3M+ parcels). Crop types, claimed areas, eligible areas, scheme participation. Anonymised (herd numbers SHA-256 hashed). | Existing research |
| **Freshness** | Annual — datasets published per calendar year (2017–2024 available) | Live test |
| **Download formats** | SHP (EPSG:2157), GPKG (2020+), **PMTiles** (2017+ — ideal for MapLibre), GeoJSON via API, CSV (data dictionary) | Existing research |
| **Reliability** | Government service backed by EU HVD regulation. Consistent schema across years. Modern OGC Features implementation. | Docs |
| **Licensing** | CC-BY-4.0. EU High Value Dataset under Regulation 2023/138. | Official |
| **Recommendation** | **`use-via-proxy`** for GeoAPI queries. **PMTiles on R2** is the ideal path for map rendering — no proxy needed. CKAN metadata API works direct from browser. | |

**GeoAPI Collections:** `anonymous-lpis-data-for-2024_2024-lpis-data` (parcels), `*_subfeatures` (ineligible features), plus N&P merged datasets for 2022–2023.

---

## 7. DAFM CAP Beneficiary JSON

**Endpoint:** `https://capben-ui.apps.services.agriculture.gov.ie/assets/capben/{year}.json`

| Field | Value | Evidence |
|-------|-------|----------|
| **Interactive UI** | https://capben-ui.apps.services.agriculture.gov.ie/ | Official |
| **CKAN** | https://opendata.agriculture.gov.ie/dataset?theme=CAP | Official |
| **gov.ie** | https://www.gov.ie/en/department-of-agriculture-food-and-the-marine/services/cap-common-agricultural-policy-beneficiary-data/ | Official |
| **Contact** | capbenenquiry@agriculture.gov.ie, +353 57 869 4302 | Official |
| **Auth model** | Public — no auth, no CAPTCHA | Live test |
| **CORS** | **Restrictive** — no CORS headers (OpenShift/K8s hosting) | Live test |
| **HTTPS** | Fully HTTPS | Live test |
| **Rate limits** | Unspecified — static file hosting | Live test |
| **Response size** | ~19.2MB for 2024.json (125,852 beneficiary records) | Live test |
| **Freshness** | Annual — published on/before 31 May for preceding year. Only 2 most recent years retained. | Official |
| **Currently available** | 2023.json (200), 2024.json (200). 2018–2022 and 2025 return 404. | Live test |
| **Reliability** | Government obligation under EU regulation. Angular SPA with static JSON — simple architecture. | Docs |
| **Licensing** | CC-BY-4.0. Contains **personal data** (names, counties, payments) — GDPR display requirements apply. | Official |
| **Recommendation** | **`use-via-proxy`** — no CORS, 19MB payload. Ingest into Supabase/DuckDB rather than serving raw JSON to clients. Cache aggressively (annual data). | |

**Data fields (2024 format):** `pn` (name), `co` (county), `vn` (vendor number), `m1` (investments), `m2` (basic income support), `m7` (climate & environment), `m10` (redistributive support), `m27` (environmental commitments), `m28` (natural constraints), `z` (total EU amount).

**CKAN downloads:** XLSX/CSV via `opendata.agriculture.gov.ie` — redirect via 302 to time-limited signed URLs on Linode object storage (1-hour expiry).

---

## 8. Marine Institute ERDDAP

**Base URL:** `https://erddap.marine.ie/erddap/`

| Field | Value | Evidence |
|-------|-------|----------|
| **Official docs** | https://erddap.marine.ie/erddap/rest.html (REST API), https://erddap.marine.ie/erddap/ (home) | Live test |
| **Contact** | Marine Institute Data Request Form: https://www.marine.ie/data-request | Official |
| **Auth model** | Public — no authentication | Live test |
| **CORS** | Permissive — `Access-Control-Allow-Origin: *` on all responses | Live test |
| **HTTPS** | Fully HTTPS with HSTS (`max-age=63072000`) | Live test |
| **Rate limits** | Unspecified — no rate limit headers, ERDDAP has no built-in rate limiting | Live test + docs |
| **Freshness** | LoadDatasets runs every ~15 minutes. Individual datasets vary: buoy data near-real-time, historical datasets static. 5 of 86 currently failing to load. | Live test (status page) |
| **Status page** | https://erddap.marine.ie/erddap/status.html — live metrics. ERDDAP v2.14. Last startup 2026-02-05. 5,707 unique users. ~49,569 successful responses. Median response ~67ms. | Live test |
| **Datasets** | 86 total: 9 gridded (griddap), 77 tabular (tabledap). Sea temperature, wave buoys, ocean models, fisheries, water quality. | Live test |
| **Output formats** | JSON, CSV, TSV, NetCDF, MATLAB, KML, GeoJSON, PNG/PDF graphs | Docs |
| **Licensing** | MI Data Policy — most data free of charge, attribution required. INFOMAR data (joint MI/GSI) uses CC-BY 4.0. | Official |
| **Recommendation** | **`use-direct`** | |

**Key API patterns:**
- Search: `https://erddap.marine.ie/erddap/search/index.json?searchFor={term}`
- Dataset metadata: `https://erddap.marine.ie/erddap/info/{datasetID}/index.json`
- Data: `https://erddap.marine.ie/erddap/tabledap/{datasetID}.json?{constraints}`

---

## 9. EPA GeoServer WMS/WFS

**WFS Endpoint:** `https://gis.epa.ie/geoserver/EPA/wfs`

| Field | Value | Evidence |
|-------|-------|----------|
| **Official docs** | https://gis.epa.ie/GetData/Connect (connection guide) | Official |
| **WFS capabilities** | `https://gis.epa.ie/geoserver/EPA/wfs?service=WFS&request=GetCapabilities` | Live test |
| **WMS capabilities** | `https://gis.epa.ie/geoserver/wms?service=WMS&request=getCapabilities&version=1.3.0` | Live test |
| **Contact** | gis@edenireland.ie, 053-916 0600 | Official |
| **Auth model** | Public — no authentication | Live test |
| **CORS** | Permissive — `Access-Control-Allow-Origin: *` | Live test |
| **HTTPS** | Fully HTTPS (Azure CDN) | Live test |
| **Rate limits** | Unspecified. `maxFeatures` cap of 1,000,000 configured. No rate limit headers. | Capabilities XML |
| **Freshness** | Varies by layer: WFD data per cycle (current: Cycle 3, 2022–2027), licensed facilities monthly, some layers static. | Official |
| **WFS versions** | 1.0.0, 1.1.0, 2.0.0 all supported | Live test |
| **Output formats** | GeoJSON, GML, KML, Shapefile (SHAPE-ZIP), CSV, text/xml | Docs |
| **CRS** | Default EPSG:29902 (Irish Grid). Request EPSG:4326 via `srsName`. | Docs |
| **Licensing** | CC-BY-4.0 for EPA data. OSi basemap imagery has separate terms (not relevant for data layers). | Official |
| **Recommendation** | **`use-direct`** | |

> **ArcGIS REST services are DEAD.** EPA retired all `gis.epa.ie/arcgis/rest/services/` endpoints. Use WFS/WMS only.

**Key layers for farm dashboard:** `EPA:WATER_*` (WFD waterbodies), `EPA:WFD_RWB_Pressures_Agriculture` (agriculture pressure on rivers), `EPA:LAND_*` (soils, CORINE), `EPA:AIR_*` (air quality).

---

## 10. EPA WFD API (Water Framework Directive)

**Base URL:** `https://wfdapi.edenireland.ie/api/`

| Field | Value | Evidence |
|-------|-------|----------|
| **Official docs** | https://data.epa.ie/api-list/wfd-open-data/ | Official |
| **Swagger** | https://wfdapi.edenireland.ie/docs/index | Official |
| **Contact** | hello@catchments.ie | Swagger docs |
| **Auth model** | **Public — NO API key required** (despite initial assumption). All endpoints open. | Live test |
| **CORS** | Permissive — `Access-Control-Allow-Origin: *` | Live test |
| **HTTPS** | Fully HTTPS | Live test |
| **Rate limits** | Unspecified. `Cache-Control: max-age=1800` (30-min cache). Server: IIS 8.5 / ASP.NET 4.x. | Live test |
| **Response time** | 146–198ms per request | Live test |
| **Freshness** | WFD status data on multi-year cycles (current: Cycle 3). Status periods: SW 2007-2009 through SW 2019-2024. Monitoring iterations: IEMP2019-2021, IEMP2022-2024, IEMP2025-2027. | Official |
| **HEAD quirk** | Returns 401 for HEAD requests (IIS quirk). Only GET works. Not actual authentication. | Live test |
| **Licensing** | CC-BY-4.0 | Official |
| **Recommendation** | **`use-direct`** | |

**Key endpoints:** `/api/catchment` (46 catchments), `/api/waterbody/{id}` (status, risk, lat/lon), `/api/search?v={term}`, `/api/charts/*` (pre-aggregated dashboard data), `/api/areaforaction` (507 areas).

See `wfd-api-key-onboarding.md` for full endpoint catalogue and example requests.

---

## 11. Tailte Eireann ArcGIS Services

**Portal:** https://data-osi.opendata.arcgis.com/
**Services:** `https://services-eu1.arcgis.com/FH5XCsx8rYXqnjF5/ArcGIS/rest/services`

| Field | Value | Evidence |
|-------|-------|----------|
| **Contact** | digidata@tailte.ie (per Oct 2025 URL change announcement) | Official |
| **Auth model** | Public — no authentication. ArcGIS Online free tier. | Live test |
| **CORS** | Permissive — `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Credentials: true` | Live test |
| **HTTPS** | Fully HTTPS with HSTS (`max-age=63072000`) | Live test |
| **Rate limits** | **Explicit** — `x-esri-org-request-units-per-min: usage=N;max=57600`. ~3 units per query = ~19,200 queries/min. | Live test |
| **CRS** | Default EPSG:2157 (ITM). Use `outSR=4326` for WGS84. | Live test |
| **Pagination** | `resultRecordCount` + `resultOffset`. `exceededTransferLimit: true` signals more records. | Live test |
| **Output formats** | JSON (default), GeoJSON (`f=geojson`), PBF | Live test |
| **Freshness** | Boundary datasets versioned by year (e.g., "Ungeneralised 2024"). Updates infrequent. | Live test |
| **Reliability** | Hosted on Esri ArcGIS Online EU (Azure-backed CDN). Very high availability. ArcGIS Server 11.5. 30-second cache. | Live test |
| **Licensing** | Creative Commons Attribution — free to use with attribution to Tailte Eireann. | Official portal |
| **Recommendation** | **`use-direct`** | |

**Key services:** Townlands (~51,000), Electoral Divisions, Counties, Administrative Areas, Small Areas, LEA Boundaries. Generalised versions (20m, 50m, 100m) available for performance.

---

## 12. GSI ArcGIS Services (Geological Survey Ireland)

**REST directory:** `https://gsi.geodata.gov.ie/server/rest/services`
**Portal:** `https://gsi.geodata.gov.ie/portal/`

| Field | Value | Evidence |
|-------|-------|----------|
| **Official docs** | https://www.gsi.ie/en-ie/data-and-maps/Pages/default.aspx | Official |
| **Auth model** | Public — no authentication. Sets `AGS_ROLES` cookie (standard ArcGIS Server, not auth). | Live test |
| **CORS** | Permissive — reflects requesting Origin. `Access-Control-Allow-Credentials: true`. | Live test |
| **HTTPS** | Fully HTTPS with HSTS (`max-age=63072000`, `includeSubDomains`, `preload`) | Live test |
| **Rate limits** | Unspecified. Self-hosted ArcGIS Server 10.81. | Live test |
| **Freshness** | Geological/quaternary data relatively static. Groundwater levels can be near-real-time (gwlevel.ie). Maps at 40K–250K scale. | Official |
| **Reliability** | Self-hosted ArcGIS Server 10.81 (older but functional). IIS 10.0 backend. No public status page. HSTS preload configured. | Live test |
| **Licensing** | **CC-BY-4.0** for most data. **Exception: groundwater flooding is CC-BY-NC-ND 4.0** (non-commercial, no derivatives). | Official |
| **Recommendation** | **`use-direct`** | |

**Key services for farm dashboard:**

| Service | Relevance |
|---------|-----------|
| `Quaternary/IE_GSI_Quaternary_Sediments_50K` | **High** — soil parent material |
| `Groundwater/IE_GSI_Aquifer_Datasets` | **High** — groundwater vulnerability for nitrate compliance |
| `Groundwater/IE_GSI_Groundwater_Vulnerability_40K` | **High** — nitrate zone delineation |
| `Groundwater/IE_GSI_Subsoil_Permeability_40K` | **High** — drainage/nutrient runoff risk |
| `Groundwater/IE_GSI_Groundwater_Recharge_40K` | Medium — water resource planning |
| `Groundwater/IE_GSI_Karst_Datasets_40K` | Medium — limestone areas |
| `Quaternary/IE_GSI_Physiographic_Units_*` | Medium — landscape classification |

27 service folders covering bedrock, drilling, energy, geochemistry, geohazards, geoheritage, geophysics, geotechnical, groundwater, marine, minerals, quaternary, third-party data.

---

## Cross-Cutting Architecture Notes

### CORS Strategy

| Behaviour | Sources | Client Strategy |
|-----------|---------|----------------|
| **Permissive** (browser-safe) | CSO PxStat, Met Eireann prodapi (ag + obs), Marine Institute ERDDAP, EPA GeoServer, EPA WFD API, Tailte Eireann, GSI | Direct `fetch()` from Next.js client |
| **Restrictive** (no CORS) | Met Eireann warnings, OPW waterlevel.ie, DAFM GeoAPI, DAFM CAP JSON | Proxy via Hono API on Fly.io Dublin |

### Recommended Proxy Routes

| Route | Upstream | Cache TTL | Notes |
|-------|----------|-----------|-------|
| `/api/proxy/met-warnings` | `www.met.ie/Open_Data/json/warning_IRELAND.json` | 60s | Tiny payload |
| `/api/proxy/opw-latest` | `https://waterlevel.ie/geojson/latest/` | 900s | 724KB, matches 15-min cadence |
| `/api/proxy/dafm-geoapi/*` | `https://geoapi.opendata.agriculture.gov.ie/shps/*` | 3600s | Annual data |
| `/api/proxy/cap/{year}` | `capben-ui.apps.services.agriculture.gov.ie/assets/capben/{year}.json` | 86400s | Annual, ingest to DB preferred |

### Data Timeliness Matrix

| Source | Update Frequency | Staleness Tolerance |
|--------|-----------------|-------------------|
| Met Eireann warnings | Near real-time (minutes) | < 5 minutes |
| OPW water levels | Every 15 minutes | < 30 minutes |
| Met Eireann observations | Hourly | < 2 hours |
| Met Eireann agriculture report | Weekly | < 1 day |
| Marine Institute ERDDAP | ~15-min dataset reload | Varies by dataset |
| EPA WFD API | Multi-year cycle | Days–weeks |
| CSO PxStat | Quarterly–annual | Days–weeks |
| DAFM LPIS | Annual | Months |
| DAFM CAP | Annual (May) | Months |
| Tailte Eireann boundaries | Infrequent | Months–years |
| GSI geological data | Rare | Years |

### Licensing Summary

All 12 sources are licensed for production use. All are CC-BY-4.0 or equivalent with attribution requirement. Two exceptions to note:
- **Met Eireann forecasts/warnings:** Custom licence — must display warnings alongside forecast data
- **GSI groundwater flooding:** CC-BY-NC-ND 4.0 — no commercial use, no derivatives
- **DAFM CAP data:** Contains personal data — GDPR display requirements apply
