# EPA WFD API — Practical Onboarding Guide

## Executive Summary

**The EPA WFD API does NOT require an API key.** The Water Framework Directive Open Data API at `wfdapi.edenireland.ie` is a fully open, unauthenticated REST API. No registration, no API key, no approval process — start making requests immediately.

Additionally, the EPA GeoServer WFS at `gis.epa.ie` provides 207 WFD-related spatial layers, also with zero authentication. Both services return `Access-Control-Allow-Origin: *` headers, enabling direct browser-side requests.

---

## 1. Access Path: No Signup Required

### WFD REST API (Primary)

| Field | Value |
|-------|-------|
| **Base URL** | `https://wfdapi.edenireland.ie/api/` |
| **Authentication** | None — all endpoints are open |
| **Swagger docs** | https://wfdapi.edenireland.ie/docs/index |
| **Portal page** | https://data.epa.ie/api-list/wfd-open-data/ |
| **License** | CC-BY-4.0 |
| **Contact** | hello@catchments.ie |

### EPA GeoServer WFS (Spatial Data)

| Field | Value |
|-------|-------|
| **WFS endpoint** | `https://gis.epa.ie/geoserver/EPA/wfs` |
| **Authentication** | None — `<ows:Fees>NONE</ows:Fees>`, `<ows:AccessConstraints>NONE</ows:AccessConstraints>` |
| **WMS endpoint** | `https://gis.epa.ie/geoserver/wms?service=WMS&request=getCapabilities&version=1.3.0` |

### Bathing Water API (Related, also open)

| Field | Value |
|-------|-------|
| **Base URL** | `https://data.epa.ie/bw/api/v1/` |
| **OpenAPI spec** | `https://data.epa.ie/bw/swagger/v1/swagger.json` |
| **Authentication** | None |
| **CORS** | Does NOT return CORS headers — may require server-side proxy |

**Verification:** On 2026-02-07, live requests to all three services returned HTTP 200 with valid JSON/GeoJSON data without any authentication.

---

## 2. Required Organization Details

None. No registration form, no organization information, no approval workflow. The EPA publishes these as open data APIs for direct consumption.

Only requirement: attribution under CC-BY-4.0. Credit the Environmental Protection Agency, Ireland.

---

## 3. Approval Lead-Time

**Zero. Instant access.** No approval process exists.

---

## 4. Sandbox / Testing Access

No separate sandbox. The production API is the development/test environment (read-only, no auth).

The Swagger UI at https://wfdapi.edenireland.ie/docs/index provides an interactive "Try it" interface for testing each endpoint in a browser.

---

## 5. Example Authenticated Requests

No authentication needed. All examples below were tested live on 2026-02-07 and returned valid responses.

### 5.1 WFD REST API

**List all 46 catchments:**
```
GET https://wfdapi.edenireland.ie/api/catchment
```

**Get a specific catchment (Foyle = code 01):**
```
GET https://wfdapi.edenireland.ie/api/catchment/01
```

**Get a subcatchment with waterbodies:**
```
GET https://wfdapi.edenireland.ie/api/catchment/01/subcatchment/01_1
```

**Get a specific waterbody (status, risk, lat/lon, local authority):**
```
GET https://wfdapi.edenireland.ie/api/waterbody/IE_SE_16B020080
```

**Get trend data for a waterbody:**
```
GET https://wfdapi.edenireland.ie/api/waterbody/IE_SE_16B020080/trend/6612
```

**Search catchments/subcatchments:**
```
GET https://wfdapi.edenireland.ie/api/search?v=suir&size=5
GET https://wfdapi.edenireland.ie/api/search?v=suir&page=1&size=5
```

**Monitoring programme summary:**
```
GET https://wfdapi.edenireland.ie/api/monitoringprogramme/iterations/IE_NW_01F011100
GET https://wfdapi.edenireland.ie/api/monitoringprogramme/IE_NW_01F011100/summarize/IEMP2019-2021
GET https://wfdapi.edenireland.ie/api/monitoringprogramme/IE_NW_01F011100/stationdetails/IEMP2019-2021
GET https://wfdapi.edenireland.ie/api/monitoringprogramme/IE_NW_01F011100/qualityelementsummarize/IEMP2019-2021
```

**Areas for Action (507 total):**
```
GET https://wfdapi.edenireland.ie/api/areaforaction
GET https://wfdapi.edenireland.ie/api/areaforaction?chariteration=CI000002&type=2
GET https://wfdapi.edenireland.ie/api/areaforaction/search?name=adr&chariteration=CI000002&type=1
```

### 5.2 Dashboard/Chart Endpoints

These provide pre-aggregated data for UI rendering. `{period}` is a GUID from `/api/charts/periods`, `{type}` is `national`, `catchment`, `subcatchment`, or `localauthority`, `{id}` is the relevant code.

```
GET /api/charts/catchments
GET /api/charts/subcatchments
GET /api/charts/localauthorities
GET /api/charts/periods
GET /api/charts/period/default
GET /api/charts/chariterations
GET /api/charts/waterbody/totals/{period}/{type}/{id}
GET /api/charts/waterbodyqualitystatus/totals/{period}/{type}/{id}
GET /api/charts/waterbodyqualitystatus/totals/all/{period}/{type}/{id}
GET /api/charts/waterbodyqualitystatus/high/totals/{period}/{type}/{id}
GET /api/charts/waterbody/risk/totals/{period}/{type}/{id}
GET /api/charts/waterqualitystatus/{period}/{type}/{id}
GET /api/charts/waterqualitystatus/all/{period}/{type}/{id}
GET /api/charts/waterqualitystatus/trends/{wbtype}/{type}/{id}
GET /api/charts/wfdrisk/bywbtype/{period}/{type}/{id}
GET /api/charts/wfdrisk/bystatus/{period}/{wbtype}/{type}/{id}
GET /api/charts/pressure/bycategories/{period}/{wbtype}/{type}/{high}/{id}
GET /api/charts/pressure/byimpact/{period}/{wbtype}/{type}/{high}/{id}
GET /api/charts/envobjectives/{period}/{wbtype}/{type}/{envtype}/{high}/{id}
GET /api/charts/paobjectives/totals/{period}/{type}/{id}
GET /api/charts/waterbody/count/{period}
GET /api/charts/highstatusobjective/{wbtype}/{type}/{id}
GET /api/charts/subcatchments/assessment/{id}
```

### 5.3 EPA GeoServer WFS

**Get River Waterbody Status 2019–2024 as GeoJSON (1 feature):**
```
GET https://gis.epa.ie/geoserver/EPA/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=EPA:WFD_RWBStatus_20192024&count=1&outputFormat=application%2Fjson
```

Response includes `MultiLineString` geometry with `European_Code`, `Name`, `Status` ("Good"/"Moderate"/"Poor"/"Bad"/"High"), `Assessment Technique`, `Period_for_WFD_Status`.

### 5.4 Bathing Water API

```
GET https://data.epa.ie/bw/api/v1/locations?page=1&per_page=5    # 241 total locations
GET https://data.epa.ie/bw/api/v1/measurements?page=1&per_page=5
GET https://data.epa.ie/bw/api/v1/alerts
```

### 5.5 curl Example

```bash
curl -s "https://wfdapi.edenireland.ie/api/catchment" | python3 -m json.tool
```

Sample response:
```json
{
  "Count": 46,
  "Catchments": [
    {
      "Code": "01",
      "Name": "Foyle",
      "GeometryExtent": "187320,371280,240217,418080",
      "LastCycleApproved": "WFD Cycle 3"
    },
    {
      "Code": "16",
      "Name": "Suir",
      "GeometryExtent": "176620,101660,269300,182160",
      "LastCycleApproved": "WFD Cycle 3"
    }
  ]
}
```

---

## 6. Operational Constraints

### Rate Limits

No rate limits formally documented. Empirical testing:
- Three consecutive requests: 146–198ms each, all HTTP 200
- Server sets `Cache-Control: max-age=1800` (30 minutes) on catchment responses
- Server: Microsoft IIS/8.5, ASP.NET 4.x
- **Recommendation:** Cache client-side, avoid polling faster than every 30 minutes. WFD data changes annually at most — daily/weekly refresh is sufficient.

### CORS

| API | CORS Status |
|-----|-------------|
| WFD REST API | `Access-Control-Allow-Origin: *` — full browser access |
| EPA GeoServer WFS | `Access-Control-Allow-Origin: *` — full browser access |
| Bathing Water API | No CORS headers — requires server-side proxy |

### IP / Domain Restrictions

None. No API key means no mechanism for IP or domain binding.

### Response Formats

| API | Format |
|-----|--------|
| WFD REST API | JSON only (`application/json; charset=utf-8`) |
| GeoServer WFS | GeoJSON, GML, Shapefile, CSV, XML. Specify via `outputFormat` param. |

### Coordinate Systems

WFS data defaults to Irish Grid (EPSG:29902). Add `srsName=EPSG:4326` for WGS84 (lat/lon).

### Data Freshness

- WFD status assessments: ~3-year cycles (current: Cycle 3, 2022–2027)
- Status periods available: SW 2007-2009, SW 2010-2012, SW 2010-2015, SW 2013-2018, SW 2016-2021, SW 2019-2024
- Monitoring iterations: IEMP2019-2021, IEMP2022-2024, IEMP2025-2027
- Areas for Action: progress updates may change more frequently

### Known Quirks

- No OpenAPI/Swagger JSON spec file (`/swagger/docs/v1` returns 404). Only the Swagger UI at `/docs/index`.
- HEAD requests return 401 (IIS quirk, not actual auth) — only GET works.
- Chart endpoints require GUID-based `{period}` values from `/api/charts/periods`.

---

## 7. Related APIs and Alternative Data Sources

### EPA Open Data APIs (all unauthenticated)

| API | Base URL | Docs |
|-----|----------|------|
| WFD Open Data | `https://wfdapi.edenireland.ie/api/` | https://wfdapi.edenireland.ie/docs/index |
| Bathing Water | `https://data.epa.ie/bw/api/v1/` | https://data.epa.ie/bw/swagger/ |
| Radiation Monitoring | See data.epa.ie | Via data.epa.ie API list |
| Medium Combustion Plant | See data.epa.ie | Via data.epa.ie API list |
| Environmental Performance | See data.epa.ie | Via data.epa.ie API list |
| LEAP (Licence & Enforcement) | See data.epa.ie | Via data.epa.ie API list |
| Extractive Industries | See data.epa.ie | Via data.epa.ie API list |

### EPA GeoServer WFS — Key WFD Layers (207 WFD layers total)

**Waterbody layers (by cycle):**
- `EPA:WFD_RIVERWATERBODIES_CYCLE3`, `EPA:WFD_LAKEWATERBODIES_CYCLE3`, `EPA:WFD_GROUNDWATERBODIES_CYCLE3`, `EPA:WFD_COASTALWATERBODIES_CYCLE3`, `EPA:WFD_TRANSITIONALWATERBODIES_CYCLE3`, `EPA:WFD_CanalWaterbodies_Cycle3`

**Status layers (by period):**
- `EPA:WFD_RWBStatus_20192024` (latest), `EPA:WFD_RWBStatus_20162021`, `EPA:WFD_CWBStatus_20192024`, `EPA:CWB_WFD_LatestStatus`

**Risk layers:**
- `EPA:WFD_RWB_ApprovedRisk_Cycle3`, `EPA:WFD_CWB_ApprovedRisk_Cycle3`, `EPA:WFD_RiverWaterbodyRiskScore`, `EPA:WFD_CoastalWaterbodyRiskScore`

**Agriculture-relevant pressure layers:**
- `EPA:WFD_RWB_Pressures_Agriculture` — agriculture pressure on rivers
- `EPA:WFD_RWB_Pressures_Forestry` — forestry pressure
- `EPA:WFD_RWB_Pressures_Domestic_Waste_Water` — domestic wastewater
- `EPA:WFD_RWB_Pressures_Hydromorphology` — hydromorphology
- `EPA:WFD_RWB_Pressures_Abstractions` — water abstraction
- `EPA:WFD_RWB_Pressures_Aquaculture` — aquaculture
- `EPA:WFD_RWB_Pressures_Invasive_Species` — invasive species

**Protected areas:**
- `EPA:WFD_RPA_BATHINGWATERAREAS`, `EPA:WFD_RPA_DRINKINGWATER_GWB`, `EPA:WFD_RPA_DRINKINGWATER_RWB`, `EPA:WFD_RPA_DRINKINGWATER_SWB`, `EPA:WFD_RIVERBASINDISTRICT`, `EPA:WFD_CATCHMENTPROJECTS`

### catchments.ie

https://www.catchments.ie/ consumes the same WFD API. Developer resources at https://www.catchments.ie/open-data-developer-resources/ with additional links:
- **Hydronet:** https://www.epa.ie/hydronet/ — EPA hydrometric station data
- **Biological River Quality:** https://www.epa.ie/QValue/webusers/ — Q-value monitoring
- **1st Cycle Archive:** https://www.catchments.ie/download-category/1stcycle20092015/

### data.gov.ie

WFD datasets catalogued under EPA publisher:
```
https://data.gov.ie/dataset?q=water+framework+directive&organization=environmental-protection-agency
```

---

## 8. Contacts

| Contact | Details |
|---------|---------|
| WFD API developer | hello@catchments.ie |
| EPA GIS team | gis@edenireland.ie |
| EPA general | info@epa.ie |
| EPA phone | +353 53 916 0600 |
| EPA Lo Call | 0818 335 599 |
| EPA address | PO Box 3000, Johnstown Castle Estate, Co. Wexford, Y35 W821 |
| data.epa.ie contact | https://data.epa.ie/contact/ |

---

## 9. Recommendations for Farm Dashboard

1. **WFD REST API as primary** for water quality status, catchment info, risk assessments, pressures data. Well-structured JSON, supports CORS.

2. **EPA GeoServer WFS for spatial overlays** — `WFD_RWB_Pressures_Agriculture` is directly relevant. Request in GeoJSON, convert from Irish Grid (EPSG:29902) to WGS84 for MapLibre.

3. **Cache aggressively.** WFD data updates on multi-year cycles. Daily/weekly refresh via Python pipeline (Polars + DuckDB) → Parquet on R2 is sufficient.

4. **Proxy the Bathing Water API** — no CORS headers. WFD REST API and GeoServer WFS can be called directly from browser.

5. **No API key management needed.** No secrets, no rotation, no environment variables for EPA access.

---

## Sources

- https://data.epa.ie/api-list/wfd-open-data/
- https://wfdapi.edenireland.ie/docs/index
- https://www.catchments.ie/open-data-developer-resources/
- https://gis.epa.ie/GetData/Connect
- https://data.epa.ie/api-list/
- https://data.epa.ie/open-data-and-developer-resources/
- https://data.epa.ie/bw/swagger/v1/swagger.json
- https://gis.epa.ie/geoserver/EPA/wfs?service=WFS&version=2.0.0&request=GetCapabilities
