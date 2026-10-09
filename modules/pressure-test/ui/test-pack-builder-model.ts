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

export interface CompositionAttempt {
  testPackId: string
  confirmedIsoIds: string[]
  remainingIsoIds: string[]
  failure: string | null
}

export function testPackFields(pressureUnit?: string | null): readonly TestPackField[] {
  return [
    { field: "testPackNumber", label: "text.testPackNumber", type: "text", required: true },
    { field: "location", label: "text.location", type: "text", required: true },
    { field: "plannedStartOn", label: "text.plannedStart", type: "date", required: true },
    { field: "plannedEndOn", label: "text.plannedEnd", type: "date", required: true },
    { field: "pressure", label: "text.testPressure", type: "number", required: true, unit: pressureUnit ?? undefined },
    { field: "volumeM3", label: "text.volume", type: "number", required: false, unit: "m³" },
  ]
}

export const TEST_PACK_FIELDS: readonly TestPackField[] = [
  { field: "testPackNumber", label: "text.testPackNumber", type: "text", required: true },
  { field: "location", label: "text.location", type: "text", required: true },
  { field: "plannedStartOn", label: "text.plannedStart", type: "date", required: true },
  { field: "plannedEndOn", label: "text.plannedEnd", type: "date", required: true },
  { field: "pressure", label: "text.testPressure", type: "number", required: true, unit: "bar" },
  { field: "volumeM3", label: "text.volume", type: "number", required: false, unit: "m³" },
]

export const TEST_PACK_REFERENCE_FIELDS = [
  { field: "systemId", label: "text.system" },
  { field: "subsystemId", label: "text.subsystem" },
  { field: "serviceClassId", label: "text.serviceClass" },
  { field: "lineServiceId", label: "text.lineService" },
] as const

/** Free text before, so two presenters could file "high", "High" and "HIGH" against one project. */
// i18n-ignore — canonical persisted priority values; the UI translates their labels.
export const TEST_PACK_PRIORITIES = ["Low", "Normal", "High", "Critical"] as const

export const TEST_PACK_MEDIA = [
  { value: "H", label: "text.hydro" },
  { value: "P", label: "text.pneumatic" },
  { value: "V", label: "text.visual" },
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
