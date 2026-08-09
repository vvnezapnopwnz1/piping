import type { TrackingDataDump } from "../domain/tracking"

export interface TrackingExportFile {
  filename: string
  mimeType: "text/csv;charset=utf-8"
  content: string
}

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

export function buildTrackingDataDumpFiles(projectCode: string, dump: TrackingDataDump): TrackingExportFile[] {
  const stem = safeStem(projectCode)
  return [
    {
      filename: `${stem}-active-spools.csv`,
      mimeType: "text/csv;charset=utf-8",
      content: toCsv(
        ["ISO Number", "Spool Number", "PDS Area", "Construction Status", "Current Location", "Last Event At"],
        dump.active_spools.map((row) => [row.iso_number, row.spool_number, row.pds_area_code, row.construction_status, row.current_location_code, row.last_event_at]),
      ),
    },
    {
      filename: `${stem}-sub-locations.csv`,
      mimeType: "text/csv;charset=utf-8",
      content: toCsv(
        ["Location Code", "Description", "Category", "Capacity", "Current Count"],
        dump.sub_locations.map((row) => [row.location_code, row.location_description, row.category_code, row.capacity, row.current_count]),
      ),
    },
    {
      filename: `${stem}-pda-users.csv`,
      mimeType: "text/csv;charset=utf-8",
      content: toCsv(
        ["Membership ID", "Full Name", "Email", "Device Code", "Last Used At"],
        dump.pda_users.map((row) => [row.membership_id, row.full_name, row.email, row.device_code, row.last_used_at]),
      ),
    },
  ]
}
