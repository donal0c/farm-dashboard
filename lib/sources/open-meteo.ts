import type { SourceSnapshot } from "@/lib/contracts/source-snapshot";

export type ForecastDay = {
  date: string;
  weatherCode: number;
  temperatureMaxC: number;
  temperatureMinC: number;
  rainMm: number;
  precipitationProbability: number;
  windGustKph: number;
};

export type FarmForecast = {
  timezone: string;
  latitude: number;
  longitude: number;
  days: ForecastDay[];
};

type OpenMeteoPayload = {
  latitude: number;
  longitude: number;
  timezone: string;
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    precipitation_probability_max?: number[];
    wind_gusts_10m_max?: number[];
  };
};

const SOURCE = {
  id: "open-meteo-forecast",
  label: "Open-Meteo forecast",
  url: "https://open-meteo.com/en/docs",
};

function finiteAt(values: number[] | undefined, index: number) {
  const value = values?.[index];
  return Number.isFinite(value) ? Number(value) : 0;
}

export function normalizeOpenMeteoForecast(
  payload: OpenMeteoPayload,
  fetchedAt = new Date(),
): SourceSnapshot<FarmForecast> {
  const daily = payload.daily;
  const dates = daily?.time ?? [];

  if (!dates.length) {
    throw new Error("Open-Meteo returned no daily forecast rows.");
  }

  const days = dates.map((date, index) => ({
    date,
    weatherCode: finiteAt(daily?.weather_code, index),
    temperatureMaxC: finiteAt(daily?.temperature_2m_max, index),
    temperatureMinC: finiteAt(daily?.temperature_2m_min, index),
    rainMm: finiteAt(daily?.precipitation_sum, index),
    precipitationProbability: finiteAt(
      daily?.precipitation_probability_max,
      index,
    ),
    windGustKph: finiteAt(daily?.wind_gusts_10m_max, index),
  }));

  const fetchedIso = fetchedAt.toISOString();
  return {
    data: {
      timezone: payload.timezone || "Europe/Dublin",
      latitude: payload.latitude,
      longitude: payload.longitude,
      days,
    },
    source: SOURCE,
    scope: "farm",
    status: "live",
    observedAt: fetchedIso,
    fetchedAt: fetchedIso,
    staleAfter: new Date(fetchedAt.getTime() + 45 * 60 * 1000).toISOString(),
    warning:
      "Forecast values are model estimates for the selected point, not measurements on the farm.",
    confidence: "estimate",
  };
}

export async function fetchOpenMeteoForecast(
  latitude: number,
  longitude: number,
) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "daily",
    [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_gusts_10m_max",
    ].join(","),
  );
  url.searchParams.set("timezone", "Europe/Dublin");
  url.searchParams.set("forecast_days", "7");

  const response = await fetch(url, {
    next: { revalidate: 30 * 60 },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new Error(`Open-Meteo upstream returned ${response.status}.`);
  }

  return normalizeOpenMeteoForecast(
    (await response.json()) as OpenMeteoPayload,
  );
}
