import type { IsometricNumberRow, IsometricReadinessRow, ProjectReferenceOptionRow, ProjectSubsystemOptionRow } from "../infrastructure/supabase-pressure-test-repository"

/** What the presenter reads (`label`) and what the RPC receives (`id`). */
export interface ReferenceOption {
  id: string
  label: string
}

export interface IsometricOption extends ReferenceOption {
  isRft: boolean
}

export function toReferenceOptions(rows: readonly ProjectReferenceOptionRow[]): ReferenceOption[] {
  return rows.map((row) => ({ id: row.id, label: row.description ? `${row.code} · ${row.description}` : row.code }))
}

export function subsystemOptionsForSystem(rows: readonly ProjectSubsystemOptionRow[], systemId: string): ReferenceOption[] {
  return systemId ? toReferenceOptions(rows.filter((row) => row.systemId === systemId)) : []
}

/** A value the current options no longer offer is dropped rather than submitted to the server. */
export function keepSelectedOption(selected: string, options: readonly ReferenceOption[]): string {
  return options.some((option) => option.id === selected) ? selected : ""
}

type ReadinessOption = Pick<IsometricReadinessRow, "isometric_id" | "is_rft">

export function isometricOptions(readiness: readonly ReadinessOption[], numbers: readonly IsometricNumberRow[]): IsometricOption[] {
  const numberById = new Map(numbers.map((row) => [row.id, row.isoNumber]))
  return readiness
    .flatMap((row) => (row.isometric_id ? [{ id: row.isometric_id, label: numberById.get(row.isometric_id) ?? row.isometric_id, isRft: row.is_rft === true }] : []))
    .sort((left, right) => left.label.localeCompare(right.label))
}
