import type { ComplianceDate } from "./rules.ts";

function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function foldLine(line: string) {
  // RFC 5545 folds content lines at 75 octets; ASCII-safe approximation.
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    chunks.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  chunks.push(rest);
  return chunks.join("\r\n");
}

function compactDate(date: string) {
  return date.replaceAll("-", "");
}

function nextDay(date: string) {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/**
 * Build an all-day calendar event for a verified deadline. The description
 * carries the applicability note, action, and official source so the event
 * keeps its provenance once it leaves AgriView.
 */
export function buildDeadlineIcs(
  item: ComplianceDate,
  stamp = new Date(),
): string {
  const uid = `${item.id}@agriview`;
  const description = [
    `Applies to: ${item.applicability}`,
    item.action,
    `Source: ${item.source.label} — ${item.source.url}`,
    `Verified ${item.verifiedAt}. Confirm current terms before relying on this date.`,
  ].join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AgriView//Deadline watchlist//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z")}`,
    `DTSTART;VALUE=DATE:${compactDate(item.date)}`,
    `DTEND;VALUE=DATE:${compactDate(nextDay(item.date))}`,
    `SUMMARY:${escapeText(item.title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${item.source.url}`,
    `CATEGORIES:${escapeText(item.category.toUpperCase())}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

export function deadlineIcsFileName(item: ComplianceDate) {
  return `agriview-${item.id}-${item.date}.ics`;
}
