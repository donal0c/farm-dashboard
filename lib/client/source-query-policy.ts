const minute = 60 * 1_000;
const hour = 60 * minute;

export const sourceQueryStaleTime = {
  cap: 24 * hour,
  cso: 6 * hour,
  epaWfd: 24 * hour,
  forecast: 30 * minute,
  lpis: 24 * hour,
  metWarnings: 10 * minute,
  nitrates: 24 * hour,
  opw: 15 * minute,
} as const;
