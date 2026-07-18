export function formatEuroMillions(value: number) {
  const absolute = Math.abs(value);
  if (absolute >= 1_000) {
    return `€${new Intl.NumberFormat("en-IE", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 1_000)}bn`;
  }
  return `€${new Intl.NumberFormat("en-IE", {
    maximumFractionDigits: absolute >= 100 ? 0 : 1,
  }).format(value)}m`;
}

export function formatPublishedReference(value: string, label = "Reference") {
  const reference = value.trim();
  if (!reference) return `${label} not published`;
  return reference.length > 18
    ? `${label} …${reference.slice(-10)}`
    : `${label} ${reference}`;
}

export function humanizeWaterbodyName(
  name: string,
  kind: "River" | "Groundwater",
) {
  const normalized = name.trim();
  if (normalized && !/^unnamed\b/i.test(normalized)) return normalized;
  return kind === "River"
    ? "River waterbody without a published name"
    : "Groundwater body without a published name";
}

export function formatSourceState(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) return "Checking";
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}
