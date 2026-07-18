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
import { sourceQueryStaleTime } from "@/lib/client/source-query-policy";
import {
  decodeJsonStat,
  type JsonStatDataset,
  jsonStatDatasetSchema,
} from "@/lib/cso/jsonstat";
import { sumByPeriodLabel, sumByYear } from "@/lib/data/market-series";
import { formatEuroMillions, formatSourceState } from "@/lib/evidence-format";
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

export default function MarketsIncomePage() {
  const enterprise = useUiStore((state) => state.enterprise);
  const outputQuery = useQuery({
    queryKey: ["cso", "AEA01"],
    queryFn: () => fetchCso("AEA01"),
    staleTime: sourceQueryStaleTime.cso,
  });
  const priceQuery = useQuery({
    queryKey: ["cso", "AHM05"],
    queryFn: () => fetchCso("AHM05"),
    staleTime: sourceQueryStaleTime.cso,
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
  const outputUnavailable =
    outputQuery.isError || outputQuery.data?.status === "unavailable";
  const priceUnavailable =
    priceQuery.isError || priceQuery.data?.status === "unavailable";

  const changeIcon = (change: number | null) => {
    if (change === null || Math.abs(change) < 0.05) return Minus;
    return change > 0 ? ArrowUpRight : ArrowDownRight;
  };

  return (
    <div className="min-w-0">
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

      <section className="grid gap-3 border-b border-border py-4 text-xs sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground">Geography</p>
          <p className="mt-1 font-semibold">Ireland · national series</p>
        </div>
        <div>
          <p className="text-muted-foreground">Publication cadence</p>
          <p className="mt-1 font-semibold">
            Annual output · monthly price index
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Source state</p>
          <p className="mt-1 font-semibold">
            {outputQuery.isLoading
              ? "Checking CSO"
              : outputUnavailable
                ? "Output series unavailable"
                : `${formatSourceState(outputQuery.data?.status)} · checked ${outputQuery.data?.fetchedAt ? new Intl.DateTimeFormat("en-IE", { dateStyle: "medium" }).format(new Date(outputQuery.data.fetchedAt)) : "unknown"}`}
          </p>
        </div>
      </section>

      <section className="grid border-b border-border md:grid-cols-2">
        <article className="border-b border-border py-7 md:border-b-0 md:border-r md:pr-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Latest annual output
          </p>
          {latestOutput ? (
            <>
              <div className="mt-3 flex items-end gap-3">
                <p className="font-editorial text-5xl font-medium">
                  {formatEuroMillions(latestOutput.value)}
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
            <div className="mt-4 text-sm">
              {outputQuery.isLoading ? (
                <output
                  className="block animate-pulse"
                  aria-label="Loading annual CSO output"
                >
                  <span className="block h-12 w-44 rounded bg-muted" />
                  <span className="mt-3 block h-4 w-64 max-w-full rounded bg-muted" />
                </output>
              ) : outputUnavailable ? (
                <>
                  <p className="font-semibold text-destructive">
                    Annual output is temporarily unavailable.
                  </p>
                  <p className="mt-1 leading-6 text-muted-foreground">
                    No national value or change has been substituted.
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  The current CSO release contains no matching annual series for
                  this enterprise.
                </p>
              )}
            </div>
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
            <div className="mt-4 text-sm">
              {priceQuery.isLoading ? (
                <output
                  className="block animate-pulse"
                  aria-label="Loading monthly CSO price index"
                >
                  <span className="block h-12 w-36 rounded bg-muted" />
                  <span className="mt-3 block h-4 w-56 max-w-full rounded bg-muted" />
                </output>
              ) : priceUnavailable ? (
                <>
                  <p className="font-semibold text-destructive">
                    Monthly price index is temporarily unavailable.
                  </p>
                  <p className="mt-1 leading-6 text-muted-foreground">
                    No index or direction has been inferred.
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  The current CSO release contains no matching monthly series.
                </p>
              )}
            </div>
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
        {outputQuery.isLoading ? (
          <output
            className="mt-6 block animate-pulse"
            aria-label="Loading annual output chart"
          >
            <span className="block h-[340px] rounded bg-muted" />
            <span className="mt-4 block h-16 rounded bg-muted" />
          </output>
        ) : output.length ? (
          <div className="mt-6">
            <ThemedChart
              style={{ height: 340 }}
              option={{
                animation: false,
                aria: {
                  enabled: true,
                  description: `${outputLabel[enterprise]} annual values in Euro million.`,
                },
                tooltip: {
                  trigger: "axis",
                  valueFormatter: (value: unknown) =>
                    formatEuroMillions(Number(value)),
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
                    lineStyle: { color: "#3a8a5c", width: 2.5 },
                    itemStyle: { color: "#3a8a5c" },
                    areaStyle: { color: "#3a8a5c", opacity: 0.08 },
                    data: output.map((item) => item.value),
                  },
                ],
              }}
            />
            <dl
              className="mt-4 grid grid-cols-1 gap-px overflow-hidden border border-border bg-border sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]"
              aria-label="Latest annual output values"
            >
              {output.slice(-5).map((item) => (
                <div key={item.year} className="bg-background px-3 py-3">
                  <dt className="text-xs text-muted-foreground">{item.year}</dt>
                  <dd className="mt-1 text-sm font-semibold">
                    {formatEuroMillions(item.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <div className="mt-6 border-l-2 border-border py-2 pl-4 text-sm">
            <p
              className={
                outputUnavailable
                  ? "font-semibold text-destructive"
                  : "font-semibold"
              }
            >
              {outputUnavailable
                ? "The annual output source is unavailable."
                : "No matching annual output series was published."}
            </p>
            <p className="mt-1 text-muted-foreground">
              No chart or zero value has been substituted.
            </p>
          </div>
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
          {priceQuery.isLoading ? (
            <output
              className="mt-6 block animate-pulse"
              aria-label="Loading monthly price-index chart"
            >
              <span className="block h-[300px] rounded bg-muted" />
              <span className="mt-4 block h-16 rounded bg-muted" />
            </output>
          ) : price.length ? (
            <div className="mt-6">
              <ThemedChart
                style={{ height: 300 }}
                option={{
                  animation: false,
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
                      lineStyle: { color: "#3a8a5c", width: 2.5 },
                      itemStyle: { color: "#3a8a5c" },
                      areaStyle: { color: "#3a8a5c", opacity: 0.08 },
                      data: price.map((item) => item.value),
                    },
                  ],
                }}
              />
              <dl
                className="mt-4 grid grid-cols-1 gap-px overflow-hidden border border-border bg-border sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]"
                aria-label="Four latest monthly price-index values"
              >
                {price.slice(-4).map((item) => (
                  <div key={item.label} className="bg-background px-3 py-3">
                    <dt className="truncate text-xs text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold">
                      {item.value.toFixed(1)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <div className="mt-6 border-l-2 border-border py-2 pl-4 text-sm">
              <p
                className={
                  priceUnavailable
                    ? "font-semibold text-destructive"
                    : "font-semibold"
                }
              >
                {priceUnavailable
                  ? "The monthly price-index source is unavailable."
                  : "No matching monthly price-index series was published."}
              </p>
              <p className="mt-1 text-muted-foreground">
                No chart or direction has been inferred.
              </p>
            </div>
          )}
        </section>
      ) : null}

      <footer className="flex gap-4 py-7 text-sm leading-6 text-muted-foreground">
        <Scale className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p>
          Values retain the CSO unit. “Euro Million” is rendered as millions,
          with compact billions where appropriate. The percentage is a change in
          the national series, not a farm return. Zero is shown only when
          published; missing data is unavailable.
        </p>
      </footer>
    </div>
  );
}
