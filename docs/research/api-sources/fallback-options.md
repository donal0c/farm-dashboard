# Fallback / Alternative Data Sources

**Research Date:** 2026-02-07 UTC

For each problematic source class, 2–3 alternatives with pros/cons, schema compatibility, and migration effort.

---

## Problem Class 1: CORS-Blocked but Otherwise Live

**Affected source:** EPA GeoServer WFS (`https://gis.epa.ie/geoserver/EPA/wfs`) — valid WFS responses but no `Access-Control-Allow-Origin` headers, blocking browser-side `fetch()`.

> **Update:** Live testing on 2026-02-07 found EPA GeoServer WFS now returns `Access-Control-Allow-Origin: *`. This class may no longer apply to EPA specifically. The alternatives below remain useful if CORS issues recur or for other sources.

---

### 1A: EPA WFD Open Data API (wfdapi.edenireland.ie)

| Field | Value |
|-------|-------|
| **URL** | `https://wfdapi.edenireland.ie/api/` |
| **Swagger** | https://wfdapi.edenireland.ie/docs/index |
| **Coverage vs original** | Core WFD water quality data: catchments, subcatchments, waterbodies, trends, monitoring, charts, areas for action. Rivers, lakes, transitional, coastal. Does NOT cover all 839 EPA WFS layers. |
| **Schema compatibility** | MEDIUM — structured JSON (not GeoJSON), different field names. Waterbody codes (`IE_SE_16B020080`) are consistent join keys. |
| **Migration effort** | Medium |
| **Pros** | HTTPS, Swagger docs, pagination, small focused payloads, search endpoint, dashboard charting endpoints, CC-BY-4.0, maintained by EPA Catchment Science |
| **Cons** | No geometry data (attributes only, no spatial polygons/polylines). Narrower than full WFS. |
| **Solves CORS?** | Yes — returns `Access-Control-Allow-Origin: *` |

### 1B: data.gov.ie Pre-Built GeoJSON Downloads

| Field | Value |
|-------|-------|
| **URLs** | Transitional Water Quality GeoJSON, Coastal Water Quality, Bathing Water Compliance, WFD River Basin Districts, Water Monitoring Stations — all on data.gov.ie |
| **Coverage vs original** | Good coverage of key WFD layers as direct GeoJSON downloads. Static snapshots, not real-time. |
| **Schema compatibility** | LOW — same EPA attribute schema (exported from GeoServer). Field names match. |
| **Migration effort** | Low |
| **Pros** | Direct file download (no CORS), standard GeoJSON, same underlying data, CC-BY-4.0 |
| **Cons** | Static snapshots (no server-side filter/bbox), some datasets WMS-only, update frequency varies (2020–2025), large nationwide files |
| **Solves CORS?** | Yes — CKAN resource URLs serve proper CORS headers |

### 1C: DAFM GeoAPI (OGC API Features) for Water Quality Review Maps

| Field | Value |
|-------|-------|
| **URL** | `https://geoapi.opendata.agriculture.gov.ie/shps/collections?f=json` |
| **Coverage vs original** | Narrower — DAFM-specific: National Water Quality Review Implementation Maps (nitrate derogation stocking rate limits), LPIS environmental overlays. Not EPA water chemistry, but the agriculture-environment intersection. |
| **Schema compatibility** | LOW-MEDIUM — OGC API Features, standard GeoJSON. DAFM-specific schema (stocking rates, derogation zones). |
| **Migration effort** | Low–Medium |
| **Pros** | HTTPS, OGC API Features Parts 1–5, pagination, GeoJSON, spatial/attribute filtering, nitrate compliance zones |
| **Cons** | Only DAFM datasets (not EPA monitoring), relatively new endpoint |
| **Solves CORS?** | Yes — OGC API Features designed for web consumption |

---

## Problem Class 2: HTTP-Only Endpoints Blocked in HTTPS Apps

**Affected source:** OPW Water Levels (`http://waterlevel.ie/geojson/latest/`) — browsers block HTTP resources from HTTPS pages (mixed content).

> **Update:** Live testing found `http://waterlevel.ie` now 301-redirects to `https://waterlevel.ie`. The HTTP-only issue is partially resolved, but CORS is still blocked. A proxy remains necessary.

---

### 2A: EPA HydroNet / Water Levels and Flow

| Field | Value |
|-------|-------|
| **URLs** | HydroNet portal: `https://epawebapp.epa.ie/hydronet/`, JSON: `http://www.epa.ie/Hydronet/output/internet/layers/10/index.json`, data.gov.ie: `https://data.gov.ie/dataset/water-levels-and-flow` |
| **Coverage vs original** | 300+ stations (EPA/Local Authority network). Complementary to OPW with different station network. Combined = comprehensive coverage. Includes groundwater levels (OPW does not). |
| **Schema compatibility** | MEDIUM — different station IDs/naming. Same water level concept, different fields. Needs mapping table. |
| **Migration effort** | Medium |
| **Pros** | HydroNet portal is HTTPS, covers stations OPW doesn't, includes groundwater, national hydrometric register, CC-BY-4.0 |
| **Cons** | Raw JSON endpoint also HTTP-only, HydroNet is a web app (not clean REST API), different station network, update latency may differ |
| **Solves HTTP?** | Partially — portal is HTTPS but raw data is HTTP. Internal API calls need reverse-engineering. |

### 2B: Server-Side Proxy for waterlevel.ie (Recommended)

| Field | Value |
|-------|-------|
| **URL** | `https://your-api.fly.dev/api/water-levels/latest` |
| **Coverage vs original** | IDENTICAL — proxies exact same data |
| **Schema compatibility** | NONE needed — exact same GeoJSON response via HTTPS |
| **Migration effort** | None |
| **Implementation** | Hono route on Fly.io Dublin → proxy `https://waterlevel.ie/geojson/latest/` with 5-min cache. Response ~200–400KB. Add `Cache-Control: public, max-age=300`. |
| **Pros** | Identical data, zero migration, HTTPS + CORS guaranteed, sub-5ms latency (Fly.io Dublin → OPW), caching reduces upstream load, error handling |
| **Cons** | Adds API server dependency, OPW asks courtesy email with server IP/URL, slight operational complexity |
| **Solves HTTP?** | Yes, completely. Most pragmatic solution. |

### 2C: OPW Hydro-Data Archive (Historical)

| Field | Value |
|-------|-------|
| **URL** | `https://waterlevel.ie/hydro-data/` |
| **Coverage vs original** | Historical records >5 weeks old. Same 400+ OPW stations. Not real-time. |
| **Schema compatibility** | LOW — same station numbering, CSV format. Different time range. |
| **Migration effort** | Low |
| **Pros** | HTTPS endpoint, historical archive (decades), same station network, useful for trend charts |
| **Cons** | Not real-time (records >5 weeks only), CSV downloads (not GeoJSON) |
| **Solves HTTP?** | Yes for historical only. Combine with 2B for real-time. |

---

## Problem Class 3: Endpoints with Brittle/Undocumented Paths

**Affected sources:** Various DAFM endpoints where URL paths change without notice; undocumented internal APIs.

---

### 3A: CSO PxStat API (Stable, Well-Documented)

| Field | Value |
|-------|-------|
| **URL pattern** | `https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/{TABLE_CODE}/JSON-stat/2.0/en` |
| **Portal** | https://data.cso.ie/ |
| **Key tables** | `AAA` (Output/Income), `AKA`/`AKM` (Price Indices), `ASA` (Crops & Livestock), `AQA` (Farm Structure), `AVA` (Milk), `AGA` (Land Prices). 150+ agriculture tables. |
| **Coverage vs original** | Excellent for income trends, livestock, crops, prices, farm structure. Does NOT cover spatial/parcel data (LPIS) or CAP payments. |
| **Schema compatibility** | LOW — JSON-stat 2.0 with library support (`jsonstat-toolkit`). Stable, versioned table codes. |
| **Migration effort** | Low |
| **Pros** | Extremely stable (5+ years), documented API, HTTPS + CORS, JSON-stat 2.0, 150+ ag tables, no auth, 10–500KB responses |
| **Cons** | Statistical aggregates only (no parcel data), table codes need discovery, JSON-stat requires parsing, some tables have complex multi-dimensional structures |
| **Solves brittle path?** | Yes — URL pattern stable 5+ years |

### 3B: DAFM Open Data Portal + GeoAPI (OGC API Features)

| Field | Value |
|-------|-------|
| **Portal** | https://opendata.agriculture.gov.ie/dataset/ |
| **GeoAPI** | `https://geoapi.opendata.agriculture.gov.ie/shps/collections?f=json` |
| **Example** | `https://geoapi.opendata.agriculture.gov.ie/shps/collections/anonymous-lpis-and-n-p-data-for-2022_parcels?f=json` |
| **CAP data** | https://opendata.agriculture.gov.ie/dataset/cap-beneficiaries-2024 |
| **Coverage vs original** | Comprehensive: 58 datasets including LPIS parcels (2019–2024), N&P data, CAP beneficiaries, forestry, water quality review maps. |
| **Schema compatibility** | LOW — CKAN resource URLs use stable UUIDs. OGC API Features returns standard GeoJSON. Multiple formats: SHP, GPKG, PMTiles, CSV, XLSX, JSON. |
| **Migration effort** | Low |
| **Pros** | CKAN UUIDs don't change on file update, OGC API Features standard, pagination/filtering/CRS transform, HTTPS, annual versioning, CC-BY-4.0, EU HVD |
| **Cons** | Annual update cycle, LPIS anonymised, some collections very large, GeoAPI relatively new |
| **Solves brittle path?** | Yes — CKAN UUIDs and OGC API Features are standardised |

### 3C: Eurostat REST API (Agriculture Statistics Mirror)

| Field | Value |
|-------|-------|
| **URL pattern** | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{DATASET_CODE}?geo=IE&format=JSON` |
| **Key datasets** | `ef_lus_main` (land use), `ef_lsk_main` (livestock), `aact_eaa01` (economic accounts), `apri_pi00_ina`/`apri_pi00_outa` (price indices), `ef_m_farmang` (farm indicators) |
| **Coverage vs original** | Mirrors CSO farm statistics at NUTS 2 level (IE04/IE05/IE06). Good for cross-country comparison and validation. |
| **Schema compatibility** | MEDIUM — different field naming (Eurostat dimensions vs CSO codes). JSON-stat 2.0 format. NUTS 2 granularity (not county). |
| **Migration effort** | Medium |
| **Pros** | Extremely stable API (years of backward compatibility), documented, HTTPS + CORS, multiple formats, no auth, good fallback for CSO |
| **Cons** | Coarser geography (NUTS 2 vs county), some datasets lag CSO by months, different codes, not useful for spatial data |
| **Solves brittle path?** | Yes — one of the most stable public data APIs in existence |

---

## Problem Class 4: Large Payload Endpoints Unsuitable for Direct Browser Use

**Affected sources:** Full LPIS datasets (1.3M+ parcels, 100MB+), EPA nationwide WFS queries (thousands of waterbodies), full OPW station data (724KB).

---

### 4A: PMTiles on Cloudflare R2 (Recommended for Map Rendering)

| Field | Value |
|-------|-------|
| **Approach** | Convert GeoJSON/SHP → PMTiles via Tippecanoe, host on R2, serve to MapLibre GL JS |
| **Tool chain** | Download SHP/GeoJSON → `tippecanoe -o output.pmtiles -zg --drop-densest-as-needed input.geojson` → upload to R2 → serve via `pmtiles://` protocol |
| **Coverage vs original** | Identical geometry + attributes (configurable). Auto-simplification at lower zoom levels. |
| **Schema compatibility** | LOW for viz, MEDIUM for queries — PMTiles optimised for rendering, not attribute queries. |
| **Migration effort** | Low (already in tech stack) |
| **Pros** | Eliminates large payload problem (only viewport tiles fetched), no server-side tile generation, R2 edge cache (sub-50ms), one-time conversion, works with MapLibre + deck.gl, multi-layer support, auto-simplification |
| **Cons** | Requires data pipeline for updates, not for real-time data, client-side attribute filtering, initial LPIS conversion may take 10–30 min |
| **Solves large payload?** | Yes — gold standard for large geospatial datasets in browser apps |

**Recommended PMTiles candidates:**

| Layer | Source | Raw Size | Update Freq |
|-------|--------|----------|-------------|
| LPIS parcels | DAFM GeoAPI | 100–200MB | Annual |
| EPA River Waterbodies | EPA WFS / data.gov.ie | 50–100MB | Multi-year |
| Nitrate Derogation Zones | DAFM GeoAPI | 5–20MB | Annual |
| Soil Types | GSI/Teagasc | 50–100MB | Rare |
| Townland Boundaries | Tailte Eireann | 80–150MB | Rare |

### 4B: WFS Pagination with `startIndex` and `count`

| Field | Value |
|-------|-------|
| **Approach** | Use WFS 2.0 pagination to fetch data in chunks |
| **URL pattern** | `...&count=500&startIndex=0` |
| **Coverage vs original** | Identical — same WFS, paginated |
| **Schema compatibility** | None needed — same data, same format |
| **Migration effort** | None |
| **Pros** | Zero migration, `count`/`maxFeatures` + `startIndex`, `BBOX` spatial filtering, reduces per-response size to 500KB–2MB |
| **Cons** | Multiple round trips, client pagination logic needed, no consistent ordering without `sortBy`, still hits EPA servers per page |
| **Solves large payload?** | Yes per-request. Combine with CORS proxy if needed. |

**Implementation pattern:**
```typescript
async function fetchAllFeatures(typeName: string, pageSize = 500) {
  let startIndex = 0;
  const allFeatures: Feature[] = [];
  let hasMore = true;

  while (hasMore) {
    const url = `https://your-proxy/epa-wfs?` +
      `service=WFS&version=2.0.0&request=GetFeature` +
      `&typeName=${typeName}&outputFormat=application/json` +
      `&count=${pageSize}&startIndex=${startIndex}`;
    const response = await fetch(url);
    const geojson = await response.json();
    allFeatures.push(...geojson.features);
    hasMore = geojson.features.length === pageSize;
    startIndex += pageSize;
  }
  return { type: "FeatureCollection", features: allFeatures };
}
```

### 4C: DuckDB-WASM with GeoParquet on R2 (Client-Side Analytics)

| Field | Value |
|-------|-------|
| **Approach** | Pre-process to GeoParquet → R2 → DuckDB-WASM spatial queries in browser |
| **Tool chain** | Python pipeline (Polars + DuckDB) → GeoParquet → R2 upload → DuckDB-WASM with spatial extension |
| **Coverage vs original** | Identical attributes. Geometry as WKB. Supports spatial queries (ST_Contains, etc). |
| **Schema compatibility** | MEDIUM — requires conversion pipeline. Schema controlled during conversion. |
| **Migration effort** | Medium |
| **Pros** | Already in tech stack, Parquet highly compressed (100MB → 10–30MB), HTTP range requests (partial downloads), full SQL in browser, complements PMTiles (Parquet for analytics, PMTiles for maps) |
| **Cons** | DuckDB-WASM ~4MB initial download, complex spatial queries can be slow, spatial extension loading, not for real-time, more complex client code |
| **Solves large payload?** | Yes — columnar format + range requests = download only what's needed |

---

## Summary Matrix

| Problem | Alternative | Solves It? | Effort | Recommended? |
|:--------|:-----------|:-----------|:-------|:-------------|
| **CORS** | 1A. WFD API | Yes | Medium | Yes, for water quality |
| **CORS** | 1B. data.gov.ie downloads | Yes | Low | Yes, for static layers |
| **CORS** | 1C. DAFM GeoAPI | Yes | Low–Med | Yes, for ag-environment |
| **HTTP-only** | 2A. EPA HydroNet | Partially | Medium | Secondary fallback |
| **HTTP-only** | **2B. Server-side proxy** | **Yes** | **None** | **Primary** |
| **HTTP-only** | 2C. OPW Hydro-Data | Historical only | Low | Complementary |
| **Brittle paths** | **3A. CSO PxStat** | **Yes** | **Low** | **Primary for statistics** |
| **Brittle paths** | **3B. DAFM Open Data + GeoAPI** | **Yes** | **Low** | **Primary for spatial/LPIS** |
| **Brittle paths** | 3C. Eurostat REST | Yes | Medium | Fallback/validation |
| **Large payloads** | **4A. PMTiles on R2** | **Yes** | **Low** | **Primary for maps** |
| **Large payloads** | 4B. WFS pagination | Yes (per-request) | None | Quick fix |
| **Large payloads** | **4C. DuckDB-WASM + Parquet** | **Yes** | **Medium** | **Primary for analytics** |

---

## Recommended Layered Architecture

1. **Map rendering:** PMTiles on R2 for all large spatial datasets. Convert with Tippecanoe in scheduled pipeline.

2. **Tabular analytics:** GeoParquet on R2 queried by DuckDB-WASM for attribute-heavy queries (farm income, livestock density, crop statistics).

3. **Real-time data:** Hono API proxy on Fly.io Dublin for CORS-blocked and HTTP-only endpoints (OPW water levels, Met Eireann warnings). Cache per source update frequency.

4. **Statistical data:** Direct browser calls to CSO PxStat (stable, CORS-enabled) and Eurostat (backup).

5. **Water quality:** WFD API for structured data; data.gov.ie GeoJSON for static spatial layers; DAFM GeoAPI for nitrate compliance zones.
