"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  ExternalLink,
  Minus,
  Scale,
} from "lucide-react";
import { useMemo } from "react";

import { ThemedChart } from "@/components/charts/themed-chart";
import { fetchValidatedSourceSnapshot } from "@/lib/client/fetch-source-snapshot";
import {
  decodeJsonStat,
  type JsonStatDataset,
  jsonStatDatasetSchema,
} from "@/lib/cso/jsonstat";
import { sumByPeriodLabel, sumByYear } from "@/lib/data/market-series";
import { enterpriseLabels } from "@/lib/farm-plan";
import { type FarmEnterprise, useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

const outputCode: Record<FarmEnterprise, string> = {
  beef: "AEA01C02",
  dairy: "AEA01C08",
  sheep: "AEA01C04",
  tillage: "AEA01C10",
  mixed: "AEA01C28",
};

const priceCommodity: Partial<Record<FarmEnterprise, string>> = {
  beef: "01211",
  dairy: "01221",
  sheep: "01213",
  tillage: "011",
};

const outputLabel: Record<FarmEnterprise, string> = {
  beef: "Cattle output at producer prices",
  dairy: "Milk output at producer prices",
  sheep: "Sheep output at producer prices",
  tillage: "Crop output at producer prices",
  mixed: "Agricultural output at basic prices",
};

async function fetchCso(dataset: string) {
  return fetchValidatedSourceSnapshot<JsonStatDataset>(
    `/api/data/cso/${dataset}`,
    jsonStatDatasetSchema,
  );
}

function euroMillions(value: number) {
  return `€${new Intl.NumberFormat("en-IE", {
    maximumFractionDigits: 1,
  }).format(value)}m`;
}

export default function MarketsIncomePage() {
  const enterprise = useUiStore((state) => state.enterprise);
  const outputQuery = useQuery({
    queryKey: ["cso", "AEA01"],
    queryFn: () => fetchCso("AEA01"),
    staleTime: 6 * 60 * 60 * 1000,
  });
  const priceQuery = useQuery({
    queryKey: ["cso", "AHM05"],
    queryFn: () => fetchCso("AHM05"),
    staleTime: 6 * 60 * 60 * 1000,
    enabled: enterprise !== "mixed",
  });

  const output = useMemo(() => {
    if (!outputQuery.data?.data) return [];
    return sumByYear(
      decodeJsonStat(outputQuery.data.data),
      "TLIST(A1)",
      { STATISTIC: outputCode[enterprise], C02196V02652: "-" },
      2015,
      2100,
    );
  }, [enterprise, outputQuery.data]);

  const price = useMemo(() => {
    const commodity = priceCommodity[enterprise];
    if (!priceQuery.data?.data || !commodity) return [];
    return sumByPeriodLabel(
      decodeJsonStat(priceQuery.data.data),
      "TLIST(M1)",
      { STATISTIC: "AHM05C01", C02818V03389: commodity },
      2023,
      2100,
    );
  }, [enterprise, priceQuery.data]);

  const latestOutput = output.at(-1);
  const priorOutput = output.at(-2);
  const outputChange =
    latestOutput && priorOutput && priorOutput.value
      ? ((latestOutput.value - priorOutput.value) / priorOutput.value) * 100
      : null;
  const latestPrice = price.at(-1);
  const priorPrice = price.at(-2);
  const priceChange =
    latestPrice && priorPrice && priorPrice.value
      ? ((latestPrice.value - priorPrice.value) / priorPrice.value) * 100
      : null;

  const changeIcon = (change: number | null) => {
    if (change === null || Math.abs(change) < 0.05) return Minus;
    return change > 0 ? ArrowUpRight : ArrowDownRight;
  };

  return (
    <div>
      <header className="border-b border-border pb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Markets · {enterpriseLabels[enterprise]} context
        </p>
        <h1 className="font-editorial mt-2 text-5xl font-medium tracking-[-0.035em] sm:text-6xl">
          National signals, kept in scope
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          CSO output values and price indices can provide commercial context.
          They are national, lagged statistics—not your sale price, margin, or a
          recommendation to buy or sell.
        </p>
      </header>

      <section className="grid border-b border-border md:grid-cols-2">
        <article className="border-b border-border py-7 md:border-b-0 md:border-r md:pr-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Latest annual output
          </p>
          {latestOutput ? (
            <>
              <div className="mt-3 flex items-end gap-3">
                <p className="font-editorial text-5xl font-medium">
                  {euroMillions(latestOutput.value)}
                </p>
                {outputChange !== null ? (
                  <p
                    className={cn(
                      "mb-1 flex items-center gap-1 text-sm font-semibold",
                      outputChange >= 0 ? "text-success" : "text-destructive",
                    )}
                  >
                    {(() => {
                      const Icon = changeIcon(outputChange);
                      return <Icon className="h-4 w-4" />;
                    })()}
                    {Math.abs(outputChange).toFixed(1)}%
                  </p>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {outputLabel[enterprise]} · {latestOutput.year} · Euro million
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              {outputQuery.isLoading ? "Loading CSO output…" : "Unavailable"}
            </p>
          )}
        </article>

        <article className="py-7 md:pl-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Latest output price index
          </p>
          {enterprise === "mixed" ? (
            <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
              A mixed enterprise has no honest single commodity index. Choose a
              specific enterprise in farm settings before treating one series as
              relevant.
            </p>
          ) : latestPrice ? (
            <>
              <div className="mt-3 flex items-end gap-3">
                <p className="font-editorial text-5xl font-medium">
                  {latestPrice.value.toFixed(1)}
                </p>
                {priceChange !== null ? (
                  <p
                    className={cn(
                      "mb-1 flex items-center gap-1 text-sm font-semibold",
                      priceChange >= 0 ? "text-success" : "text-destructive",
                    )}
                  >
                    {(() => {
                      const Icon = changeIcon(priceChange);
                      return <Icon className="h-4 w-4" />;
                    })()}
                    {Math.abs(priceChange).toFixed(1)}%
                  </p>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                CSO monthly output price index · {latestPrice.label}
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              {priceQuery.isLoading ? "Loading CSO prices…" : "Unavailable"}
            </p>
          )}
        </article>
      </section>

      <section className="border-b border-border py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Direction, not prediction
            </p>
            <h2 className="font-editorial mt-1 text-3xl font-medium">
              {outputLabel[enterprise]}
            </h2>
          </div>
          <a
            href="https://www.cso.ie/en/statistics/agriculture/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
          >
            CSO agriculture
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        {output.length ? (
          <div className="mt-6">
            <ThemedChart
              style={{ height: 340 }}
              option={{
                aria: {
                  enabled: true,
                  description: `${outputLabel[enterprise]} annual values in Euro million.`,
                },
                tooltip: {
                  trigger: "axis",
                  valueFormatter: (value: unknown) =>
                    euroMillions(Number(value)),
                },
                grid: { left: 62, right: 16, top: 20, bottom: 42 },
                xAxis: {
                  type: "category",
                  data: output.map((item) => String(item.year)),
                },
                yAxis: {
                  type: "value",
                  name: "€ million",
                  nameLocation: "middle",
                  nameGap: 48,
                },
                series: [
                  {
                    name: outputLabel[enterprise],
                    type: "line",
                    smooth: false,
                    symbol: "circle",
                    symbolSize: 7,
                    data: output.map((item) => item.value),
                  },
                ],
              }}
            />
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            No valid output series is available.
          </p>
        )}
      </section>

      {enterprise !== "mixed" ? (
        <section className="border-b border-border py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Recent index
          </p>
          <h2 className="font-editorial mt-1 text-3xl font-medium">
            Monthly output price direction
          </h2>
          {price.length ? (
            <div className="mt-6">
              <ThemedChart
                style={{ height: 300 }}
                option={{
                  aria: {
                    enabled: true,
                    description: `${enterpriseLabels[enterprise]} monthly output price index.`,
                  },
                  tooltip: { trigger: "axis" },
                  grid: { left: 54, right: 16, top: 18, bottom: 60 },
                  xAxis: {
                    type: "category",
                    data: price.map((item) => item.label),
                    axisLabel: { hideOverlap: true },
                  },
                  yAxis: { type: "value", name: "Index" },
                  dataZoom: [{ type: "inside" }],
                  series: [
                    {
                      name: `${enterpriseLabels[enterprise]} price index`,
                      type: "line",
                      smooth: false,
                      showSymbol: false,
                      data: price.map((item) => item.value),
                    },
                  ],
                }}
              />
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              No valid price-index series is available.
            </p>
          )}
        </section>
      ) : null}

      <footer className="flex gap-4 py-7 text-sm leading-6 text-muted-foreground">
        <Scale className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p>
          Values retain the CSO unit. “Euro Million” is rendered as millions,
          not literal euros. Zero is shown only when published; missing data is
          unavailable.
        </p>
      </footer>
    </div>
  );
}
