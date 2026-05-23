"use client"

import { FileText } from "lucide-react"
import { jsPDF } from "jspdf"

import { Button } from "@/components/ui/button"
import { useAdminStore } from "@/store/admin-store"
import type { PaintRecord } from "@/lib/spool-data"

export function W10pPdfButton({
  spoolNo,
  record,
}: {
  spoolNo: string
  record: PaintRecord
}) {
  const projectDef = useAdminStore((s) => s.projectDefinition)

  function handleGenerate() {
    const yymmdd = new Date().toISOString().slice(2, 10).replace(/-/g, "")
    const doc = new jsPDF({ unit: "pt", format: "letter" })
    const margin = 40
    let y = margin

    doc.setFont("helvetica", "bold").setFontSize(14)
    doc.text("W10P — Painting QC Release", margin, y)
    y += 18
    doc.setFont("helvetica", "normal").setFontSize(9)
    doc.text(
      `Project: ${projectDef.projectTitle} · ${projectDef.activityCode}`,
      margin,
      y
    )
    y += 12
    doc.text(`Form: W10P-${spoolNo}-${yymmdd}`, margin, y)
    y += 20

    const rows: [string, string][] = [
      ["Spool ID", spoolNo],
      ["Paint system", record.paintSystem ?? "—"],
      [
        "DFT measurement",
        record.dftMicrons != null ? `${record.dftMicrons} µm` : "—",
      ],
      ["Inspector", record.finalQCInspector ?? "—"],
      ["Sign-off date", record.finalQCSignedOffDate ?? record.returnDate ?? "—"],
      ["Subcontractor", record.subcontractor ?? "—"],
    ]
    rows.forEach(([k, v]) => {
      doc.setFont("helvetica", "bold").setFontSize(9)
      doc.text(`${k}:`, margin, y)
      doc.setFont("helvetica", "normal").setFontSize(9)
      doc.text(String(v), margin + 120, y)
      y += 14
    })
    y += 16

    doc.setFont("helvetica", "bold").setFontSize(10)
    doc.text("Sign-off", margin, y)
    y += 18
    const sigY = y + 30
    const pageW = doc.internal.pageSize.getWidth()
    const colW = (pageW - 2 * margin) / 2
    ;["QC Inspector", "Subcontractor rep"].forEach((label, i) => {
      const x = margin + i * colW
      doc.line(x, sigY, x + colW - 10, sigY)
      doc.setFont("helvetica", "normal").setFontSize(8)
      doc.text(label, x, sigY + 12)
      doc.text("Name / Date / Signature", x, sigY + 22)
    })

    doc.save(`W10P-${spoolNo}-${yymmdd}.pdf`)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      className="h-9 gap-2 border-slate-300 bg-white text-xs text-slate-700"
    >
      <FileText className="h-4 w-4" />
      W10P PDF
    </Button>
  )
}
