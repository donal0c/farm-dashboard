import { type JsonStatRow, parseYear } from "../cso/jsonstat.ts";

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function collectYears(rows: JsonStatRow[], timeDimension: string) {
  return Array.from(
    new Set(
      rows
        .map((row) => parseYear(String(row[timeDimension])))
        .filter((year) => Number.isFinite(year)),
    ),
  ).sort((a, b) => a - b);
}

export function sumByYear(
  rows: JsonStatRow[],
  timeDimension: string,
  filters: Record<string, string>,
  fromYear: number,
  toYear: number,
) {
  const totals = new Map<number, number>();

  for (const row of rows) {
    const matches = Object.entries(filters).every(
      ([dim, code]) => row[dim] === code,
    );
    if (!matches) {
      continue;
    }

    const year = parseYear(String(row[timeDimension]));
    if (!Number.isFinite(year) || year < fromYear || year > toYear) {
      continue;
    }

    totals.set(year, (totals.get(year) ?? 0) + Number(row.value));
  }

  return Array.from(totals.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, value]) => ({ year, value }));
}

export function sumByPeriodLabel(
  rows: JsonStatRow[],
  timeDimension: string,
  filters: Record<string, string>,
  fromYear: number,
  toYear: number,
) {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const matches = Object.entries(filters).every(
      ([dim, code]) => row[dim] === code,
    );
    if (!matches) {
      continue;
    }

    const year = parseYear(String(row[timeDimension]));
    if (!Number.isFinite(year) || year < fromYear || year > toYear) {
      continue;
    }

    const label = String(row[`${timeDimension}_label`]);
    totals.set(label, (totals.get(label) ?? 0) + Number(row.value));
  }

  return Array.from(totals.entries()).map(([label, value]) => ({
    label,
    value,
  }));
}

export function latestValue(rows: Array<{ year: number; value: number }>) {
  if (!rows.length) {
    return 0;
  }
  return rows[rows.length - 1].value;
}
