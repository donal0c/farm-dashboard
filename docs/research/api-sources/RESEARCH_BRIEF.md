# API Source Research Brief (Parallel Agent)

## Output location
Put all research docs in this folder:
- `/Users/donalocallaghan/workspace/vibes/farm-dashboard/docs/research/api-sources/`

## Required output files
1. `source-matrix.md`
2. `wfd-api-key-onboarding.md`
3. `fallback-options.md`
4. `method-notes.md`

## Research scope (exact)

### 1) Source matrix deep validation
For each source below, provide:
- Official docs URL
- Contact/support channel (if available)
- Auth model: public / API key / OAuth / unknown
- CORS behavior: permissive / restrictive / inconsistent
- HTTPS status: fully HTTPS / HTTP-only / mixed
- Rate limit policy: explicit headers/docs vs unspecified
- Data freshness/update cadence (if documented)
- Reliability signals: uptime/status page/changelog/recent deprecations
- Terms/licensing for production use
- Recommendation: `use-direct`, `use-via-proxy`, `avoid`, or `backup-only`

Sources:
- CSO PxStat
- Met Eireann agriculture report API
- Met Eireann observations API
- Met Eireann warning JSON feed
- OPW water levels (waterlevel.ie)
- DAFM GeoAPI / LPIS datasets
- DAFM CAP JSON
- Marine Institute ERDDAP
- EPA GeoServer WMS/WFS
- EPA WFD API
- Tailte Eireann ArcGIS services
- GSI ArcGIS services

### 2) EPA WFD API key onboarding
Produce a practical guide with:
- Exact signup/request path for key access
- Required organization details (if any)
- Approval lead-time expectations
- Sandbox/testing access availability
- Example authenticated request (if docs provide one)
- Operational constraints (rate limits, allowed domains, IP allowlist)

### 3) Fallback dataset options
For each problematic source class below, propose 2-3 alternatives with pros/cons:
- CORS-blocked but otherwise live
- HTTP-only endpoints blocked in HTTPS apps
- Endpoints with brittle/undocumented paths
- Large payload endpoints unsuitable for direct browser use

Include migration notes:
- Schema compatibility vs our expected farm dashboard needs
- Effort estimate: low/medium/high

### 4) Method notes and evidence
In `method-notes.md`, include:
- Date/time of verification (UTC)
- Commands used (`curl` and browser method)
- Whether result came from docs, live test, or inference
- Any unresolved uncertainty

## Acceptance criteria for research handoff
- Every source has a recommendation category.
- EPA WFD onboarding is actionable (not just “contact provider”).
- At least one fallback exists per problematic class.
- Claims are linked to official docs where possible.
