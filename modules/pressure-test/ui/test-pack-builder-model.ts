/**
 * The Builder's form fields, spelled the way a presenter says them.
 *
 * The screen used to render `TEXT_FIELDS.map((field) => <label>{field}…)`, so the operator read
 * `testPackNumber`, `plannedStartOn` and `volumeM3` — property names, straight out of the type,
 * on the label of every field they had to fill in.
 */
interface TestPackField {
  field: "testPackNumber" | "location" | "plannedStartOn" | "plannedEndOn" | "pressure" | "volumeM3"
  label: string
  type: "text" | "date" | "number"
  required: boolean
  /** Printed beside the label, because "Test pressure" alone does not say bar. */
  unit?: string
}

export const TEST_PACK_FIELDS: readonly TestPackField[] = [
  { field: "testPackNumber", label: "Test Pack number", type: "text", required: true },
  { field: "location", label: "Location", type: "text", required: true },
  { field: "plannedStartOn", label: "Planned start", type: "date", required: true },
  { field: "plannedEndOn", label: "Planned end", type: "date", required: true },
  { field: "pressure", label: "Test pressure", type: "number", required: true, unit: "bar" },
  { field: "volumeM3", label: "Volume", type: "number", required: false, unit: "m³" },
]

export const TEST_PACK_REFERENCE_FIELDS = [
  { field: "systemId", label: "System" },
  { field: "subsystemId", label: "Subsystem" },
  { field: "serviceClassId", label: "Service class" },
  { field: "lineServiceId", label: "Line service" },
] as const

/** Free text before, so two presenters could file "high", "High" and "HIGH" against one project. */
export const TEST_PACK_PRIORITIES = ["Low", "Normal", "High", "Critical"] as const

export const TEST_PACK_MEDIA = [
  { value: "H", label: "Hydro" },
  { value: "P", label: "Pneumatic" },
  { value: "V", label: "Visual" },
] as const

export const mediumLabel = (medium: string | null | undefined): string =>
  TEST_PACK_MEDIA.find((item) => item.value === medium)?.label ?? "—"

/**
 * Which fields the presenter has not filled in yet.
 *
 * The Builder used to find this out by submitting and reading back a joined string of server
 * errors at the top of the page. Naming them up front is what turns "Test Pack mutation failed"
 * into something the presenter can act on before they press anything.
 */
export function missingRequiredFields(
  form: Readonly<Record<string, string>>,
): string[] {
  const missing: string[] = []
  for (const { field, label, required } of TEST_PACK_FIELDS) {
    if (required && !form[field]?.trim()) missing.push(label)
  }
  for (const { field, label } of TEST_PACK_REFERENCE_FIELDS) {
    if (!form[field]?.trim()) missing.push(label)
  }
  return missing
}
