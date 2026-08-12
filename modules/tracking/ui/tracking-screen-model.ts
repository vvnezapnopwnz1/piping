import type { TrackingDeviceUsageRow, TrackingWorklistRow } from "../domain/tracking"

export function filterTrackingWorklist(rows: readonly TrackingWorklistRow[], query: string): TrackingWorklistRow[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return [...rows]
  return rows.filter((row) => [row.isoNumber, row.spoolNumber, row.pdsAreaCode, row.currentLocationCode, row.constructionStatus]
    .some((value) => value?.toLowerCase().includes(needle)))
}

export interface DesignAreaSummary {
  code: string
  activeSpoolCount: number
  locations: string[]
}

export function groupActiveSpoolsByDesignArea(rows: readonly TrackingWorklistRow[]): DesignAreaSummary[] {
  const groups = new Map<string, { count: number; locations: Set<string> }>()
  for (const row of rows) {
    if (!row.isActive) continue
    const code = row.pdsAreaCode ?? "Not configured"
    const group = groups.get(code) ?? { count: 0, locations: new Set<string>() }
    group.count += 1
    if (row.currentLocationCode) group.locations.add(row.currentLocationCode)
    groups.set(code, group)
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([code, value]) => ({ code, activeSpoolCount: value.count, locations: [...value.locations].sort() }))
}

export interface DeviceSummary {
  deviceId: string
  deviceCode: string
  scanCount: number
  mostFrequentOperator: string
  mostFrequentLocation: string
  lastUsedAt: string
}

export function summarizeDeviceUsage(rows: readonly TrackingDeviceUsageRow[]): DeviceSummary[] {
  const grouped = new Map<string, TrackingDeviceUsageRow[]>()
  for (const row of rows) grouped.set(row.deviceId, [...(grouped.get(row.deviceId) ?? []), row])
  return [...grouped.values()].map((items) => {
    const sorted = [...items].sort((a, b) => b.scanCount - a.scanCount || b.lastUsedAt.localeCompare(a.lastUsedAt))
    return {
      deviceId: sorted[0]!.deviceId,
      deviceCode: sorted[0]!.deviceCode,
      scanCount: items.reduce((total, row) => total + row.scanCount, 0),
      mostFrequentOperator: sorted[0]!.operatorMembershipId,
      mostFrequentLocation: sorted[0]!.locationCode,
      lastUsedAt: items.reduce((latest, row) => row.lastUsedAt > latest ? row.lastUsedAt : latest, ""),
    }
  }).sort((a, b) => b.scanCount - a.scanCount || a.deviceCode.localeCompare(b.deviceCode))
}
