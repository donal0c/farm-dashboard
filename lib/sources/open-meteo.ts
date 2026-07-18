import { z } from "zod";

import type { SourceSnapshot } from "../contracts/source-snapshot.ts";
import { fetchValidated } from "../server/fetch-validated.ts";

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

export const forecastDaySchema = z.object({
  date: z.string().date(),
  weatherCode: z.number().finite(),
  temperatureMaxC: z.number().finite(),
  temperatureMinC: z.number().finite(),
  rainMm: z.number().finite().nonnegative(),
  precipitationProbability: z.number().finite().min(0).max(100),
  windGustKph: z.number().finite().nonnegative(),
});

export const farmForecastSchema = z.object({
  timezone: z.string().min(1),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  days: z.array(forecastDaySchema),
});

const nullableFiniteArray = z.array(z.number().finite().nullable());

export const openMeteoPayloadSchema = z.object({
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  timezone: z.string().min(1),
  daily: z.object({
    time: z.array(z.string().date()),
    weather_code: nullableFiniteArray,
    temperature_2m_max: nullableFiniteArray,
    temperature_2m_min: nullableFiniteArray,
    precipitation_sum: nullableFiniteArray,
    precipitation_probability_max: nullableFiniteArray,
    wind_gusts_10m_max: nullableFiniteArray,
  }),
});

type OpenMeteoPayload = z.infer<typeof openMeteoPayloadSchema>;

export const OPEN_METEO_SOURCE = {
  id: "open-meteo-forecast",
  label: "Open-Meteo forecast",
  url: "https://open-meteo.com/en/docs",
};

function finiteAt(values: Array<number | null>, index: number) {
  const value = values?.[index];
  return Number.isFinite(value) ? Number(value) : null;
}

export function normalizeOpenMeteoForecast(
  payload: OpenMeteoPayload,
  fetchedAt = new Date(),
): SourceSnapshot<FarmForecast> {
  const daily = payload.daily;
  const dates = daily.time;

  if (!dates.length) {
    throw new Error("Open-Meteo returned no daily forecast rows.");
  }

  const candidateDays = dates.map((date, index) => ({
    date,
    weatherCode: finiteAt(daily.weather_code, index),
    temperatureMaxC: finiteAt(daily.temperature_2m_max, index),
    temperatureMinC: finiteAt(daily.temperature_2m_min, index),
    rainMm: finiteAt(daily.precipitation_sum, index),
    precipitationProbability: finiteAt(
      daily.precipitation_probability_max,
      index,
    ),
    windGustKph: finiteAt(daily.wind_gusts_10m_max, index),
  }));
  const days = candidateDays.filter(
    (day): day is ForecastDay =>
      day.weatherCode !== null &&
      day.temperatureMaxC !== null &&
      day.temperatureMinC !== null &&
      day.rainMm !== null &&
      day.precipitationProbability !== null &&
      day.windGustKph !== null,
  );
  if (!days.length) {
    throw new Error("Open-Meteo returned no complete daily forecast rows.");
  }
  const omittedDays = candidateDays.length - days.length;

  const fetchedIso = fetchedAt.toISOString();
  return {
    data: {
      timezone: payload.timezone || "Europe/Dublin",
      latitude: payload.latitude,
      longitude: payload.longitude,
      days,
    },
    source: OPEN_METEO_SOURCE,
    scope: "farm",
    status: omittedDays ? "partial" : "live",
    observedAt: fetchedIso,
    fetchedAt: fetchedIso,
    staleAfter: new Date(fetchedAt.getTime() + 45 * 60 * 1000).toISOString(),
    warning: [
      "Forecast values are model estimates for the selected point, not measurements on the farm.",
      omittedDays
        ? `${omittedDays} incomplete forecast ${omittedDays === 1 ? "day was" : "days were"} excluded rather than converted to zero.`
        : null,
    ]
      .filter(Boolean)
      .join(" "),
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

  const { data } = await fetchValidated(url, {
    sourceId: OPEN_METEO_SOURCE.id,
    schema: openMeteoPayloadSchema,
    timeoutMs: 8_000,
    maxAttempts: 2,
    init: { next: { revalidate: 30 * 60 } },
  });
  return normalizeOpenMeteoForecast(data);
}
