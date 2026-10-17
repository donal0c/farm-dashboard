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

import { ThemedChart, useChartTokens } from "@/components/charts/themed-chart";
import { Fact, PageIntro, SectionHeading } from "@/components/ui/page-intro";
import { SourceNotice } from "@/components/ui/source-notice";
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

function Change({ value }: { value: number | null }) {
  if (value === null) return null;
  const flat = Math.abs(value) < 0.05;
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <p
      className={cn(
        "mb-1.5 flex items-center gap-1 text-sm font-semibold",
        flat
          ? "text-muted-foreground"
          : value > 0
            ? "text-success"
            : "text-act",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {Math.abs(value).toFixed(1)}%
      <span className="sr-only">
        {flat ? "unchanged" : value > 0 ? "up" : "down"} on the prior period
      </span>
    </p>
  );
}

export default function MarketsIncomePage() {
  const enterprise = useUiStore((state) => state.enterprise);
  const tokens = useChartTokens();
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

  const axisStyle = {
    axisLabel: { color: tokens.muted, fontFamily: tokens.fontFamily },
    splitLine: { lineStyle: { color: tokens.rule, type: "dashed" as const } },
    axisLine: { show: false },
    axisTick: { show: false },
  };

  return (
    <div className="min-w-0">
      <PageIntro
        title="National signals, kept in scope"
        lede="CSO output and price indices for context. National and lagged: not your price, margin, or a recommendation."
      />

      <dl className="grid gap-4 border-b border-rule py-5 sm:grid-cols-3">
        <Fact label="Geography">Ireland · national series</Fact>
        <Fact label="Publication cadence">
          Annual output · monthly price index
        </Fact>
        <Fact label="Source state">
          {outputQuery.isLoading
            ? "Checking CSO"
            : outputUnavailable
              ? "Output series unavailable"
              : `${formatSourceState(outputQuery.data?.status)} · checked ${outputQuery.data?.fetchedAt ? new Intl.DateTimeFormat("en-IE", { dateStyle: "medium" }).format(new Date(outputQuery.data.fetchedAt)) : "unknown"}`}
        </Fact>
      </dl>

      <section className="grid border-b border-rule md:grid-cols-2">
        <article className="border-b border-rule py-7 md:border-b-0 md:border-r md:pr-8">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Latest annual output
          </h2>
          {latestOutput ? (
            <>
              <div className="mt-3 flex items-end gap-3">
                <p className="font-editorial text-[3rem] font-medium leading-none tracking-[-0.025em]">
                  {formatEuroMillions(latestOutput.value)}
                </p>
                <Change value={outputChange} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {outputLabel[enterprise]} · {latestOutput.year} · Euro million
              </p>
            </>
          ) : outputQuery.isLoading ? (
            <output
              className="mt-4 block animate-pulse"
              aria-label="Loading annual CSO output"
            >
              <span className="block h-12 w-44 rounded-sm bg-muted" />
              <span className="mt-3 block h-4 w-64 max-w-full rounded-sm bg-muted" />
            </output>
          ) : (
            <SourceNotice
              tone={outputUnavailable ? "unavailable" : "empty"}
              className="mt-4"
              title={
                outputUnavailable
                  ? "Annual output is temporarily unavailable."
                  : "No matching annual series for this enterprise."
              }
              detail={
                outputUnavailable
                  ? "No national value or change has been substituted."
                  : "The current CSO release contains no matching annual series."
              }
              onRetry={
                outputUnavailable ? () => void outputQuery.refetch() : undefined
              }
            />
          )}
        </article>

        <article className="py-7 md:pl-8">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Latest output price index
          </h2>
          {enterprise === "mixed" ? (
            <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
              A mixed enterprise has no honest single commodity index. Choose a
              specific enterprise in farm settings before treating one series as
              relevant.
            </p>
          ) : latestPrice ? (
            <>
              <div className="mt-3 flex items-end gap-3">
                <p className="font-editorial text-[3rem] font-medium leading-none tracking-[-0.025em]">
                  {latestPrice.value.toFixed(1)}
                </p>
                <Change value={priceChange} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                CSO monthly output price index · {latestPrice.label}
              </p>
            </>
          ) : priceQuery.isLoading ? (
            <output
              className="mt-4 block animate-pulse"
              aria-label="Loading monthly CSO price index"
            >
              <span className="block h-12 w-36 rounded-sm bg-muted" />
              <span className="mt-3 block h-4 w-56 max-w-full rounded-sm bg-muted" />
            </output>
          ) : (
            <SourceNotice
              tone={priceUnavailable ? "unavailable" : "empty"}
              className="mt-4"
              title={
                priceUnavailable
                  ? "Monthly price index is temporarily unavailable."
                  : "No matching monthly series was published."
              }
              detail={
                priceUnavailable
                  ? "No index or direction has been inferred."
                  : "The current CSO release contains no matching monthly series."
              }
              onRetry={
                priceUnavailable ? () => void priceQuery.refetch() : undefined
              }
            />
          )}
        </article>
      </section>

      <section className="border-b border-rule py-8">
        <SectionHeading
          title={outputLabel[enterprise]}
          lede="Direction, not prediction. Annual values in Euro million from CSO AEA01."
          aside={
            <a
              href="https://www.cso.ie/en/statistics/agriculture/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              CSO agriculture
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          }
        />
        {outputQuery.isLoading ? (
          <output
            className="mt-6 block animate-pulse"
            aria-label="Loading annual output chart"
          >
            <span className="block h-[320px] rounded-md bg-muted" />
          </output>
        ) : output.length ? (
          <div className="mt-6">
            <ThemedChart
              style={{ height: 320 }}
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
                grid: { left: 64, right: 16, top: 20, bottom: 40 },
                xAxis: {
                  type: "category",
                  data: output.map((item) => String(item.year)),
                  ...axisStyle,
                },
                yAxis: {
                  type: "value",
                  name: "€ million",
                  nameLocation: "middle",
                  nameGap: 50,
                  nameTextStyle: { color: tokens.muted },
                  ...axisStyle,
                },
                series: [
                  {
                    name: outputLabel[enterprise],
                    type: "line",
                    smooth: false,
                    symbol: "circle",
                    symbolSize: 7,
                    lineStyle: { width: 2.25 },
                    areaStyle: { opacity: 0.08 },
                    data: output.map((item) => item.value),
                  },
                ],
              }}
            />
            <dl
              className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]"
              aria-label="Latest annual output values"
            >
              {output.slice(-5).map((item) => (
                <div key={item.year} className="bg-sheet px-3 py-3">
                  <dt className="text-xs text-muted-foreground">{item.year}</dt>
                  <dd className="mt-1 text-sm font-semibold">
                    {formatEuroMillions(item.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <SourceNotice
            tone={outputUnavailable ? "unavailable" : "empty"}
            className="mt-6"
            title={
              outputUnavailable
                ? "The annual output source is unavailable."
                : "No matching annual output series was published."
            }
            detail="No chart or zero value has been substituted."
            onRetry={
              outputUnavailable ? () => void outputQuery.refetch() : undefined
            }
          />
        )}
      </section>

      {enterprise !== "mixed" ? (
        <section className="border-b border-rule py-8">
          <SectionHeading
            title="Monthly output price direction"
            lede={`${enterpriseLabels[enterprise]} output price index from CSO AHM05, since January 2023.`}
          />
          {priceQuery.isLoading ? (
            <output
              className="mt-6 block animate-pulse"
              aria-label="Loading monthly price-index chart"
            >
              <span className="block h-[280px] rounded-md bg-muted" />
            </output>
          ) : price.length ? (
            <div className="mt-6">
              <ThemedChart
                style={{ height: 280 }}
                option={{
                  animation: false,
                  aria: {
                    enabled: true,
                    description: `${enterpriseLabels[enterprise]} monthly output price index.`,
                  },
                  tooltip: { trigger: "axis" },
                  grid: { left: 54, right: 16, top: 32, bottom: 56 },
                  xAxis: {
                    type: "category",
                    data: price.map((item) => item.label),
                    ...axisStyle,
                    axisLabel: { ...axisStyle.axisLabel, hideOverlap: true },
                  },
                  yAxis: {
                    type: "value",
                    name: "Index",
                    nameTextStyle: { color: tokens.muted },
                    ...axisStyle,
                  },
                  dataZoom: [{ type: "inside" }],
                  series: [
                    {
                      name: `${enterpriseLabels[enterprise]} price index`,
                      type: "line",
                      smooth: false,
                      showSymbol: false,
                      lineStyle: { width: 2.25 },
                      areaStyle: { opacity: 0.08 },
                      data: price.map((item) => item.value),
                    },
                  ],
                }}
              />
              <dl
                className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]"
                aria-label="Four latest monthly price-index values"
              >
                {price.slice(-4).map((item) => (
                  <div key={item.label} className="bg-sheet px-3 py-3">
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
            <SourceNotice
              tone={priceUnavailable ? "unavailable" : "empty"}
              className="mt-6"
              title={
                priceUnavailable
                  ? "The monthly price-index source is unavailable."
                  : "No matching monthly price-index series was published."
              }
              detail="No chart or direction has been inferred."
              onRetry={
                priceUnavailable ? () => void priceQuery.refetch() : undefined
              }
            />
          )}
        </section>
      ) : null}

      <footer className="flex gap-3 py-6">
        <Scale
          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
          aria-hidden="true"
        />
        <p className="footnote max-w-[70ch]">
          Values keep the CSO unit; “Euro Million” is shown as millions or
          billions. The percentage is a change in the national series, not a
          farm return. Missing data is unavailable, never zero.
        </p>
      </footer>
    </div>
  );
}
