import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type {
  BillLine,
  MaterialCandidate,
  AcceptedMaterialEvidence,
} from "../domain/material-check"
import { mapSupabaseConstructionError } from "./supabase-construction-errors"

export interface MaterialQc13Form {
  id: string
  formNumber: string
  requestedOn: string
}

export interface MaterialCheckWorkspace {
  lines: BillLine[]
  accepted: AcceptedMaterialEvidence[]
  record: { id: string; checkedOn: string; qc13Form: MaterialQc13Form | null } | null
  latestQc13Form: MaterialQc13Form | null
}

export interface MaterialCandidateCursor {
  traceNumber: string
  id: string
}

export interface MaterialCandidatePage {
  options: MaterialCandidate[]
  nextCursor: MaterialCandidateCursor | null
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value)
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const num = typeof value === "number" ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

function decodeQc13Form(raw: unknown): MaterialQc13Form | null {
  if (!raw || typeof raw !== "object") return null
  const item = raw as Record<string, unknown>
  if (!isUuid(item.id) || typeof item.formNumber !== "string" || typeof item.requestedOn !== "string") {
    throw new Error("Malformed QC-13 form in workspace payload.")
  }
  return {
    id: item.id,
    formNumber: item.formNumber,
    requestedOn: item.requestedOn,
  }
}

function decodeAcceptedEvidence(raw: unknown): AcceptedMaterialEvidence | null {
  if (!raw || typeof raw !== "object") return null
  const item = raw as Record<string, unknown>
  if (
    !isUuid(item.materialCheckItemId) ||
    !isUuid(item.spoolRevisionMaterialId) ||
    !isUuid(item.pipingMaterialRecordId)
  ) {
    throw new Error("Malformed accepted evidence in workspace payload.")
  }
  const status =
    item.status === "active" || item.status === "inactive" || item.status === "archived"
      ? item.status
      : null
  return {
    materialCheckItemId: item.materialCheckItemId,
    spoolRevisionMaterialId: item.spoolRevisionMaterialId,
    pipingMaterialRecordId: item.pipingMaterialRecordId,
    traceNumber: typeof item.traceNumber === "string" ? item.traceNumber : null,
    mrrNumber: typeof item.mrrNumber === "string" ? item.mrrNumber : null,
    status,
    quantity: parseNumber(item.quantity),
  }
}

function decodeBillLine(raw: unknown): { line: BillLine; accepted: AcceptedMaterialEvidence | null } {
  if (!raw || typeof raw !== "object") {
    throw new Error("Malformed BOM line in workspace payload.")
  }
  const item = raw as Record<string, unknown>
  if (!isUuid(item.spoolRevisionMaterialId) || typeof item.identCode !== "string") {
    throw new Error("Malformed BOM line identification in workspace payload.")
  }
  const line: BillLine = {
    spoolRevisionMaterialId: item.spoolRevisionMaterialId,
    identCode: item.identCode,
    description: typeof item.description === "string" ? item.description : null,
    quantity: parseNumber(item.quantity),
    unit: typeof item.unit === "string" ? item.unit : null,
    expectedTraceNumber: typeof item.expectedTraceNumber === "string" ? item.expectedTraceNumber : null,
  }
  const accepted = item.accepted ? decodeAcceptedEvidence(item.accepted) : null
  return { line, accepted }
}

export async function loadMaterialCheckWorkspace(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<MaterialCheckWorkspace> {
  if (!isUuid(spoolRevisionId)) {
    throw new Error("Invalid spool revision ID.")
  }

  const allLines = new Map<string, BillLine>()
  const allAccepted = new Map<string, AcceptedMaterialEvidence>()
  let recordHeader: MaterialCheckWorkspace["record"] = null
  let latestQc13Form: MaterialQc13Form | null = null

  let afterId: string | null = null
  let hasMore = true
  const seenAfterIds = new Set<string>()

  while (hasMore) {
    const { data, error } = await client.rpc("read_material_check_workspace", {
      target_spool_revision_id: spoolRevisionId,
      after_id: afterId ?? undefined,
      page_size: 200,
    })

    if (error) {
      throw new Error(mapSupabaseConstructionError(error))
    }

    if (!data || typeof data !== "object") {
      throw new Error("Malformed workspace response from server.")
    }

    const payload = data as Record<string, unknown>
    if (!Array.isArray(payload.lines)) {
      throw new Error("Malformed workspace lines array.")
    }

    for (const rawLine of payload.lines) {
      const { line, accepted } = decodeBillLine(rawLine)
      allLines.set(line.spoolRevisionMaterialId, line)
      if (accepted) {
        allAccepted.set(accepted.materialCheckItemId, accepted)
      }
    }

    if (payload.record !== undefined) {
      if (payload.record === null) {
        recordHeader = null
      } else if (typeof payload.record === "object") {
        const rawRec = payload.record as Record<string, unknown>
        if (!isUuid(rawRec.id) || typeof rawRec.checkedOn !== "string") {
          throw new Error("Malformed material check record in workspace payload.")
        }
        recordHeader = {
          id: rawRec.id,
          checkedOn: rawRec.checkedOn,
          qc13Form: decodeQc13Form(rawRec.qc13Form),
        }
      } else {
        throw new Error("Malformed record header in workspace payload.")
      }
    }

    if (payload.latestQc13Form !== undefined) {
      latestQc13Form = decodeQc13Form(payload.latestQc13Form)
    }

    const rawHasMore = payload.hasMore === true
    const nextAfterId = typeof payload.nextAfterId === "string" ? payload.nextAfterId : null

    if (rawHasMore) {
      if (!nextAfterId || !isUuid(nextAfterId) || seenAfterIds.has(nextAfterId)) {
        throw new Error("Invalid pagination cursor received from server.")
      }
      seenAfterIds.add(nextAfterId)
      afterId = nextAfterId
      hasMore = true
    } else {
      hasMore = false
    }
  }

  const sortedLines = Array.from(allLines.values()).sort((a, b) => {
    const identCmp = a.identCode.localeCompare(b.identCode)
    if (identCmp !== 0) return identCmp
    const traceA = a.expectedTraceNumber ?? ""
    const traceB = b.expectedTraceNumber ?? ""
    const traceCmp = traceA.localeCompare(traceB)
    if (traceCmp !== 0) return traceCmp
    return a.spoolRevisionMaterialId.localeCompare(b.spoolRevisionMaterialId)
  })

  return {
    lines: sortedLines,
    accepted: Array.from(allAccepted.values()),
    record: recordHeader,
    latestQc13Form,
  }
}

export async function searchMaterialTraceCandidates(
  client: SupabaseClient<Database>,
  input: {
    spoolRevisionMaterialId: string
    query?: string
    cursor?: MaterialCandidateCursor | null
  },
): Promise<MaterialCandidatePage> {
  if (!isUuid(input.spoolRevisionMaterialId)) {
    throw new Error("Invalid spool revision material ID.")
  }

  const requestedPageSize = 25
  const { data, error } = await client.rpc("search_material_trace_candidates", {
    target_spool_revision_material_id: input.spoolRevisionMaterialId,
    search_text: input.query ?? "",
    after_trace: input.cursor?.traceNumber ?? undefined,
    after_id: input.cursor?.id ?? undefined,
    page_size: requestedPageSize,
  })

  if (error) {
    throw new Error(mapSupabaseConstructionError(error))
  }

  const rows = (data ?? []) as {
    id: string
    ident_code: string
    trace_number: string
    mrr_number: string
    status: string
  }[]

  const visible = rows.slice(0, requestedPageSize)
  const options: MaterialCandidate[] = visible.map((row) => {
    if (row.status !== "active") {
      throw new Error("Unexpected inactive material candidate.")
    }
    return {
      id: row.id,
      identCode: row.ident_code,
      traceNumber: row.trace_number,
      mrrNumber: row.mrr_number,
      status: "active",
    }
  })

  const last = options.at(-1)
  return {
    options,
    nextCursor:
      rows.length > requestedPageSize && last
        ? { traceNumber: last.traceNumber, id: last.id }
        : null,
  }
}
