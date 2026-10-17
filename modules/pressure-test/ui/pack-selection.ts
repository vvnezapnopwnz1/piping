export type PackSelection = { kind: "selected"; id: string } | { kind: "not_found" } | { kind: "none" }

/** A requested pack that is not in the list is "not found"; it is never swapped for another pack. */
export function resolvePackSelection(packs: readonly { id: string }[], requested: string | null): PackSelection {
  if (!requested) return { kind: "none" }
  return packs.some((pack) => pack.id === requested) ? { kind: "selected", id: requested } : { kind: "not_found" }
}

/**
 * A requested pack that is not in a loaded list is reloaded for once per id: the list may predate it (a pack
 * created a moment ago). A second miss for the same id is a real "not found".
 */
export function shouldReloadForRequested(selection: PackSelection, loaded: boolean, requested: string | null, reloadedFor: string | null): boolean {
  return loaded && selection.kind === "not_found" && requested !== null && requested !== reloadedFor
}
