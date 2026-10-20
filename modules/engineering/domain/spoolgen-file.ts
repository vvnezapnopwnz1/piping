import { spoolgenIssue, type SpoolgenIssue } from "./spoolgen-issue"

export const SPOOLGEN_FILE_ROLES = ["weld", "trace", "bolt", "supp"] as const
export type SpoolgenFileRole = (typeof SPOOLGEN_FILE_ROLES)[number]
/** The role a file is stored under: one of the four SpoolGen files, or a PCF file (one per isometric). */
export type SpoolingFileRole = SpoolgenFileRole | "pcf"
export const SPOOLGEN_REQUIRED_ROLES: readonly SpoolgenFileRole[] = ["weld"]
export const SPOOLGEN_MAX_FILE_BYTES = 4 * 1024 * 1024
/** At most this many files in one spooling import; the server refuses the next one. */
export const SPOOLING_MAX_FILES = 300

export function isSpoolgenFileRole(value: string): value is SpoolgenFileRole {
  return (SPOOLGEN_FILE_ROLES as readonly string[]).includes(value)
}
export function missingRequiredRoles(present: readonly SpoolgenFileRole[]): SpoolgenFileRole[] {
  return SPOOLGEN_REQUIRED_ROLES.filter((role) => !present.includes(role))
}
export interface FileSetDescription { complete: boolean; missingRequired: SpoolgenFileRole[]; optionalMissing: SpoolgenFileRole[] }
export function describeFileSet(present: readonly SpoolgenFileRole[]): FileSetDescription {
  const missingRequired = missingRequiredRoles(present)
  return { complete: missingRequired.length === 0 && present.length === SPOOLGEN_FILE_ROLES.length, missingRequired, optionalMissing: SPOOLGEN_FILE_ROLES.filter((role) => !present.includes(role) && !SPOOLGEN_REQUIRED_ROLES.includes(role)) }
}
export function checkFileSize(role: SpoolgenFileRole, _fileName: string, sizeBytes: number): SpoolgenIssue | null {
  if (sizeBytes <= 0) return spoolgenIssue("FILE_EMPTY", null, role)
  if (sizeBytes > SPOOLGEN_MAX_FILE_BYTES) return spoolgenIssue("FILE_TOO_LARGE", null, role)
  return null
}
