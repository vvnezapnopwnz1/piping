import type { WelderQualification, WeldingProcedure } from "../domain/weld-progress"

export interface WeldFormChoicesInput {
  weldLocation: string
  /** Shop and field subcontractor of the isometric's PDS area; null where the area names none. */
  area: { shopSubcontractorId: string | null; fieldSubcontractorId: string | null } | null
  /** What the person picked, used only where the area names no subcontractor. */
  pickedSubcontractorId: string
  procedures: readonly WeldingProcedure[]
  welders: readonly WelderQualification[]
}

export interface WeldFormChoices {
  subcontractorId: string
  /** The area fixed the subcontractor: the screen shows it read-only (manual 7.3, 12.3). */
  isFixedByArea: boolean
  procedures: WeldingProcedure[]
  welders: WelderQualification[]
}

/**
 * The subcontractor comes from the PDS area for the weld's location (manual 3.4); a WPS or a welder of
 * another subcontractor is not offered. The server enforces the same rule; this only keeps the lists honest.
 */
export function weldFormChoices(input: WeldFormChoicesInput): WeldFormChoices {
  const fromArea =
    (input.weldLocation === "field"
      ? input.area?.fieldSubcontractorId
      : input.area?.shopSubcontractorId) ?? null
  const subcontractorId = fromArea ?? input.pickedSubcontractorId
  return {
    subcontractorId,
    isFixedByArea: fromArea !== null,
    procedures: subcontractorId
      ? input.procedures.filter((p) => p.subcontractorId === null || p.subcontractorId === subcontractorId)
      : [...input.procedures],
    welders: subcontractorId
      ? input.welders.filter((w) => w.subcontractorId === subcontractorId)
      : [...input.welders],
  }
}
