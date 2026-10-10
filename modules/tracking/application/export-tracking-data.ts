import type { TrackingDataDump } from "../domain/tracking"
import enTracking from "@/messages/en/tracking.json"

export interface TrackingExportFile {
  filename: string
  mimeType: "text/csv;charset=utf-8"
  content: string
}

export type TrackingExportKey =
  | "export.spoolHeaders.isoNumber"
  | "export.spoolHeaders.spoolNumber"
  | "export.spoolHeaders.pdsArea"
  | "export.spoolHeaders.constructionStatus"
  | "export.spoolHeaders.currentLocation"
  | "export.spoolHeaders.lastEventAt"
  | "export.locationHeaders.locationCode"
  | "export.locationHeaders.description"
  | "export.locationHeaders.category"
  | "export.locationHeaders.capacity"
  | "export.locationHeaders.currentCount"
  | "export.pdaUserHeaders.membershipId"
  | "export.pdaUserHeaders.fullName"
  | "export.pdaUserHeaders.email"
  | "export.pdaUserHeaders.deviceCode"
  | "export.pdaUserHeaders.lastUsedAt"

export type TrackingTranslate = (key: TrackingExportKey) => string

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function toCsv(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`
}

function safeStem(projectCode: string): string {
  return projectCode.trim().replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "project"
}

export function buildTrackingDataDumpFiles(
  projectCode: string,
  dump: TrackingDataDump,
  t?: TrackingTranslate,
): TrackingExportFile[] {
  const stem = safeStem(projectCode)
  const spoolHeaders = [
    t ? t("export.spoolHeaders.isoNumber") : enTracking.export.spoolHeaders.isoNumber,
    t ? t("export.spoolHeaders.spoolNumber") : enTracking.export.spoolHeaders.spoolNumber,
    t ? t("export.spoolHeaders.pdsArea") : enTracking.export.spoolHeaders.pdsArea,
    t ? t("export.spoolHeaders.constructionStatus") : enTracking.export.spoolHeaders.constructionStatus,
    t ? t("export.spoolHeaders.currentLocation") : enTracking.export.spoolHeaders.currentLocation,
    t ? t("export.spoolHeaders.lastEventAt") : enTracking.export.spoolHeaders.lastEventAt,
  ]
  const locationHeaders = [
    t ? t("export.locationHeaders.locationCode") : enTracking.export.locationHeaders.locationCode,
    t ? t("export.locationHeaders.description") : enTracking.export.locationHeaders.description,
    t ? t("export.locationHeaders.category") : enTracking.export.locationHeaders.category,
    t ? t("export.locationHeaders.capacity") : enTracking.export.locationHeaders.capacity,
    t ? t("export.locationHeaders.currentCount") : enTracking.export.locationHeaders.currentCount,
  ]
  const pdaUserHeaders = [
    t ? t("export.pdaUserHeaders.membershipId") : enTracking.export.pdaUserHeaders.membershipId,
    t ? t("export.pdaUserHeaders.fullName") : enTracking.export.pdaUserHeaders.fullName,
    t ? t("export.pdaUserHeaders.email") : enTracking.export.pdaUserHeaders.email,
    t ? t("export.pdaUserHeaders.deviceCode") : enTracking.export.pdaUserHeaders.deviceCode,
    t ? t("export.pdaUserHeaders.lastUsedAt") : enTracking.export.pdaUserHeaders.lastUsedAt,
  ]
  return [
    {
      filename: `${stem}-active-spools.csv`,
      mimeType: "text/csv;charset=utf-8",
      content: toCsv(
        spoolHeaders,
        dump.active_spools.map((row) => [row.iso_number, row.spool_number, row.pds_area_code, row.construction_status, row.current_location_code, row.last_event_at]),
      ),
    },
    {
      filename: `${stem}-sub-locations.csv`,
      mimeType: "text/csv;charset=utf-8",
      content: toCsv(
        locationHeaders,
        dump.sub_locations.map((row) => [row.location_code, row.location_description, row.category_code, row.capacity, row.current_count]),
      ),
    },
    {
      filename: `${stem}-pda-users.csv`,
      mimeType: "text/csv;charset=utf-8",
      content: toCsv(
        pdaUserHeaders,
        dump.pda_users.map((row) => [row.membership_id, row.full_name, row.email, row.device_code, row.last_used_at]),
      ),
    },
  ]
}
