# API Source Validation - 2026-02-07

Validation run date: 2026-02-07

Methods used:
- Server-side checks with `curl` (status, response time, content-type, size, CORS/rate-limit headers).
- Browser-side checks with Playwright from `https://example.com` origin using `fetch(...)`.
- Artifacts captured in `/Users/donalocallaghan/workspace/vibes/farm-dashboard/output/api-checks/`.

## Summary Classification

- `browser-safe`: `cso_pxstat`, `met_agri`, `met_obs`, `marine_erddap`, `epa_wms_caps`, `epa_wfs_alt`, `epa_wfd_alt`, `tailte_services`, `gsi_services`
- `needs-proxy`: `met_warn`, `dafm_cap_json`, `dafm_lpis_alt` (CORS blocked)
- `broken-or-replace`: `opw_levels` (HTTP-only mixed content), `dafm_lpis_broken` (404), `epa_wfs_broken` (invalid layer, returns XML exception), `epa_wfd_root` (403 root URL)

## Per-source Results

| Source | URL tested | Curl result | Browser fetch | CORS header (Origin: `https://example.com`) | Notes | Classification |
|---|---|---:|---:|---|---|---|
| CSO PxStat | `https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/AAA09/JSON-stat/2.0/en` | `200`, `0.23s`, `application/json`, `58,606 bytes` | `true / 200` | `Access-Control-Allow-Origin: https://example.com` | Good baseline public JSON-stat feed. | browser-safe |
| Met Eireann ag weather | `https://prodapi.metweb.ie/agriculture/report` | `200`, `0.19s`, `application/json`, `6,401 bytes` | `true / 200` | `*` | Rate-limit headers present (`x-ratelimit-limit: 60`). | browser-safe |
| Met Eireann observations | `https://prodapi.metweb.ie/observations/dublin-airport/today` | `200`, `0.15s`, `application/json`, `2 bytes` | `true / 200` | `*` | Response currently empty array (`[]`). | browser-safe |
| Met Eireann warnings | `https://www.met.ie/Open_Data/json/warning_IRELAND.json` | `200`, `0.18s`, `application/json`, `3 bytes` | `false / null` | none | Browser CORS failure despite HTTP 200 in curl. Current payload is empty list (`[]`). | needs-proxy |
| OPW water levels | `http://waterlevel.ie/geojson/latest/` | `200`, `1.12s`, `application/json`, `724,502 bytes` | `false / null` | none | HTTP-only endpoint. Blocked by browser mixed-content rules from HTTPS app pages. | broken-or-replace |
| DAFM LPIS (bead URL) | `https://geoapi.opendata.agriculture.gov.ie/arcgis/rest/services/LPIS/MapServer/0/query?...` | `404`, `0.16s`, `text/html` | `false / null` | none | Path appears stale or removed. | broken-or-replace |
| DAFM LPIS (working alternative) | `https://geoapi.opendata.agriculture.gov.ie/shps/collections/anonymous-lpis-and-n-p-for-2020_parcels/items?f=json&bbox=-8.8,51.8,-8.5,52.0&limit=5` | `200`, `0.76s`, `application/json`, `36,467 bytes` | `false / null` | none | OGC API endpoint works server-side but no CORS for browser direct use. | needs-proxy |
| DAFM CAP JSON | `https://capben-ui.apps.services.agriculture.gov.ie/assets/capben/2024.json` | `200`, `0.70s`, `application/json`, `19,161,987 bytes` | `false / null` | none | Large payload (~19 MB) and CORS blocked in browser. | needs-proxy |
| Marine Institute ERDDAP | `https://erddap.marine.ie/erddap/tabledap/IWBNetwork.json?...` | `200`, `0.28s`, `application/json`, `531 bytes` | `true / 200` | `*` | Queryable and browser consumable. | browser-safe |
| EPA WMS GetCapabilities | `https://gis.epa.ie/geoserver/wms?SERVICE=WMS&REQUEST=GetCapabilities` | `200`, `30.67s`, `text/xml`, `1,209,395 bytes` | `true / 200` | `*` | Very large and slower response; cache if used directly. | browser-safe |
| EPA WFS sample (bead typeName) | `https://gis.epa.ie/geoserver/wfs?...typeName=EPA:IPPC_Licensed_Industries...` | `200`, `application/xml`, `546 bytes` | `true / 200` | `*` | Returns OWS Exception XML, not GeoJSON (invalid/unknown layer). | broken-or-replace |
| EPA WFS sample (working alternative) | `https://gis.epa.ie/geoserver/wfs?...typeName=EPA:AIR_NO2&outputFormat=application/json&maxFeatures=5` | `200`, `0.72s`, `application/json`, `11,054,371 bytes` | `true / 200` | `*` | Valid layer + GeoJSON output confirmed. | browser-safe |
| EPA WFD root URL | `https://wfdapi.edenireland.ie` | `403`, `0.24s`, `text/html` | `false / null` | none | Root path forbidden. | broken-or-replace |
| EPA WFD working path | `https://wfdapi.edenireland.ie/api/catchment` | `200`, `0.19s`, `application/json`, `5,559 bytes` | `true / 200` | `*` | Public endpoint appears available without key for this route. | browser-safe |
| Tailte Eireann ArcGIS services | `https://services-eu1.arcgis.com/FH5XCsx8rYXqnjF5/arcgis/rest/services?f=pjson` | `200`, `1.77s`, `application/json`, `43,540 bytes` | `true / 200` | `*` | CORS-enabled ArcGIS directory endpoint. | browser-safe |
| GSI ArcGIS services | `https://gsi.geodata.gov.ie/server/rest/services?f=pjson` | `200`, `0.20s`, `text/plain`, `736 bytes` | `true / 200` | reflected origin | CORS allowed with credentials true. | browser-safe |

## Rate limits observed

- Met Eireann endpoints (`agriculture/report`, `observations/...`) expose:
  - `x-ratelimit-limit: 60`
  - `x-ratelimit-remaining: <value>`
- No explicit rate-limit headers observed for the other tested endpoints.

## Response format notes

- JSON: CSO, Met Eireann ag/obs, DAFM LPIS alt, DAFM CAP, Marine ERDDAP, WFD `/api/catchment`, Tailte, some EPA WFS queries.
- XML: EPA WMS capabilities; invalid EPA WFS request returns OWS exception XML.
- OPW delivers JSON but only over HTTP.

## Blocking issues and immediate solutions

1. OPW mixed-content block
- Problem: endpoint is HTTP-only and cannot be fetched by an HTTPS frontend.
- Solution: proxy via backend service over HTTPS to browser, or replace with HTTPS-capable alternative source.

2. DAFM LPIS bead URL invalid
- Problem: supplied ArcGIS path is 404.
- Solution: use OGC API path under `/shps/collections/.../items` server-side; expose trimmed, normalized API from backend.

3. EPA WFS sample query invalid
- Problem: layer `EPA:IPPC_Licensed_Industries` does not return GeoJSON data.
- Solution: obtain valid layer names from WFS GetCapabilities (e.g. `EPA:AIR_NO2`) before integrating.

4. EPA WFD base URL misleading
- Problem: root URL returns 403.
- Solution: use concrete API paths (verified: `/api/catchment`).

## EPA WFD API key / onboarding status

- Swagger endpoint discovered at:
  - `https://wfdapi.edenireland.ie/docs/v1/swagger`
- API description states this is an API for EPA public catchment information.
- Verified live request to `https://wfdapi.edenireland.ie/api/catchment` returns `200` in curl and browser fetch.
- No API key or OAuth requirement is declared in the discovered Swagger definition for tested public endpoints.
- Operational onboarding for public use: use documented `/api/*` routes directly.
- For restricted access/queries or platform support, EDEN contact published by EPA: `eden@epa.ie`.

## Pending research (parallel task)

- Confirm production usage/licensing terms and long-term stability expectations per provider.

These are being tracked in `/Users/donalocallaghan/workspace/vibes/farm-dashboard/docs/research/api-sources/RESEARCH_BRIEF.md`.
