/**
 * Project the spine into the flat fabrication seed shapes.
 *
 * Domain types are imported type-only (erased at runtime). Runtime constants
 * (stage order) are declared locally so this module has no runtime dependency
 * on spool-data.ts — which re-exports these seeds from fixtures — keeping the
 * import graph acyclic.
 */
import { SPINE, type SpineSpool, type SpineWeld } from "../spine"
import type { SpoolFabStage } from "@/lib/spool-data"
import type { MaterialCheckRecord, HeatPiece } from "@/lib/spool-data"
import type { PaintRecord } from "@/lib/spool-data"
import type { QCReleaseRecord, QCChecklistEntry } from "@/lib/spool-data"
import type { LaydownRecord, YardLocation } from "@/lib/spool-data"
import type { WeldJoint, WeldStatus } from "@/lib/weld-data"

const FAB_ORDER: SpoolFabStage[] = [
  "Not Started",
  "Material Check",
  "Weld Progress",
  "Fabricated",
  "QC Release",
  "Sent to Paint",
  "Painted",
  "Laydown",
]
const fabRank = (s: SpoolFabStage) => FAB_ORDER.indexOf(s)
const atLeast = (s: SpineSpool, stage: SpoolFabStage) => fabRank(s.fabStage) >= fabRank(stage)
const beyond = (s: SpineSpool, stage: SpoolFabStage) => fabRank(s.fabStage) > fabRank(stage)

const MATERIAL_LABEL: Record<string, string> = {
  "CS-A106B": "CS A106B",
  "SS-316L": "SS 316L",
  "CS-P91": "CS A335 P91",
  "LTCS-A333": "LTCS A333",
}
const mat = (code: string) => MATERIAL_LABEL[code] ?? code

const YARDS: YardLocation[] = ["YARD-A-01", "YARD-A-12", "YARD-B-04", "YARD-B-09", "YARD-C-02", "YARD-C-15"]

// ─── Material Check ──────────────────────────────────────────────────────────

export function deriveMaterialCheckSeed(): MaterialCheckRecord[] {
  return SPINE.filter((s) => atLeast(s, "Material Check") && s.pieces.length > 0).map((s) => {
    const pieces: HeatPiece[] = s.pieces.map((p, i) => ({
      id: `HP-${s.spoolNo}-${i + 1}`,
      heatNumber: p.heatNo,
      materialGrade: mat(s.material),
      diaInch: '6"',
      lengthM: 6.0,
      millCertRef: p.millCertRef,
      status: p.mcStatus,
      ncRemark: p.ncRemark,
    }))
    const nc = pieces.filter((p) => p.status === "Non-conformance").length
    const signedOff = beyond(s, "Material Check") && nc === 0
    return {
      spoolNo: s.spoolNo,
      pieces,
      inspector: signedOff ? "QC-ENG-01" : undefined,
      signedOffDate: signedOff ? "2025-05-10" : undefined,
      nonConformanceCount: nc,
    }
  })
}

// ─── Paint ───────────────────────────────────────────────────────────────────

export function derivePaintSeed(): PaintRecord[] {
  return SPINE.filter((s) => atLeast(s, "Sent to Paint")).map((s) => {
    const finished = atLeast(s, "Painted")
    return {
      spoolNo: s.spoolNo,
      paintSystem: "PS-3A: Zinc Primer + Epoxy (250 µm)",
      subcontractor: "ColorPro Coatings Inc",
      dispatchDate: "2025-05-13",
      dispatchRemark: "Dispatched to paint shop per W-22.",
      returnDate: finished ? "2025-05-14" : undefined,
      dftMicrons: finished ? 255 : undefined,
      finalQCInspector: finished ? "QC-ENG-02" : undefined,
      finalQCSignedOffDate: finished ? "2025-05-14" : undefined,
    }
  })
}

// ─── QC Release ────────────────────────────────────────────────────────────────

export function deriveQCReleaseSeed(): QCReleaseRecord[] {
  return SPINE.filter((s) => atLeast(s, "QC Release")).map((s) => {
    const released = beyond(s, "QC Release") && !s.qcHold
    const entries: QCChecklistEntry[] = s.qcHold
      ? [
          { key: "dimensional", status: "Pass" },
          { key: "visual", status: "Pass" },
          { key: "nde_complete", status: "Pending" },
          { key: "traceability", status: "Pass" },
        ]
      : [
          { key: "dimensional", status: "Pass" },
          { key: "visual", status: "Pass" },
          { key: "nde_complete", status: "Pass" },
          { key: "traceability", status: "Pass" },
        ]
    return {
      spoolNo: s.spoolNo,
      entries,
      inspector: released ? "QC-ENG-03" : undefined,
      signedOffDate: released ? "2025-05-12" : undefined,
    }
  })
}

// ─── Laydown ─────────────────────────────────────────────────────────────────

export function deriveLaydownSeed(): LaydownRecord[] {
  return SPINE.filter((s) => atLeast(s, "Laydown")).map((s, i) => {
    // Released to site once the spool has an erection stage (it left the yard).
    const released = !!s.erectionStage
    return {
      spoolNo: s.spoolNo,
      yardLocation: YARDS[i % YARDS.length],
      placedDate: "2025-05-15",
      placedBy: "QC-ENG-02",
      releasedToSiteDate: released ? "2025-05-16" : undefined,
      releasedBy: released ? "QC-ENG-03" : undefined,
    }
  })
}

// ─── Shop welds (WELD_DATA) ────────────────────────────────────────────────────

const weldStatusFromNde = (w: SpineWeld): WeldStatus => {
  if (w.ndeResult === "Rejected") return "Rejected"
  if (w.ndeResult === "Accepted") return "Completed"
  return "In Progress"
}

export function deriveShopWeldData(): WeldJoint[] {
  const rows: WeldJoint[] = []
  let n = 0
  for (const s of SPINE) {
    for (const w of s.welds.filter((x) => x.type === "SHOP")) {
      n += 1
      rows.push({
        id: `shop-${n}`,
        jointNo: w.weldNo,
        spoolNo: s.spoolNo,
        isoNo: s.isoNo,
        diaInch: '6"',
        materialType: mat(s.material),
        wpsNo: w.wps,
        welderCode: w.welderId,
        weldDate: "14 May 2025",
        dwirNo: `DWIR-2025-${3000 + n}`,
        status: weldStatusFromNde(w),
        isLocked: w.ndeResult === "Accepted",
        heatNo: s.pieces[0]?.heatNo,
        rtNo: w.ndeBatchId ? `RT-${w.ndeBatchId}` : undefined,
        rtResult: w.ndeResult,
        pwhtRequired: s.material === "CS-P91",
        ndeCategory: w.ndeMethod === "RT" ? "NDE100" : undefined,
      })
    }
  }
  return rows
}
