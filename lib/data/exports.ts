export type ExportRow = {
  category: string;
  year: number;
  amountEur: number;
  quantityTonnes: number;
};

export type ExportPayload = {
  rows: ExportRow[];
  source: {
    status: "live" | "fallback";
    label: string;
    updated: string;
    warning?: string;
  };
};

export const EXPORTS_DATASET_API =
  "https://opendata.agriculture.gov.ie/api/3/action/package_show?id=dafm-annual-export-value-of-irish-agri-food-products";

export const EXPORTS_FALLBACK_ROWS: ExportRow[] = [
  {
    category: "Beef",
    year: 2024,
    amountEur: 3100166933,
    quantityTonnes: 489002,
  },
  {
    category: "Beef",
    year: 2025,
    amountEur: 3639886985,
    quantityTonnes: 458996,
  },
  {
    category: "Dairy Produce",
    year: 2024,
    amountEur: 6476113245,
    quantityTonnes: 1629680,
  },
  {
    category: "Dairy Produce",
    year: 2025,
    amountEur: 7232396029,
    quantityTonnes: 1957463,
  },
  {
    category: "Beverages",
    year: 2024,
    amountEur: 2199296606,
    quantityTonnes: 1110843,
  },
  {
    category: "Beverages",
    year: 2025,
    amountEur: 2242733798,
    quantityTonnes: 1162653,
  },
  {
    category: "Cereal & cereal preparation",
    year: 2024,
    amountEur: 732198930,
    quantityTonnes: 292784,
  },
  {
    category: "Cereal & cereal preparation",
    year: 2025,
    amountEur: 709716572,
    quantityTonnes: 278761,
  },
  {
    category: "Fish",
    year: 2024,
    amountEur: 598961683,
    quantityTonnes: 152481,
  },
  {
    category: "Fish",
    year: 2025,
    amountEur: 672619762,
    quantityTonnes: 191047,
  },
];

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && quoted && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function numberCell(value: string) {
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseExportCsv(text: string): ExportRow[] {
  const [headerLine, ...bodyLines] = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!headerLine) {
    return [];
  }

  const headers = parseCsvLine(headerLine);
  const yearColumns = headers
    .map((header, index) => {
      const match = header.match(/^CY_(\d{4})_value$/i);
      if (!match) {
        return null;
      }

      const tonnesIndex = headers.findIndex(
        (candidate) =>
          candidate.toLowerCase() === `cy_${match[1]}_tonnes`.toLowerCase(),
      );

      return {
        year: Number.parseInt(match[1], 10),
        valueIndex: index,
        tonnesIndex,
      };
    })
    .filter((column): column is NonNullable<typeof column> => Boolean(column));

  const rows: ExportRow[] = [];

  for (const line of bodyLines) {
    const cells = parseCsvLine(line);
    const category = cells[0];
    if (!category) {
      continue;
    }

    if (yearColumns.length) {
      for (const column of yearColumns) {
        rows.push({
          category,
          year: column.year,
          amountEur: numberCell(cells[column.valueIndex] ?? ""),
          quantityTonnes:
            column.tonnesIndex >= 0
              ? numberCell(cells[column.tonnesIndex] ?? "")
              : 0,
        });
      }
      continue;
    }

    const [, legacyCategory, year, amount, quantity] = cells;
    if (legacyCategory && year) {
      rows.push({
        category: legacyCategory,
        year: Number.parseInt(year, 10),
        amountEur: numberCell(amount ?? ""),
        quantityTonnes: numberCell(quantity ?? ""),
      });
    }
  }

  return rows.filter((row) => Number.isFinite(row.year));
}

type FetchLike = typeof fetch;

async function resolveCurrentExportsUrl(fetcher: FetchLike) {
  const response = await fetcher(EXPORTS_DATASET_API, {
    headers: { "User-Agent": "farm-dashboard/0.1" },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    throw new Error("DAFM package metadata failed");
  }

  const payload = (await response.json()) as {
    result?: { resources?: Array<{ format?: string; url?: string }> };
  };
  const resource = payload.result?.resources?.find(
    (item) => item.format?.toUpperCase() === "CSV" && item.url,
  );

  if (!resource?.url) {
    throw new Error("DAFM export CSV URL missing");
  }

  return resource.url;
}

export async function loadExportsPayload(
  fetcher: FetchLike,
): Promise<ExportPayload> {
  try {
    const url = await resolveCurrentExportsUrl(fetcher);
    const response = await fetcher(url, {
      cache: "no-store",
      headers: { "User-Agent": "farm-dashboard/0.1" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`DAFM export CSV failed with ${response.status}`);
    }

    const rows = parseExportCsv(await response.text());
    if (!rows.length) {
      throw new Error("DAFM export CSV parsed no rows");
    }

    return {
      rows,
      source: {
        status: "live",
        label: "DAFM Open Data CSV",
        updated: "Live package metadata",
      },
    };
  } catch (error) {
    return {
      rows: EXPORTS_FALLBACK_ROWS,
      source: {
        status: "fallback",
        label: "Bundled DAFM extract",
        updated: "2026-03-12",
        warning:
          error instanceof Error
            ? error.message
            : "DAFM export feed unavailable",
      },
    };
  }
}
