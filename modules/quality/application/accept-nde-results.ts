import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase/database.types"
import { recordNdeResult } from "../infrastructure/supabase-quality-repository"

export interface AcceptOutcome {
  accepted: string[]
  failed: { id: string; message: string }[]
}

/**
 * Records "accepted" for several joints. Each is its own command (the server checks each), so a refusal on one
 * leaves the others recorded; the caller gets both lists. The report number is numbered per joint, and the retry
 * key is stable per obligation, so a repeated click cannot record a joint twice.
 */
export async function acceptNdeResults(
  client: SupabaseClient<Database>,
  obligationIds: readonly string[],
  examinedOn: string,
  reportNumber: string | null,
): Promise<AcceptOutcome> {
  const outcome: AcceptOutcome = { accepted: [], failed: [] }
  const base = reportNumber?.trim() ?? ""
  for (const [index, id] of obligationIds.entries()) {
    try {
      await recordNdeResult(client, id, "accepted", examinedOn, base ? `${base}-${index + 1}` : null, null, null, `nde-accept-${id}`)
      outcome.accepted.push(id)
    } catch (error) {
      outcome.failed.push({ id, message: error instanceof Error ? error.message : String(error) })
    }
  }
  return outcome
}

/** A rejection needs a defect code; a responsible welder, if named, must be one who welded this joint. */
export function rejectDraftValid(draft: { defectCodeId: string; welderId: string }, jointWelderIds: readonly string[]): boolean {
  return draft.defectCodeId !== "" && (draft.welderId === "" || jointWelderIds.includes(draft.welderId))
}
