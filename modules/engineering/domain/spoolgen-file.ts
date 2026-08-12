import type { ImportIssue } from "@/modules/imports/domain/import-issue"

export const SPOOLGEN_FILE_ROLES = ["weld", "trace", "bolt", "supp"] as const
export type SpoolgenFileRole = (typeof SPOOLGEN_FILE_ROLES)[number]
export const SPOOLGEN_REQUIRED_ROLES: readonly SpoolgenFileRole[] = ["weld"]
export const SPOOLGEN_MAX_FILE_BYTES = 4 * 1024 * 1024

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
export function checkFileSize(role: SpoolgenFileRole, fileName: string, sizeBytes: number): ImportIssue | null {
  if (sizeBytes <= 0) return { rowNumber: null, columnName: role, severity: "blocker", code: "FILE_EMPTY", message: `${fileName} is empty.` }
  if (sizeBytes > SPOOLGEN_MAX_FILE_BYTES) return { rowNumber: null, columnName: role, severity: "blocker", code: "FILE_TOO_LARGE", message: `${fileName} is larger than the 4 MB limit for SpoolGen files.` }
  return null
}
