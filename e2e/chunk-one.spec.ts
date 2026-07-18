import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const routes = [
  "/this-week",
  "/my-land",
  "/weather-water",
  "/calendar",
  "/markets-income",
  "/environment-compliance",
  "/methodology",
] as const;

const farm = {
  latitude: 53.2812,
  longitude: -9.0464,
  label: "GALWAY",
  routingKey: "H91",
  county: "GALWAY",
  precision: "manual-pin",
} as const;

const source = {
  id: "test-source",
  label: "Test source",
  url: "https://example.com/source",
};

function snapshot(
  data: unknown,
  options: {
    status?: "live" | "cached" | "partial" | "unavailable";
    scope?: "farm" | "nearby" | "county" | "regional" | "national";
    warning?: string | null;
  } = {},
) {
  const status = options.status ?? "live";
  return {
    data,
    source,
    scope: options.scope ?? "farm",
    status,
    observedAt: "2026-07-18T08:00:00.000Z",
    fetchedAt: "2026-07-18T08:05:00.000Z",
    staleAfter: "2026-07-19T08:45:00.000Z",
    warning:
      options.warning ??
      (status === "unavailable" ? "Source temporarily unavailable." : null),
    confidence: "authoritative",
  };
}

const forecast = snapshot({
  timezone: "Europe/Dublin",
  latitude: farm.latitude,
  longitude: farm.longitude,
  days: Array.from({ length: 7 }, (_, index) => ({
    date: `2026-07-${18 + index}`,
    weatherCode: index === 3 ? 61 : 1,
    temperatureMaxC: 18 + (index % 2),
    temperatureMinC: 9,
    rainMm: index === 3 ? 7 : 0.4,
    precipitationProbability: index === 3 ? 80 : 15,
    windGustKph: 22 + index,
  })),
});

function forecastFor(rain: number[], gusts: number[]) {
  return {
    timezone: "Europe/Dublin",
    latitude: farm.latitude,
    longitude: farm.longitude,
    days: rain.map((rainMm, index) => ({
      date: `2026-07-${18 + index}`,
      weatherCode: rainMm > 0 ? 61 : 1,
      temperatureMaxC: 18 + (index % 3),
      temperatureMinC: 9,
      rainMm,
      precipitationProbability: rainMm > 0 ? 80 : 10,
      windGustKph: gusts[index] ?? 20,
    })),
  };
}

const emptyFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const emptyJsonStat = {
  class: "dataset" as const,
  id: ["STATISTIC", "TLIST(A1)"],
  size: [1, 1],
  dimension: {
    STATISTIC: { category: { index: ["NO_MATCH"] } },
    "TLIST(A1)": {
      category: { index: ["2025"], label: { "2025": "2025" } },
    },
  },
  value: [null],
};

function csoDataset(dataset: "AEA01" | "AHM05") {
  if (dataset === "AEA01") {
    const statistics = [
      "AEA01C02",
      "AEA01C08",
      "AEA01C04",
      "AEA01C10",
      "AEA01C28",
    ];
    const years = ["2023", "2024", "2025"];
    return {
      class: "dataset" as const,
      id: ["STATISTIC", "C02196V02652", "TLIST(A1)"],
      size: [statistics.length, 1, years.length],
      dimension: {
        STATISTIC: { category: { index: statistics } },
        C02196V02652: { category: { index: ["-"] } },
        "TLIST(A1)": {
          category: {
            index: years,
            label: Object.fromEntries(years.map((year) => [year, year])),
          },
        },
      },
      value: statistics.flatMap((_, index) => [
        2_000 + index * 2_500,
        2_120 + index * 2_600,
        2_250 + index * 2_700,
      ]),
    };
  }

  const commodities = ["01211", "01221", "01213", "011"];
  const periods = ["202501", "202502", "202503", "202504"];
  return {
    class: "dataset" as const,
    id: ["STATISTIC", "C02818V03389", "TLIST(M1)"],
    size: [1, commodities.length, periods.length],
    dimension: {
      STATISTIC: { category: { index: ["AHM05C01"] } },
      C02818V03389: { category: { index: commodities } },
      "TLIST(M1)": {
        category: {
          index: periods,
          label: {
            "202501": "January 2025",
            "202502": "February 2025",
            "202503": "March 2025",
            "202504": "April 2025",
          },
        },
      },
    },
    value: commodities.flatMap((_, index) => [
      108 + index,
      109 + index,
      108.5 + index,
      111 + index,
    ]),
  };
}

async function setSavedFarm(
  page: Page,
  profile: {
    enterprise?: "dairy" | "beef" | "sheep" | "tillage" | "mixed";
    weekFocus?: "grazing" | "nutrients" | "spraying" | "sales" | "compliance";
    theme?: "light" | "dark";
    farmLabel?: string;
    routingKey?: string;
  } = {},
) {
  await page.addInitScript(
    ({ savedFarm, savedProfile }) => {
      window.localStorage.setItem(
        "agriview-farm-profile-v1",
        JSON.stringify({
          state: {
            enterprise: savedProfile.enterprise ?? "mixed",
            weekFocus: savedProfile.weekFocus ?? "grazing",
            farmCounty: savedFarm.county,
            farmLocation: {
              ...savedFarm,
              label: savedProfile.farmLabel ?? savedFarm.label,
              routingKey: savedProfile.routingKey ?? savedFarm.routingKey,
            },
            preferredOpwStation: null,
          },
          version: 0,
        }),
      );
      if (savedProfile.theme) {
        window.localStorage.setItem("theme", savedProfile.theme);
      }
    },
    { savedFarm: farm, savedProfile: profile },
  );
}

type LandState = "live" | "empty" | "capped" | "unavailable" | "transport";
type WarningState = "empty" | "unavailable";
type ForecastState = "live" | "partial" | "unavailable";
type OpwState = "live" | "empty" | "unavailable";
type SupportingState = "live" | "empty" | "unavailable";

async function installApiMocks(
  page: Page,
  options: {
    land?: LandState;
    warnings?: WarningState;
    forecastState?: ForecastState;
    forecastData?: (typeof forecast)["data"];
    warningData?: unknown[];
    warningStatus?: "live" | "partial";
    forecastDelayMs?: number;
    apiDelayMs?: number;
    opw?: OpwState;
    environment?: SupportingState;
    markets?: SupportingState;
  } = {},
) {
  const land = options.land ?? "live";
  const warnings = options.warnings ?? "empty";
  const forecastState = options.forecastState ?? "live";
  const opw = options.opw ?? "empty";
  const environment = options.environment ?? "empty";
  const markets = options.markets ?? "empty";
  await page.route("**/api/data/**", async (route) => {
    const url = new URL(route.request().url());
    if (options.apiDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.apiDelayMs));
    }

    if (url.pathname === "/api/data/forecast") {
      if (options.forecastDelayMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, options.forecastDelayMs),
        );
      }
      if (forecastState === "unavailable") {
        await route.fulfill({
          status: 502,
          json: snapshot(null, { status: "unavailable" }),
        });
        return;
      }
      await route.fulfill({
        json: snapshot(options.forecastData ?? forecast.data, {
          status: forecastState,
          warning:
            forecastState === "partial"
              ? "Two incomplete forecast days were excluded."
              : null,
        }),
      });
      return;
    }
    if (url.pathname === "/api/data/met/warnings") {
      if (warnings === "unavailable") {
        await route.fulfill({
          status: 502,
          json: snapshot(null, {
            status: "unavailable",
            scope: "national",
          }),
        });
        return;
      }
      await route.fulfill({
        json: snapshot(options.warningData ?? [], {
          scope: "national",
          status: options.warningStatus ?? "live",
          warning:
            options.warningStatus === "partial"
              ? "One warning record was excluded."
              : null,
        }),
      });
      return;
    }
    if (url.pathname === "/api/data/lpis") {
      if (land === "transport") {
        await route.abort("failed");
        return;
      }
      if (land === "unavailable") {
        await route.fulfill({
          status: 502,
          json: snapshot(null, { status: "unavailable", scope: "nearby" }),
        });
        return;
      }
      const featureCount = land === "capped" ? 500 : land === "live" ? 3 : 0;
      const features = Array.from({ length: featureCount }, (_, index) => {
        const row = Math.floor(index / 25);
        const column = index % 25;
        const longitude = farm.longitude - 0.025 + column * 0.002;
        const latitude = farm.latitude - 0.02 + row * 0.002;
        const parcelId = `CA98F1F20DBCFB3B6B1AD1E4399E626C-${String(index + 1).padStart(4, "0")}`;
        return {
          type: "Feature",
          id: parcelId,
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [longitude, latitude],
                [longitude + 0.0015, latitude],
                [longitude + 0.0015, latitude + 0.0015],
                [longitude, latitude + 0.0015],
                [longitude, latitude],
              ],
            ],
          },
          properties: {
            parcelId,
            cropCode: index % 2 ? "PERMANENT_PASTURE" : "Grass",
            digitisedAreaHa: 4.2 + index / 100,
            claimedAreaHa: 4 + index / 100,
            organic: index === 1,
            commonage: index === 2,
          },
        };
      });
      await route.fulfill({
        json: snapshot(
          { type: "FeatureCollection", features },
          { scope: "nearby" },
        ),
      });
      return;
    }
    if (url.pathname === "/api/data/nitrates") {
      const nitrateState =
        options.environment === undefined ? land : environment;
      if (nitrateState === "transport") {
        await route.abort("failed");
        return;
      }
      if (nitrateState === "unavailable") {
        await route.fulfill({
          status: 502,
          json: snapshot(null, { status: "unavailable", scope: "nearby" }),
        });
        return;
      }
      const features =
        nitrateState === "live" || nitrateState === "capped"
          ? [
              {
                type: "Feature",
                geometry: null,
                properties: { STK_RATE: "220kgN/haJan24" },
              },
            ]
          : [];
      await route.fulfill({
        json: snapshot(
          { type: "FeatureCollection", features },
          { scope: "nearby" },
        ),
      });
      return;
    }
    if (url.pathname === "/api/data/cap-summary") {
      if (land === "transport") {
        await route.abort("failed");
        return;
      }
      if (land === "unavailable") {
        await route.fulfill({
          status: 502,
          json: snapshot(null, { status: "unavailable", scope: "county" }),
        });
        return;
      }
      await route.fulfill({
        json: snapshot(
          land === "live" || land === "capped"
            ? {
                county: "GALWAY",
                beneficiaries: 123,
                totalPayment: 4_500_000,
              }
            : null,
          { status: "cached", scope: "county" },
        ),
      });
      return;
    }
    if (url.pathname === "/api/data/opw/nearby") {
      if (opw === "unavailable") {
        await route.fulfill({
          status: 502,
          json: snapshot(null, { status: "unavailable", scope: "nearby" }),
        });
        return;
      }
      await route.fulfill({
        json: snapshot(
          opw === "live"
            ? [
                {
                  stationRef: "30097",
                  stationName: "Corrib at Wolfe Tone Bridge",
                  sensorRef: "0001",
                  parameter: "Water level",
                  unit: "m",
                  observedAt: "2026-07-18T08:00:00.000Z",
                  value: 1.234,
                  distanceKm: 2.4,
                  latitude: 53.274,
                  longitude: -9.054,
                  csvFile: "/data/month/30097_0001.csv",
                },
                {
                  stationRef: "30098",
                  stationName: "Clare River at Claregalway",
                  sensorRef: "0001",
                  parameter: "Water level",
                  unit: "m",
                  observedAt: "2026-07-18T07:45:00.000Z",
                  value: 0.842,
                  distanceKm: 10.8,
                  latitude: 53.34,
                  longitude: -8.94,
                  csvFile: "/data/month/30098_0001.csv",
                },
              ]
            : [],
          { scope: "nearby" },
        ),
      });
      return;
    }
    if (url.pathname === "/api/data/epa/wfd-status") {
      if (environment === "unavailable") {
        await route.fulfill({
          status: 502,
          json: snapshot(null, { status: "unavailable", scope: "nearby" }),
        });
        return;
      }
      const rivers =
        environment === "live"
          ? {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  id: "IE_EA_34C010200",
                  geometry: null,
                  properties: {
                    European_Code: "IE_EA_34C010200",
                    Name: "River Corrib",
                    Status: "Good",
                    Period_for_WFD_Status: "2019–2024",
                  },
                },
                {
                  type: "Feature",
                  id: "IE_EA_30C020300",
                  geometry: null,
                  properties: {
                    European_Code: "IE_EA_30C020300",
                    Name: "",
                    Status: "Moderate",
                    Period_for_WFD_Status: "2019–2024",
                  },
                },
              ],
            }
          : emptyFeatureCollection;
      const groundwater =
        environment === "live"
          ? {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  id: "IE_WE_G_010",
                  geometry: null,
                  properties: {
                    European_Code: "IE_WE_G_010",
                    Name: "Galway groundwater body",
                    Overall_GW_Status: "Poor",
                    Period_for_WFD_Status: "2019–2024",
                  },
                },
              ],
            }
          : emptyFeatureCollection;
      await route.fulfill({
        json: snapshot(
          {
            rivers,
            groundwater,
          },
          { scope: "nearby" },
        ),
      });
      return;
    }
    if (url.pathname.startsWith("/api/data/cso/")) {
      if (markets === "unavailable") {
        await route.fulfill({
          status: 502,
          json: snapshot(null, { status: "unavailable", scope: "national" }),
        });
        return;
      }
      const dataset = url.pathname.endsWith("/AHM05") ? "AHM05" : "AEA01";
      await route.fulfill({
        json: snapshot(
          markets === "live" ? csoDataset(dataset) : emptyJsonStat,
          { status: "cached", scope: "national" },
        ),
      });
      return;
    }
    if (url.pathname === "/api/data/geocode") {
      await route.fulfill({
        json: snapshot(
          {
            latitude: farm.latitude,
            longitude: farm.longitude,
            county: farm.county,
          },
          { scope: "regional", status: "cached" },
        ),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      json: { error: `No E2E fixture for ${url.pathname}` },
    });
  });
}

async function expectNoSeriousAxeViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  const blocking = result.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );
  expect(
    blocking,
    blocking
      .map(
        (violation) =>
          `${violation.id}: ${violation.help} (${violation.nodes.length})`,
      )
      .join("\n"),
  ).toEqual([]);
}

test("completes first-run setup with the keyboard coordinate path", async ({
  page,
}) => {
  await installApiMocks(page);
  await page.goto("/this-week");

  await page.getByLabel("Latitude").fill("50");
  await page.getByLabel("Longitude").fill("-9.0464");
  await page.getByRole("button", { name: "Place farm point" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Latitude must be between" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Use this farm" }),
  ).toBeDisabled();

  await page.getByLabel("Latitude").fill("53.2812");
  await page.getByLabel("Longitude").fill("-9.0464");
  await page.getByRole("button", { name: "Place farm point" }).click();
  await expect(page.getByText("Farm pin placed")).toBeVisible();
  await page.getByRole("button", { name: "Use this farm" }).click();

  await expect(
    page.getByRole("heading", { name: "What deserves your attention" }),
  ).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  const stored = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("agriview-farm-profile-v1") ?? "{}"),
  );
  expect(stored.state.farmLocation).toMatchObject({
    latitude: farm.latitude,
    longitude: farm.longitude,
    precision: "manual-pin",
  });
  await expectNoSeriousAxeViolations(page);
});

test("updates an existing farm pin without requiring a map click", async ({
  page,
}) => {
  await setSavedFarm(page);
  await installApiMocks(page);
  await page.goto("/my-land");

  await page.getByRole("button", { name: "Move farm pin" }).click();
  await page.getByLabel("Latitude").fill("53.3000");
  await page.getByLabel("Longitude").fill("-8.0000");
  await page.getByRole("button", { name: "Use as candidate" }).click();
  await page.getByRole("button", { name: "Save candidate pin" }).click();

  await expect(
    page.getByRole("button", { name: "Move farm pin" }),
  ).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("agriview-farm-profile-v1") ?? "{}"),
  );
  expect(stored.state.farmLocation).toMatchObject({
    latitude: 53.3,
    longitude: -8,
    precision: "manual-pin",
  });
  await expectNoSeriousAxeViolations(page);
});

test("explains geocode failures and supports retry without losing the area", async ({
  page,
}) => {
  let attempts = 0;
  await page.route("**/api/data/geocode**", async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.abort("failed");
      return;
    }
    if (attempts === 2) {
      await route.fulfill({ status: 404, json: { error: "not found" } });
      return;
    }
    if (attempts === 3) {
      await route.fulfill({ status: 500, json: { error: "upstream failed" } });
      return;
    }
    if (attempts === 4) {
      await route.fulfill({
        json: snapshot(
          { latitude: 48.8566, longitude: 2.3522, county: null },
          { scope: "regional", status: "cached" },
        ),
      });
      return;
    }
    await route.fulfill({
      json: snapshot(
        {
          latitude: farm.latitude,
          longitude: farm.longitude,
          county: farm.county,
        },
        { scope: "regional", status: "cached" },
      ),
    });
  });
  await page.goto("/this-week");

  await page.getByLabel("Routing key or area").fill("H91");
  await page.getByRole("button", { name: /GALWAY H91/ }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Routing area unavailable" }),
  ).toContainText("Routing area unavailable");
  await page.getByRole("button", { name: "Try this area again" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Routing area unavailable" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try this area again" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Routing area unavailable" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try this area again" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "outside Ireland" }),
  ).toContainText("outside Ireland");
  await page.getByRole("button", { name: "Try this area again" }).click();
  await expect(page.getByText(/Approximate area centre/)).toBeVisible();
  await expect(page.getByLabel("Latitude")).toHaveValue("53.28120");
  await expectNoSeriousAxeViolations(page);
});

test("keeps unavailable and live-empty Land results distinct", async ({
  page,
}) => {
  await setSavedFarm(page);
  await installApiMocks(page, { land: "unavailable" });
  await page.goto("/my-land");

  await expect(
    page.getByText("Temporarily unavailable", { exact: true }),
  ).toHaveCount(2);
  await expect(
    page.getByText(/has not presented that as an empty result/),
  ).toBeVisible();
  await expect(
    page.getByText("CAP county context is temporarily unavailable."),
  ).toBeVisible();

  await page.unrouteAll({ behavior: "wait" });
  await installApiMocks(page, { land: "empty" });
  await page.reload();
  await expect(page.getByText("No nearby band returned")).toBeVisible();
  await expect(page.getByText("0 nearby parcels")).toBeVisible();
  await expect(page.getByText(/No GALWAY aggregate was present/)).toBeVisible();
  await expect(
    page.getByText("No valid LPIS parcel rows were returned nearby."),
  ).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test("renders live Land data and transport failures as distinct states", async ({
  page,
}) => {
  await setSavedFarm(page);
  await installApiMocks(page, { land: "live" });
  await page.goto("/my-land");

  await expect(
    page.getByText("220 kg organic N/ha", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText(/effective from January 2024/)).toBeVisible();
  await expect(page.getByText("3 nearby parcels")).toBeVisible();
  await expect(page.getByText("123")).toBeVisible();
  await expect(page.getByText("beneficiaries in GALWAY, 2025")).toBeVisible();

  await page.unrouteAll({ behavior: "wait" });
  await installApiMocks(page, { land: "transport" });
  await page.reload();
  await expect(
    page.getByText("Temporarily unavailable", { exact: true }),
  ).toHaveCount(2);
  await expect(
    page.getByText(/has not presented that as an empty result/),
  ).toBeVisible();
  await expect(
    page.getByText("CAP county context is temporarily unavailable."),
  ).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test("keeps Land map and keyboard-accessible parcel selection in step", async ({
  page,
}) => {
  await setSavedFarm(page);
  await installApiMocks(page, { land: "live" });
  await page.goto("/my-land");

  const parcelRows = page.locator('button[aria-pressed][type="button"]');
  await expect(parcelRows).toHaveCount(3);
  await parcelRows.nth(1).focus();
  await expect(parcelRows.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-selected-parcel-id]")).toHaveAttribute(
    "data-selected-parcel-id",
    /-0002$/,
  );

  await parcelRows.nth(2).hover();
  await expect(parcelRows.nth(2)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-selected-parcel-id]")).toHaveAttribute(
    "data-selected-parcel-id",
    /-0001$/,
  );
  await expect(page.getByText("Permanent Pasture").first()).toBeVisible();
  await expect(page.getByText("Reference …26C-0002")).toBeVisible();
  const soilToggle = page.getByRole("button", { name: "EPA soil overlay" });
  await expect(soilToggle).toHaveAttribute("aria-pressed", "false");
  await soilToggle.click();
  await expect(soilToggle).toHaveAttribute("aria-pressed", "true");
  await expectNoSeriousAxeViolations(page);
});

test("labels a capped LPIS response as partial nearby evidence", async ({
  page,
}) => {
  await setSavedFarm(page);
  await installApiMocks(page, { land: "capped" });
  await page.goto("/my-land");

  await expect(page.getByText("500 unique · 500-feature limit")).toBeVisible();
  await expect(
    page.getByText(/source hit its 500-feature response limit/),
  ).toBeVisible();
  await expect(
    page.getByText(/partial nearby sample, not a complete count/),
  ).toBeVisible();
  await expect(page.locator('button[aria-pressed][type="button"]')).toHaveCount(
    8,
  );
});

test("renders a partial forecast on one shared day grid and raw OPW readings", async ({
  page,
}) => {
  await setSavedFarm(page);
  await installApiMocks(page, {
    forecastState: "partial",
    forecastData: forecastFor([0, 2.4, 7, 0.2, 1.1], [20, 24, 31, 18, 22]),
    warningStatus: "partial",
    opw: "live",
  });
  await page.goto("/weather-water");

  await expect(page.getByText(/Partial forecast:/)).toBeVisible();
  await expect(page.getByText("Rain, 5 validated days")).toBeVisible();
  await expect(
    page.getByText("Official warning feed partially available"),
  ).toBeVisible();
  await expect(page.locator("[data-forecast-day]")).toHaveCount(5);
  await expect(page.locator("[data-rain-bar]").first()).toHaveCSS(
    "height",
    "0px",
  );
  const alignment = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLElement>("[data-forecast-day]"),
    ).map((day) => {
      const temperature = day.querySelector<HTMLElement>(
        "[data-temperature-range]",
      );
      const rain = day.querySelector<HTMLElement>("[data-rain-bar]");
      const dayRect = day.getBoundingClientRect();
      const temperatureRect = temperature?.getBoundingClientRect();
      const rainRect = rain?.getBoundingClientRect();
      return {
        dayCenter: dayRect.left + dayRect.width / 2,
        temperatureCenter:
          (temperatureRect?.left ?? 0) + (temperatureRect?.width ?? 0) / 2,
        rainCenter: (rainRect?.left ?? 0) + (rainRect?.width ?? 0) / 2,
      };
    }),
  );
  for (const column of alignment) {
    expect(Math.abs(column.dayCenter - column.temperatureCenter)).toBeLessThan(
      1,
    );
    expect(Math.abs(column.dayCenter - column.rainCenter)).toBeLessThan(1);
  }

  await expect(page.getByText("Corrib at Wolfe Tone Bridge")).toBeVisible();
  await expect(page.getByText("1.234 m")).toBeVisible();
  await expect(
    page.getByText(/latest validated observation only/),
  ).toBeVisible();
  await expect(page.getByText(/does not infer a trend/)).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test("keeps unavailable and valid-empty Conditions sources distinct", async ({
  page,
}) => {
  await setSavedFarm(page);
  await installApiMocks(page, {
    forecastState: "unavailable",
    warnings: "unavailable",
    opw: "unavailable",
  });
  await page.goto("/weather-water");

  await expect(
    page.getByText("Official warning feed unavailable"),
  ).toBeVisible();
  await expect(page.getByText(/forecast source is unavailable/)).toBeVisible();
  await expect(
    page.getByText("Current OPW readings are temporarily unavailable."),
  ).toBeVisible();

  await page.unrouteAll({ behavior: "wait" });
  await installApiMocks(page, { opw: "empty" });
  await page.reload();
  await expect(page.getByText("No active notices returned")).toBeVisible();
  await expect(
    page.getByText("No validated current OPW readings were returned nearby."),
  ).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test("filters and sorts the verified Calendar watchlist accessibly", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-07-18T12:00:00.000Z"));
  await page.goto("/calendar");

  await expect(
    page.getByText("Showing 5 of 5 verified upcoming dates."),
  ).toBeVisible();
  await page.getByLabel("Filter by purpose").selectOption("safety");
  await expect(
    page.getByText("Showing 1 of 5 verified upcoming dates."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "National Farm Safety Measure closes" }),
  ).toBeVisible();

  await expect(
    page.getByLabel("Filter by purpose").locator('option[value="record"]'),
  ).toHaveCount(0);

  await page.getByLabel("Filter by purpose").selectOption("all");
  await page.getByLabel("Sort dates").selectOption("latest");
  await expect(page.locator("article").first().getByRole("heading")).toHaveText(
    "TAMS 3 Tranche 14 closes",
  );
  await expectNoSeriousAxeViolations(page);
});

test("renders national Market values with honest scope and compact money", async ({
  page,
}) => {
  await setSavedFarm(page, { enterprise: "mixed" });
  await installApiMocks(page, { markets: "live" });
  await page.goto("/markets-income");

  await expect(page.getByText("€13.1bn").first()).toBeVisible();
  await expect(page.getByText("Ireland · national series")).toBeVisible();
  await expect(
    page.getByText(/not your sale price, margin, or a recommendation/),
  ).toBeVisible();
  await expect(
    page.getByText(/mixed enterprise has no honest single commodity index/i),
  ).toBeVisible();
  await expect(page.getByLabel("Latest annual output values")).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test("keeps empty and unavailable Market releases distinct", async ({
  page,
}) => {
  await setSavedFarm(page, { enterprise: "dairy" });
  await installApiMocks(page, { markets: "empty" });
  await page.goto("/markets-income");

  await expect(
    page.getByText(/contains no matching annual series/),
  ).toBeVisible();
  await expect(
    page.getByText(/contains no matching monthly series/),
  ).toBeVisible();

  await page.unrouteAll({ behavior: "wait" });
  await installApiMocks(page, { markets: "unavailable" });
  await page.reload();
  await expect(
    page.getByText("Annual output is temporarily unavailable."),
  ).toBeVisible();
  await expect(
    page.getByText("Monthly price index is temporarily unavailable."),
  ).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test("leads Environment evidence with names and human nitrate units", async ({
  page,
}) => {
  await setSavedFarm(page);
  await installApiMocks(page, { environment: "live" });
  await page.goto("/environment-compliance");

  await expect(page.getByText("River Corrib")).toBeVisible();
  await expect(
    page.getByText("River waterbody without a published name"),
  ).toBeVisible();
  await expect(page.getByText("Code IE_EA_34C010200")).toBeVisible();
  await expect(
    page.getByText("220 kg organic N/ha", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Effective label: January 2024/)).toBeVisible();
  await expect(
    page.getByText(/screening signals—not a field assessment/),
  ).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test("keeps empty and unavailable Environment searches distinct", async ({
  page,
}) => {
  await setSavedFarm(page);
  await installApiMocks(page, { environment: "empty" });
  await page.goto("/environment-compliance");
  await expect(
    page.getByText(/No mapped waterbodies were returned/),
  ).toBeVisible();
  await expect(
    page.getByText(/No stocking-rate label was returned/),
  ).toBeVisible();

  await page.unrouteAll({ behavior: "wait" });
  await installApiMocks(page, { environment: "unavailable" });
  await page.reload();
  await expect(
    page.getByText(/EPA classifications are unavailable/),
  ).toBeVisible();
  await expect(
    page.getByText(/DAFM screening layer is unavailable/),
  ).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test("contains focus in the mobile evidence dialog and restores its trigger", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setSavedFarm(page);
  await installApiMocks(page);
  await page.goto("/this-week");

  const trigger = page
    .getByRole("button", { name: "Open evidence and rule" })
    .first();
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: /Driest two-day window/ });
  await expect(dialog).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close evidence", exact: true }),
  ).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  const sourceLink = dialog.getByRole("link", { name: "Test source" });
  await page.keyboard.press("Shift+Tab");
  await expect(sourceLink).toBeFocused();
  await sourceLink.focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close evidence", exact: true }),
  ).toBeFocused();
  await expectNoSeriousAxeViolations(page);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("stacks the lead composition when the desktop evidence dock is open", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await setSavedFarm(page);
  await installApiMocks(page);
  await page.goto("/this-week");

  await page
    .getByRole("button", { name: "Open evidence and rule" })
    .first()
    .click();

  const dialog = page.getByRole("dialog", { name: /Driest two-day window/ });
  const lead = page.getByRole("article").first();
  const chart = page.getByRole("region", { name: "Rain and gusts at the pin" });
  const trigger = page
    .getByRole("button", { name: "Open evidence and rule" })
    .first();
  await expect(dialog).toBeVisible();

  const leadBox = await lead.boundingBox();
  const chartBox = await chart.boundingBox();
  expect(leadBox?.width ?? 0).toBeGreaterThan(500);
  expect(chartBox?.y ?? 0).toBeGreaterThan(
    (leadBox?.y ?? 0) + (leadBox?.height ?? 0) - 1,
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  await expectNoSeriousAxeViolations(page);

  await trigger.click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page
    .getByRole("button", { name: "Close evidence", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("distinguishes an unavailable warning source from no active warnings", async ({
  page,
}) => {
  await setSavedFarm(page);
  await installApiMocks(page, { warnings: "unavailable" });
  await page.goto("/this-week");

  await expect(
    page.getByRole("heading", {
      name: "Weather warnings could not be checked.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/Do not interpret a missing warning row/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Check warnings again" }),
  ).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test("shows an explicit coverage check for a one-day forecast", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await setSavedFarm(page);
  await installApiMocks(page);
  await page.route("**/api/data/forecast**", async (route) => {
    await route.fulfill({
      json: snapshot({
        timezone: "Europe/Dublin",
        latitude: farm.latitude,
        longitude: farm.longitude,
        days: [
          {
            date: "2026-07-18",
            weatherCode: 1,
            temperatureMaxC: 18,
            temperatureMinC: 9,
            rainMm: 0.4,
            precipitationProbability: 15,
            windGustKph: 22,
          },
        ],
      }),
    });
  });
  await page.goto("/this-week");

  await expect(
    page.getByRole("heading", {
      name: "Not enough forecast days for a work window",
    }),
  ).toBeVisible();
  await expect(page.getByText(/looks least constrained/)).toHaveCount(0);
  await expectNoSeriousAxeViolations(page);
});

test("contains focus in the Mobile More dialog", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setSavedFarm(page);
  await installApiMocks(page);
  await page.goto("/this-week");

  await page.getByRole("button", { name: "More" }).click();
  const dialog = page.getByRole("dialog", { name: "More evidence" });
  await expect(dialog).toBeVisible();
  const closeButton = dialog.getByRole("button", {
    name: "Close more menu",
  });
  const lastLink = dialog.getByRole("link", { name: "Farm settings" });
  await closeButton.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(lastLink).toBeFocused();
  await lastLink.focus();
  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "More" })).toBeFocused();
});

test("reuses fresh source evidence across related client-side workspaces", async ({
  page,
}) => {
  const requestCounts = new Map<string, number>();
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith("/api/data/")) {
      requestCounts.set(pathname, (requestCounts.get(pathname) ?? 0) + 1);
    }
  });

  await setSavedFarm(page);
  await installApiMocks(page, {
    environment: "live",
    land: "live",
    opw: "live",
  });
  await page.goto("/this-week");
  await expect(
    page.getByRole("heading", { name: "What deserves your attention" }),
  ).toBeVisible();

  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Conditions" })
    .click();
  await expect(
    page.getByRole("heading", { name: "A working weather window" }),
  ).toBeVisible();

  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Land" })
    .click();
  await expect(page.getByText("3 nearby parcels")).toBeVisible();

  await page
    .getByRole("navigation", { name: "Evidence navigation" })
    .getByRole("link", { name: "Environment" })
    .click();
  await expect(page.getByText("River Corrib")).toBeVisible();

  expect(requestCounts.get("/api/data/forecast")).toBe(1);
  expect(requestCounts.get("/api/data/met/warnings")).toBe(1);
  expect(requestCounts.get("/api/data/nitrates")).toBe(1);
});

test("keeps asynchronous evidence loading transitions layout-stable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const measuredWindow = window as typeof window & { __agriViewCls: number };
    measuredWindow.__agriViewCls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };
        if (!shift.hadRecentInput) measuredWindow.__agriViewCls += shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await setSavedFarm(page);
  await installApiMocks(page, {
    apiDelayMs: 700,
    environment: "live",
    land: "live",
    markets: "live",
    opw: "live",
  });

  const cases = [
    {
      route: "/my-land",
      settled: () => page.getByText("3 nearby parcels"),
    },
    {
      route: "/weather-water",
      settled: () =>
        page.getByRole("region", {
          name: "7-day rain and temperature comparison",
        }),
    },
    {
      route: "/markets-income",
      settled: () => page.getByText("€13.1bn").first(),
    },
    {
      route: "/environment-compliance",
      settled: () => page.getByText("River Corrib"),
    },
  ] as const;

  for (const { route, settled } of cases) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    await expect(settled()).toBeVisible();
    await page.waitForTimeout(100);
    const cls = await page.evaluate(
      () => (window as typeof window & { __agriViewCls: number }).__agriViewCls,
    );
    expect(cls, `${route} layout shift`).toBeLessThan(0.02);
  }
});

test("preserves full-page scrolling and navigation geometry across routes and viewports", async ({
  page,
}) => {
  await setSavedFarm(page);
  await installApiMocks(page);

  for (const theme of ["light", "dark"]) {
    await page.goto("/this-week");
    await page.evaluate((selectedTheme) => {
      window.localStorage.setItem("theme", selectedTheme);
    }, theme);

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 820, height: 600 },
      { width: 1280, height: 720 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      for (const path of routes) {
        await page.goto(path);
        await page.evaluate(() =>
          window.scrollTo(0, document.documentElement.scrollHeight),
        );

        const metrics = await page.evaluate(() => {
          const aside = document.querySelector("aside");
          const mobileNav = document.querySelector(
            'nav[aria-label="Mobile navigation"]',
          );
          const asideRect = aside?.getBoundingClientRect();
          const navRect = mobileNav?.getBoundingClientRect();
          return {
            overflow:
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
            asidePosition: aside ? getComputedStyle(aside).position : null,
            asideTop: asideRect
              ? Math.abs(asideRect.top) < 1
                ? 0
                : Math.round(asideRect.top)
              : null,
            asideBottom: asideRect ? Math.round(asideRect.bottom) : null,
            navPosition: mobileNav
              ? getComputedStyle(mobileNav).position
              : null,
            navBottom: navRect
              ? Math.round(window.innerHeight - navRect.bottom)
              : null,
            dark: document.documentElement.classList.contains("dark"),
            overflowingElements: Array.from(
              document.querySelectorAll<HTMLElement>("body *"),
            )
              .filter(
                (element) =>
                  element.getBoundingClientRect().right >
                  document.documentElement.clientWidth,
              )
              .slice(0, 6)
              .map((element) => ({
                tag: element.tagName,
                className: element.className,
                right: Math.round(element.getBoundingClientRect().right),
                width: Math.round(element.getBoundingClientRect().width),
              })),
            forecastAncestors: (() => {
              const chart = document.querySelector<HTMLElement>(
                '[aria-label$="rain and temperature comparison"]',
              );
              const elements: HTMLElement[] = [];
              let current = chart;
              while (current && elements.length < 5) {
                elements.push(current);
                current = current.parentElement;
              }
              return elements.map((element) => ({
                tag: element.tagName,
                className: element.className,
                width: Math.round(element.getBoundingClientRect().width),
                scrollWidth: element.scrollWidth,
                overflowX: getComputedStyle(element).overflowX,
                minWidth: getComputedStyle(element).minWidth,
              }));
            })(),
          };
        });

        expect(
          metrics.overflow,
          `${path} at ${viewport.width}px in ${theme}: ${JSON.stringify({ overflowingElements: metrics.overflowingElements, forecastAncestors: metrics.forecastAncestors })}`,
        ).toBe(0);
        expect(metrics.dark).toBe(theme === "dark");
        if (viewport.width < 768) {
          expect(metrics.navPosition).toBe("fixed");
          expect(metrics.navBottom).toBe(0);
        } else {
          expect(metrics.asidePosition).toBe("sticky");
          expect(metrics.asideTop).toBe(0);
          expect(metrics.asideBottom).toBe(viewport.height);
        }

        if (viewport.width === 390 || viewport.width === 1280) {
          await expectNoSeriousAxeViolations(page);
        }
      }
    }
  }
});

test("lets the document scroll when the pointer is over the Land map", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await setSavedFarm(page);
  await installApiMocks(page);
  await page.goto("/my-land");
  await page.evaluate(() => window.scrollTo(0, 0));

  const map = page.getByRole("region", { name: "Map" });
  await map.hover();
  await page.mouse.wheel(0, 600);
  await expect
    .poll(() => page.evaluate(() => Math.round(window.scrollY)))
    .toBeGreaterThanOrEqual(500);
});

const visualMatrix = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
] as const;

// Pixel baselines are maintained on the project's macOS review workstation;
// functional, responsive, and accessibility assertions remain platform-neutral.
for (const viewport of visualMatrix) {
  for (const theme of ["light", "dark"] as const) {
    test(`This Week visual lock · ${viewport.name} · ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await setSavedFarm(page, { theme });
      await installApiMocks(page);
      await page.goto("/this-week");
      await expect(
        page.getByRole("heading", { name: "What deserves your attention" }),
      ).toBeVisible();
      await expect(page.locator("html")).toHaveClass(
        theme === "dark" ? /dark/ : /light/,
      );
      await expect(page).toHaveScreenshot(
        `this-week-${viewport.name}-${theme}.png`,
        {
          fullPage: true,
          animations: "disabled",
          caret: "hide",
          maxDiffPixelRatio: 0.001,
        },
      );
    });
  }
}

for (const route of ["my-land", "weather-water"] as const) {
  for (const viewport of visualMatrix) {
    for (const theme of ["light", "dark"] as const) {
      test(`${route} visual lock · ${viewport.name} · ${theme}`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        if (route === "my-land") {
          await page.clock.setFixedTime(new Date("2026-07-18T08:35:00.000Z"));
        }
        await setSavedFarm(page, { theme });
        await installApiMocks(page, { land: "live", opw: "live" });
        await page.goto(`/${route}`);
        await expect(page.locator("h1")).toBeVisible();
        await expect(page.locator("html")).toHaveClass(
          theme === "dark" ? /dark/ : /light/,
        );
        await expect(page).toHaveScreenshot(
          `${route}-${viewport.name}-${theme}.png`,
          {
            fullPage: true,
            animations: "disabled",
            caret: "hide",
            mask:
              route === "my-land"
                ? [page.locator("[data-selected-parcel-id]")]
                : [],
            maxDiffPixelRatio: route === "my-land" ? 0 : 0.001,
          },
        );
      });
    }
  }
}

for (const route of [
  "calendar",
  "markets-income",
  "environment-compliance",
] as const) {
  for (const viewport of visualMatrix) {
    for (const theme of ["light", "dark"] as const) {
      test(`${route} visual lock · ${viewport.name} · ${theme}`, async ({
        page,
      }) => {
        await page.clock.setFixedTime(new Date("2026-07-18T12:00:00.000Z"));
        await page.setViewportSize(viewport);
        await setSavedFarm(page, { theme });
        await installApiMocks(page, {
          environment: "live",
          markets: "live",
        });
        await page.goto(`/${route}`);
        await expect(page.locator("h1")).toBeVisible();
        await expect(page.locator("html")).toHaveClass(
          theme === "dark" ? /dark/ : /light/,
        );
        await expect(page).toHaveScreenshot(
          `${route}-${viewport.name}-${theme}.png`,
          {
            fullPage: true,
            animations: "disabled",
            caret: "hide",
            mask:
              route === "calendar" ? [page.locator("[data-days-until]")] : [],
            maxDiffPixelRatio: 0.001,
          },
        );
      });
    }
  }
}

test("renders ground, spraying, warning, and sales lead variants honestly", async ({
  page,
}) => {
  const orangeWarning = {
    id: "orange-galway",
    level: "Orange",
    headline:
      "Orange wind warning for Galway with a deliberately long operational headline",
    description:
      "Very strong winds are expected. Check exposed work, loose equipment, travel and animal welfare arrangements before acting.",
    issuedAt: "2026-07-18T08:00:00Z",
    startsAt: "2026-07-18T09:00:00Z",
    expiresAt: "2026-07-20T23:00:00Z",
    regions: ["EI10"],
  };

  await setSavedFarm(page);
  await installApiMocks(page, {
    forecastData: forecastFor(
      [4, 5, 6, 7, 4, 2, 1],
      [20, 22, 24, 40, 30, 22, 18],
    ),
  });
  await page.goto("/this-week");
  await expect(
    page.getByRole("heading", { name: /Protect vulnerable ground/ }),
  ).toBeVisible();

  await page.unroute("**/api/data/**");
  await setSavedFarm(page, { enterprise: "tillage", weekFocus: "spraying" });
  await installApiMocks(page, {
    forecastData: forecastFor(
      [4, 0, 0.2, 7, 3, 1, 2],
      [20, 18, 21, 30, 20, 19, 18],
    ),
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Check the .* window/ }),
  ).toBeVisible();

  await page.unroute("**/api/data/**");
  await setSavedFarm(page);
  await installApiMocks(page, { warningData: [orangeWarning] });
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: /Orange wind warning for Galway/,
    }),
  ).toBeVisible();
  const overflow = await page.evaluate(() => ({
    pixels: document.documentElement.scrollWidth - innerWidth,
    elements: Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((element) => element.getBoundingClientRect().right > innerWidth)
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName,
        text: element.textContent?.trim().slice(0, 80),
        right: Math.round(element.getBoundingClientRect().right),
        width: Math.round(element.getBoundingClientRect().width),
        className: element.className,
      })),
  }));
  expect(overflow.pixels, JSON.stringify(overflow.elements, null, 2)).toBe(0);

  await page.unroute("**/api/data/**");
  await setSavedFarm(page, { enterprise: "dairy", weekFocus: "sales" });
  await installApiMocks(page);
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Keep sale timing separate from field conditions",
    }),
  ).toBeVisible();
});

test("keeps partial and unavailable source states explicit", async ({
  page,
}) => {
  await setSavedFarm(page);
  await installApiMocks(page, {
    forecastState: "partial",
    forecastData: forecastFor([0, 0, 0, 0, 0], [20, 21, 22, 23, 24]),
    warningStatus: "partial",
  });
  await page.goto("/this-week");
  await expect(
    page.getByText("Partial forecast coverage", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Partial", { exact: true }).first(),
  ).toBeVisible();
  const alignment = await page.evaluate(() => {
    const chartLabels = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-testid="weekly-day-label"]',
      ),
    ).map((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left + rect.width / 2;
    });
    const valueCells = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-testid="weekly-day-value"]',
      ),
    ).map((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left + rect.width / 2;
    });
    return { chartLabels, valueCells };
  });
  expect(alignment.chartLabels).toHaveLength(5);
  expect(alignment.valueCells).toHaveLength(5);
  for (const [index, chartCenter] of alignment.chartLabels.entries()) {
    expect(
      Math.abs(chartCenter - (alignment.valueCells[index] ?? 0)),
    ).toBeLessThan(1);
  }

  await page.unroute("**/api/data/**");
  await installApiMocks(page, { forecastState: "unavailable" });
  await page.reload();
  await expect(page.getByText("Forecast unavailable")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "No weekly advice is safer than invented advice.",
    }),
  ).toBeVisible();
});

test("preserves composition at 200% text and with long farm context", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setSavedFarm(page, {
    farmLabel:
      "A deliberately long saved routing-area description for field testing",
    routingKey: "EXTRA-LONG-ROUTING-LABEL",
  });
  await installApiMocks(page);
  await page.goto("/this-week");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(
    page.getByRole("heading", { name: "What deserves your attention" }),
  ).toBeVisible();
  const overflow = await page.evaluate(() => ({
    pixels: document.documentElement.scrollWidth - innerWidth,
    elements: Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((element) => element.getBoundingClientRect().right > innerWidth)
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName,
        text: element.textContent?.trim().slice(0, 80),
        right: Math.round(element.getBoundingClientRect().right),
        width: Math.round(element.getBoundingClientRect().width),
        className: element.className,
      })),
  }));
  expect(overflow.pixels, JSON.stringify(overflow.elements, null, 2)).toBe(0);
  await expectNoSeriousAxeViolations(page);
});

test("reserves the lead composition while forecast data loads", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await setSavedFarm(page);
  await installApiMocks(page, { forecastDelayMs: 900 });
  await page.goto("/this-week");
  await expect(
    page.getByRole("heading", { name: "What deserves your attention" }),
  ).toBeVisible();
  const loadingTop = (
    await page.getByLabel("Loading weekly brief").last().boundingBox()
  )?.y;
  await expect(
    page.getByRole("heading", { name: /looks least constrained/ }),
  ).toBeVisible();
  const finalTop = (
    await page
      .getByLabel("Lead weekly priority and forecast evidence")
      .boundingBox()
  )?.y;
  expect(Math.abs((loadingTop ?? 0) - (finalTop ?? 0))).toBeLessThan(24);
});
