export type DatedComplianceItem = {
  id: string;
  date: string;
};

export function daysUntil(date: string, now: Date) {
  const deadline = new Date(`${date}T23:59:59+01:00`);
  const remainingMs = deadline.getTime() - now.getTime();
  return remainingMs < 0 ? -1 : Math.ceil(remainingMs / 86_400_000);
}

export function upcomingComplianceItems<T extends DatedComplianceItem>(
  items: readonly T[],
  now: Date,
) {
  return items
    .map((item) => ({ ...item, days: daysUntil(item.date, now) }))
    .filter((item) => item.days >= 0)
    .sort(
      (left, right) =>
        left.days - right.days || left.id.localeCompare(right.id),
    );
}
