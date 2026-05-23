import type { SpoolFabStage } from "@/lib/spool-data"

export type TrackingLocationCategory =
  | "Fab shop"
  | "Paint shop"
  | "Laydown"
  | "Erection area"
  | "Transit"

export interface LocationDef {
  name: string
  category: TrackingLocationCategory
  capacity: number
}

export const TRACKING_LOCATIONS: LocationDef[] = [
  { name: "Fab Shop A", category: "Fab shop", capacity: 350 },
  { name: "Fab Shop B", category: "Fab shop", capacity: 250 },
  { name: "QC Hold Area", category: "Fab shop", capacity: 60 },
  { name: "Paint Shop", category: "Paint shop", capacity: 200 },
  { name: "Laydown Yard 1", category: "Laydown", capacity: 400 },
  { name: "Laydown Yard 2", category: "Laydown", capacity: 400 },
  { name: "Final QC Yard", category: "Laydown", capacity: 100 },
  { name: "Pre-erection", category: "Erection area", capacity: 200 },
  { name: "Erection North", category: "Erection area", capacity: 120 },
  { name: "Erection East", category: "Erection area", capacity: 150 },
  { name: "Erection South", category: "Erection area", capacity: 120 },
  { name: "Erection West", category: "Erection area", capacity: 120 },
]

export type LocationEventType = "IN" | "OUT" | "MANUAL"

export interface LocationEvent {
  id: string
  spoolNo: string
  location: string
  eventType: LocationEventType
  at: string
  by: string
  reason?: string
}

export interface CurrentLocationResult {
  location: string
  daysInLocation: number
  lastScan: string
  isTransitOut: boolean
}

export interface TrackingSpool {
  spoolNo: string
  isoNo: string
  material?: string
  pdsAreaCode?: string
}

export function yardLocationToTrackingName(yardLocation: string): string {
  if (yardLocation.startsWith("YARD-A")) return "Laydown Yard 1"
  if (yardLocation.startsWith("YARD-B")) return "Laydown Yard 2"
  if (yardLocation.startsWith("YARD-C")) return "Final QC Yard"
  return "Laydown Yard 1"
}

export function deriveBarcode(spoolNo: string): string {
  return `BC-${spoolNo.replace(/[^0-9]/g, "").slice(-6).padStart(6, "0")}`
}

export function deriveCurrentLocation(
  events: LocationEvent[],
  now: Date = new Date(),
): CurrentLocationResult | null {
  if (events.length === 0) return null
  const sorted = [...events].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  )
  const last = sorted[sorted.length - 1]
  const isTransitOut = last.eventType === "OUT"
  const millis = now.getTime() - new Date(last.at).getTime()
  const daysInLocation = Math.max(0, Math.floor(millis / (1000 * 60 * 60 * 24)))
  return {
    location: isTransitOut ? "Transit out" : last.location,
    daysInLocation,
    lastScan: last.at,
    isTransitOut,
  }
}

/** CC-11: Start Fab started and not yet erected. */
export function deriveIsActive(
  fabStage: SpoolFabStage | undefined,
  hasErected: boolean,
): boolean {
  if (hasErected) return false
  if (!fabStage || fabStage === "Not Started" || fabStage === "Material Check") {
    return false
  }
  return true
}

export function deriveInconsistencyFlag(
  fabStage: SpoolFabStage | undefined,
  location: string | undefined,
  hasErected?: boolean,
): { isInconsistent: boolean; reason?: string } {
  if (!location) return { isInconsistent: false }
  if (
    hasErected &&
    (location.toLowerCase().includes("laydown") ||
      location.toLowerCase().includes("fab"))
  ) {
    return {
      isInconsistent: true,
      reason: `Erected spool still located in ${location}`,
    }
  }
  if (!fabStage) return { isInconsistent: false }
  if (fabStage === "Painted" && location.toLowerCase().includes("fab shop")) {
    return {
      isInconsistent: true,
      reason: `Status 'Painted' but located in ${location}`,
    }
  }
  if (fabStage === "QC Release" && location.toLowerCase().includes("paint shop")) {
    return {
      isInconsistent: true,
      reason: `Status 'QC Release' but located in ${location}`,
    }
  }
  return { isInconsistent: false }
}

export function deriveTransitOutFlag(
  events: LocationEvent[],
  maxTransitDays: number,
  now: Date = new Date(),
): { isTransitOut: boolean; outFor?: number; fromLocation?: string } {
  if (events.length === 0) return { isTransitOut: false }
  const sorted = [...events].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  )
  const last = sorted[sorted.length - 1]
  if (last.eventType !== "OUT") return { isTransitOut: false }
  const days = Math.floor(
    (now.getTime() - new Date(last.at).getTime()) / (1000 * 60 * 60 * 24),
  )
  if (days < maxTransitDays) return { isTransitOut: false }
  return { isTransitOut: true, outFor: days, fromLocation: last.location }
}

export function groupEventsBySpool(
  events: LocationEvent[],
): Map<string, LocationEvent[]> {
  const map = new Map<string, LocationEvent[]>()
  events.forEach((e) => {
    const list = map.get(e.spoolNo) ?? []
    list.push(e)
    map.set(e.spoolNo, list)
  })
  return map
}
