// modules/project-setup/ui/reference-catalog.ts
import { PROJECT_PARAM } from "@/components/pipeqc/project-url"
import type { ImportType } from "@/modules/imports/domain/import-type"

/**
 * Every project reference, in the order the list on the left shows them. One level: a group heading
 * and its references. They used to sit behind two rows of tabs, and some tabs stacked four lists on
 * top of each other, so a long list pushed the next one off the screen.
 */
export const REFERENCE_GROUPS = [
  { id: "general", keys: ["subcontractors", "units", "area-classifications", "pds-areas"] },
  {
    id: "welding",
    keys: ["service-classes", "weld-types", "welders", "wps", "nde", "thickness", "pml", "rework", "joint-categories"],
  },
  {
    id: "testpack",
    keys: [
      "teams", "punch-codes", "systems", "subsystems", "line-services",
      "unit-time", "location-categories", "locations", "pressure-unit",
    ],
  },
  {
    id: "spooling",
    keys: [
      "spooling-material-types", "spooling-material-classes", "spooling-checklist",
      "ral-codes", "paint-matrix", "assembly", "devices", "pda-users",
    ],
  },
] as const

type Group = (typeof REFERENCE_GROUPS)[number]
export type ReferenceGroupId = Group["id"]
export type ReferenceKey = Group["keys"][number]
export type ReferenceKeyOf<G extends ReferenceGroupId> = Extract<Group, { id: G }>["keys"][number]

export const DEFAULT_REFERENCE: ReferenceKey = "subcontractors"
export const REFERENCE_PARAM = "ref"

const ALL_KEYS: readonly string[] = REFERENCE_GROUPS.flatMap((group) => [...group.keys])

export function parseReferenceKey(raw: string | null | undefined): ReferenceKey {
  return raw && ALL_KEYS.includes(raw) ? (raw as ReferenceKey) : DEFAULT_REFERENCE
}

export function referenceGroupOf(key: ReferenceKey): ReferenceGroupId {
  const group = REFERENCE_GROUPS.find((candidate) => (candidate.keys as readonly string[]).includes(key))
  if (!group) throw new Error(`Unknown reference ${key}`)
  return group.id
}

/**
 * The query string of another reference. Keeps the project; drops the previous reference's search,
 * sort and page, and the PML deep-link context (`ident`, `spool`, `material`, `from`), so a search typed
 * in one table does not silently filter the next one.
 */
export function referenceQuery(current: URLSearchParams, key: ReferenceKey): string {
  const next = new URLSearchParams()
  const project = current.get(PROJECT_PARAM)
  if (project) next.set(PROJECT_PARAM, project)
  next.set(REFERENCE_PARAM, key)
  return next.toString()
}

/** References that already have an Excel import on `/admin/imports`. */
export const REFERENCE_IMPORT_TYPE: Partial<Record<ReferenceKey, ImportType>> = {
  welders: "welder_qualification",
  wps: "welding_procedure",
  nde: "nde_matrix",
  thickness: "thickness_flange",
  pml: "piping_material_list",
}

export type ReadinessTarget =
  | { kind: "reference"; key: ReferenceKey }
  | { kind: "page"; href: "/admin/system-referential" | "/admin/progress-weights" }

const reference = (key: ReferenceKey): ReadinessTarget => ({ kind: "reference", key })
const systemPage: ReadinessTarget = { kind: "page", href: "/admin/system-referential" }
const weightsPage: ReadinessTarget = { kind: "page", href: "/admin/progress-weights" }

const READINESS_TARGETS: Readonly<Record<string, ReadinessTarget>> = {
  material_types: systemPage,
  subcontractors: reference("subcontractors"),
  pds_areas: reference("pds-areas"),
  service_classes: reference("service-classes"),
  weld_types: reference("weld-types"),
  welding_procedures: reference("wps"),
  welder_qualifications: reference("welders"),
  nde_matrix_shop: reference("nde"),
  nde_matrix_assembly: reference("nde"),
  nde_matrix_field: reference("nde"),
  thickness_flange_rules: reference("thickness"),
  piping_material_records: reference("pml"),
  teams: reference("teams"),
  systems: reference("systems"),
  subsystems: reference("subsystems"),
  line_services: reference("line-services"),
  locations: reference("locations"),
  pressure_unit: reference("pressure-unit"),
  progress_weights_prefabrication: weightsPage,
  progress_weights_painting: weightsPage,
  progress_weights_assembly: weightsPage,
  progress_weights_erection: weightsPage,
  spooling_material_types: reference("spooling-material-types"),
  spooling_material_classes: reference("spooling-material-classes"),
  spooling_checklist: reference("spooling-checklist"),
  ral_codes: reference("ral-codes"),
  paint_matrix: reference("paint-matrix"),
  devices: reference("devices"),
}

export function readinessTarget(code: string): ReadinessTarget | null {
  return Object.hasOwn(READINESS_TARGETS, code) ? READINESS_TARGETS[code] : null
}

export function referencesMissingData(missingCodes: readonly string[]): ReadonlySet<ReferenceKey> {
  const keys = new Set<ReferenceKey>()
  for (const code of missingCodes) {
    const target = readinessTarget(code)
    if (target?.kind === "reference") keys.add(target.key)
  }
  return keys
}
