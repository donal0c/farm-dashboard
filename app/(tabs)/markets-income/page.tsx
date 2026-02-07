"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Banknote, Milk, Ship } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ThemedChart } from "@/components/charts/themed-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  decodeJsonStat,
  type JsonStatDataset,
  type JsonStatRow,
  parseYear,
} from "@/lib/cso/jsonstat";

type ExportRow = {
  category: string;
  year: number;
  amountEur: number;
  quantityTonnes: number;
};

type CountyAggregate = {
  county: string;
  beneficiaries: number;
  totalPayment: number;
};

const currency = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const queryDefaults = {
  staleTime: 30 * 60 * 1000,
  gcTime: 60 * 60 * 1000,
  refetchOnWindowFocus: false as const,
  refetchOnReconnect: false as const,
  retry: 1,
};

async function fetchCso(dataset: string) {
  const response = await fetch(`/api/data/cso/${dataset}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${dataset}`);
  }
  return (await response.json()) as JsonStatDataset;
}

function safeDecode(dataset?: JsonStatDataset | null) {
  if (!dataset) {
    return [];
  }

  try {
    return decodeJsonStat(dataset);
  } catch {
    return [];
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function collectYears(rows: JsonStatRow[], timeDimension: string) {
  return Array.from(
    new Set(
      rows
        .map((row) => parseYear(String(row[timeDimension])))
        .filter((year) => Number.isFinite(year)),
    ),
  ).sort((a, b) => a - b);
}

function sumByYear(
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

function sumByPeriodLabel(
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

function latestValue(rows: Array<{ year: number; value: number }>) {
  if (!rows.length) {
    return 0;
  }
  return rows[rows.length - 1].value;
}

export default function MarketsIncomePage() {
  const aea01 = useQuery({
    queryKey: ["cso", "AEA01"],
    queryFn: () => fetchCso("AEA01"),
    ...queryDefaults,
  });
  const aca03 = useQuery({
    queryKey: ["cso", "ACA03"],
    queryFn: () => fetchCso("ACA03"),
    ...queryDefaults,
  });
  const ahm05 = useQuery({
    queryKey: ["cso", "AHM05"],
    queryFn: () => fetchCso("AHM05"),
    ...queryDefaults,
  });
  const aaa09 = useQuery({
    queryKey: ["cso", "AAA09"],
    queryFn: () => fetchCso("AAA09"),
    ...queryDefaults,
  });
  const adm01 = useQuery({
    queryKey: ["cso", "ADM01"],
    queryFn: () => fetchCso("ADM01"),
    ...queryDefaults,
  });
  const akm03 = useQuery({
    queryKey: ["cso", "AKM03"],
    queryFn: () => fetchCso("AKM03"),
    ...queryDefaults,
  });
  const ajm09 = useQuery({
    queryKey: ["cso", "AJM09"],
    queryFn: () => fetchCso("AJM09"),
    ...queryDefaults,
  });
  const pfsa03 = useQuery({
    queryKey: ["cso", "PFSA03"],
    queryFn: () => fetchCso("PFSA03"),
    ...queryDefaults,
  });

  const exportsQuery = useQuery({
    queryKey: ["exports"],
    queryFn: async () => {
      const response = await fetch("/api/data/exports");
      if (!response.ok) {
        throw new Error("Failed to load exports");
      }
      return (await response.json()) as ExportRow[];
    },
    ...queryDefaults,
  });

  const capCountyQuery = useQuery({
    queryKey: ["cap-counties"],
    queryFn: async () => {
      const response = await fetch("/api/data/cap-counties");
      if (!response.ok) {
        throw new Error("Failed to load CAP county data");
      }
      return (await response.json()) as CountyAggregate[];
    },
    ...queryDefaults,
  });

  const decoded = useMemo(() => {
    return {
      aea01: safeDecode(aea01.data),
      aca03: safeDecode(aca03.data),
      ahm05: safeDecode(ahm05.data),
      aaa09: safeDecode(aaa09.data),
      adm01: safeDecode(adm01.data),
      akm03: safeDecode(akm03.data),
      ajm09: safeDecode(ajm09.data),
      pfsa03: safeDecode(pfsa03.data),
    };
  }, [
    aea01.data,
    aca03.data,
    ahm05.data,
    aaa09.data,
    adm01.data,
    akm03.data,
    ajm09.data,
    pfsa03.data,
  ]);

  const allYears = useMemo(() => {
    const years = [
      ...collectYears(decoded.aea01, "TLIST(A1)"),
      ...collectYears(decoded.aca03, "TLIST(A1)"),
      ...collectYears(decoded.aaa09, "TLIST(A1)"),
      ...collectYears(decoded.ahm05, "TLIST(M1)"),
      ...collectYears(decoded.adm01, "TLIST(M1)"),
      ...collectYears(decoded.akm03, "TLIST(M1)"),
      ...collectYears(decoded.ajm09, "TLIST(M1)"),
      ...collectYears(decoded.pfsa03, "TLIST(Q1)"),
    ];
    return Array.from(new Set(years)).sort((a, b) => a - b);
  }, [decoded]);

  const minYear = allYears[0] ?? 2018;
  const maxYear = allYears[allYears.length - 1] ?? 2025;

  const [fromYear, setFromYear] = useState(Math.max(minYear, maxYear - 8));
  const [toYear, setToYear] = useState(maxYear);
  const [region, setRegion] = useState("-");
  const [showExtendedCharts, setShowExtendedCharts] = useState(false);
  const [draftFromYear, setDraftFromYear] = useState(String(fromYear));
  const [draftToYear, setDraftToYear] = useState(String(toYear));
  const effectiveToYear = Number.isFinite(toYear)
    ? clamp(toYear, minYear, maxYear)
    : maxYear;
  const effectiveFromYear = Number.isFinite(fromYear)
    ? clamp(fromYear, minYear, effectiveToYear)
    : Math.max(minYear, effectiveToYear - 8);
  const dataFromYear = useDeferredValue(effectiveFromYear);
  const dataToYear = useDeferredValue(effectiveToYear);

  useEffect(() => {
    setDraftFromYear(String(fromYear));
  }, [fromYear]);

  useEffect(() => {
    setDraftToYear(String(toYear));
  }, [toYear]);

  const applyDraftYears = () => {
    const parsedFrom = Number.parseInt(draftFromYear, 10);
    const parsedTo = Number.parseInt(draftToYear, 10);

    const nextTo = Number.isFinite(parsedTo)
      ? clamp(parsedTo, minYear, maxYear)
      : effectiveToYear;
    const nextFrom = Number.isFinite(parsedFrom)
      ? clamp(parsedFrom, minYear, nextTo)
      : effectiveFromYear;

    setFromYear(nextFrom);
    setToYear(nextTo);
  };

  const regionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of decoded.aca03) {
      map.set(String(row.C02196V04140), String(row.C02196V04140_label));
    }
    const options = Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1]),
    );
    return options.length ? options : [["-", "State"]];
  }, [decoded.aca03]);

  const outputSeries = useMemo(() => {
    const cattle = sumByYear(
      decoded.aea01,
      "TLIST(A1)",
      { STATISTIC: "AEA01C02", C02196V02652: "-" },
      dataFromYear,
      dataToYear,
    );
    const milk = sumByYear(
      decoded.aea01,
      "TLIST(A1)",
      { STATISTIC: "AEA01C08", C02196V02652: "-" },
      dataFromYear,
      dataToYear,
    );
    const sheep = sumByYear(
      decoded.aea01,
      "TLIST(A1)",
      { STATISTIC: "AEA01C04", C02196V02652: "-" },
      dataFromYear,
      dataToYear,
    );
    const crops = sumByYear(
      decoded.aea01,
      "TLIST(A1)",
      { STATISTIC: "AEA01C10", C02196V02652: "-" },
      dataFromYear,
      dataToYear,
    );

    const years = Array.from(
      new Set([...cattle, ...milk, ...sheep, ...crops].map((r) => r.year)),
    ).sort((a, b) => a - b);

    return {
      years,
      cattle: years.map(
        (year) => cattle.find((row) => row.year === year)?.value ?? 0,
      ),
      milk: years.map(
        (year) => milk.find((row) => row.year === year)?.value ?? 0,
      ),
      sheep: years.map(
        (year) => sheep.find((row) => row.year === year)?.value ?? 0,
      ),
      crops: years.map(
        (year) => crops.find((row) => row.year === year)?.value ?? 0,
      ),
    };
  }, [decoded.aea01, dataFromYear, dataToYear]);

  const regionalComparison = useMemo(() => {
    const currentYear = dataToYear;
    const regionalRows = decoded.aca03.filter(
      (row) =>
        parseYear(String(row["TLIST(A1)"])) === currentYear &&
        row.STATISTIC === "ACA03C44" &&
        row.C02196V04140 !== "-",
    );

    return regionalRows
      .map((row) => ({
        region: String(row.C02196V04140_label),
        value: Number(row.value),
      }))
      .sort((a, b) => b.value - a.value);
  }, [decoded.aca03, dataToYear]);

  const pricesSeries = useMemo(() => {
    const monthly = {
      cattle: sumByPeriodLabel(
        decoded.ahm05,
        "TLIST(M1)",
        { STATISTIC: "AHM05C01", C02818V03389: "01211" },
        dataFromYear,
        dataToYear,
      ),
      milk: sumByPeriodLabel(
        decoded.ahm05,
        "TLIST(M1)",
        { STATISTIC: "AHM05C01", C02818V03389: "01221" },
        dataFromYear,
        dataToYear,
      ),
      sheep: sumByPeriodLabel(
        decoded.ahm05,
        "TLIST(M1)",
        { STATISTIC: "AHM05C01", C02818V03389: "01213" },
        dataFromYear,
        dataToYear,
      ),
      crops: sumByPeriodLabel(
        decoded.ahm05,
        "TLIST(M1)",
        { STATISTIC: "AHM05C01", C02818V03389: "011" },
        dataFromYear,
        dataToYear,
      ),
    };

    const labels = Array.from(
      new Set(
        Object.values(monthly)
          .flat()
          .map((row) => row.label),
      ),
    );

    return {
      labels,
      cattle: labels.map(
        (label) =>
          monthly.cattle.find((row) => row.label === label)?.value ?? 0,
      ),
      milk: labels.map(
        (label) => monthly.milk.find((row) => row.label === label)?.value ?? 0,
      ),
      sheep: labels.map(
        (label) => monthly.sheep.find((row) => row.label === label)?.value ?? 0,
      ),
      crops: labels.map(
        (label) => monthly.crops.find((row) => row.label === label)?.value ?? 0,
      ),
    };
  }, [decoded.ahm05, dataFromYear, dataToYear]);

  const livestockNumbers = useMemo(() => {
    const rows = {
      cattle: sumByYear(
        decoded.aaa09,
        "TLIST(A1)",
        { STATISTIC: "AAA09", C02148V02965: "01", C02196V04140: region },
        dataFromYear,
        dataToYear,
      ),
      sheep: sumByYear(
        decoded.aaa09,
        "TLIST(A1)",
        { STATISTIC: "AAA09", C02148V02965: "02", C02196V04140: region },
        dataFromYear,
        dataToYear,
      ),
      pigs: sumByYear(
        decoded.aaa09,
        "TLIST(A1)",
        { STATISTIC: "AAA09", C02148V02965: "03", C02196V04140: region },
        dataFromYear,
        dataToYear,
      ),
    };

    const years = Array.from(
      new Set(
        Object.values(rows)
          .flat()
          .map((row) => row.year),
      ),
    ).sort((a, b) => a - b);

    return {
      years,
      cattle: years.map(
        (year) => rows.cattle.find((row) => row.year === year)?.value ?? 0,
      ),
      sheep: years.map(
        (year) => rows.sheep.find((row) => row.year === year)?.value ?? 0,
      ),
      pigs: years.map(
        (year) => rows.pigs.find((row) => row.year === year)?.value ?? 0,
      ),
    };
  }, [decoded.aaa09, dataFromYear, dataToYear, region]);

  const slaughterings = useMemo(() => {
    const rows = {
      cattle: sumByPeriodLabel(
        decoded.adm01,
        "TLIST(M1)",
        { STATISTIC: "ADM01C1", C02079V02513: "5009" },
        dataFromYear,
        dataToYear,
      ),
      sheep: sumByPeriodLabel(
        decoded.adm01,
        "TLIST(M1)",
        { STATISTIC: "ADM01C1", C02079V02513: "2" },
        dataFromYear,
        dataToYear,
      ),
      pigs: sumByPeriodLabel(
        decoded.adm01,
        "TLIST(M1)",
        { STATISTIC: "ADM01C1", C02079V02513: "3" },
        dataFromYear,
        dataToYear,
      ),
    };

    const labels = Array.from(
      new Set(
        Object.values(rows)
          .flat()
          .map((row) => row.label),
      ),
    );

    return {
      labels,
      cattle: labels.map(
        (label) => rows.cattle.find((row) => row.label === label)?.value ?? 0,
      ),
      sheep: labels.map(
        (label) => rows.sheep.find((row) => row.label === label)?.value ?? 0,
      ),
      pigs: labels.map(
        (label) => rows.pigs.find((row) => row.label === label)?.value ?? 0,
      ),
    };
  }, [decoded.adm01, dataFromYear, dataToYear]);

  const dairyProduction = useMemo(() => {
    const rows = {
      cheese: sumByPeriodLabel(
        decoded.akm03,
        "TLIST(M1)",
        { STATISTIC: "AKM03", C02064V02491: "003" },
        dataFromYear,
        dataToYear,
      ),
      butter: sumByPeriodLabel(
        decoded.akm03,
        "TLIST(M1)",
        { STATISTIC: "AKM03", C02064V02491: "004" },
        dataFromYear,
        dataToYear,
      ),
      skimmedPowder: sumByPeriodLabel(
        decoded.akm03,
        "TLIST(M1)",
        { STATISTIC: "AKM03", C02064V02491: "021" },
        dataFromYear,
        dataToYear,
      ),
    };

    const labels = Array.from(
      new Set(
        Object.values(rows)
          .flat()
          .map((row) => row.label),
      ),
    );

    return {
      labels,
      cheese: labels.map(
        (label) => rows.cheese.find((row) => row.label === label)?.value ?? 0,
      ),
      butter: labels.map(
        (label) => rows.butter.find((row) => row.label === label)?.value ?? 0,
      ),
      skimmedPowder: labels.map(
        (label) =>
          rows.skimmedPowder.find((row) => row.label === label)?.value ?? 0,
      ),
    };
  }, [decoded.akm03, dataFromYear, dataToYear]);

  const fertiliser = useMemo(() => {
    const prices = {
      can: sumByPeriodLabel(
        decoded.ajm09,
        "TLIST(M1)",
        { STATISTIC: "AJM09C01", C02069V02500: "001" },
        dataFromYear,
        dataToYear,
      ),
      urea: sumByPeriodLabel(
        decoded.ajm09,
        "TLIST(M1)",
        { STATISTIC: "AJM09C01", C02069V02500: "002" },
        dataFromYear,
        dataToYear,
      ),
    };

    const sales = sumByPeriodLabel(
      decoded.pfsa03,
      "TLIST(Q1)",
      { STATISTIC: "PFSA03C01", C02196V02652: "-" },
      dataFromYear,
      dataToYear,
    );

    const labels = Array.from(
      new Set([...prices.can, ...prices.urea].map((row) => row.label)),
    );

    return {
      labels,
      can: labels.map(
        (label) => prices.can.find((row) => row.label === label)?.value ?? 0,
      ),
      urea: labels.map(
        (label) => prices.urea.find((row) => row.label === label)?.value ?? 0,
      ),
      sales,
    };
  }, [decoded.ajm09, decoded.pfsa03, dataFromYear, dataToYear]);

  const exportsByYear = useMemo(() => {
    const totals = new Map<number, number>();
    for (const row of exportsQuery.data ?? []) {
      totals.set(row.year, (totals.get(row.year) ?? 0) + row.amountEur);
    }

    return Array.from(totals.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, value]) => ({ year, value }));
  }, [exportsQuery.data]);

  const topExportCategories = useMemo(() => {
    if (!exportsQuery.data?.length) {
      return [];
    }

    const latestYear = Math.max(...exportsQuery.data.map((row) => row.year));
    return exportsQuery.data
      .filter((row) => row.year === latestYear)
      .sort((a, b) => b.amountEur - a.amountEur)
      .slice(0, 8);
  }, [exportsQuery.data]);

  const capColumns = useMemo<ColumnDef<CountyAggregate>[]>(
    () => [
      { accessorKey: "county", header: "County" },
      {
        accessorKey: "beneficiaries",
        header: "Beneficiaries",
        cell: ({ row }) => row.original.beneficiaries.toLocaleString(),
      },
      {
        accessorKey: "totalPayment",
        header: "Total Payment",
        cell: ({ row }) => currency.format(row.original.totalPayment),
      },
    ],
    [],
  );

  const capTable = useReactTable({
    data: capCountyQuery.data?.slice(0, 12) ?? [],
    columns: capColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const kpiTotalOutput = latestValue(
    sumByYear(
      decoded.aea01,
      "TLIST(A1)",
      { STATISTIC: "AEA01C55", C02196V02652: "-" },
      dataFromYear,
      dataToYear,
    ),
  );
  const kpiExports = exportsByYear.length
    ? exportsByYear[exportsByYear.length - 1].value
    : 0;
  const kpiMilkIndex = pricesSeries.milk.length
    ? pricesSeries.milk[pricesSeries.milk.length - 1]
    : 0;

  const loading =
    aea01.isLoading ||
    aca03.isLoading ||
    ahm05.isLoading ||
    aaa09.isLoading ||
    adm01.isLoading ||
    akm03.isLoading ||
    ajm09.isLoading ||
    pfsa03.isLoading;
  const datasetErrors = [
    ["AEA01", aea01.error],
    ["ACA03", aca03.error],
    ["AHM05", ahm05.error],
    ["AAA09", aaa09.error],
    ["ADM01", adm01.error],
    ["AKM03", akm03.error],
    ["AJM09", ajm09.error],
    ["PFSA03", pfsa03.error],
    ["exports", exportsQuery.error],
    ["cap-counties", capCountyQuery.error],
  ].filter((entry): entry is [string, Error] => entry[1] instanceof Error);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter by region and time period for economic and market series.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 text-sm">
            Region
            <select
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3"
            >
              {regionOptions.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            From year
            <input
              type="number"
              min={minYear}
              max={effectiveToYear}
              value={draftFromYear}
              onChange={(event) => {
                setDraftFromYear(event.target.value);
              }}
              onBlur={applyDraftYears}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  applyDraftYears();
                }
              }}
              className="h-10 rounded-md border border-input bg-background px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            To year
            <input
              type="number"
              min={fromYear}
              max={maxYear}
              value={draftToYear}
              onChange={(event) => {
                setDraftToYear(event.target.value);
              }}
              onBlur={applyDraftYears}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  applyDraftYears();
                }
              }}
              className="h-10 rounded-md border border-input bg-background px-3"
            />
          </label>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <KpiCard
          label="Total agricultural output (latest in range)"
          value={currency.format(kpiTotalOutput)}
          icon={Banknote}
          variant="success"
        />
        <KpiCard
          label="Agri-food exports (latest year)"
          value={currency.format(kpiExports)}
          icon={Ship}
          variant="info"
        />
        <KpiCard
          label="Milk price index (latest month)"
          value={kpiMilkIndex.toFixed(2)}
          icon={Milk}
          variant="default"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Agricultural Output Trend (CSO AEA01)</CardTitle>
          <CardDescription>
            Cattle, milk, sheep, and crops used as farm-type income proxy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemedChart
            style={{ height: 360 }}
            option={{
              tooltip: { trigger: "axis" },
              legend: { data: ["Cattle", "Milk", "Sheep", "Crops"] },
              xAxis: { type: "category", data: outputSeries.years },
              yAxis: { type: "value" },
              dataZoom: [{ type: "inside" }, { type: "slider" }],
              series: [
                { name: "Cattle", type: "line", data: outputSeries.cattle },
                { name: "Milk", type: "line", data: outputSeries.milk },
                { name: "Sheep", type: "line", data: outputSeries.sheep },
                { name: "Crops", type: "line", data: outputSeries.crops },
              ],
            }}
          />
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Regional Income Comparison (CSO ACA03)</CardTitle>
            <CardDescription>
              Entrepreneurial income by NUTS3 region ({toYear}).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemedChart
              style={{ height: 360 }}
              option={{
                tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
                xAxis: { type: "value" },
                yAxis: {
                  type: "category",
                  data: regionalComparison.map((item) => item.region),
                },
                series: [
                  {
                    type: "bar",
                    data: regionalComparison.map((item) => item.value),
                  },
                ],
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Price Indices (CSO AHM05)</CardTitle>
            <CardDescription>
              Monthly cattle, milk, sheep, and crop output indices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemedChart
              style={{ height: 360 }}
              option={{
                tooltip: { trigger: "axis" },
                xAxis: { type: "category", data: pricesSeries.labels },
                yAxis: { type: "value" },
                dataZoom: [{ type: "inside" }, { type: "slider" }],
                series: [
                  { name: "Cattle", type: "line", data: pricesSeries.cattle },
                  { name: "Milk", type: "line", data: pricesSeries.milk },
                  { name: "Sheep", type: "line", data: pricesSeries.sheep },
                  { name: "Crops", type: "line", data: pricesSeries.crops },
                ],
              }}
            />
          </CardContent>
        </Card>
      </section>

      {!showExtendedCharts ? (
        <Card>
          <CardHeader>
            <CardTitle>Extended Analytics</CardTitle>
            <CardDescription>
              Load additional charts (livestock, dairy, fertiliser, exports, and
              CAP table) on demand to keep this tab responsive on first load.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button
              type="button"
              onClick={() => setShowExtendedCharts(true)}
              className="inline-flex h-10 items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Load full analytics
            </button>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Livestock Numbers (CSO AAA09)</CardTitle>
                <CardDescription>
                  Region-aware annual livestock headcount.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ThemedChart
                  style={{ height: 320 }}
                  option={{
                    tooltip: { trigger: "axis" },
                    xAxis: { type: "category", data: livestockNumbers.years },
                    yAxis: { type: "value" },
                    series: [
                      {
                        name: "Cattle",
                        type: "line",
                        data: livestockNumbers.cattle,
                      },
                      {
                        name: "Sheep",
                        type: "line",
                        data: livestockNumbers.sheep,
                      },
                      {
                        name: "Pigs",
                        type: "line",
                        data: livestockNumbers.pigs,
                      },
                    ],
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Slaughterings (CSO ADM01)</CardTitle>
                <CardDescription>
                  Monthly livestock slaughter counts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ThemedChart
                  style={{ height: 320 }}
                  option={{
                    tooltip: { trigger: "axis" },
                    xAxis: { type: "category", data: slaughterings.labels },
                    yAxis: { type: "value" },
                    dataZoom: [{ type: "inside" }, { type: "slider" }],
                    series: [
                      {
                        name: "Cattle",
                        type: "line",
                        data: slaughterings.cattle,
                      },
                      {
                        name: "Sheep",
                        type: "line",
                        data: slaughterings.sheep,
                      },
                      { name: "Pigs", type: "line", data: slaughterings.pigs },
                    ],
                  }}
                />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Dairy Production (CSO AKM03)</CardTitle>
                <CardDescription>
                  Cheese, butter, and skimmed milk powder production.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ThemedChart
                  style={{ height: 320 }}
                  option={{
                    tooltip: { trigger: "axis" },
                    xAxis: { type: "category", data: dairyProduction.labels },
                    yAxis: { type: "value" },
                    dataZoom: [{ type: "inside" }, { type: "slider" }],
                    series: [
                      {
                        name: "Cheese",
                        type: "line",
                        data: dairyProduction.cheese,
                      },
                      {
                        name: "Butter",
                        type: "line",
                        data: dairyProduction.butter,
                      },
                      {
                        name: "Skimmed Milk Powder",
                        type: "line",
                        data: dairyProduction.skimmedPowder,
                      },
                    ],
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fertiliser Prices and Sales</CardTitle>
                <CardDescription>
                  CSO AJM09 prices and PFSA03 quarterly sales share.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <ThemedChart
                  style={{ height: 240 }}
                  option={{
                    tooltip: { trigger: "axis" },
                    xAxis: { type: "category", data: fertiliser.labels },
                    yAxis: { type: "value" },
                    series: [
                      { name: "CAN", type: "line", data: fertiliser.can },
                      { name: "Urea", type: "line", data: fertiliser.urea },
                    ],
                  }}
                />
                <ThemedChart
                  style={{ height: 180 }}
                  option={{
                    tooltip: { trigger: "axis" },
                    xAxis: {
                      type: "category",
                      data: fertiliser.sales.map((row) => row.label),
                    },
                    yAxis: { type: "value" },
                    series: [
                      {
                        type: "bar",
                        data: fertiliser.sales.map((row) => row.value),
                      },
                    ],
                  }}
                />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Agri-Food Exports (DAFM)</CardTitle>
                <CardDescription>Annual export value totals.</CardDescription>
              </CardHeader>
              <CardContent>
                <ThemedChart
                  style={{ height: 300 }}
                  option={{
                    tooltip: { trigger: "axis" },
                    xAxis: {
                      type: "category",
                      data: exportsByYear.map((row) => row.year),
                    },
                    yAxis: { type: "value" },
                    series: [
                      {
                        type: "bar",
                        data: exportsByYear.map((row) => row.value),
                      },
                    ],
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Export Categories (Latest Year)</CardTitle>
                <CardDescription>
                  Commodity breakdown by export value.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ThemedChart
                  style={{ height: 300 }}
                  option={{
                    tooltip: {
                      trigger: "axis",
                      axisPointer: { type: "shadow" },
                    },
                    xAxis: { type: "value" },
                    yAxis: {
                      type: "category",
                      data: topExportCategories.map((row) => row.category),
                    },
                    series: [
                      {
                        type: "bar",
                        data: topExportCategories.map((row) => row.amountEur),
                      },
                    ],
                  }}
                />
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>CAP Payment County Comparison</CardTitle>
              <CardDescription>
                Top counties by CAP beneficiary payment totals.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50">
                    {capTable.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-3 py-2 text-left font-medium"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {capTable.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="border-t border-border">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-3 py-2">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading data...</p>
      ) : null}
      {datasetErrors.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Data Source Warnings</CardTitle>
            <CardDescription>
              Some feeds failed to load. Charts stay available with remaining
              data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {datasetErrors.map(([name, error]) => (
                <li key={name}>
                  {name}: {error.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
