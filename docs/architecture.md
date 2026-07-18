# AgriView architecture

## Product boundary

AgriView is built around one recurring job:

> Help a farmer decide what deserves attention this week, then make the evidence
> and uncertainty easy to inspect.

The weekly brief is the centre. Land, conditions, calendar, markets, and
environment are evidence-led drill-downs. A source is not a product feature
until it changes a recurring decision safely.

## Request and trust flow

```text
official public source
  -> Next.js route handler
  -> source-specific validation and normalization
  -> SourceSnapshot<T>
  -> TanStack Query
  -> deterministic rule or scoped drill-down
  -> source/evidence disclosure
```

The ingestion boundary owns:

- endpoint selection and allowlisting;
- coordinate and radius validation;
- source-specific schema checks;
- units and date parsing;
- caching at the source’s natural cadence;
- scope, confidence, freshness, and warning metadata;
- explicit unavailable responses.

The UI owns presentation and interaction. It must not independently guess units,
repair schemas, relabel scope, or manufacture fallbacks.

## Location model

Setup can search a curated Irish routing-key index to centre the map. That result
is approximate. The user’s manual pin is persisted locally and becomes the one
coordinate used by the forecast, land, OPW, EPA, and DAFM routes.

The profile contains:

- manual coordinate;
- routing key and county for labelling and county-level context;
- main enterprise;
- the week’s current focus.

There is no server-side user profile.

## Caching and upstream protection

- Open-Meteo and Met Éireann: cached near their update cadence.
- OPW: 15-minute route revalidation.
- DAFM LPIS: the oversized raw payload bypasses Next’s 2 MB data cache,
  is normalized to seven stable properties, then the smaller route response is
  cached for 24 hours with stale-while-revalidate.
- DAFM nitrates and EPA WFD: 24-hour route revalidation after geometry/property
  projection keeps browser payloads compact.
- CAP: the large annual payload is parsed and aggregated once per cache window;
  clients receive county aggregates, never the raw beneficiary file.
- CSO: clients load only AEA01 and, for a specific enterprise, AHM05.

This prevents repeated UI-level repair and avoids multiplying calls to fragile
public services.

## Degraded-state policy

`SourceSnapshot<T>` distinguishes `live`, `cached`, `partial`, `stale`, and
`unavailable`. `partial` means validated rows remain usable but incomplete rows
were excluded; it is never labelled current. AgriView does not ship sample
fallbacks.

An unavailable source:

- does not become a numeric zero;
- does not silently use a static extract;
- cannot produce a decision priority that depends on its missing value;
- retains the official source and a useful warning when possible.

Transient upstream requests may make one bounded retry for timeout, transport,
408, 425, 429, or 5xx responses. `Retry-After` is respected with a two-second
cap; contract failures and ordinary 4xx responses are never retried. Next/Vercel
cache revalidation is the current last-known-good mechanism. There is no durable
cross-deployment source cache, and the UI must not imply otherwise.

## Why there is no AI layer

The current useful work is explainable thresholding, ordering, and evidence
retrieval. A language model would add variability without supplying missing
field context or legal authority. AI becomes justified only if a validated
farmer workflow needs interpretation of user-owned documents or a natural
language evidence query that deterministic code cannot handle safely.

## Release shape

Coherent implementation chunks are committed and preview-deployed. Production
promotion remains a separate approval. Source-contract drift checks are
report-only; they detect upstream changes but do not mutate source configuration
or silently select replacements.
