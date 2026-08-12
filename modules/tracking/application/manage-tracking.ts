import type {
  TrackingDashboard,
  TrackingDeviceUsageRow,
  TrackingEventRow,
  TrackingWorklistRow,
} from "../domain/tracking"

const TRACKING_ERROR_MESSAGES: Record<string, string> = {
  PQS01: "The spool or location is not available in this project.",
  PQS02: "The spool does not have one current accepted revision.",
  PQS03: "The tracking operator or assigned device is not valid.",
  PQS04: "Departure requires the spool at the selected location.",
  PQS05: "Arrival requires the spool to be in transit.",
  PQS06: "The tracking event details are invalid.",
  PQS07: "The correction target is missing or already corrected.",
  PQS08: "This tracking action conflicts with an earlier request.",
  PQS09: "Tracking history is append-only.",
}

export function normalizeTrackingError(cause: unknown): Error {
  const code = typeof cause === "object" && cause !== null && "code" in cause
    ? String(cause.code)
    : ""
  if (TRACKING_ERROR_MESSAGES[code]) return new Error(TRACKING_ERROR_MESSAGES[code])
  return cause instanceof Error ? cause : new Error("Unable to complete the tracking action.")
}

export function createTrackingIdempotencyKey(prefix = "browser"): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export function createLatestProjectLoader<T>() {
  let version = 0
  return {
    invalidate() { version += 1 },
    async run(projectId: string, load: (projectId: string) => Promise<T>, commit: (value: T) => void) {
      const requestVersion = ++version
      const value = await load(projectId)
      if (requestVersion === version) commit(value)
    },
  }
}

export function buildTrackingDashboard(
  worklist: readonly TrackingWorklistRow[],
  events: readonly TrackingEventRow[],
  usage: readonly TrackingDeviceUsageRow[],
  overdue: number,
  now = new Date(),
): TrackingDashboard {
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  const sortedUsage = [...usage].sort((a, b) => b.scanCount - a.scanCount || b.lastUsedAt.localeCompare(a.lastUsedAt))
  const top = sortedUsage[0]
  return {
    distinctSpoolsScanned: new Set(events.map((event) => event.spoolId)).size,
    activeSpools: worklist.filter((row) => row.isActive).length,
    scansThisMonth: events.filter((event) => Date.parse(event.occurredAt) >= monthStart).length,
    inTransit: worklist.filter((row) => row.isInTransit).length,
    overdue,
    mostUsedDevice: top?.deviceCode ?? null,
    mostUsedOperator: top?.operatorMembershipId ?? null,
    mostUsedLocation: top?.locationCode ?? null,
    recentActivity: [...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 10),
  }
}
