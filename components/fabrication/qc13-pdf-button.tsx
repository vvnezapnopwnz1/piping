"use client"

import { FileText } from "lucide-react"
import { jsPDF } from "jspdf"
import { Button } from "@/components/ui/button"
import { useAdminStore } from "@/store/admin-store"
import type { WeldJoint } from "@/lib/weld-data"

export function Qc13PdfButton({ joint }: { joint: WeldJoint }) {
  const projectDef = useAdminStore((s) => s.projectDefinition)

  function handleGenerate() {
    const doc = new jsPDF({ unit: "pt", format: "letter" })
    const margin = 40
    let y = margin

    doc.setFont("helvetica", "bold").setFontSize(14)
    doc.text("QC13 — Daily Progress Report", margin, y)
    y += 18
    doc.setFont("helvetica", "normal").setFontSize(9)
    doc.text(
      `Project: ${projectDef.projectTitle ?? "—"} · Activity ${projectDef.activityCode ?? "—"}`,
      margin,
      y,
    )
    y += 12
    doc.text(`Issued: ${new Date().toLocaleDateString("en-GB")}`, margin, y)
    y += 12
    doc.text(
      `QC13 No: QC13-${joint.spoolNo}-${joint.jointNo}-${Date.now().toString().slice(-6)}`,
      margin,
      y,
    )
    y += 20

    doc.setFont("helvetica", "bold").setFontSize(10)
    doc.text("Identification", margin, y)
    y += 14
    doc.setFont("helvetica", "normal").setFontSize(9)
    const rows: [string, string][] = [
      ["Spool No", joint.spoolNo],
      ["Joint No", joint.jointNo],
      ["ISO No", joint.isoNo],
      ["DWIR No", joint.dwirNo],
      ["Material", joint.materialType],
      ["Diameter", joint.diaInch],
      ["WPS", joint.wpsNo],
      ["Heat No", joint.heatNo ?? "—"],
    ]
    rows.forEach(([k, v]) => {
      doc.text(`${k}:`, margin, y)
      doc.text(String(v ?? "—"), margin + 100, y)
      y += 11
    })
    y += 8

    doc.setFont("helvetica", "bold").setFontSize(10)
    doc.text("Welding", margin, y)
    y += 14
    doc.setFont("helvetica", "normal").setFontSize(9)
    doc.text(`Welder code: ${joint.welderCode ?? "—"}`, margin, y)
    y += 11
    doc.text(`Weld date: ${joint.weldDate ?? "—"}`, margin, y)
    y += 11
    doc.text(
      `PWHT required: ${joint.pwhtRequired ? "Yes" : "No"}${joint.pwhtRequired ? ` · Date: ${joint.pwhtDate ?? "pending"}` : ""}`,
      margin,
      y,
    )
    y += 20

    doc.setFont("helvetica", "bold").setFontSize(10)
    doc.text("Sign-off", margin, y)
    y += 14
    doc.setFont("helvetica", "normal").setFontSize(8)
    const sigY = y + 30
    const colWidth =
      (doc.internal.pageSize.getWidth() - 2 * margin) / 3
    ;["Foreman", "QC Engineer", "Sub-contractor rep"].forEach((label, i) => {
      const x = margin + i * colWidth
      doc.line(x, sigY, x + colWidth - 10, sigY)
      doc.text(label, x, sigY + 12)
      doc.text("Name / Date / Signature", x, sigY + 22)
    })

    doc.save(`QC13-${joint.spoolNo}-${joint.jointNo}.pdf`)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      className="h-9 text-xs gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
    >
      <FileText className="h-4 w-4" />
      Generate QC13 PDF
    </Button>
  )
}
