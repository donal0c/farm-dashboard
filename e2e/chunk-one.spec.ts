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
    staleAfter: "2026-07-18T08:45:00.000Z",
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

const emptyFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const emptyJsonStat = {
  class: "dataset",
  id: [],
  size: [],
  dimension: {},
  value: [],
};

async function setSavedFarm(page: Page) {
  await page.addInitScript((savedFarm) => {
    window.localStorage.setItem(
      "agriview-farm-profile-v1",
      JSON.stringify({
        state: {
          enterprise: "mixed",
          weekFocus: "grazing",
          farmCounty: savedFarm.county,
          farmLocation: savedFarm,
          preferredOpwStation: null,
        },
        version: 0,
      }),
    );
  }, farm);
}

type LandState = "live" | "empty" | "unavailable" | "transport";
type WarningState = "empty" | "unavailable";

async function installApiMocks(
  page: Page,
  options: { land?: LandState; warnings?: WarningState } = {},
) {
  const land = options.land ?? "live";
  const warnings = options.warnings ?? "empty";
  await page.route("**/api/data/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/api/data/forecast") {
      await route.fulfill({ json: forecast });
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
      await route.fulfill({ json: snapshot([], { scope: "national" }) });
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
      const features =
        land === "live"
          ? [
              {
                type: "Feature",
                id: "parcel-1",
                geometry: null,
                properties: {
                  parcelId: "parcel-1",
                  cropCode: "Grass",
                  digitisedAreaHa: 4.2,
                  claimedAreaHa: 4,
                  organic: false,
                  commonage: false,
                },
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
    if (url.pathname === "/api/data/nitrates") {
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
      const features =
        land === "live"
          ? [
              {
                type: "Feature",
                geometry: null,
                properties: { STK_RATE: "220 kg N/ha" },
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
          land === "live"
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
      await route.fulfill({
        json: snapshot([], { scope: "nearby" }),
      });
      return;
    }
    if (url.pathname === "/api/data/epa/wfd-status") {
      await route.fulfill({
        json: snapshot(
          {
            rivers: emptyFeatureCollection,
            groundwater: emptyFeatureCollection,
          },
          { scope: "nearby" },
        ),
      });
      return;
    }
    if (url.pathname.startsWith("/api/data/cso/")) {
      await route.fulfill({
        json: snapshot(emptyJsonStat, { scope: "national" }),
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
  await page.getByRole("button", { name: "Save pin" }).click();

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
    page.getByText(/has not treated the failed request as an empty parcel/),
  ).toBeVisible();
  await expect(
    page.getByText("CAP county context is temporarily unavailable."),
  ).toBeVisible();

  await page.unrouteAll({ behavior: "wait" });
  await installApiMocks(page, { land: "empty" });
  await page.reload();
  await expect(page.getByText("No nearby label returned")).toBeVisible();
  await expect(page.getByText("0 nearby parcels")).toBeVisible();
  await expect(page.getByText(/No GALWAY aggregate was present/)).toBeVisible();
  await expect(
    page.getByText("No valid LPIS parcel rows were returned near this point."),
  ).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test("renders live Land data and transport failures as distinct states", async ({
  page,
}) => {
  await setSavedFarm(page);
  await installApiMocks(page, { land: "live" });
  await page.goto("/my-land");

  await expect(page.getByText("220 kg N/ha")).toBeVisible();
  await expect(page.getByText("1 nearby parcels")).toBeVisible();
  await expect(page.getByText("123")).toBeVisible();
  await expect(page.getByText("beneficiaries in GALWAY, 2025")).toBeVisible();

  await page.unrouteAll({ behavior: "wait" });
  await installApiMocks(page, { land: "transport" });
  await page.reload();
  await expect(
    page.getByText("Temporarily unavailable", { exact: true }),
  ).toHaveCount(2);
  await expect(
    page.getByText(/has not treated the failed request as an empty parcel/),
  ).toBeVisible();
  await expect(
    page.getByText("CAP county context is temporarily unavailable."),
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
    .getByRole("button", { name: "See evidence and rule" })
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
    page.getByText(/Do not interpret the missing warning row/),
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
          };
        });

        expect(
          metrics.overflow,
          `${path} at ${viewport.width}px in ${theme}`,
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
