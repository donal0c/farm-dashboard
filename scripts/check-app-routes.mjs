#!/usr/bin/env node

const baseUrl = process.env.ROUTE_CHECK_BASE_URL ?? "http://localhost:3000";

const pageRoutes = [
  "/this-week",
  "/my-land",
  "/weather-water",
  "/calendar",
  "/markets-income",
  "/environment-compliance",
];

const snapshotRoutes = [
  "/api/data/forecast?lat=53.2744&lng=-9.0491",
  "/api/data/met/warnings",
  "/api/data/opw/nearby?lat=53.2744&lng=-9.0491",
  "/api/data/lpis?lat=53.2744&lng=-9.0491",
  "/api/data/nitrates?lat=53.2744&lng=-9.0491",
  "/api/data/epa/wfd-status?lat=53.2744&lng=-9.0491",
  "/api/data/cap-summary?county=Galway",
];

const directJsonRoutes = [
  {
    path: "/api/data/geocode?q=H91",
    validate: (payload) =>
      Number.isFinite(payload.latitude) && Number.isFinite(payload.longitude),
    expectation: "finite latitude and longitude",
  },
  {
    path: "/api/data/cso/AEA01",
    validate: (payload) =>
      payload.class === "dataset" && Array.isArray(payload.value),
    expectation: "a JSON-stat dataset",
  },
  {
    path: "/api/data/cso/AHM05",
    validate: (payload) =>
      payload.class === "dataset" && Array.isArray(payload.value),
    expectation: "a JSON-stat dataset",
  },
];

const validSnapshotStatuses = new Set([
  "live",
  "cached",
  "stale",
  "unavailable",
]);

function routeUrl(path) {
  return new URL(path, baseUrl).toString();
}

async function fetchWithDeadline(path, timeoutMs = 20_000) {
  return fetch(routeUrl(path), {
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function checkPage(path) {
  const response = await fetchWithDeadline(path);
  const body = await response.text();
  assert(response.status === 200, `${path} returned HTTP ${response.status}`);
  assert(
    response.headers.get("content-type")?.includes("text/html"),
    `${path} did not return HTML`,
  );
  assert(body.includes("<main"), `${path} did not render a main landmark`);
  return `${path} -> page contract`;
}

async function checkSnapshot(path) {
  const response = await fetchWithDeadline(path, 30_000);
  const payload = await response.json();
  assert(
    validSnapshotStatuses.has(payload.status),
    `${path} returned an invalid SourceSnapshot status`,
  );
  assert(
    response.status === (payload.status === "unavailable" ? 502 : 200),
    `${path} returned HTTP ${response.status} for ${payload.status}`,
  );
  assert(
    typeof payload.source?.id === "string" &&
      typeof payload.source?.label === "string" &&
      typeof payload.source?.url === "string",
    `${path} omitted normalized source metadata`,
  );
  assert(
    typeof payload.fetchedAt === "string" &&
      typeof payload.staleAfter === "string" &&
      typeof payload.scope === "string" &&
      typeof payload.confidence === "string",
    `${path} omitted provenance or freshness metadata`,
  );
  if (payload.status === "unavailable") {
    assert(
      payload.data === null && typeof payload.warning === "string",
      `${path} did not expose an honest unavailable state`,
    );
  }
  return `${path} -> ${payload.status}`;
}

async function checkDirectJson({ path, validate, expectation }) {
  const response = await fetchWithDeadline(path);
  const payload = await response.json();
  assert(response.status === 200, `${path} returned HTTP ${response.status}`);
  assert(validate(payload), `${path} did not return ${expectation}`);
  return `${path} -> ${expectation}`;
}

async function checkInvalidCoordinateGuard() {
  const path = "/api/data/forecast?lat=0&lng=0";
  const response = await fetchWithDeadline(path);
  const payload = await response.json();
  assert(response.status === 400, `${path} did not reject invalid coordinates`);
  assert(
    typeof payload.error === "string",
    `${path} did not return an explanatory error`,
  );
  return `${path} -> rejected with HTTP 400`;
}

async function main() {
  const results = [];

  for (const path of pageRoutes) {
    results.push(await checkPage(path));
  }
  for (const path of snapshotRoutes) {
    results.push(await checkSnapshot(path));
  }
  for (const route of directJsonRoutes) {
    results.push(await checkDirectJson(route));
  }
  results.push(await checkInvalidCoordinateGuard());

  console.log(`App route contracts passed against ${baseUrl}`);
  for (const result of results) {
    console.log(`  ✓ ${result}`);
  }
}

main().catch((error) => {
  console.error(`App route contract failed: ${error.message}`);
  process.exitCode = 1;
});
