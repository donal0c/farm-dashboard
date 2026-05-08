const MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

export type HistoricalWeatherRow = {
  date: string;
  maxTemp: number | null;
  minTemp: number | null;
  rainfall: number | null;
  soilTemp: number | null;
  smd: number | null;
};

export type HistoricalWeatherPayload = {
  rows: HistoricalWeatherRow[];
  source: {
    status: "live" | "unavailable";
    warning?: string;
  };
};

export function normalizeHistoricalDate(dateValue: string) {
  const [day, mon, year] = dateValue.toLowerCase().split("-");
  const month = MONTHS[mon];
  if (!month || !day || !year) {
    return null;
  }
  return `${year}-${month}-${day.padStart(2, "0")}`;
}

function toNumber(value: string | undefined) {
  const parsed = Number.parseFloat(value?.trim() ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseHistoricalCsv(
  text: string,
  from: string,
  to: string,
  limit = 800,
) {
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) =>
    line.startsWith("date,ind,maxtp"),
  );

  if (headerIndex < 0) {
    throw new Error("unexpected historical format");
  }

  return lines
    .slice(headerIndex + 1)
    .filter(Boolean)
    .map((line) => {
      const cols = line.split(",");
      const normalizedDate = normalizeHistoricalDate(cols[0]);
      if (!normalizedDate) {
        return null;
      }

      return {
        date: normalizedDate,
        maxTemp: toNumber(cols[2]),
        minTemp: toNumber(cols[4]),
        rainfall: toNumber(cols[8]),
        soilTemp: toNumber(cols[19]),
        smd: toNumber(cols[23]),
      };
    })
    .filter((row): row is HistoricalWeatherRow => Boolean(row))
    .filter((row) => row.date >= from && row.date <= to)
    .slice(-limit);
}

export async function loadHistoricalWeather(
  stationId: string,
  from: string,
  to: string,
  fetcher: typeof fetch,
): Promise<HistoricalWeatherPayload> {
  try {
    const response = await fetcher(
      `https://cli.fusio.net/cli/climate_data/webdata/dly${stationId}.csv`,
      {
        cache: "no-store",
        headers: { "User-Agent": "farm-dashboard/0.1" },
        signal: AbortSignal.timeout(4500),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Met Eireann daily climate feed failed with ${response.status}`,
      );
    }

    return {
      rows: parseHistoricalCsv(await response.text(), from, to),
      source: { status: "live" },
    };
  } catch (error) {
    return {
      rows: [],
      source: {
        status: "unavailable",
        warning:
          error instanceof Error
            ? error.message
            : "Met Eireann daily climate feed unavailable",
      },
    };
  }
}
