import * as XLSX from "xlsx"

import type { FabricationProgressSnapshot } from "../../domain/report"

const MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export function renderFabricationProgress(snapshot: FabricationProgressSnapshot): Blob {
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Fabrication Progress"],
    [`Project: ${snapshot.projectCode}`, `Generated: ${snapshot.generatedAt.toISOString()}`],
    [],
    ["Spool", "Weld", "Location", "WPS", "Welders", "Welded On", "NDE Pending", "NDE Total"],
    ...snapshot.rows.map((row) => [
      row.spoolNumber,
      row.weldNumber,
      row.weldLocation,
      row.wpsCode,
      row.welders.join(", "),
      row.weldedOn ?? "",
      row.ndePending,
      row.ndeTotal,
    ]),
  ])
  sheet["!cols"] = [
    { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
    { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, "Fabrication Progress")
  const content = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  return new Blob([content], { type: MIME_TYPE })
}
