import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"

import type { WeldJoint } from "@/lib/weld-data"
import type { NdeBatch } from "@/store/batches-store"
import type { ISORecord, PunchItem, TestPackRecord } from "@/lib/testpack-seed"
import { computeReleaseTrackingMetrics } from "@/lib/testpack-release-tracking"
import type { FieldWeldJoint } from "@/lib/erection-weld-data"
import type { FlangeJoint } from "@/lib/flange-data"

export interface ReportStoreSnapshot {
  welds: WeldJoint[]
  batches: NdeBatch[]
  testPacks: TestPackRecord[]
  isos: ISORecord[]
  punchItems: PunchItem[]
  fieldWelds: FieldWeldJoint[]
  flangeJoints: FlangeJoint[]
  projectTitle: string
  activityCode: string
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function triggerReportDownload(blob: Blob, filename: string) {
  downloadBlob(blob, filename)
}

export async function genFabProgressXlsx(
  stores: ReportStoreSnapshot
): Promise<Blob> {
  const rows = stores.welds.map((w) => ({
    "Joint No": w.jointNo,
    Spool: w.spoolNo,
    ISO: w.isoNo,
    WPS: w.wpsNo,
    Welder: w.welderCode,
    Status: w.status,
    "Heat #": w.heatNo ?? "",
    "Date completed": w.weldDate ?? "",
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Fabrication Progress")
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

export async function genWelderPerfPdf(
  stores: ReportStoreSnapshot
): Promise<Blob> {
  const byWelder = new Map<
    string,
    { total: number; accepted: number; rejected: number; tracer: number }
  >()

  for (const w of stores.welds) {
    const code = w.welderCode || "—"
    const cur = byWelder.get(code) ?? {
      total: 0,
      accepted: 0,
      rejected: 0,
      tracer: 0,
    }
    cur.total++
    if (w.rtResult?.toLowerCase() === "accepted" || w.status === "Completed") {
      cur.accepted++
    }
    if (w.status === "Rejected") cur.rejected++

    const inBatch = stores.batches.some((b) =>
      b.welds.some(
        (bw) => bw.id === w.id && bw.isTracer && bw.result === "Accepted"
      )
    )
    if (inBatch) cur.tracer++
    byWelder.set(code, cur)
  }

  const doc = new jsPDF({ unit: "pt", format: "letter" })
  const margin = 40
  let y = margin

  doc.setFont("helvetica", "bold").setFontSize(14)
  doc.text("Welder Performance Log", margin, y)
  y += 18
  doc.setFont("helvetica", "normal").setFontSize(9)
  doc.text(
    `Project: ${stores.projectTitle} · ${stores.activityCode}`,
    margin,
    y
  )
  y += 14
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, margin, y)
  y += 22

  doc.setFont("helvetica", "bold").setFontSize(9)
  doc.text("Welder", margin, y)
  doc.text("Total", margin + 120, y)
  doc.text("Accepted", margin + 170, y)
  doc.text("Rejected", margin + 240, y)
  doc.text("Accept %", margin + 310, y)
  doc.text("Tracer", margin + 380, y)
  y += 14
  doc.setFont("helvetica", "normal").setFontSize(9)

  const sorted = [...byWelder.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  for (const [welder, stats] of sorted) {
    if (y > 720) {
      doc.addPage()
      y = margin
    }
    const pct =
      stats.total > 0
        ? `${Math.round((stats.accepted / stats.total) * 100)}%`
        : "—"
    doc.text(welder, margin, y)
    doc.text(String(stats.total), margin + 120, y)
    doc.text(String(stats.accepted), margin + 170, y)
    doc.text(String(stats.rejected), margin + 240, y)
    doc.text(pct, margin + 310, y)
    doc.text(String(stats.tracer), margin + 380, y)
    y += 12
  }

  return doc.output("blob")
}

export async function genNdeBatchStatusXlsx(
  stores: ReportStoreSnapshot
): Promise<Blob> {
  const rows = stores.batches.map((b) => {
    const accepted = b.welds.filter((w) => w.result === "Accepted").length
    const rejected = b.welds.filter((w) => w.result === "Rejected").length
    return {
      "Batch No": b.batchNo,
      Method: b.method,
      Subcontractor: b.subcontractor,
      Issued: b.issuedDate ?? "",
      Returned: b.resultsReceivedDate ?? "",
      "Total welds": b.welds.length,
      Accepted: accepted,
      Rejected: rejected,
      Status: b.status,
    }
  })
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "NDE Batches")
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

export async function genTestpackRftPdf(
  stores: ReportStoreSnapshot
): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "letter" })
  const margin = 40
  let y = margin

  doc.setFont("helvetica", "bold").setFontSize(14)
  doc.text("Testpack RFT Pursuit", margin, y)
  y += 18
  doc.setFont("helvetica", "normal").setFontSize(9)
  doc.text(
    `Project: ${stores.projectTitle} · ${stores.activityCode}`,
    margin,
    y
  )
  y += 14
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, margin, y)
  y += 24

  for (const tp of stores.testPacks) {
    if (y > 680) {
      doc.addPage()
      y = margin
    }

    const metrics = computeReleaseTrackingMetrics({
      testpack: tp,
      isos: stores.isos,
      punchItems: stores.punchItems,
      welds: stores.welds,
      fieldWelds: stores.fieldWelds,
      batches: stores.batches,
      flangeJoints: stores.flangeJoints,
    })

    const blockers: string[] = []
    if (metrics.jointsToBeWelded > 0)
      blockers.push(`${metrics.jointsToBeWelded} joints to weld`)
    if (metrics.jointsAwaitingNde > 0)
      blockers.push(`${metrics.jointsAwaitingNde} awaiting NDE`)
    if (metrics.itemsCatXToClear > 0)
      blockers.push(`${metrics.itemsCatXToClear} Cat-X punch open`)
    if (metrics.flangeJointsToBeBolted > 0)
      blockers.push(`${metrics.flangeJointsToBeBolted} flanges to bolt`)

    doc.setFont("helvetica", "bold").setFontSize(11)
    doc.text(`${tp.id} — ${tp.location}`, margin, y)
    y += 14
    doc.setFont("helvetica", "normal").setFontSize(9)
    doc.text(`ISOs: ${tp.isoIds.join(", ")}`, margin, y)
    y += 11
    doc.text(
      `RFT: ${metrics.readyForTest ? "Ready" : "Blocked"} · Planned: ${tp.testPlannedDate ?? "—"} · Medium: ${tp.testMedium}`,
      margin,
      y
    )
    y += 11
    doc.text(
      `Gates — Weld:${metrics.jointsToBeWelded} NDE:${metrics.jointsAwaitingNde} LC:${metrics.isosToReturnFromLineCheck} X:${metrics.itemsCatXToClear} Flange:${metrics.flangeJointsToBeBolted} ISO:${metrics.isosToComplete} QC:${metrics.isosToQcRelease} Ready:${metrics.isosReadyForTest}`,
      margin,
      y,
      { maxWidth: 520 }
    )
    y += 11
    if (blockers.length) {
      doc.text(`Blockers: ${blockers.join("; ")}`, margin, y, { maxWidth: 520 })
      y += 11
    }
    y += 10
  }

  return doc.output("blob")
}

export const REAL_REPORT_GENERATORS: Record<
  string,
  (stores: ReportStoreSnapshot) => Promise<Blob>
> = {
  "RPT-F-001": genFabProgressXlsx,
  "RPT-F-003": genWelderPerfPdf,
  "RPT-N-001": genNdeBatchStatusXlsx,
  "RPT-T-001": genTestpackRftPdf,
}
