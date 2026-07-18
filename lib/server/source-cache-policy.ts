function publicCache(sMaxAge: number, staleWhileRevalidate: number) {
  return `public, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`;
}

export const sourceCacheControl = {
  cap: publicCache(24 * 60 * 60, 7 * 24 * 60 * 60),
  cso: publicCache(6 * 60 * 60, 24 * 60 * 60),
  epaWfd: publicCache(24 * 60 * 60, 7 * 24 * 60 * 60),
  forecast: publicCache(30 * 60, 15 * 60),
  geocode: publicCache(24 * 60 * 60, 7 * 24 * 60 * 60),
  lpis: publicCache(24 * 60 * 60, 7 * 24 * 60 * 60),
  metWarnings: publicCache(10 * 60, 5 * 60),
  nitrates: publicCache(24 * 60 * 60, 7 * 24 * 60 * 60),
  opw: publicCache(15 * 60, 5 * 60),
} as const;
