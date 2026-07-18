import type { FarmEnterprise, FarmWeekFocus } from "@/lib/store/ui-store";

export const enterpriseLabels: Record<FarmEnterprise, string> = {
  dairy: "Dairy",
  beef: "Beef",
  sheep: "Sheep",
  tillage: "Tillage",
  mixed: "Mixed",
};

export const weekFocusLabels: Record<FarmWeekFocus, string> = {
  grazing: "Grazing",
  nutrients: "Nutrients",
  spraying: "Spraying",
  sales: "Sales",
  compliance: "Compliance",
};

export const enterpriseOptions = Object.entries(enterpriseLabels).map(
  ([value, label]) => ({ value: value as FarmEnterprise, label }),
);

export const weekFocusOptions = Object.entries(weekFocusLabels).map(
  ([value, label]) => ({ value: value as FarmWeekFocus, label }),
);

export function enterpriseMarketSignal(enterprise: FarmEnterprise) {
  switch (enterprise) {
    case "dairy":
      return "Treat milk index and dairy export strength as the first commercial signals; watch fertiliser before committing grazing platform spend.";
    case "beef":
      return "Use cattle output, beef exports, and slaughter activity together before changing finishing or store-sale timing.";
    case "sheep":
      return "Use sheep output and slaughterings as the main price context; keep weather risk in view for lambing and grazing windows.";
    case "tillage":
      return "Use crop output, cereal exports, fertiliser prices, and spraying windows as the core weekly decision set.";
    case "mixed":
      return "Compare livestock, crops, fertiliser, and export direction before moving money or labour between enterprises.";
  }
}

export function weatherActionForEnterprise(
  enterprise: FarmEnterprise,
  focus: FarmWeekFocus,
  signals: { rainMm: number; windKts: number; soilTemp: number },
) {
  if (focus === "spraying" || enterprise === "tillage") {
    return signals.windKts > 10
      ? "Delay spraying or choose a sheltered block; wind is the limiting signal this week."
      : "Spraying may be workable, but confirm field-level wind and label conditions before acting.";
  }

  if (focus === "nutrients") {
    return signals.rainMm > 20
      ? "Hold nutrient applications on vulnerable ground until runoff risk eases."
      : "Nutrient work may be possible; cross-check nitrate zone and local forecast first.";
  }

  if (enterprise === "dairy") {
    return signals.soilTemp >= 6
      ? "Soil temperature supports grass growth checks; use rainfall to decide grazing residuals."
      : "Grass growth signal is weak; avoid assuming the grazing platform is ready everywhere.";
  }

  if (enterprise === "sheep") {
    return signals.rainMm > 20
      ? "Plan shelter and field rotation around wet ground before moving ewes or lambs."
      : "Ground conditions look manageable nationally; confirm local exposure before moves.";
  }

  return signals.rainMm > 20
    ? "Wet signal is the main constraint; prioritise access, poaching risk, and watercourse buffers."
    : "Weather is not the obvious blocker; move next to compliance and market timing.";
}

export function complianceActionForEnterprise(
  enterprise: FarmEnterprise,
  focus: FarmWeekFocus,
  signals: { goodHighShare: number | null },
) {
  if (focus === "compliance") {
    return "Start with nitrate zone, waterbody status, and any protected-species prompts before scheduling field work.";
  }

  if (enterprise === "tillage") {
    return "Check susceptibility and waterbody status before spraying, cultivation, or nutrient work near drains.";
  }

  if (enterprise === "dairy" || enterprise === "beef") {
    return "Use water quality and nitrate overlays before stocking or slurry decisions near watercourses.";
  }

  if (signals.goodHighShare !== null && signals.goodHighShare < 60) {
    return "Water status is weak enough to raise the bar for nutrient and bank-side decisions.";
  }

  return "Compliance signals do not show an immediate blocker, but field-specific checks still matter.";
}
