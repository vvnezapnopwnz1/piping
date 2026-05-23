"use client"

import { FileText } from "lucide-react"
import { jsPDF } from "jspdf"

import { Button } from "@/components/ui/button"
import { useAdminStore } from "@/store/admin-store"
import { useBatchesStore } from "@/store/batches-store"
import { useErectionStore } from "@/store/erection-store"
import { useFlangeStore } from "@/store/flange-store"
import { useTestpackStore } from "@/store/testpack-store"
import { useWeldsStore } from "@/store/welds-store"
import type { TestPackRecord } from "@/lib/testpack-seed"
import { computeReleaseTrackingMetrics } from "@/lib/testpack-release-tracking"

const normalizeIso = (value: string) =>
  value
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/R\d+$/g, "")
    .replace(/[^A-Z0-9-]/g, "")

export function DossierPdfButton({
  testpack,
  variant = "outline",
  size = "sm",
  label = "Generate Dossier",
}: {
  testpack: TestPackRecord
  variant?: "outline" | "default" | "ghost"
  size?: "sm" | "default"
  label?: string
}) {
  const projectDef = useAdminStore((s) => s.projectDefinition)
  const welds = useWeldsStore((s) => s.welds)
  const batches = useBatchesStore((s) => s.batches)
  const fieldWelds = useErectionStore((s) => s.fieldWelds)
  const flangeJoints = useFlangeStore((s) => s.joints)
  const isos = useTestpackStore((s) => s.isos)
  const punchItems = useTestpackStore((s) => s.punchItems)

  function handleGenerate() {
    const tpIsoIds = new Set(testpack.isoIds)
    const tpIsoNorm = new Set(testpack.isoIds.map(normalizeIso))

    const shopWelds = welds.filter(
      (w) => tpIsoIds.has(w.isoNo) || tpIsoNorm.has(normalizeIso(w.isoNo))
    )
    const siteWelds = fieldWelds.filter(
      (w) => tpIsoIds.has(w.isoNo) || tpIsoNorm.has(normalizeIso(w.isoNo))
    )
    const tpPunch = punchItems.filter((p) => tpIsoIds.has(p.isoId))
    const tpBatches = batches.filter((b) =>
      b.welds.some((bw) => shopWelds.some((w) => w.id === bw.id))
    )

    const metrics = computeReleaseTrackingMetrics({
      testpack,
      isos,
      punchItems,
      welds,
      fieldWelds,
      batches,
      flangeJoints,
    })

    const doc = new jsPDF({ unit: "pt", format: "letter" })
    const margin = 40
    const pageW = doc.internal.pageSize.getWidth()
    let y = margin

    const addPageIfNeeded = (need: number) => {
      if (y + need > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage()
        y = margin
      }
    }

    // Cover
    doc.setFont("helvetica", "bold").setFontSize(16)
    doc.text("Test Pack Handover Dossier", margin, y)
    y += 22
    doc.setFont("helvetica", "normal").setFontSize(10)
    doc.text(projectDef.projectTitle, margin, y)
    y += 14
    doc.text(`Activity: ${projectDef.activityCode}`, margin, y)
    y += 14
    doc.text(`Test Pack: ${testpack.id} · ${testpack.location}`, margin, y)
    y += 14
    doc.text(`ISOs: ${testpack.isoIds.join(", ")}`, margin, y, { maxWidth: pageW - 2 * margin })
    y += 14
    doc.text(
      `Medium: ${testpack.testMedium} · Planned: ${testpack.testPlannedDate ?? "—"} · Rev: ${testpack.rev}`,
      margin,
      y
    )
    y += 14
    const witness = testpack.clientWitness
    doc.text(
      `Client witness: ${witness?.present ? `${witness.signerName ?? "Yes"} (${witness.date ?? "—"})` : "Not recorded"}`,
      margin,
      y
    )
    y += 14
    doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, margin, y)
    y += 28

    // Weld history
    doc.setFont("helvetica", "bold").setFontSize(12)
    doc.text("1. Weld History", margin, y)
    y += 16
    doc.setFont("helvetica", "normal").setFontSize(8)
    for (const w of shopWelds) {
      addPageIfNeeded(14)
      const batch = batches.find((b) => b.welds.some((bw) => bw.id === w.id))
      const bw = batch?.welds.find((x) => x.id === w.id)
      doc.text(
        `${w.jointNo} · ${w.spoolNo} · ${w.wpsNo} · ${w.welderCode} · ${batch?.method ?? "—"} · ${bw?.result ?? w.rtResult ?? "—"} · ${w.weldDate}`,
        margin,
        y,
        { maxWidth: pageW - 2 * margin }
      )
      y += 11
    }
    for (const w of siteWelds) {
      addPageIfNeeded(14)
      doc.text(
        `${w.jointNo} · ${w.spoolNo} · field · ${w.welderCode ?? "—"} · ${w.erectionStatus} · ${w.weldDate ?? "—"}`,
        margin,
        y,
        { maxWidth: pageW - 2 * margin }
      )
      y += 11
    }
    if (shopWelds.length === 0 && siteWelds.length === 0) {
      doc.text("No welds linked to this test pack.", margin, y)
      y += 12
    }
    y += 12

    // NDE clearance
    addPageIfNeeded(40)
    doc.setFont("helvetica", "bold").setFontSize(12)
    doc.text("2. NDE Clearance", margin, y)
    y += 16
    doc.setFont("helvetica", "normal").setFontSize(8)
    for (const b of tpBatches) {
      addPageIfNeeded(14)
      const acc = b.welds.filter((w) => w.result === "Accepted").length
      const rej = b.welds.filter((w) => w.result === "Rejected").length
      doc.text(
        `${b.batchNo} · ${b.method} · ${acc} accepted / ${rej} rejected · Received: ${b.resultsReceivedDate ?? "pending"}`,
        margin,
        y
      )
      y += 11
    }
    if (tpBatches.length === 0) {
      doc.text("No NDE batches for welds in this test pack.", margin, y)
      y += 12
    }
    y += 12

    // Punch items
    addPageIfNeeded(40)
    doc.setFont("helvetica", "bold").setFontSize(12)
    doc.text("3. Punch Items", margin, y)
    y += 16
    for (const cat of ["X", "Y", "Z"] as const) {
      const items = tpPunch.filter((p) => p.category === cat)
      if (!items.length) continue
      addPageIfNeeded(20)
      doc.setFont("helvetica", "bold").setFontSize(9)
      doc.text(`Category ${cat}`, margin, y)
      y += 12
      doc.setFont("helvetica", "normal").setFontSize(8)
      for (const p of items) {
        addPageIfNeeded(12)
        const status = p.clearedAt ? `Cleared ${p.clearedAt.slice(0, 10)}` : "Open"
        doc.text(`${p.code}: ${p.description} — ${status}`, margin + 8, y, {
          maxWidth: pageW - 2 * margin - 8,
        })
        y += 11
      }
    }
    y += 16

    // Release summary
    addPageIfNeeded(50)
    doc.setFont("helvetica", "bold").setFontSize(12)
    doc.text("4. Release Tracking Summary", margin, y)
    y += 14
    doc.setFont("helvetica", "normal").setFontSize(9)
    doc.text(
      `RFT status: ${metrics.readyForTest ? "Ready for test" : "Not ready"} · Gates: weld ${metrics.jointsToBeWelded}, NDE ${metrics.jointsAwaitingNde}, line check ${metrics.isosToReturnFromLineCheck}, Cat-X ${metrics.itemsCatXToClear}`,
      margin,
      y,
      { maxWidth: pageW - 2 * margin }
    )
    y += 24

    // Sign-off
    doc.setFont("helvetica", "bold").setFontSize(12)
    doc.text("5. Sign-off", margin, y)
    y += 20
    doc.setFont("helvetica", "normal").setFontSize(8)
    const sigY = y + 28
    const colW = (pageW - 2 * margin) / 3
    ;["QC Engineer", "Project Manager", "Client Witness"].forEach((label, i) => {
      const x = margin + i * colW
      doc.line(x, sigY, x + colW - 12, sigY)
      doc.text(label, x, sigY + 12)
      doc.text("Name / Date / Signature", x, sigY + 22)
    })

    doc.save(`Dossier-${testpack.id}-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}.pdf`)
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleGenerate}
      className="h-9 gap-2 text-xs"
    >
      <FileText className="h-4 w-4" />
      {label}
    </Button>
  )
}
