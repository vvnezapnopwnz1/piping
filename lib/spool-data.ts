import type { SpoolReadiness } from "@/store/welds-store"

export type SpoolFabStage =
  | "Not Started"
  | "Material Check"
  | "Weld Progress"
  | "Fabricated"
  | "QC Release"
  | "Sent to Paint"
  | "Painted"
  | "Laydown"

export const STAGE_ORDER: SpoolFabStage[] = [
  "Not Started",
  "Material Check",
  "Weld Progress",
  "Fabricated",
  "QC Release",
  "Sent to Paint",
  "Painted",
  "Laydown",
]

// Color tokens per stage — used by the funnel and (future) badges.
// Match docs/PIPEQC_CONTEXT.md design system (sky/amber/emerald/violet/slate).
export const STAGE_COLOR: Record<SpoolFabStage, { bg: string; text: string; rail: string }> = {
  "Not Started": { bg: "bg-slate-50", text: "text-slate-600", rail: "bg-slate-300" },
  "Material Check": { bg: "bg-amber-50", text: "text-amber-700", rail: "bg-amber-500" },
  "Weld Progress": { bg: "bg-sky-50", text: "text-sky-700", rail: "bg-sky-500" },
  "Fabricated": { bg: "bg-emerald-50", text: "text-emerald-700", rail: "bg-emerald-500" },
  "QC Release": { bg: "bg-violet-50", text: "text-violet-700", rail: "bg-violet-500" },
  "Sent to Paint": { bg: "bg-slate-50", text: "text-slate-600", rail: "bg-slate-400" },
  "Painted": { bg: "bg-slate-50", text: "text-slate-600", rail: "bg-slate-400" },
  "Laydown": { bg: "bg-slate-50", text: "text-slate-600", rail: "bg-slate-400" },
}

// ---------------------------------------------------------------------------
// Material Check data model (G2)
// ---------------------------------------------------------------------------

export type MaterialCheckStatus = "Pending" | "Cleared" | "Non-conformance"

export interface HeatPiece {
  id: string
  heatNumber: string
  materialGrade: string
  diaInch: string
  lengthM: number
  millCertRef?: string
  status: MaterialCheckStatus
  ncRemark?: string
}

export interface MaterialCheckRecord {
  spoolNo: string
  pieces: HeatPiece[]
  inspector?: string
  signedOffDate?: string
  nonConformanceCount: number
}

export const QC_INSPECTORS = [
  "QC-ENG-01",
  "QC-ENG-02",
  "QC-ENG-03",
  "QC-ENG-04",
]


// ---------------------------------------------------------------------------
// Paint data model (G4)
// ---------------------------------------------------------------------------

export const PAINT_SYSTEMS = [
  "PS-1A: Zinc Primer only",
  "PS-2B: Epoxy 2-coat",
  "PS-3A: Zinc Primer + Epoxy (250 µm)",
  "PS-4C: High-temp Silicone (cryo lines)",
] as const
export type PaintSystem = (typeof PAINT_SYSTEMS)[number]

export const PAINT_SUBCONTRACTORS = [
  "ColorPro Coatings Inc",
  "Apex Industrial Painting",
  "PetroCoat Services",
] as const
export type PaintSubcontractor = (typeof PAINT_SUBCONTRACTORS)[number]

export interface PaintRecord {
  spoolNo: string
  paintSystem?: PaintSystem
  subcontractor?: PaintSubcontractor
  dispatchDate?: string         // ISO date — set on dispatch
  returnDate?: string            // ISO date — set on sign-off
  dftMicrons?: number            // dry-film thickness, µm
  finalQCInspector?: string      // from QC_INSPECTORS (reuse from G2/G3)
  finalQCSignedOffDate?: string  // ISO date — set on sign-off
  dispatchRemark?: string        // optional note captured on dispatch
}


// ---------------------------------------------------------------------------
// Stage derivation (G1 + G2 + G3 + G4)
// ---------------------------------------------------------------------------

export function deriveFabStage(
  readiness: SpoolReadiness | undefined,
  mcRecord?: MaterialCheckRecord,
  qcRecord?: QCReleaseRecord,
  paintRecord?: PaintRecord,
  laydownRecord?: LaydownRecord,
): SpoolFabStage {
  // G5: placed on laydown yard takes absolute priority
  if (laydownRecord?.placedDate) return "Laydown"

  // G4: paint-signed-off takes absolute priority
  if (paintRecord?.finalQCSignedOffDate) return "Painted"
  // G4: dispatched to paint shop (not yet signed off)
  if (paintRecord?.dispatchDate) return "Sent to Paint"

  // G3: signed-off QC record takes highest priority
  if (qcRecord?.signedOffDate) return "QC Release"

  if (!readiness || readiness.total === 0) {
    // If no welds but we have an MC record, use MC logic
    if (mcRecord) {
      const hasPending = mcRecord.pieces.some((p) => p.status === "Pending")
      if (!mcRecord.signedOffDate || hasPending) return "Material Check"
      return "Weld Progress"
    }
    return "Not Started"
  }

  if (mcRecord) {
    const hasPending = mcRecord.pieces.some((p) => p.status === "Pending")
    if (!mcRecord.signedOffDate || hasPending) return "Material Check"
    if (readiness.status === "Ready for delivery") return "Fabricated"
    return "Weld Progress"
  }

  // G1 fallback — no MC record
  if (readiness.status === "Ready for delivery") return "Fabricated"
  if (readiness.status === "Not started") return "Not Started"
  return "Weld Progress"
}

// ---------------------------------------------------------------------------
// QC Release data model (G3)
// ---------------------------------------------------------------------------

export type QCChecklistKey =
  | "dimensional"
  | "visual"
  | "nde_complete"
  | "traceability"

export interface QCChecklistItem {
  key: QCChecklistKey
  label: string
  description: string
}

export const QC_CHECKLIST: QCChecklistItem[] = [
  { key: "dimensional", label: "Dimensional check", description: "Length, flange face, bolt-hole orientation against ISO" },
  { key: "visual", label: "Visual inspection", description: "Surface defects, weld spatter, alignment" },
  { key: "nde_complete", label: "NDE complete", description: "All required NDE batches accepted; no outstanding rejections" },
  { key: "traceability", label: "Heat-number traceability", description: "All pieces match the Material Check record" },
]

export type QCChecklistStatus = "Pending" | "Pass" | "Pass with remark" | "Fail"

export interface QCChecklistEntry {
  key: QCChecklistKey
  status: QCChecklistStatus
  remark?: string  // required when status === "Pass with remark"
}

export interface QCReleaseRecord {
  spoolNo: string
  entries: QCChecklistEntry[]
  inspector?: string
  signedOffDate?: string
  failReason?: string
  failedAt?: string
}


// ---------------------------------------------------------------------------
// Laydown data model (G5)
// ---------------------------------------------------------------------------

export const YARD_LOCATIONS = [
  "YARD-A-01",
  "YARD-A-12",
  "YARD-B-04",
  "YARD-B-09",
  "YARD-C-02",
  "YARD-C-15",
] as const
export type YardLocation = (typeof YARD_LOCATIONS)[number]

export interface LaydownRecord {
  spoolNo: string
  yardLocation: YardLocation
  placedDate: string
  placedBy: string
  releasedToSiteDate?: string
  releasedBy?: string
}

// Fabrication demo seeds are derived from the canonical spine.
// See lib/fixtures/derive/fabrication.ts.
export { MATERIAL_CHECK_SEED, PAINT_SEED, QC_RELEASE_SEED, LAYDOWN_SEED } from "@/lib/fixtures"
