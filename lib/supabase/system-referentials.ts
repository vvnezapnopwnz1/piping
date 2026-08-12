import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"
import {
  toSystemReferenceEntry,
  toMaterialTypeInsert,
  toMaterialTypeUpdate,
  type SystemReferenceEntry,
  type MaterialTypeInput,
} from "../system-referentials"

export const SYSTEM_REFERENTIAL_SELECT =
  "id, kind, code, description, status, created_at, updated_at" as const

export async function loadSystemReferentials(
  client: SupabaseClient<Database>
): Promise<{
  entries: SystemReferenceEntry[]
  canManage: boolean
}> {
  const [entriesRes, adminRes] = await Promise.all([
    client
      .from("system_reference_entries")
      .select(SYSTEM_REFERENTIAL_SELECT)
      .order("kind", { ascending: true })
      .order("code", { ascending: true }),
    client.rpc("is_platform_admin"),
  ])

  if (entriesRes.error) {
    throw new Error(entriesRes.error.message)
  }

  if (adminRes.error) {
    throw new Error(adminRes.error.message)
  }

  const entries = (entriesRes.data ?? []).map(toSystemReferenceEntry)
  const canManage = adminRes.data === true

  return { entries, canManage }
}

export async function createMaterialType(
  client: SupabaseClient<Database>,
  input: MaterialTypeInput
): Promise<SystemReferenceEntry> {
  const payload = toMaterialTypeInsert(input)
  const { data, error } = await client
    .from("system_reference_entries")
    .insert(payload)
    .select(SYSTEM_REFERENTIAL_SELECT)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return toSystemReferenceEntry(data)
}

export async function updateMaterialType(
  client: SupabaseClient<Database>,
  entryId: string,
  input: MaterialTypeInput
): Promise<SystemReferenceEntry> {
  const payload = toMaterialTypeUpdate(input)
  const { data, error } = await client
    .from("system_reference_entries")
    .update(payload)
    .eq("id", entryId)
    .eq("kind", "material_type")
    .select(SYSTEM_REFERENTIAL_SELECT)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return toSystemReferenceEntry(data)
}

export async function setMaterialTypeStatus(
  client: SupabaseClient<Database>,
  entryId: string,
  status: "active" | "inactive"
): Promise<SystemReferenceEntry> {
  const { data, error } = await client
    .from("system_reference_entries")
    .update({ status })
    .eq("id", entryId)
    .eq("kind", "material_type")
    .select(SYSTEM_REFERENTIAL_SELECT)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return toSystemReferenceEntry(data)
}

export async function deleteMaterialType(
  client: SupabaseClient<Database>,
  entryId: string
): Promise<void> {
  const { data, error } = await client
    .from("system_reference_entries")
    .delete()
    .eq("id", entryId)
    .eq("kind", "material_type")
    .select("id")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error("Material type was not deleted")
  }
}
