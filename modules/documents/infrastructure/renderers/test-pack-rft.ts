import { jsPDF } from "jspdf"

import type { TestPackRftSnapshot } from "../../domain/report"

const PAGE_BOTTOM = 720
const LEFT = 40

function addPageIfNeeded(doc: jsPDF, y: number): number {
  if (y <= PAGE_BOTTOM) return y
  doc.addPage()
  return LEFT
}

export function renderTestPackRft(snapshot: TestPackRftSnapshot): Blob {
  const doc = new jsPDF({ unit: "pt", format: "letter", compress: false })
  let y = LEFT

  doc.setFont("helvetica", "bold").setFontSize(14)
  doc.text("Test Pack RFT Pursuit", LEFT, y)
  y += 18
  doc.setFont("helvetica", "normal").setFontSize(9)
  doc.text(`Project: ${snapshot.projectCode}`, LEFT, y)
  y += 13
  doc.text(`Generated: ${snapshot.generatedAt.toISOString()}`, LEFT, y)
  y += 22

  if (snapshot.rows.length === 0) {
    doc.text("No Test Packs in this project.", LEFT, y)
    return doc.output("blob")
  }

  for (const row of snapshot.rows) {
    y = addPageIfNeeded(doc, y + 48)
    doc.setFont("helvetica", "bold").setFontSize(11)
    doc.text(row.testPackNumber || "Unnamed Test Pack", LEFT, y)
    y += 14
    doc.setFont("helvetica", "normal").setFontSize(9)
    doc.text(
      `Readiness: ${row.isRft ? "Ready" : "Blocked"} | Lifecycle: ${row.lifecycle || "-"} | Members: ${row.memberCount} | Spools: ${row.spoolTotal}`,
      LEFT,
      y,
    )
    y += 12
    doc.text(
      `Blockers - Weld/support: ${row.weldOrSupportPendingCount} | NDE: ${row.ndePendingCount} | PWHT: ${row.pwhtPendingCount} | Flange: ${row.flangePendingCount} | Line check: ${row.lineCheckPendingCount} | Open X: ${row.xOpenCount}`,
      LEFT,
      y,
      { maxWidth: 530 },
    )
    y += 20
  }

  return doc.output("blob")
}
