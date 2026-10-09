/**
 * UPG-1 referentials that have no Excel import. Starts from the manifest set (teams, punch codes,
 * locations, paint rules, line services, joint categories, progress weights…) and replaces what
 * makes the project its own. The six families that arrive from Excel are empty here on purpose.
 */
import { DEMO_MANIFEST, type DemoReferences } from "../demo/manifest"
import { FIELD_SUBCONTRACTOR, PDS_AREAS, SERVICE_CLASSES, SHOP_SUBCONTRACTOR, SYSTEMS } from "./dataset"

const base = DEMO_MANIFEST.references

export const IMPORTED_FAMILIES = [
  "pipingMaterialRecords",
  "weldingProcedures",
  "welders",
  "welderWpsQualifications",
  "thicknessFlangeRules",
  "ndeMatrixRules",
] as const satisfies readonly (keyof DemoReferences)[]

export const UPG_REFERENCES: DemoReferences = {
  ...base,
  subcontractors: [
    ...base.subcontractors,
    { key: FIELD_SUBCONTRACTOR, code: FIELD_SUBCONTRACTOR, description: "Монтажный субподрядчик", status: "active" },
  ],
  pdsAreas: PDS_AREAS.map((area) => ({
    ...base.pdsAreas[0],
    key: `PROCESS|${area.code}`,
    code: area.code,
    description: area.description,
    status: "active" as const,
    areaCode: "PROCESS",
    shopSubcontractorCode: SHOP_SUBCONTRACTOR,
    fieldSubcontractorCode: FIELD_SUBCONTRACTOR,
  })),
  serviceClasses: Object.values(SERVICE_CLASSES).map((spec) => ({
    ...base.serviceClasses[0],
    key: spec.code,
    code: spec.code,
    description: spec.description,
    status: "active" as const,
    materialTypeCode: spec.materialTypeCode,
  })),
  spoolingMaterialClasses: Object.values(SERVICE_CLASSES).map((spec) => ({
    ...base.spoolingMaterialClasses[0],
    key: spec.code,
    code: spec.code,
    description: spec.description,
    status: "active" as const,
    materialTypeCode: spec.materialTypeCode,
  })),
  systems: SYSTEMS.map((system) => ({ ...base.systems[0], key: system.code, code: system.code, description: system.description, status: "active" as const })),
  subsystems: SYSTEMS.flatMap((system) =>
    system.subsystems.map((sub) => ({ ...base.subsystems[0], key: `${system.code}|${sub.code}`, code: sub.code, description: sub.description, status: "active" as const, systemCode: system.code })),
  ),
  pipingMaterialRecords: [],
  weldingProcedures: [],
  welders: [],
  welderWpsQualifications: [],
  thicknessFlangeRules: [],
  ndeMatrixRules: [],
  deviceAssignments: [],
}
