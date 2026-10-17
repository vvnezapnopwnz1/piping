export type PackSelection = { kind: "selected"; id: string } | { kind: "not_found" } | { kind: "none" }

/** A requested pack that is not in the list is "not found"; it is never swapped for another pack. */
export function resolvePackSelection(packs: readonly { id: string }[], requested: string | null): PackSelection {
  if (!requested) return { kind: "none" }
  return packs.some((pack) => pack.id === requested) ? { kind: "selected", id: requested } : { kind: "not_found" }
}
