const DEFAULT_TIMEOUT_MS = 15_000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function categoryCodes(dataset, dimension) {
  const index = dataset?.dimension?.[dimension]?.category?.index;
  if (Array.isArray(index)) return index;
  if (index && typeof index === "object") return Object.keys(index);
  return [];
}

async function fetchChecked(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent":
        "AgriView source-contract monitor (https://github.com/donal0c/farm-dashboard)",
      ...options.headers,
    },
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });
  assert(response.ok, `HTTP ${response.status}`);
  return response;
}

async function checkJson(name, url, validate) {
  try {
    const startedAt = performance.now();
    const response = await fetchChecked(url);
    const payload = await response.json();
    await validate(payload, response);
    return {
      name,
      status: "PASS",
      durationMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    if (error && typeof error === "object") error.checkName = name;
    throw error;
  }
}

const galway = {
  latitude: 53.2744,
  longitude: -9.0491,
  lpisBbox: "-9.1291,53.1944,-8.9691,53.3544",
  wfdBbox: "-9.2,53.1,-8.9,53.4,EPSG:4326",
};

const checks = [
  () =>
    checkJson(
      "Met Éireann warnings",
      "https://www.met.ie/Open_Data/json/warning_IRELAND.json",
      (payload) => {
        assert(Array.isArray(payload), "expected an array");
        if (!payload.length) return;
        const warning = payload[0];
        assert(typeof warning.headline === "string", "headline is missing");
        assert(typeof warning.expiry === "string", "expiry is missing");
        assert(
          Number.isFinite(Date.parse(warning.expiry)),
          "expiry is not an ISO date",
        );
      },
    ),
  () =>
    checkJson(
      "Open-Meteo forecast",
      `https://api.open-meteo.com/v1/forecast?latitude=${galway.latitude}&longitude=${galway.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max&timezone=Europe%2FDublin&forecast_days=2`,
      (payload) => {
        assert(
          payload?.daily_units?.precipitation_sum === "mm",
          "rain unit drifted",
        );
        assert(
          payload?.daily_units?.wind_gusts_10m_max === "km/h",
          "gust unit drifted",
        );
        assert(payload?.daily?.time?.length === 2, "daily rows are missing");
        assert(
          payload.daily.time.length === payload.daily.precipitation_sum?.length,
          "daily arrays have different lengths",
        );
      },
    ),
  () =>
    checkJson(
      "OPW current water levels",
      "https://waterlevel.ie/geojson/latest/",
      (payload) => {
        assert(payload?.type === "FeatureCollection", "expected GeoJSON");
        const level = payload.features?.find(
          (feature) => feature?.properties?.sensor_ref === "0001",
        );
        assert(level, "water-level sensor 0001 is missing");
        assert(level.geometry?.type === "Point", "station geometry drifted");
        assert(
          Number.isFinite(Number(level.properties.value)),
          "water-level value is not numeric",
        );
        assert(
          Number.isFinite(Date.parse(level.properties.datetime)),
          "observation time is invalid",
        );
      },
    ),
  () =>
    checkJson(
      "DAFM LPIS 2024",
      `https://geoapi.opendata.agriculture.gov.ie/shps/collections/anonymous-lpis-data-for-2024_2024-lpis-data/items?f=json&bbox=${galway.lpisBbox}&limit=2`,
      (payload) => {
        assert(payload?.type === "FeatureCollection", "expected GeoJSON");
        const properties = payload.features?.[0]?.properties;
        assert(properties, "no reference parcel was returned");
        for (const key of ["PAR_LAB", "CROP", "DIGITISED", "CLAIM_AREA"]) {
          assert(key in properties, `parcel field ${key} is missing`);
        }
      },
    ),
  () =>
    checkJson(
      "DAFM nitrates catalogue",
      "https://geoapi.opendata.agriculture.gov.ie/nitrates/collections?f=json",
      (payload) => {
        const current = payload?.collections?.find((collection) =>
          /nitrate|derogation/i.test(
            `${collection?.id ?? ""} ${collection?.title ?? ""}`,
          ),
        );
        assert(current?.id, "no current nitrates collection was found");
        assert(
          /2025/.test(`${current.id} ${current.title ?? ""}`),
          "expected the maintained 2025 collection",
        );
      },
    ),
  () =>
    checkJson(
      "EPA WFD river status",
      `https://gis.epa.ie/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=EPA%3AWFD_RWBStatus_20192024&outputFormat=application%2Fjson&srsName=EPSG%3A4326&bbox=${encodeURIComponent(galway.wfdBbox)}&maxFeatures=2&propertyName=European_Code%2CName%2CStatus%2CPeriod_for_WFD_Status`,
      (payload) => {
        assert(payload?.type === "FeatureCollection", "expected GeoJSON");
        const properties = payload.features?.[0]?.properties;
        assert(properties, "no reference waterbody was returned");
        for (const key of [
          "European_Code",
          "Name",
          "Status",
          "Period_for_WFD_Status",
        ]) {
          assert(key in properties, `waterbody field ${key} is missing`);
        }
      },
    ),
  () =>
    checkJson(
      "DAFM nitrate screening items",
      "https://geoapi.opendata.agriculture.gov.ie/nitrates/collections/dafm-national-maximum-nitrates-derogation-stocking-rate-limits-map-for-2025_maximum-nitrates-derogation-stocking-rate-limits-m/items?f=json&bbox=-9.2491,53.0744,-8.8491,53.4744&limit=2&skipGeometry=true&properties=STK_RATE,SDO_GID",
      (payload) => {
        assert(payload?.type === "FeatureCollection", "expected GeoJSON");
        const feature = payload.features?.[0];
        assert(feature, "no screening feature was returned");
        assert(feature.geometry === null, "geometry was not omitted");
        assert(
          typeof feature.properties?.STK_RATE === "string",
          "stocking-rate label is missing",
        );
      },
    ),
  ...["AEA01", "AHM05"].map(
    (dataset) => () =>
      checkJson(
        `CSO ${dataset}`,
        `https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/${dataset}/JSON-stat/2.0/en`,
        (payload) => {
          assert(payload?.class === "dataset", "expected JSON-stat dataset");
          assert(Array.isArray(payload.id), "dimension ids are missing");
          assert(Array.isArray(payload.value), "value array is missing");
          const expectedStatistic =
            dataset === "AEA01" ? "AEA01C28" : "AHM05C01";
          assert(
            categoryCodes(payload, "STATISTIC").includes(expectedStatistic),
            `statistic ${expectedStatistic} is missing`,
          );
          if (dataset === "AHM05") {
            const commodities = categoryCodes(payload, "C02818V03389");
            for (const code of ["011", "01211", "01213", "01221"]) {
              assert(
                commodities.includes(code),
                `commodity ${code} is missing`,
              );
            }
          }
        },
      ),
  ),
  async () => {
    const name = "DAFM CAP beneficiaries 2025";
    try {
      const startedAt = performance.now();
      const response = await fetchChecked(
        "https://capben-ui.apps.services.agriculture.gov.ie/assets/capben/2025.json",
        { method: "HEAD" },
      );
      assert(
        response.headers.get("content-type")?.includes("application/json"),
        "content type is not JSON",
      );
      assert(
        response.headers.get("etag") || response.headers.get("last-modified"),
        "no cache validator is present",
      );
      return {
        name,
        status: "PASS",
        durationMs: Math.round(performance.now() - startedAt),
      };
    } catch (error) {
      if (error && typeof error === "object") error.checkName = name;
      throw error;
    }
  },
];

const results = [];
for (const run of checks) {
  try {
    results.push(await run());
  } catch (error) {
    results.push({
      name:
        error && typeof error === "object" && "checkName" in error
          ? String(error.checkName)
          : `check ${results.length + 1}`,
      status: "FAIL",
      durationMs: 0,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

console.table(results);
const failures = results.filter((result) => result.status === "FAIL");
if (failures.length) {
  console.error(
    `\n${failures.length} source contract${failures.length === 1 ? "" : "s"} failed.`,
  );
  process.exitCode = 1;
} else {
  console.log(`\nAll ${results.length} source contracts passed.`);
}
