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

// Helper to build a seed record
function makeRecord(
  spoolNo: string,
  pieces: Omit<HeatPiece, "id">[],
  opts?: { inspector?: string; signedOffDate?: string }
): MaterialCheckRecord {
  const pcs: HeatPiece[] = pieces.map((p, i) => ({
    ...p,
    id: `HP-${spoolNo}-${i + 1}`,
  }))
  const ncCount = pcs.filter((p) => p.status === "Non-conformance").length
  return {
    spoolNo,
    pieces: pcs,
    inspector: opts?.inspector,
    signedOffDate: opts?.signedOffDate,
    nonConformanceCount: ncCount,
  }
}

export const MATERIAL_CHECK_SEED: MaterialCheckRecord[] = [
  // --- Material Check spools (Pending / NC) -------------------------------
  makeRecord("PL-CW200-003-A", [
    { heatNumber: "HT-SS-316L-55120", materialGrade: "SS 316L", diaInch: '12"', lengthM: 6.0, millCertRef: "MILL-2026-3841", status: "Cleared" },
    { heatNumber: "HT-SS-316L-55121", materialGrade: "SS 316L", diaInch: '12"', lengthM: 6.0, status: "Non-conformance", ncRemark: "Mill certificate not yet received from supplier" },
    { heatNumber: "HT-SS-316L-55122", materialGrade: "SS 316L", diaInch: '12"', lengthM: 6.0, millCertRef: "MILL-2026-3842", status: "Pending" },
  ]),
  makeRecord("PL-CW200-003-B", [
    { heatNumber: "HT-SS-316L-55123", materialGrade: "SS 316L", diaInch: '12"', lengthM: 6.0, millCertRef: "MILL-2026-3843", status: "Pending" },
    { heatNumber: "HT-SS-316L-55124", materialGrade: "SS 316L", diaInch: '12"', lengthM: 6.0, millCertRef: "MILL-2026-3844", status: "Pending" },
  ]),
  makeRecord("PL-FU300-007-B", [
    { heatNumber: "HT-CS-A106B-33010", materialGrade: "CS A106B", diaInch: '4"', lengthM: 6.0, millCertRef: "MILL-2026-2201", status: "Pending" },
    { heatNumber: "HT-CS-A106B-33011", materialGrade: "CS A106B", diaInch: '4"', lengthM: 6.0, millCertRef: "MILL-2026-2202", status: "Pending" },
  ]),
  makeRecord("PL-CW200-008-A", [
    { heatNumber: "HT-SS-316L-55130", materialGrade: "SS 316L", diaInch: '3"', lengthM: 6.0, millCertRef: "MILL-2026-3845", status: "Pending" },
    { heatNumber: "HT-SS-316L-55131", materialGrade: "SS 316L", diaInch: '3"', lengthM: 6.0, millCertRef: "MILL-2026-3846", status: "Pending" },
    { heatNumber: "HT-SS-316L-55132", materialGrade: "SS 316L", diaInch: '3"', lengthM: 6.0, millCertRef: "MILL-2026-3847", status: "Pending" },
  ]),

  // --- Pre-signed-off spools (land on Weld Progress) ----------------------
  makeRecord("PL-TK100-002-B", [
    { heatNumber: "HT-CS-P91-99810", materialGrade: "CS A335 P91", diaInch: '8"', lengthM: 6.0, millCertRef: "MILL-2026-1101", status: "Cleared" },
    { heatNumber: "HT-CS-P91-99811", materialGrade: "CS A335 P91", diaInch: '8"', lengthM: 6.0, millCertRef: "MILL-2026-1102", status: "Cleared" },
  ], { inspector: "QC-ENG-01", signedOffDate: "2025-05-10" }),
  makeRecord("PL-CW200-006-A", [
    { heatNumber: "HT-SS-316L-55140", materialGrade: "SS 316L", diaInch: '6"', lengthM: 6.0, millCertRef: "MILL-2026-3848", status: "Cleared" },
    { heatNumber: "HT-SS-316L-55141", materialGrade: "SS 316L", diaInch: '6"', lengthM: 6.0, millCertRef: "MILL-2026-3849", status: "Cleared" },
    { heatNumber: "HT-SS-316L-55142", materialGrade: "SS 316L", diaInch: '6"', lengthM: 6.0, millCertRef: "MILL-2026-3850", status: "Cleared" },
  ], { inspector: "QC-ENG-02", signedOffDate: "2025-05-11" }),

  // --- Signed-off spools (land on Fabricated or Weld Progress) -----------
  makeRecord("PL-TK100-001-A", [
    { heatNumber: "HT-CS-A106B-44210", materialGrade: "CS A106B", diaInch: '6"', lengthM: 6.0, millCertRef: "MILL-2026-2203", status: "Cleared" },
    { heatNumber: "HT-CS-A106B-44211", materialGrade: "CS A106B", diaInch: '6"', lengthM: 6.0, millCertRef: "MILL-2026-2204", status: "Cleared" },
  ], { inspector: "QC-ENG-03", signedOffDate: "2025-05-09" }),
  makeRecord("PL-TK100-001-B", [
    { heatNumber: "HT-CS-A106B-44212", materialGrade: "CS A106B", diaInch: '6"', lengthM: 6.0, millCertRef: "MILL-2026-2205", status: "Cleared" },
    { heatNumber: "HT-CS-A106B-44213", materialGrade: "CS A106B", diaInch: '6"', lengthM: 6.0, millCertRef: "MILL-2026-2206", status: "Cleared" },
  ], { inspector: "QC-ENG-03", signedOffDate: "2025-05-09" }),
  makeRecord("PL-FU300-007-A", [
    { heatNumber: "HT-CS-A106B-33012", materialGrade: "CS A106B", diaInch: '4"', lengthM: 6.0, millCertRef: "MILL-2026-2207", status: "Cleared" },
    { heatNumber: "HT-CS-A106B-33013", materialGrade: "CS A106B", diaInch: '4"', lengthM: 6.0, millCertRef: "MILL-2026-2208", status: "Cleared" },
  ], { inspector: "QC-ENG-04", signedOffDate: "2025-05-09" }),
  makeRecord("PL-TK100-002-A", [
    { heatNumber: "HT-CS-P91-99812", materialGrade: "CS A335 P91", diaInch: '8"', lengthM: 6.0, millCertRef: "MILL-2026-1103", status: "Cleared" },
    { heatNumber: "HT-CS-P91-99813", materialGrade: "CS A335 P91", diaInch: '8"', lengthM: 6.0, millCertRef: "MILL-2026-1104", status: "Cleared" },
  ], { inspector: "QC-ENG-01", signedOffDate: "2025-05-08" }),
  makeRecord("PL-CW200-005-A", [
    { heatNumber: "HT-SS-316L-55150", materialGrade: "SS 316L", diaInch: '3"', lengthM: 6.0, millCertRef: "MILL-2026-3851", status: "Cleared" },
    { heatNumber: "HT-SS-316L-55151", materialGrade: "SS 316L", diaInch: '3"', lengthM: 6.0, millCertRef: "MILL-2026-3852", status: "Cleared" },
  ], { inspector: "QC-ENG-02", signedOffDate: "2025-05-08" }),
  makeRecord("PL-TK100-003-A", [
    { heatNumber: "HT-CS-P91-99814", materialGrade: "CS A335 P91", diaInch: '10"', lengthM: 6.0, millCertRef: "MILL-2026-1105", status: "Cleared" },
    { heatNumber: "HT-CS-P91-99815", materialGrade: "CS A335 P91", diaInch: '10"', lengthM: 6.0, millCertRef: "MILL-2026-1106", status: "Cleared" },
  ], { inspector: "QC-ENG-01", signedOffDate: "2025-05-08" }),
  makeRecord("PL-FU300-009-A", [
    { heatNumber: "HT-CS-A106B-33014", materialGrade: "CS A106B", diaInch: '2"', lengthM: 6.0, millCertRef: "MILL-2026-2209", status: "Cleared" },
    { heatNumber: "HT-CS-A106B-33015", materialGrade: "CS A106B", diaInch: '2"', lengthM: 6.0, millCertRef: "MILL-2026-2210", status: "Cleared" },
  ], { inspector: "QC-ENG-04", signedOffDate: "2025-05-09" }),
  makeRecord("PL-TK100-004-A", [
    { heatNumber: "HT-CS-A106B-44214", materialGrade: "CS A106B", diaInch: '16"', lengthM: 6.0, millCertRef: "MILL-2026-2211", status: "Cleared" },
    { heatNumber: "HT-CS-A106B-44215", materialGrade: "CS A106B", diaInch: '16"', lengthM: 6.0, millCertRef: "MILL-2026-2212", status: "Cleared" },
  ], { inspector: "QC-ENG-03", signedOffDate: "2025-05-08" }),
  makeRecord("PL-FU300-011-A", [
    { heatNumber: "HT-CS-P91-99816", materialGrade: "CS A335 P91", diaInch: '8"', lengthM: 6.0, millCertRef: "MILL-2026-1107", status: "Cleared" },
    { heatNumber: "HT-CS-P91-99817", materialGrade: "CS A335 P91", diaInch: '8"', lengthM: 6.0, millCertRef: "MILL-2026-1108", status: "Cleared" },
  ], { inspector: "QC-ENG-01", signedOffDate: "2025-05-08" }),
]

// ---------------------------------------------------------------------------
// Stage derivation (G1 + G2)
// ---------------------------------------------------------------------------

export function deriveFabStage(
  readiness: SpoolReadiness | undefined,
  mcRecord?: MaterialCheckRecord,
  qcRecord?: QCReleaseRecord,
): SpoolFabStage {
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

export type QCChecklistKey = "dimensional" | "visual" | "documentation" | "traceability"

export interface QCChecklistItem {
  key: QCChecklistKey
  label: string
  description: string
}

export const QC_CHECKLIST: QCChecklistItem[] = [
  { key: "dimensional", label: "Dimensional check", description: "Length, flange face, bolt-hole orientation against ISO" },
  { key: "visual", label: "Visual inspection", description: "Surface defects, weld spatter, alignment" },
  { key: "documentation", label: "Documentation review", description: "WPS, welder logs, NDE reports all on file" },
  { key: "traceability", label: "Heat-number traceability", description: "All pieces match the Material Check record" },
]

export type QCChecklistStatus = "Pending" | "Pass" | "Pass with remark"

export interface QCChecklistEntry {
  key: QCChecklistKey
  status: QCChecklistStatus
  remark?: string  // required when status === "Pass with remark"
}

export interface QCReleaseRecord {
  spoolNo: string
  entries: QCChecklistEntry[]   // length 4, one per QC_CHECKLIST item
  inspector?: string             // set on sign-off
  signedOffDate?: string         // ISO date — set on sign-off
}

function makeQCRecord(
  spoolNo: string,
  entries: Partial<Record<QCChecklistKey, { status: QCChecklistStatus; remark?: string }>>,
  opts?: { inspector?: string; signedOffDate?: string },
): QCReleaseRecord {
  return {
    spoolNo,
    entries: QC_CHECKLIST.map((item) => ({
      key: item.key,
      status: entries[item.key]?.status ?? "Pending",
      remark: entries[item.key]?.remark,
    })),
    inspector: opts?.inspector,
    signedOffDate: opts?.signedOffDate,
  }
}

export const QC_RELEASE_SEED: QCReleaseRecord[] = [
  // Pre-released spools — all 4 entries Pass
  makeQCRecord(
    "PL-TK100-002-A",
    {
      dimensional: { status: "Pass" },
      visual: { status: "Pass" },
      documentation: { status: "Pass" },
      traceability: { status: "Pass" },
    },
    { inspector: "QC-ENG-01", signedOffDate: "2025-05-12" },
  ),
  makeQCRecord(
    "PL-CW200-005-A",
    {
      dimensional: { status: "Pass" },
      visual: { status: "Pass" },
      documentation: { status: "Pass" },
      traceability: { status: "Pass" },
    },
    { inspector: "QC-ENG-02", signedOffDate: "2025-05-11" },
  ),
  // Anchor spool — Pass with remark on Dimensional
  makeQCRecord(
    "PL-TK100-001-A",
    {
      dimensional: { status: "Pass with remark", remark: "0.3 mm out on flange face — within tolerance per spec 12-PIP-002" },
      visual: { status: "Pass" },
      documentation: { status: "Pass" },
      traceability: { status: "Pass" },
    },
    { inspector: "QC-ENG-03", signedOffDate: "2025-05-10" },
  ),
]
