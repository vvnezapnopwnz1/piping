"use client"

import { FileText } from "lucide-react"
import { jsPDF } from "jspdf"
import { Button } from "@/components/ui/button"
import { useAdminStore } from "@/store/admin-store"
import type { NdeBatch } from "@/store"

export function IssueExaminationPdfButton({ batch }: { batch: NdeBatch }) {
  const projectDef = useAdminStore((s) => s.projectDefinition)

  function handleGenerate() {
    const doc = new jsPDF({ unit: "pt", format: "letter" })
    const margin = 40
    let y = margin
    const requestNo = `IEP-${batch.batchNo}-${Date.now().toString().slice(-5)}`

    doc.setFont("helvetica", "bold").setFontSize(14)
    doc.text("Issue Examination Program", margin, y)
    y += 18
    doc.setFont("helvetica", "normal").setFontSize(9)
    doc.text(`Project: ${projectDef.projectTitle ?? "—"}`, margin, y)
    y += 12
    doc.text(`Issued: ${new Date().toLocaleDateString("en-GB")}`, margin, y)
    y += 12
    doc.text(`Request No: ${requestNo}`, margin, y)
    y += 20

    doc.setFont("helvetica", "bold").setFontSize(10)
    doc.text("Examination Details", margin, y)
    y += 14
    doc.setFont("helvetica", "normal").setFontSize(9)
    const rows = [
      ["Batch No", batch.batchNo],
      ["Method", batch.method],
      ["NDE Matrix", batch.matrixRef],
      ["Subcontractor", batch.subcontractor],
      ["Source", batch.source === "field" ? "Field (Erection)" : "Shop"],
      ["Welds in batch", String(batch.welds.length)],
    ]
    rows.forEach(([k, v]) => {
      doc.text(`${k}:`, margin, y)
      doc.text(String(v ?? "—"), margin + 100, y)
      y += 11
    })
    y += 8

    doc.setFont("helvetica", "bold").setFontSize(10)
    doc.text("Joints for Examination", margin, y)
    y += 14
    doc.setFont("helvetica", "normal").setFontSize(8)
    const colHeads = ["#", "Joint", "Spool", "Material", "Dia", "WPS"]
    const colXs = [margin, margin + 25, margin + 100, margin + 200, margin + 300, margin + 340]
    colHeads.forEach((h, i) => doc.text(h, colXs[i], y))
    y += 10
    doc.line(margin, y - 5, margin + 460, y - 5)
    batch.welds.forEach((w, i) => {
      if (y > 720) {
        doc.addPage()
        y = margin
      }
      doc.text(String(i + 1), colXs[0], y)
      doc.text(w.jointNo, colXs[1], y)
      doc.text(w.spoolNo, colXs[2], y)
      doc.text(w.materialType, colXs[3], y)
      doc.text(w.diaInch, colXs[4], y)
      doc.text(w.wpsNo, colXs[5], y)
      y += 11
    })

    y += 20
    doc.setFont("helvetica", "bold").setFontSize(10)
    doc.text("Sign-off", margin, y)
    y += 14
    doc.setFont("helvetica", "normal").setFontSize(8)
    const sigY = y + 30
    const colWidth = (doc.internal.pageSize.getWidth() - 2 * margin) / 3
    ;["QC Engineer", "NDE Inspector", "Subcontractor Lab Rep"].forEach((label, i) => {
      const x = margin + i * colWidth
      doc.line(x, sigY, x + colWidth - 10, sigY)
      doc.text(label, x, sigY + 12)
      doc.text("Name / Date / Signature", x, sigY + 22)
    })

    doc.save(`${requestNo}.pdf`)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleGenerate} className="h-9 text-xs gap-2">
      <FileText className="h-4 w-4" />
      Issue Examination Program PDF
    </Button>
  )
}
