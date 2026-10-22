/**
 * A project's referentials that have no Excel import. Starts from the manifest set (teams, punch codes,
 * locations, paint rules, line services, joint categories, progress weights…) and replaces what
 * makes the project its own. The six families that arrive from Excel are empty here on purpose.
 */
import { DEMO_MANIFEST, type DemoReferences } from "../demo/manifest"
import type { ProjectSpec } from "./spec"

const base = DEMO_MANIFEST.references

export const IMPORTED_FAMILIES = [
  "pipingMaterialRecords",
  "weldingProcedures",
  "welders",
  "welderWpsQualifications",
  "thicknessFlangeRules",
  "ndeMatrixRules",
] as const satisfies readonly (keyof DemoReferences)[]

export function referencesFor(spec: ProjectSpec): DemoReferences {
  return {
    ...base,
    subcontractors: [
      ...base.subcontractors,
      { key: spec.fieldSubcontractor, code: spec.fieldSubcontractor, description: "Монтажный субподрядчик", status: "active" },
    ],
    pdsAreas: spec.pdsAreas.map((area) => ({
      ...base.pdsAreas[0],
      key: `${spec.pdsAreaCode}|${area.code}`,
      code: area.code,
      description: area.description,
      status: "active" as const,
      areaCode: spec.pdsAreaCode,
      shopSubcontractorCode: spec.shopSubcontractor,
      fieldSubcontractorCode: spec.fieldSubcontractor,
    })),
    serviceClasses: Object.values(spec.serviceClasses).map((cls) => ({
      ...base.serviceClasses[0],
      key: cls.code,
      code: cls.code,
      description: cls.description,
      status: "active" as const,
      materialTypeCode: cls.materialTypeCode,
    })),
    // record_weld_progress matches a spool to a WPS by these codes, so they are the WPS material types.
    spoolingMaterialTypes: [...new Set(Object.values(spec.serviceClasses).map((cls) => cls.materialTypeCode))].map((code) => ({
      ...base.spoolingMaterialTypes[0],
      key: code,
      code,
      description: code === "CS" ? "Углеродистая сталь" : "Нержавеющая сталь 316",
      status: "active" as const,
    })),
    spoolingMaterialClasses: Object.values(spec.serviceClasses).map((cls) => ({
      ...base.spoolingMaterialClasses[0],
      key: cls.code,
      code: cls.code,
      description: cls.description,
      status: "active" as const,
      materialTypeCode: cls.materialTypeCode,
    })),
    systems: spec.systems.map((system) => ({ ...base.systems[0], key: system.code, code: system.code, description: system.description, status: "active" as const })),
    subsystems: spec.systems.flatMap((system) =>
      system.subsystems.map((sub) => ({ ...base.subsystems[0], key: `${system.code}|${sub.code}`, code: sub.code, description: sub.description, status: "active" as const, systemCode: system.code })),
    ),
    lineServices: spec.lineServices.map((service) => ({
      ...base.lineServices[0],
      key: service.code,
      code: service.code,
      description: service.description,
      status: "active" as const,
    })),
    pipingMaterialRecords: [],
    weldingProcedures: [],
    welders: [],
    welderWpsQualifications: [],
    thicknessFlangeRules: [],
    ndeMatrixRules: [],
    deviceAssignments: [],
  }
}
