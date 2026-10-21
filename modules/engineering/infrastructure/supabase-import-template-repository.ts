import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Json } from "@/lib/supabase/database.types"
import { isImportSourceId, parseTemplateSettings, templateKindOf, type ImportReferences, type ImportTemplate } from "../domain/import-template"
import { mapSupabaseEngineeringError } from "./supabase-engineering-errors"

export type { ImportReferences }

type Client = SupabaseClient<Database>
type StoredTemplate = { id: string; source: string; name: string; settings: unknown }

const TEMPLATE_COLUMNS = "id, source, name, settings"
const TABLE = "spooling_import_templates"

type DatabaseError = { code?: string; message?: string }

/** The two codes a template write can hit for its own reasons get a sentence about templates; the rest use the engineering messages. */
function failure(error: DatabaseError): Error {
  if (error.code === "23505") return new Error("A template with this name already exists in this project. Choose another name.")
  if (error.code === "23514") return new Error("The template name or source is not allowed. A name takes 1 to 120 characters.")
  return new Error(mapSupabaseEngineeringError(error))
}

/** Row level security hides a row the user may not change instead of failing, so no row back means no permission. */
const refused = () => new Error(mapSupabaseEngineeringError({ code: "42501" }))

/** A stored row as a template, or null when it is not a usable one: settings that are no template, or of another kind than its source takes. */
export function toImportTemplate(row: StoredTemplate): ImportTemplate | null {
  if (!isImportSourceId(row.source)) return null
  const settings = parseTemplateSettings(row.settings)
  if (settings === null || settings.kind !== templateKindOf(row.source)) return null
  return { id: row.id, source: row.source, name: row.name, settings }
}

/** The project's saved templates, the most recently saved first. A row that does not read as a template is left out. */
export async function loadImportTemplates(client: Client, projectId: string): Promise<ImportTemplate[]> {
  const { data, error } = await client.from(TABLE).select(TEMPLATE_COLUMNS).eq("project_id", projectId).order("updated_at", { ascending: false }).order("name")
  if (error) throw failure(error)
  return (data ?? []).flatMap((row) => toImportTemplate(row) ?? [])
}

/** Inserts a template without an id, updates one with an id. The settings are stored in the form the parser reads them back in. */
export async function saveImportTemplate(client: Client, projectId: string, template: ImportTemplate): Promise<ImportTemplate> {
  const settings = parseTemplateSettings(template.settings)
  if (settings === null || settings.kind !== templateKindOf(template.source)) throw new Error("The template settings do not fit its source.")
  const values = { source: template.source, name: template.name.trim(), settings: settings as unknown as NonNullable<Json> }
  const { data, error } = template.id === null
    ? await client.from(TABLE).insert({ project_id: projectId, ...values }).select(TEMPLATE_COLUMNS).single()
    : await client.from(TABLE).update(values).eq("id", template.id).eq("project_id", projectId).select(TEMPLATE_COLUMNS).maybeSingle()
  if (error) throw failure(error)
  if (data === null) throw refused()
  const saved = toImportTemplate(data)
  if (saved === null) throw new Error(mapSupabaseEngineeringError(null))
  return saved
}

export async function deleteImportTemplate(client: Client, templateId: string): Promise<void> {
  const { data, error } = await client.from(TABLE).delete().eq("id", templateId).select("id")
  if (error) throw failure(error)
  if ((data ?? []).length === 0) throw refused()
}

/** The project's active codes, for the drop-downs and the code maps of a template. */
export async function loadImportReferences(client: Client, projectId: string): Promise<ImportReferences> {
  const [areas, classes, weldTypes] = await Promise.all([
    client.from("project_pds_areas").select("code").eq("project_id", projectId).eq("status", "active").order("code"),
    client.from("project_service_classes").select("code").eq("project_id", projectId).eq("status", "active").order("code"),
    client.from("project_weld_types").select("code").eq("project_id", projectId).eq("status", "active").order("code"),
  ])
  for (const result of [areas, classes, weldTypes]) if (result.error) throw new Error(mapSupabaseEngineeringError(result.error))
  const codes = (rows: { code: string }[] | null) => (rows ?? []).map((row) => row.code)
  return { pdsAreas: codes(areas.data), serviceClasses: codes(classes.data), weldTypes: codes(weldTypes.data) }
}
