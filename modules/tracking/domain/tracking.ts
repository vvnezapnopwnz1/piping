export type TrackingDirection = "in" | "out" | "manual"

export interface TrackingActiveSpoolDumpRow {
  iso_number: string
  spool_number: string
  pds_area_code: string | null
  construction_status: string
  current_location_code: string | null
  last_event_at: string | null
}

export interface TrackingSubLocationDumpRow {
  location_code: string
  location_description: string
  category_code: string
  capacity: number | null
  current_count: number
}

export interface TrackingPdaUserDumpRow {
  membership_id: string
  full_name: string
  email: string | null
  device_code: string | null
  last_used_at: string | null
}

export interface TrackingDataDump {
  active_spools: TrackingActiveSpoolDumpRow[]
  sub_locations: TrackingSubLocationDumpRow[]
  pda_users: TrackingPdaUserDumpRow[]
}

export interface TrackingWorklistRow {
  projectId: string
  spoolId: string
  spoolRevisionId: string
  isoNumber: string
  spoolNumber: string
  pdsAreaCode: string | null
  constructionStatus: string
  currentLocationId: string | null
  currentLocationCode: string | null
  isInTransit: boolean
  hasEverScanned: boolean
  isActive: boolean
  lastEventAt: string | null
}

export interface TrackingEventRow {
  id: string
  projectId: string
  spoolId: string
  spoolRevisionId: string
  locationId: string
  deviceId: string | null
  operatorMembershipId: string
  direction: TrackingDirection
  occurredAt: string
  source: string
  compensatesEventId: string | null
  reason: string | null
  recordedAt: string
}

export interface TrackingOccupancyRow {
  projectId: string
  locationId: string
  categoryCode: string
  locationCode: string
  locationDescription: string
  capacity: number | null
  currentCount: number
  remainingCapacity: number | null
}

export interface TrackingTransitAlertRow {
  projectId: string
  spoolId: string
  isoNumber: string
  spoolNumber: string
  departureLocationCode: string | null
  transitStartedAt: string
  transitDays: number
  maximumTransitTimeDays: number
  isOverdue: boolean
}

export interface TrackingDeviceUsageRow {
  projectId: string
  deviceId: string
  deviceCode: string
  operatorMembershipId: string
  locationId: string
  locationCode: string
  scanCount: number
  lastUsedAt: string
}

export interface TrackingDeviceManagementRow {
  projectId: string
  deviceId: string
  deviceCode: string
  deviceDescription: string
  deviceStatus: string
  assignedMembershipId: string | null
  assignmentStatus: string | null
  scanCount: number
  mostFrequentOperatorMembershipId: string | null
  mostFrequentLocationCode: string | null
  lastUsedAt: string | null
}

export interface TrackingInconsistencyRow {
  projectId: string
  spoolId: string
  eventId: string
  occurredAt: string
  issueCode: string
}

export interface RecordTrackingEventInput {
  projectId: string
  spoolId: string
  locationId: string
  deviceId: string | null
  direction: TrackingDirection
  occurredAt: string
  reason: string | null
  compensatesEventId: string | null
  idempotencyKey: string
}

export interface TrackingDashboard {
  distinctSpoolsScanned: number
  activeSpools: number
  scansThisMonth: number
  inTransit: number
  overdue: number
  mostUsedDevice: string | null
  mostUsedOperator: string | null
  mostUsedLocation: string | null
  recentActivity: TrackingEventRow[]
}

export function normalizeTrackingDirection(value: unknown): TrackingDirection | null {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : ""
  return normalized === "in" || normalized === "out" || normalized === "manual" ? normalized : null
}

export function trackingCapacityLabel(capacity: number | null): string {
  return capacity === null ? "Not configured" : String(capacity)
}
