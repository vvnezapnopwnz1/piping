/** Field types that hold record data; buttons, files and search boxes are not unsaved input. */
const IGNORED_INPUT_TYPES = new Set(["search", "button", "submit", "reset", "file", "hidden", "image"])

export interface FieldLike {
  tagName: string
  type?: string
  readOnly?: boolean
  disabled?: boolean
  closest: (selector: string) => unknown
  getAttribute: (name: string) => string | null
}

const FINDER = /^\s*(search|filter|find)\b/i

/**
 * Whether typing into this field creates input worth protecting. Table searches and filters
 * are excluded: they live in the address bar, so leaving and returning restores them.
 */
export function isTrackedField(field: FieldLike): boolean {
  if (field.disabled || field.readOnly) return false
  if (field.tagName === "INPUT" && IGNORED_INPUT_TYPES.has((field.type ?? "text").toLowerCase())) return false
  if (field.closest("[data-filter-control]")) return false
  // Screens with a plain input for narrowing a list label it "Search …" or "Filter …".
  const label = field.getAttribute("aria-label") ?? field.getAttribute("placeholder") ?? ""
  return !FINDER.test(label)
}

const COMMIT = /^(record|save|submit|issue|assign|create|apply|confirm|close batch|allocate|release|upload|import|validate|update|add)\b/i

/** A button whose label commits what was typed, after which the input is no longer unsaved. */
export function isCommitLabel(label: string): boolean {
  return COMMIT.test(label.trim())
}
