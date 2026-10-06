import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Tables } from "@/lib/supabase/database.types"
import type { AcceptedMaterialEvidence, BillLine, MaterialCandidate } from "../domain/material-check"
import { mapSupabaseConstructionError } from "./supabase-construction-errors"

type Client = SupabaseClient<Database>
type LineRow = Database["public"]["Views"]["material_check_lines"]["Row"]
type RecordRow = Pick<Tables<"material_check_records">, "id" | "checked_on" | "qc13_form_id">
type FormRow = Pick<Tables<"qc13_progress_forms">, "id" | "form_number" | "requested_on">

export interface MaterialQc13Form { id: string; formNumber: string; requestedOn: string }
export interface MaterialCheckWorkspace {
  lines: BillLine[]
  accepted: AcceptedMaterialEvidence[]
  record: { id: string; checkedOn: string; qc13Form: MaterialQc13Form | null } | null
  latestQc13Form: MaterialQc13Form | null
}

function fail(error: { code?: string; message?: string } | null): void {
  if (error) throw new Error(mapSupabaseConstructionError(error))
}

const toForm = (form: FormRow): MaterialQc13Form => ({ id: form.id, formNumber: form.form_number, requestedOn: form.requested_on })

/** `forms` must be ordered newest first, as `loadMaterialCheckWorkspace` reads them. */
export function toMaterialCheckWorkspace(input: { lines: LineRow[]; record: RecordRow | null; forms: FormRow[] }): MaterialCheckWorkspace {
  const lines: BillLine[] = input.lines.map((row) => ({
    spoolRevisionMaterialId: row.spool_revision_material_id ?? "",
    identCode: row.ident_code ?? "",
    description: row.description,
    quantity: row.quantity,
    unit: row.unit,
    expectedTraceNumber: row.expected_trace_number,
  }))
  const accepted: AcceptedMaterialEvidence[] = input.lines
    .filter((row) => row.accepted_piping_material_record_id !== null)
    .map((row) => ({
      spoolRevisionMaterialId: row.spool_revision_material_id ?? "",
      pipingMaterialRecordId: row.accepted_piping_material_record_id ?? "",
      traceNumber: row.accepted_trace_number,
      mrrNumber: row.accepted_mrr_number,
      status: row.accepted_status,
    }))
  const recorded = input.record?.qc13_form_id ? input.forms.find((form) => form.id === input.record?.qc13_form_id) : undefined
  return {
    lines,
    accepted,
    record: input.record ? { id: input.record.id, checkedOn: input.record.checked_on, qc13Form: recorded ? toForm(recorded) : null } : null,
    latestQc13Form: input.forms[0] ? toForm(input.forms[0]) : null,
  }
}

export async function loadMaterialCheckWorkspace(client: Client, spoolRevisionId: string): Promise<MaterialCheckWorkspace> {
  const [lines, record, forms] = await Promise.all([
    client.from("material_check_lines").select("*").eq("spool_revision_id", spoolRevisionId)
      .order("ident_code").order("expected_trace_number").order("spool_revision_material_id"),
    client.from("material_check_records").select("id, checked_on, qc13_form_id").eq("spool_revision_id", spoolRevisionId).maybeSingle(),
    client.from("qc13_progress_forms").select("id, form_number, requested_on").eq("spool_revision_id", spoolRevisionId)
      .order("requested_on", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }),
  ])
  fail(lines.error)
  fail(record.error)
  fail(forms.error)
  return toMaterialCheckWorkspace({ lines: lines.data ?? [], record: record.data, forms: forms.data ?? [] })
}

/** Every eligible PML record for one BOM row: the server's rule, read from `material_trace_candidates`. */
export async function loadMaterialTraceCandidates(client: Client, spoolRevisionMaterialId: string): Promise<MaterialCandidate[]> {
  const { data, error } = await client.from("material_trace_candidates")
    .select("piping_material_record_id, trace_number, mrr_number")
    .eq("spool_revision_material_id", spoolRevisionMaterialId)
    .order("trace_number").order("piping_material_record_id")
  fail(error)
  return (data ?? []).map((row) => ({
    id: row.piping_material_record_id ?? "",
    traceNumber: row.trace_number ?? "",
    mrrNumber: row.mrr_number ?? "",
  }))
}
