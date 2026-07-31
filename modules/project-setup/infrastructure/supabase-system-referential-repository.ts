import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type {
  FilmQuantityRule,
  UtCalculationRule,
  SystemReferenceEntry,
} from "../domain/system-referential"
import { TORQUING_METHODS } from "../domain/system-referential"
import { mapSupabaseReferenceError } from "./supabase-reference-errors"

export interface LoadedSystemReferentials {
  materialTypes: SystemReferenceEntry[]
  filmQuantityRules: FilmQuantityRule[]
  utCalculationRules: UtCalculationRule[]
  torquingMethods: readonly ["Manual", "Torquing", "Tensioning"]
  canManage: boolean
}

export async function loadSystemReferentials(
  client: SupabaseClient<Database>
): Promise<LoadedSystemReferentials> {
  const [entriesRes, filmRes, utRes, manageRes] = await Promise.all([
    client
      .from("system_reference_entries")
      .select("id, kind, code, description, status, created_at, updated_at")
      .eq("kind", "material_type")
      .order("code", { ascending: true }),
    client
      .from("system_film_quantity_rules")
      .select("id, diameter_from_inch, diameter_to_inch, thickness_from_mm, thickness_to_mm, film_count")
      .order("diameter_from_inch", { ascending: true })
      .order("thickness_from_mm", { ascending: true }),
    client
      .from("system_ut_calculation_rules")
      .select("id, diameter_from_inch, diameter_to_inch, coefficient_diameter, coefficient_rating")
      .order("diameter_from_inch", { ascending: true }),
    client.rpc("current_user_has_global_capability", {
      requested_capability: "system_referential.manage",
    }),
  ])

  if (entriesRes.error) throw new Error(mapSupabaseReferenceError(entriesRes.error))
  if (filmRes.error) throw new Error(mapSupabaseReferenceError(filmRes.error))
  if (utRes.error) throw new Error(mapSupabaseReferenceError(utRes.error))

  const materialTypes: SystemReferenceEntry[] = (entriesRes.data ?? []).map((row) => ({
    id: row.id,
    kind: "material_type",
    code: row.code,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))

  const filmQuantityRules: FilmQuantityRule[] = (filmRes.data ?? []).map((row) => ({
    id: row.id,
    diameterFromInch: Number(row.diameter_from_inch),
    diameterToInch: Number(row.diameter_to_inch),
    thicknessFromMm: Number(row.thickness_from_mm),
    thicknessToMm: Number(row.thickness_to_mm),
    filmCount: row.film_count,
  }))

  const utCalculationRules: UtCalculationRule[] = (utRes.data ?? []).map((row) => ({
    id: row.id,
    diameterFromInch: Number(row.diameter_from_inch),
    diameterToInch: Number(row.diameter_to_inch),
    coefficientDiameter: Number(row.coefficient_diameter),
    coefficientRating: Number(row.coefficient_rating),
  }))

  const canManage = manageRes.data === true

  return {
    materialTypes,
    filmQuantityRules,
    utCalculationRules,
    torquingMethods: TORQUING_METHODS,
    canManage,
  }
}

export async function createMaterialType(
  client: SupabaseClient<Database>,
  input: { code: string; description: string }
): Promise<SystemReferenceEntry> {
  const { data, error } = await client
    .from("system_reference_entries")
    .insert({
      kind: "material_type",
      code: input.code.trim().toUpperCase(),
      description: input.description.trim(),
      status: "active",
    })
    .select("id, kind, code, description, status, created_at, updated_at")
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return {
    id: data.id,
    kind: "material_type",
    code: data.code,
    description: data.description,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function updateMaterialType(
  client: SupabaseClient<Database>,
  id: string,
  input: { code: string; description: string }
): Promise<SystemReferenceEntry> {
  const { data, error } = await client
    .from("system_reference_entries")
    .update({
      code: input.code.trim().toUpperCase(),
      description: input.description.trim(),
    })
    .eq("id", id)
    .eq("kind", "material_type")
    .select("id, kind, code, description, status, created_at, updated_at")
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return {
    id: data.id,
    kind: "material_type",
    code: data.code,
    description: data.description,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function setMaterialTypeStatus(
  client: SupabaseClient<Database>,
  id: string,
  status: "active" | "inactive" | "archived"
): Promise<SystemReferenceEntry> {
  const { data, error } = await client
    .from("system_reference_entries")
    .update({ status })
    .eq("id", id)
    .eq("kind", "material_type")
    .select("id, kind, code, description, status, created_at, updated_at")
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return {
    id: data.id,
    kind: "material_type",
    code: data.code,
    description: data.description,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}
