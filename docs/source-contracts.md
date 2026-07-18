# Source contracts and reliability

Last reconciled: 18 July 2026.

| Source | Product use | Scope | Ingestion policy | Known boundary |
| --- | --- | --- | --- | --- |
| Open-Meteo | Seven-day priorities and Conditions | Saved point, estimated | Validate daily arrays and units; cache near forecast cadence | Model output is not observed field weather |
| Met Éireann | Active warning priority and Conditions | National/regional, authoritative | Drop expired notices; retain issue/expiry/source | Warning geography still needs local interpretation |
| DAFM LPIS 2024 | Nearby parcel reference | Nearby, authoritative dataset | Fixed maintained collection; bypass the oversized raw cache; normalize to stable browser fields; cache the compact route response for 24h | Does not prove ownership or holding boundary; the API caps a request at 500 features |
| DAFM nitrates 2025 | Screening layer and labels | Nearby, authoritative dataset | Discover maintained catalogue collection; validate GeoJSON; 24h cache | Map intersections are not a holding calculation |
| EPA WFD 2019–2024 | Nearby waterbody status | Nearby, authoritative dataset | Fixed river/groundwater layers; lon/lat bbox; 24h cache | Classification belongs to waterbodies, not the farm |
| OPW waterlevel.ie | Nearby current water levels | Sensor location, authoritative | Keep sensor `0001`, metres, valid dates/coordinates, and republication range; 15m cache | No inferred station flood threshold or farm impact |
| DAFM CAP 2025 | County beneficiary/payment context | County, authoritative | Fetch large annual file server-side; aggregate and cache | Not an entitlement or farm-payment estimate |
| CSO AEA01 | Enterprise output context | National, authoritative | Allowlisted dataset and statistic; preserve Euro Million | Lagged national output is not farm income |
| CSO AHM05 | Enterprise output-price direction | National, authoritative | Load only for a specific enterprise; preserve index unit | Not a sale price or trading signal |
| Routing-key index | Setup map centring | Approximate | Curated local index; manual pin required | Not an official or full-Eircode geocoder |
| 2026 DAFM dates | Calendar watchlist | Scheme-specific | Manually verified primary links with published date and applicability | Not a universal compliance calendar |

## Drift detection

Run:

```bash
npm run check:sources
```

The checker validates ten live upstream contracts:

- expected response type;
- critical fields and dataset codes;
- units and array alignment;
- maintained collection presence;
- water-level sensor semantics;
- cache validators for the large CAP payload.

It writes no state and does not auto-repair a failure. GitHub Actions runs it
weekly and on demand. A failure should be investigated at the ingestion
boundary before any UI workaround is considered.

For the application boundary, run a production build locally and then:

```bash
ROUTE_CHECK_BASE_URL=http://localhost:3001 npm run check:routes
```

This verifies every product page, each app API response shape and provenance
envelope, and the invalid-coordinate guard. An upstream may return an explicit
`unavailable` snapshot with HTTP 502; that is a valid degraded contract, not a
silent fallback.

## Deliberate omissions

- No static demo or sample values.
- No automatic full-Eircode claim.
- No biodiversity layer without a maintained redistribution path and recurring
  farmer decision.
- No OPW flood categorisation without station-specific thresholds.
- No AI-generated advice.
