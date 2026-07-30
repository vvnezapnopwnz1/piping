import type { Database } from "@/lib/supabase/database.types"

type SystemReferenceRow = Database["public"]["Tables"]["system_reference_entries"]["Row"]
export type SystemReferenceKind = Database["public"]["Enums"]["system_reference_kind"]

export type SystemReferentialSectionKey = "materialTypes" | "filmQty" | "utCalc" | "torquing"

export interface SystemReferentialSectionConfig {
  kind: SystemReferenceKind
  title: string
  mutable: boolean
}

export const SYSTEM_REFERENCE_SECTIONS = {
  materialTypes: { kind: "material_type", title: "Material Type", mutable: true },
  filmQty: { kind: "film_quantity", title: "Film Quantity per Diameter", mutable: false },
  utCalc: { kind: "ut_calculation", title: "UT Calculation", mutable: false },
  torquing: { kind: "torquing_requirement", title: "Torquing Requirement", mutable: false },
} as const satisfies Record<SystemReferentialSectionKey, SystemReferentialSectionConfig>

export type SystemReferentialSection = SystemReferentialSectionKey

export function toSystemReferentialSection(kind: SystemReferenceKind): SystemReferentialSection {
  switch (kind) {
    case "material_type":
      return "materialTypes"
    case "film_quantity":
      return "filmQty"
    case "ut_calculation":
      return "utCalc"
    case "torquing_requirement":
      return "torquing"
  }
}

export interface SystemReferenceEntry {
  id: string
  kind: SystemReferenceKind
  code: string
  description: string
  status: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export function toSystemReferenceEntry(
  row: Pick<SystemReferenceRow, "id" | "kind" | "code" | "description" | "status" | "created_at" | "updated_at">
): SystemReferenceEntry {
  return {
    id: row.id,
    kind: row.kind,
    code: row.code,
    description: row.description,
    status: row.status,
    active: row.status === "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export interface MaterialTypeInput {
  code: string
  description: string
}

export interface MaterialTypeValidation {
  isValid: boolean
  errors: {
    code?: string
    description?: string
  }
  value: {
    code: string
    description: string
  }
}

export function validateMaterialType(input: MaterialTypeInput): MaterialTypeValidation {
  const trimmedCode = input.code.trim()
  const trimmedDescription = input.description.trim()

  const errors: { code?: string; description?: string } = {}

  if (!trimmedCode) {
    errors.code = "Code is required"
  }

  if (!trimmedDescription) {
    errors.description = "Description is required"
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    value: {
      code: trimmedCode,
      description: trimmedDescription,
    },
  }
}

export function toMaterialTypeInsert(input: MaterialTypeInput): { kind: "material_type"; code: string; description: string } {
  const trimmedCode = input.code.trim()
  const trimmedDescription = input.description.trim()
  return {
    kind: "material_type",
    code: trimmedCode,
    description: trimmedDescription,
  }
}

export function toMaterialTypeUpdate(input: MaterialTypeInput): { code: string; description: string } {
  const trimmedCode = input.code.trim()
  const trimmedDescription = input.description.trim()
  return {
    code: trimmedCode,
    description: trimmedDescription,
  }
}
