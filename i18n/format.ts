import type { Locale } from "./locale"

/** "Aug 24" / "24 авг." for a week that starts on an ISO calendar date; UTC keeps the day. */
export function formatWeekLabel(isoDate: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${isoDate}T00:00:00Z`))
}

/** A moment such as a scan or an upload, in the viewer's own clock. */
export function formatMoment(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(iso))
}

/**
 * The server's own words, shown under a translated title. Server messages stay English until the
 * server returns codes (separate plan); an empty message adds nothing.
 */
export function errorDetail(error: unknown): string | undefined {
  const message = error instanceof Error ? error.message : typeof error === "object" && error !== null && "message" in error ? (error as { message: unknown }).message : undefined
  return typeof message === "string" && message.trim() ? message : undefined
}
