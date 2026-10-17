export interface Target {
  id: string
  label: string
}

/** The pack's active ISOs that no live (not cancelled) line check request already holds. */
export function lineCheckTargets(
  members: readonly { isometric_id: string | null; iso_number: string | null; removed_at: string | null }[],
  worklist: readonly { isometric_id: string | null; cancelled_at: string | null }[],
): Target[] {
  const held = new Set(worklist.filter((row) => row.cancelled_at === null).map((row) => row.isometric_id))
  return members
    .filter((member) => member.removed_at === null && member.isometric_id && !held.has(member.isometric_id))
    .map((member) => ({ id: member.isometric_id as string, label: member.iso_number ?? (member.isometric_id as string) }))
}

/** The pack's punch items that no live clearance request already holds. */
export function punchTargets(
  punches: readonly { id: string; item_number?: string | null }[],
  worklist: readonly { punch_item_id: string | null; cancelled_at: string | null }[],
): Target[] {
  const held = new Set(worklist.filter((row) => row.cancelled_at === null).map((row) => row.punch_item_id))
  return punches.filter((punch) => !held.has(punch.id)).map((punch) => ({ id: punch.id, label: punch.item_number ?? punch.id }))
}

/** No punch at all is a valid line check result; a description without a punch code is not. */
export function punchDraftValid(draft: { code: string; description: string }): boolean {
  return draft.code.trim() !== "" || draft.description.trim() === ""
}

/** Live requests whose result column (`result_id`, `clearance_id`, `record_id`) is still empty. */
export function openRows<Row extends { cancelled_at: string | null }>(rows: readonly Row[], resultColumn: keyof Row): Row[] {
  return rows.filter((row) => row.cancelled_at === null && row[resultColumn] === null)
}
