"use client"

import { FileText } from "lucide-react"
import { jsPDF } from "jspdf"
import { Button } from "@/components/ui/button"
import { useAdminStore } from "@/store/admin-store"
import { useErectionStore } from "@/store/erection-store"

interface Props {
  spoolNo: string
  w24FormNo: string
  areaZone?: string
  receivedDate?: string
  erectedDate?: string
}

export function W24PdfButton({
  spoolNo,
  w24FormNo,
  areaZone,
  receivedDate,
  erectedDate,
}: Props) {
  const projectDef = useAdminStore((s) => s.projectDefinition)

  function handleGenerate() {
    const fieldWelds = useErectionStore
      .getState()
      .fieldWelds.filter((w) => w.spoolNo === spoolNo)
    const doc = new jsPDF({ unit: "pt", format: "letter" })
    const margin = 40
    let y = margin

    doc.setFont("helvetica", "bold").setFontSize(14)
    doc.text("W24 — Welding Daily Progress & Visual Examination", margin, y)
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
      `W24 No: ${w24FormNo || `W24-${spoolNo}-${Date.now().toString().slice(-6)}`}`,
      margin,
      y,
    )
    y += 20

    doc.setFont("helvetica", "bold").setFontSize(10)
    doc.text("Spool", margin, y)
    y += 14
    doc.setFont("helvetica", "normal").setFontSize(9)
    ;[
      ["Spool No", spoolNo],
      ["Area Zone", areaZone ?? "—"],
      ["Received Date", receivedDate ?? "—"],
      ["Erected Date", erectedDate ?? "—"],
    ].forEach(([k, v]) => {
      doc.text(`${k}:`, margin, y)
      doc.text(String(v ?? "—"), margin + 100, y)
      y += 11
    })
    y += 8

    doc.setFont("helvetica", "bold").setFontSize(10)
    doc.text(`Field Joints (${fieldWelds.length})`, margin, y)
    y += 14
    doc.setFont("helvetica", "normal").setFontSize(8)
    doc.text("Joint No   Welder   WPS    Status     Visual    Heat", margin, y)
    y += 10
    doc.line(margin, y - 2, doc.internal.pageSize.getWidth() - margin, y - 2)
    fieldWelds.forEach((w) => {
      const line = `${w.jointNo.padEnd(10)} ${(w.welderCode ?? "—").padEnd(8)} ${w.wpsNo.padEnd(6)} ${w.status.padEnd(10)} ${"___".padEnd(8)} ${w.heatNo ?? "—"}`
      doc.text(line, margin, y)
      y += 10
    })
    y += 14

    doc.setFont("helvetica", "bold").setFontSize(10)
    doc.text("Sign-off", margin, y)
    y += 14
    doc.setFont("helvetica", "normal").setFontSize(8)
    const sigY = y + 30
    const colWidth = (doc.internal.pageSize.getWidth() - 2 * margin) / 3
    ;["Foreman", "Area Supervisor", "QC Engineer"].forEach((label, i) => {
      const x = margin + i * colWidth
      doc.line(x, sigY, x + colWidth - 10, sigY)
      doc.text(label, x, sigY + 12)
      doc.text("Name / Date / Signature", x, sigY + 22)
    })

    doc.save(`W24-${spoolNo}.pdf`)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      className="h-9 text-xs gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
    >
      <FileText className="h-4 w-4" />
      Generate W24 PDF
    </Button>
  )
}
