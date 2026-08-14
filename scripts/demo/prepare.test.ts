import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

import {
  formatDemoCheck,
  parsePrepareArguments,
  runLocalReset,
  runPrepareDemo,
} from "../prepare-track12-demo"
import {
  hostedAdminKeyFromEnvironment,
  parseHostedPrepareArguments,
  runHostedReset,
  runPrepareHostedDemo,
} from "../prepare-hosted-demo"
import { PIPEQC_HOSTED_DEMO_PROJECT_REF } from "./hosted-target"
import { runCheckDemo } from "../check-track12-demo"
import { runHostedCheckDemo } from "../check-hosted-demo"
import {
  DEMO_MANIFEST,
  EMPTY_AT_DEMO_START,
  type DemoReferences,
  resolveDemoDates,
} from "./manifest"
import {
  prepareDemoStand,
  type DemoStandPort,
} from "./prepare"
import {
  evaluateDemoStand,
  type DemoStandSnapshot,
  type ObservedDemoReferences,
} from "./preflight"
import {
  EMPTY_TABLE_STRATEGIES,
  MANIFEST_ONLY_REFERENCE_FIELDS,
  SupabaseDemoStandCore,
  buildDemoReferencePlan,
  buildObservedDemoSpoolgenSnapshot,
  createSupabaseDemoStandCore,
  listAllAuthUsers,
  normalizeDemoReferenceRows,
  observedProjectRecordFromDatabase,
  planDemoProgressWeightWrites,
  planDemoPunchCodeWrites,
  planDemoUtRuleWrites,
  reconcileMembershipFunctionalRoles,
  type AuthAdminListGateway,
  type DemoAdminGateway,
  type DemoAuthUserAttributes,
  type DemoAuthUserRecord,
  type DemoMembershipWrite,
  type DemoProfileRecord,
  type DemoProjectRecord,
  type DemoProjectWrite,
  type DemoReferenceGateway,
  type DemoReferenceDatabaseRows,
  type DemoReferencePlan,
  type DemoReferenceResolvedIds,
  type DemoReferenceWriteBatch,
  type DemoScopeReplacement,
  type DatabaseObservedProjectRow,
  type EmptyTableCountStrategy,
  type FunctionalRoleRecord,
  type FunctionalRoleReconciliationGateway,
  type MembershipRecord,
  type PdsAreaScopeRecord,
  type SubcontractorScopeRecord,
} from "./supabase-demo-stand"

type EmptyTable = (typeof EMPTY_AT_DEMO_START)[number]
type ReferenceFamily = keyof DemoReferences

function recordFromKeys<Key extends string, Value>(
  keys: readonly Key[],
  valueFor: (key: Key) => Value,
): Record<Key, Value> {
  const result: Partial<Record<Key, Value>> = {}
  for (const key of keys) {
    result[key] = valueFor(key)
  }
  return result as Record<Key, Value>
}

function validSnapshot(): DemoStandSnapshot {
  const referenceFamilies = Object.keys(
    DEMO_MANIFEST.references,
  ) as ReferenceFamily[]
  const zeroCounts = () =>
    recordFromKeys(EMPTY_AT_DEMO_START, () => 0)
  const preparedOn = "2026-08-11"
  const dates = resolveDemoDates(new Date(`${preparedOn}T00:00:00.000Z`))

  return structuredClone({
    projects: [
      DEMO_MANIFEST.projects.golden,
      DEMO_MANIFEST.projects.isolation,
      DEMO_MANIFEST.projects.showcase,
    ],
    users: DEMO_MANIFEST.users.map((user) => ({
      ...user,
      memberships: user.memberships.map((membership) => ({
        ...membership,
        isActive: true,
      })),
    })),
    preparedOn,
    references: {
      ...DEMO_MANIFEST.references,
      weldingProcedures: DEMO_MANIFEST.references.weldingProcedures.map(
        ({ approvedOffsetDays: _approvedOffsetDays, ...row }) => ({
          ...row,
          approvedOn: dates.approvedOn,
        }),
      ),
      welders: DEMO_MANIFEST.references.welders.map(
        ({ expiresOffsetDays: _expiresOffsetDays, ...row }) => ({
          ...row,
          expiresOn: dates.welderExpiresOn,
        }),
      ),
      progressWeights: DEMO_MANIFEST.references.progressWeights.map(
        (phase) => ({
          ...phase,
          items: phase.items.map((item) => ({
            ...item,
            status: phase.status,
          })),
        }),
      ),
    },
    readiness: {
      projectCode: DEMO_MANIFEST.projects.golden.activityCode,
      ready: true,
      missing: [],
    },
    isolationReferenceKeys: recordFromKeys(
      referenceFamilies,
      () => [],
    ),
    emptyCounts: {
      [DEMO_MANIFEST.projects.golden.activityCode]: zeroCounts(),
      [DEMO_MANIFEST.projects.isolation.activityCode]: zeroCounts(),
    },
    spoolgen: DEMO_MANIFEST.spoolgen,
  })
}

function fakePort(
  events: string[],
  snapshot: DemoStandSnapshot = validSnapshot(),
): DemoStandPort {
  return {
    async prepareUsers(password) {
      assert.equal(password, "demo-password")
      events.push("users")
    },
    async prepareProjects() {
      events.push("projects")
    },
    async prepareAccess() {
      events.push("access")
    },
    async prepareSystemReferences() {
      events.push("system-references")
    },
    async prepareProjectReferences(preparedOn) {
      assert.equal(preparedOn.toISOString(), "2026-08-11T00:00:00.000Z")
      events.push("project-references")
    },
    async readSnapshot() {
      events.push("snapshot")
      return snapshot
    },
  }
}

const REFERENCE_RESOLVED_IDS = {
  goldenProjectId: "project-a",
  membershipIds: {
    projectAdminA: "membership-project-admin-a",
    qcEditor: "membership-qc-editor",
    ndeSubcontractor: "membership-nde-subcontractor",
  },
} as const satisfies DemoReferenceResolvedIds

const REFERENCE_PLAN_COUNTS = {
  system_reference_entries: 6,
  system_film_quantity_rules: 2,
  system_ut_calculation_rules: 3,
  project_subcontractors: 3,
  project_units: 2,
  project_weld_types: 3,
  project_line_services: 3,
  project_location_categories: 3,
  project_systems: 2,
  project_teams: 5,
  project_punch_codes: 1,
  project_rework_codes: 3,
  project_unit_time_references: 4,
  project_pressure_units: 1,
  project_spooling_material_types: 2,
  project_spooling_checklist_items: 5,
  piping_material_records: 5,
  project_assembly_settings: 1,
  project_devices: 3,
  project_area_classifications: 2,
  project_pds_areas: 3,
  project_service_classes: 2,
  project_welding_procedures: 4,
  welder_qualifications: 4,
  welder_wps_qualifications: 4,
  project_thickness_flange_rules: 3,
  nde_matrix_rules: 4,
  project_subsystems: 3,
  project_locations: 6,
  project_spooling_material_classes: 3,
  project_ral_codes: 3,
  project_paint_matrix_rules: 3,
  project_joint_categories: 3,
  project_device_users: 2,
  project_progress_weights: 13,
  membership_subcontractor_scopes: 1,
  membership_pds_area_scopes: 1,
} as const satisfies Readonly<Record<keyof DemoReferencePlan, number>>

function databaseRowsForReferencePlan(
  plan: DemoReferencePlan,
): DemoReferenceDatabaseRows {
  const id = (table: string, code: string) => `${table}:${code}`
  const materialIds = new Map(
    plan.system_reference_entries
      .filter((row) => row.insert.kind === "material_type")
      .map((row) => [
        row.insert.code,
        id("system_reference_entries", row.insert.code),
      ]),
  )
  const subcontractorIds = new Map(
    plan.project_subcontractors.map((row) => [
      row.insert.code,
      id("project_subcontractors", row.insert.code),
    ]),
  )
  const unitIds = new Map(
    plan.project_units.map((row) => [
      row.insert.code,
      id("project_units", row.insert.code),
    ]),
  )
  const areaIds = new Map(
    plan.project_area_classifications.map((row) => [
      row.insert.code,
      id("project_area_classifications", row.insert.code),
    ]),
  )
  const serviceClassIds = new Map(
    plan.project_service_classes.map((row) => [
      row.insert.code,
      id("project_service_classes", row.insert.code),
    ]),
  )
  const weldTypeIds = new Map(
    plan.project_weld_types.map((row) => [
      row.insert.code,
      id("project_weld_types", row.insert.code),
    ]),
  )
  const wpsIds = new Map(
    plan.project_welding_procedures.map((row) => [
      row.insert.code,
      id("project_welding_procedures", row.insert.code),
    ]),
  )
  const welderIds = new Map(
    plan.welder_qualifications.map((row) => [
      row.insert.welder_code,
      id("welder_qualifications", row.insert.welder_code),
    ]),
  )
  const systemIds = new Map(
    plan.project_systems.map((row) => [
      row.insert.code,
      id("project_systems", row.insert.code),
    ]),
  )
  const locationCategoryIds = new Map(
    plan.project_location_categories.map((row) => [
      row.insert.code,
      id("project_location_categories", row.insert.code),
    ]),
  )
  const lineServiceIds = new Map(
    plan.project_line_services.map((row) => [
      row.insert.code,
      id("project_line_services", row.insert.code),
    ]),
  )
  const spoolingTypeIds = new Map(
    plan.project_spooling_material_types.map((row) => [
      row.insert.code,
      id("project_spooling_material_types", row.insert.code),
    ]),
  )
  const ralIds = new Map(
    plan.project_ral_codes.map((row) => [
      row.insert.ral_code,
      id("project_ral_codes", row.insert.ral_code),
    ]),
  )
  const deviceIds = new Map(
    plan.project_devices.map((row) => [
      row.insert.code,
      id("project_devices", row.insert.code),
    ]),
  )
  const requiredId = (ids: ReadonlyMap<string, string>, code: string) => {
    const resolved = ids.get(code)
    assert.ok(resolved, code)
    return resolved
  }
  const users = {
    [REFERENCE_RESOLVED_IDS.membershipIds.qcEditor]: {
      id: "user-qc-editor",
      email: DEMO_MANIFEST.users.find((user) => user.key === "qc_editor")
        ?.email ?? null,
    },
    [REFERENCE_RESOLVED_IDS.membershipIds.projectAdminA]: {
      id: "user-project-admin-a",
      email: DEMO_MANIFEST.users.find(
        (user) => user.key === "project_admin_a",
      )?.email ?? null,
    },
  }

  return {
    system_reference_entries: plan.system_reference_entries.map((row) => ({
      id: id("system_reference_entries", row.insert.code),
      kind: row.insert.kind,
      code: row.insert.code,
      description: row.insert.description,
      status: row.status,
    })),
    system_film_quantity_rules: plan.system_film_quantity_rules.map(
      (row) => row.insert,
    ),
    system_ut_calculation_rules: plan.system_ut_calculation_rules.map(
      (row) => ({ ...row.insert, flange_rating: row.insert.flange_rating ?? null }),
    ),
    project_subcontractors: plan.project_subcontractors.map((row) => ({
      id: requiredId(subcontractorIds, row.insert.code),
      code: row.insert.code,
      description: row.insert.description,
      status: row.status,
    })),
    project_units: plan.project_units.map((row) => ({
      id: requiredId(unitIds, row.insert.code),
      code: row.insert.code,
      description: row.insert.description,
      status: row.status,
    })),
    project_area_classifications: plan.project_area_classifications.map(
      (row) => ({
        id: requiredId(areaIds, row.insert.code),
        code: row.insert.code,
        description: row.insert.description,
        status: row.status,
        unit_id: requiredId(unitIds, row.parents.unitCode),
      }),
    ),
    project_pds_areas: plan.project_pds_areas.map((row) => ({
      id: id("project_pds_areas", row.insert.code),
      code: row.insert.code,
      description: row.insert.description,
      status: row.status,
      area_classification_id: requiredId(areaIds, row.parents.areaCode),
      shop_subcontractor_id: requiredId(
        subcontractorIds,
        row.parents.shopSubcontractorCode,
      ),
      field_subcontractor_id: requiredId(
        subcontractorIds,
        row.parents.fieldSubcontractorCode,
      ),
    })),
    project_service_classes: plan.project_service_classes.map((row) => ({
      id: requiredId(serviceClassIds, row.insert.code),
      code: row.insert.code,
      description: row.insert.description ?? null,
      status: row.status,
      material_type_id: requiredId(
        materialIds,
        row.parents.materialTypeCode,
      ),
    })),
    project_weld_types: plan.project_weld_types.map((row) => ({
      id: requiredId(weldTypeIds, row.insert.code),
      code: row.insert.code,
      description: row.insert.description,
      status: row.status,
      counts_in_dia_inch: row.insert.counts_in_dia_inch ?? false,
    })),
    project_welding_procedures: plan.project_welding_procedures.map(
      (row) => ({
        id: requiredId(wpsIds, row.insert.code),
        code: row.insert.code,
        description: row.insert.description ?? null,
        status: row.status,
        subcontractor_id: requiredId(
          subcontractorIds,
          row.parents.subcontractorCode,
        ),
        material_type_id: requiredId(
          materialIds,
          row.parents.materialTypeCode,
        ),
        process: row.insert.process,
        revision: row.insert.revision,
        diameter_from: row.insert.diameter_from,
        diameter_to: row.insert.diameter_to,
        thickness_from: row.insert.thickness_from,
        thickness_to: row.insert.thickness_to,
        approved_on: row.insert.approved_on,
      }),
    ),
    welder_qualifications: plan.welder_qualifications.map((row) => ({
      id: requiredId(welderIds, row.insert.welder_code),
      welder_code: row.insert.welder_code,
      full_name: row.insert.full_name,
      status: row.status,
      subcontractor_id: requiredId(
        subcontractorIds,
        row.parents.subcontractorCode,
      ),
      expires_on: row.insert.expires_on,
    })),
    welder_wps_qualifications: plan.welder_wps_qualifications.map((row) => ({
      welder_qualification_id: requiredId(
        welderIds,
        row.parents.welderCode,
      ),
      wps_id: requiredId(wpsIds, row.parents.wpsCode),
    })),
    nde_matrix_rules: plan.nde_matrix_rules.map((row) => ({
      service_class_id: requiredId(
        serviceClassIds,
        row.parents.serviceClassCode,
      ),
      weld_type_id: requiredId(weldTypeIds, row.parents.weldTypeCode),
      weld_location: row.insert.weld_location,
      rt_coverage: row.insert.rt_coverage ?? 0,
      ut_coverage: row.insert.ut_coverage ?? 0,
      mt_coverage: row.insert.mt_coverage ?? 0,
      pt_coverage: row.insert.pt_coverage ?? 0,
      pmi_coverage: row.insert.pmi_coverage ?? 0,
      ht_coverage: row.insert.ht_coverage ?? 0,
      material_traceability_required:
        row.insert.material_traceability_required ?? false,
      pwht_required: row.insert.pwht_required ?? false,
      status: row.status,
    })),
    piping_material_records: plan.piping_material_records.map((row) => ({
      ident_code: row.insert.ident_code,
      trace_number: row.insert.trace_number,
      mrr_number: row.insert.mrr_number,
      status: row.status,
    })),
    project_thickness_flange_rules:
      plan.project_thickness_flange_rules.map((row) => ({
        service_class_id: requiredId(
          serviceClassIds,
          row.parents.serviceClassCode,
        ),
        diameter_inch: row.insert.diameter_inch,
        thickness_mm: row.insert.thickness_mm,
        flange_rating: row.insert.flange_rating,
        status: row.status,
      })),
    project_rework_codes: plan.project_rework_codes.map((row) => ({
      code: row.insert.code,
      description: row.insert.description,
      status: row.status,
    })),
    project_joint_categories: plan.project_joint_categories.map((row) => ({
      category_code: row.insert.category_code,
      joint_definition: row.insert.joint_definition,
      timing: row.insert.timing,
      reason: row.insert.reason,
      coefficient: row.insert.coefficient ?? null,
      status: row.status,
    })),
    project_teams: plan.project_teams.map((row) => ({
      code: row.insert.code,
      description: row.insert.description,
      team_type: row.insert.team_type,
      status: row.status,
    })),
    project_punch_codes: plan.project_punch_codes.map((row) => ({
      code: row.insert.code,
      description: row.insert.description,
      status: row.status,
    })),
    project_systems: plan.project_systems.map((row) => ({
      id: requiredId(systemIds, row.insert.code),
      code: row.insert.code,
      description: row.insert.description,
      status: row.status,
    })),
    project_subsystems: plan.project_subsystems.map((row) => ({
      code: row.insert.code,
      description: row.insert.description,
      status: row.status,
      system_id: requiredId(systemIds, row.parents.systemCode),
    })),
    project_line_services: plan.project_line_services.map((row) => ({
      id: requiredId(lineServiceIds, row.insert.code),
      code: row.insert.code,
      description: row.insert.description,
      status: row.status,
    })),
    project_pressure_units: plan.project_pressure_units.map((row) => ({
      unit: row.insert.unit,
    })),
    project_location_categories: plan.project_location_categories.map(
      (row) => ({
        id: requiredId(locationCategoryIds, row.insert.code),
        code: row.insert.code,
        description: row.insert.description,
        status: row.status,
      }),
    ),
    project_locations: plan.project_locations.map((row) => ({
      code: row.insert.code,
      description: row.insert.description,
      status: row.status,
      category_id: requiredId(
        locationCategoryIds,
        row.parents.categoryCode,
      ),
    })),
    project_unit_time_references: plan.project_unit_time_references.map(
      (row) => ({
        activity: row.insert.activity,
        project_ut: row.insert.project_ut,
        standard_reference: row.insert.standard_reference,
        status: row.status,
      }),
    ),
    project_progress_weights: plan.project_progress_weights.map((row) => ({
      phase: row.insert.phase,
      activity: row.insert.activity,
      weight: row.insert.weight,
      status: row.status,
    })),
    project_assembly_settings: plan.project_assembly_settings.map((row) => ({
      enabled: row.insert.enabled ?? false,
    })),
    project_spooling_material_types: plan.project_spooling_material_types.map(
      (row) => ({
        id: requiredId(spoolingTypeIds, row.insert.code),
        code: row.insert.code,
        description: row.insert.description,
        status: row.status,
      }),
    ),
    project_spooling_material_classes:
      plan.project_spooling_material_classes.map((row) => ({
        external_class_code: row.insert.external_class_code,
        material_type_id: requiredId(
          spoolingTypeIds,
          row.parents.materialTypeCode,
        ),
        status: row.status,
      })),
    project_spooling_checklist_items:
      plan.project_spooling_checklist_items.map((row) => ({
        code: row.insert.code,
        description: row.insert.description,
        sort_order: row.insert.sort_order,
        is_required: row.insert.is_required ?? false,
        status: row.status,
      })),
    project_ral_codes: plan.project_ral_codes.map((row) => ({
      id: requiredId(ralIds, row.insert.ral_code),
      line_service_id: requiredId(
        lineServiceIds,
        row.parents.lineServiceCode,
      ),
      color_code: row.insert.color_code,
      ral_code: row.insert.ral_code,
      status: row.status,
    })),
    project_paint_matrix_rules: plan.project_paint_matrix_rules.map((row) => ({
      line_service_id: requiredId(
        lineServiceIds,
        row.parents.lineServiceCode,
      ),
      ral_code_id: requiredId(ralIds, row.parents.ralCode),
      blasting_required: row.insert.blasting_required,
      primer_required: row.insert.primer_required,
      intermediate_coat_count: row.insert.intermediate_coat_count,
      final_coat_count: row.insert.final_coat_count,
      required_final_dft_microns: row.insert.required_final_dft_microns,
      status: row.status,
    })),
    project_devices: plan.project_devices.map((row) => ({
      id: requiredId(deviceIds, row.insert.code),
      code: row.insert.code,
      description: row.insert.description,
      status: row.status,
    })),
    project_device_users: plan.project_device_users.map((row) => ({
      membership_id: row.insert.membership_id,
      device_id: requiredId(deviceIds, row.parents.deviceCode),
      status: row.status,
    })),
    project_memberships: Object.entries(users).map(
      ([membershipId, user]) => ({
        id: membershipId,
        user_id: user.id,
      }),
    ),
    profiles: Object.values(users),
  }
}

test("buildDemoReferencePlan can be built for a project other than golden", () => {
  const preparedOn = new Date("2026-08-13T00:00:00.000Z")
  const golden = buildDemoReferencePlan(REFERENCE_RESOLVED_IDS, preparedOn)
  const showcase = buildDemoReferencePlan(
    REFERENCE_RESOLVED_IDS,
    preparedOn,
    "showcase-project-id",
  )

  assert.equal(golden.project_pds_areas[0].insert.project_id, "project-a")
  assert.equal(
    showcase.project_pds_areas[0].insert.project_id,
    "showcase-project-id",
  )
  assert.equal(
    showcase.project_pds_areas.length,
    golden.project_pds_areas.length,
  )
  // Scopes stay bound to the golden project's memberships: the showcase members are unscoped on
  // purpose, so the restrictive PDS guard never hides seeded rows.
  assert.deepEqual(
    showcase.membership_pds_area_scopes,
    golden.membership_pds_area_scopes,
  )
})

test("buildDemoReferencePlan locks every approved table, row count, status, and dependency order", () => {
  const plan = buildDemoReferencePlan(
    REFERENCE_RESOLVED_IDS,
    new Date("2026-08-10T23:30:00.000Z"),
  )

  assert.deepEqual(Object.keys(plan), Object.keys(REFERENCE_PLAN_COUNTS))
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(plan).map(([table, rows]) => [table, rows.length]),
    ),
    REFERENCE_PLAN_COUNTS,
  )
  assert.ok(
    Object.values(plan)
      .flat()
      .every(
        (row) => row.status === "active" || row.status === "inactive",
      ),
  )

  assert.equal(
    JSON.stringify(plan).includes(
      DEMO_MANIFEST.projects.isolation.activityCode,
    ),
    false,
  )
  assert.equal(JSON.stringify(plan).includes("project-b"), false)
})

test("buildDemoReferencePlan resolves dates and all stable-code parent relationships without guessed IDs", () => {
  const plan = buildDemoReferencePlan(
    REFERENCE_RESOLVED_IDS,
    new Date("2026-08-10T23:30:00.000Z"),
  )

  assert.deepEqual(
    plan.project_welding_procedures.map(({ insert, parents }) => ({
      code: insert.code,
      approvedOn: insert.approved_on,
      subcontractorCode: parents.subcontractorCode,
      materialTypeCode: parents.materialTypeCode,
    })),
    DEMO_MANIFEST.references.weldingProcedures.map((row) => ({
      code: row.code,
      approvedOn: "2026-02-11",
      subcontractorCode: row.subcontractorCode,
      materialTypeCode: row.materialTypeCode,
    })),
  )
  assert.deepEqual(
    plan.welder_qualifications.map(({ insert, parents }) => ({
      code: insert.welder_code,
      fullName: insert.full_name,
      expiresOn: insert.expires_on,
      subcontractorCode: parents.subcontractorCode,
    })),
    DEMO_MANIFEST.references.welders.map((row) => ({
      code: row.code,
      fullName: row.fullName,
      expiresOn: "2027-08-10",
      subcontractorCode: row.subcontractorCode,
    })),
  )
  assert.deepEqual(
    plan.project_pds_areas.map(({ insert, parents }) => ({
      code: insert.code,
      ...parents,
    })),
    DEMO_MANIFEST.references.pdsAreas.map((row) => ({
      code: row.code,
      areaCode: row.areaCode,
      shopSubcontractorCode: row.shopSubcontractorCode,
      fieldSubcontractorCode: row.fieldSubcontractorCode,
    })),
  )
  assert.deepEqual(
    plan.nde_matrix_rules.map(({ parents, insert }) => ({
      key: `${parents.serviceClassCode}|${parents.weldTypeCode}|${insert.weld_location}`,
      rt: insert.rt_coverage,
      pt: insert.pt_coverage,
      traceability: insert.material_traceability_required,
      pwht: insert.pwht_required,
    })),
    [
      { key: "SC-CS150|BW|shop", rt: 100, pt: 0, traceability: true, pwht: false },
      { key: "SC-CS150|BW|field", rt: 0, pt: 0, traceability: false, pwht: false },
      { key: "SC-CS150|SW|shop", rt: 0, pt: 100, traceability: true, pwht: false },
      { key: "SC-SS300|BW|shop", rt: 100, pt: 0, traceability: true, pwht: false },
    ],
  )
  assert.deepEqual(
    plan.project_ral_codes.map(({ insert, parents }) => ({
      colorCode: insert.color_code,
      ralCode: insert.ral_code,
      lineServiceCode: parents.lineServiceCode,
    })),
    [
      { colorCode: "WHITE ALUMINIUM", ralCode: "RAL 9006", lineServiceCode: "PROCESS" },
      { colorCode: "SKY BLUE", ralCode: "RAL 5015", lineServiceCode: "AIR" },
      { colorCode: "YELLOW GREEN", ralCode: "RAL 6018", lineServiceCode: "WATER" },
    ],
  )
})

test("buildDemoReferencePlan emits only the three exact active 100-percent progress phases", () => {
  const plan = buildDemoReferencePlan(
    REFERENCE_RESOLVED_IDS,
    new Date("2026-08-11T00:00:00.000Z"),
  )

  assert.deepEqual(
    plan.project_progress_weights.map(({ insert }) => ({
      phase: insert.phase,
      activity: insert.activity,
      weight: insert.weight,
      status: insert.status,
    })),
    DEMO_MANIFEST.references.progressWeights.flatMap((phase) =>
      phase.items.map((item) => ({
        phase: phase.phase,
        activity: item.code,
        weight: item.weight,
        status: phase.status,
      })),
    ),
  )
  assert.equal(
    plan.project_progress_weights.some(
      ({ insert }) => insert.phase === "assembly",
    ),
    false,
  )
  for (const phase of ["prefabrication", "painting", "erection"] as const) {
    assert.equal(
      plan.project_progress_weights
        .filter((row) => row.insert.phase === phase)
        .reduce((total, row) => total + row.insert.weight, 0),
      100,
      phase,
    )
  }
})

test("buildDemoReferencePlan finalizes only the approved NDE scopes and leaves SCN-003 unassigned", () => {
  const plan = buildDemoReferencePlan(
    REFERENCE_RESOLVED_IDS,
    new Date("2026-08-11T00:00:00.000Z"),
  )

  assert.deepEqual(
    plan.membership_subcontractor_scopes.map(
      ({ key, status, insert, parents }) => ({
        key,
        status,
        insert,
        parents,
      }),
    ),
    [
      {
        key: "NDE-A",
        status: "active",
        insert: { membership_id: "membership-nde-subcontractor" },
        parents: { subcontractorCode: "NDE-A" },
      },
    ],
  )
  assert.deepEqual(
    plan.membership_pds_area_scopes.map(
      ({ key, status, insert, parents }) => ({
        key,
        status,
        insert,
        parents,
      }),
    ),
    [
      {
        key: "PDS-100",
        status: "active",
        insert: { membership_id: "membership-nde-subcontractor" },
        parents: { pdsAreaCode: "PDS-100" },
      },
    ],
  )
  assert.deepEqual(
    plan.project_device_users.map(({ insert, parents }) => ({
      membershipId: insert.membership_id,
      deviceCode: parents.deviceCode,
    })),
    [
      { membershipId: "membership-qc-editor", deviceCode: "SCN-001" },
      { membershipId: "membership-project-admin-a", deviceCode: "SCN-002" },
    ],
  )
  assert.equal(
    plan.project_device_users.some(
      ({ parents }) => parents.deviceCode === "SCN-003",
    ),
    false,
  )
})

test("database reference normalizer maps every approved persisted family, FK code, date, and code-owned label", () => {
  const plan = buildDemoReferencePlan(
    REFERENCE_RESOLVED_IDS,
    new Date("2026-08-11T00:00:00.000Z"),
  )

  const references = normalizeDemoReferenceRows(
    databaseRowsForReferencePlan(plan),
  )

  assert.deepEqual(references, validSnapshot().references)
})

test("database reference normalizer preserves observed archived, nullable, and multi-coverage drift", () => {
  const plan = buildDemoReferencePlan(
    REFERENCE_RESOLVED_IDS,
    new Date("2026-08-11T00:00:00.000Z"),
  )
  const rows = databaseRowsForReferencePlan(plan)
  const drifted: DemoReferenceDatabaseRows = {
    ...rows,
    project_subcontractors: rows.project_subcontractors.map((row) =>
      row.code === "FAB-A" ? { ...row, status: "archived" } : row,
    ),
    project_service_classes: rows.project_service_classes.map((row) =>
      row.code === "SC-CS150" ? { ...row, description: null } : row,
    ),
    project_pds_areas: rows.project_pds_areas.map((row) =>
      row.code === "PDS-100"
        ? { ...row, shop_subcontractor_id: null }
        : row,
    ),
    nde_matrix_rules: rows.nde_matrix_rules.map((row, index) =>
      index === 0
        ? { ...row, rt_coverage: 30, pt_coverage: 20 }
        : row,
    ),
  }

  const references = normalizeDemoReferenceRows(drifted)

  assert.equal(
    references.subcontractors.find((row) => row.key === "FAB-A")?.status,
    "archived",
  )
  assert.equal(
    references.serviceClasses.find((row) => row.key === "SC-CS150")
      ?.description,
    null,
  )
  assert.equal(
    references.pdsAreas.find((row) => row.key === "PROCESS|PDS-100")
      ?.shopSubcontractorCode,
    null,
  )
  assert.deepEqual(
    references.ndeMatrixRules.find(
      (row) => row.key === "SC-CS150|BW|shop",
    ),
    {
      ...validSnapshot().references.ndeMatrixRules.find(
        (row) => row.key === "SC-CS150|BW|shop",
      ),
      method: "MULTIPLE:RT=30+PT=20",
      coveragePercent: 50,
    },
  )
})

test("database reference normalizer and preflight expose an archived duplicate progress item by stable identity", () => {
  const plan = buildDemoReferencePlan(
    REFERENCE_RESOLVED_IDS,
    new Date("2026-08-11T00:00:00.000Z"),
  )
  const rows = databaseRowsForReferencePlan(plan)
  const first = rows.project_progress_weights[0]
  assert.ok(first)
  const references = normalizeDemoReferenceRows({
    ...rows,
    project_progress_weights: [
      ...rows.project_progress_weights,
      { ...first, status: "archived" },
    ],
  })
  const snapshot: DemoStandSnapshot = {
    ...validSnapshot(),
    references,
  }

  const check = evaluateDemoStand(snapshot).checks.find(
    (candidate) => candidate.id === "reference:progressWeights",
  )

  assert.ok(check)
  assert.equal(check.ok, false)
  assert.match(check.actual, /count=14/)
  assert.match(
    check.actual,
    /unexpected item keys=\[prefabrication\|spool_fabrication\]/,
  )
})

test("UT write policy updates exact composite rows, inserts missing rows, and rejects unexpected or duplicate state", () => {
  const plan = buildDemoReferencePlan(
    REFERENCE_RESOLVED_IDS,
    new Date("2026-08-11T00:00:00.000Z"),
  )
  const desired = plan.system_ut_calculation_rules
  const existing = [
    {
      id: "ut-existing",
      diameter_from_inch: desired[0].insert.diameter_from_inch,
      diameter_to_inch: desired[0].insert.diameter_to_inch,
      flange_rating: " 150# ",
    },
  ]

  const actions = planDemoUtRuleWrites(existing, desired)

  assert.deepEqual(
    actions.map((action) =>
      action.kind === "update"
        ? { kind: action.kind, id: action.id, key: action.row.key }
        : { kind: action.kind, key: action.row.key },
    ),
    [
      { kind: "update", id: "ut-existing", key: "1-3in|150#" },
      { kind: "insert", key: "4-8in|150#" },
      { kind: "insert", key: "9-16in|300#" },
    ],
  )
  assert.throws(
    () =>
      planDemoUtRuleWrites(
        [
          ...existing,
          {
            id: "ut-unexpected",
            diameter_from_inch: 50,
            diameter_to_inch: 60,
            flange_rating: "900#",
          },
        ],
        desired,
      ),
    /unexpected reference rows/i,
  )
  assert.throws(
    () => planDemoUtRuleWrites([...existing, ...existing], desired),
    /unexpected reference rows/i,
  )
})

test("preflight fails when the prepared stand is missing the Item Clearance team or the Line Check punch code", () => {
  const snapshot = validSnapshot()
  const drifted: DemoStandSnapshot = {
    ...snapshot,
    references: {
      ...snapshot.references,
      teams: snapshot.references.teams.filter((row) => row.key !== "FINISH-A"),
      punchCodes: [],
    },
  }

  const checks = evaluateDemoStand(drifted).checks
  for (const id of ["reference:teams", "reference:punchCodes"]) {
    const result = checks.find((candidate) => candidate.id === id)
    assert.ok(result, `${id} must be an observed preflight check`)
    assert.equal(result.ok, false)
  }
  assert.match(
    checks.find((candidate) => candidate.id === "reference:punchCodes")?.actual ?? "",
    /missing keys=\[X-DEMO\]/,
  )
  assert.equal(evaluateDemoStand(snapshot).ok, true)
})

test("punch code write policy matches the case-folding unique index instead of a column upsert target", () => {
  const plan = buildDemoReferencePlan(
    REFERENCE_RESOLVED_IDS,
    new Date("2026-08-11T00:00:00.000Z"),
  )
  const desired = plan.project_punch_codes

  assert.deepEqual(
    planDemoPunchCodeWrites([], desired).map((action) => ({
      kind: action.kind,
      key: action.row.key,
    })),
    [{ kind: "insert", key: "X-DEMO" }],
  )
  // `project_punch_codes_project_code_uq` indexes `upper(btrim(code))`, so a differently cased
  // row is the same row and must be updated rather than inserted a second time.
  assert.deepEqual(
    planDemoPunchCodeWrites(
      [{ id: "punch-existing", code: " x-demo " }],
      desired,
    ).map((action) =>
      action.kind === "update"
        ? { kind: action.kind, id: action.id, key: action.row.key }
        : { kind: action.kind, key: action.row.key },
    ),
    [{ kind: "update", id: "punch-existing", key: "X-DEMO" }],
  )
  assert.throws(
    () =>
      planDemoPunchCodeWrites(
        [{ id: "punch-unexpected", code: "X-LEGACY" }],
        desired,
      ),
    /unexpected reference rows/i,
  )
  assert.throws(
    () =>
      planDemoPunchCodeWrites(
        [
          { id: "punch-a", code: "X-DEMO" },
          { id: "punch-b", code: "x-demo" },
        ],
        desired,
      ),
    /unexpected reference rows/i,
  )
})

test("progress write policy repairs the exact active set without relying on the partial index as an upsert target", () => {
  const plan = buildDemoReferencePlan(
    REFERENCE_RESOLVED_IDS,
    new Date("2026-08-11T00:00:00.000Z"),
  )
  const desired = plan.project_progress_weights
  const policy = planDemoProgressWeightWrites(
    [
      {
        id: "existing-desired",
        phase: desired[0].insert.phase,
        activity: desired[0].insert.activity,
      },
      { id: "obsolete", phase: "assembly", activity: "assembly_fitup" },
    ],
    desired,
  )

  assert.deepEqual(policy.archiveIds, ["obsolete"])
  assert.deepEqual(
    policy.updates.map(({ id, row }) => ({ id, key: row.key })),
    [{ id: "existing-desired", key: desired[0].key }],
  )
  assert.deepEqual(
    policy.inserts.map((row) => row.key),
    desired.slice(1).map((row) => row.key),
  )
  assert.throws(
    () =>
      planDemoProgressWeightWrites(
        [
          { id: "duplicate-a", phase: "painting", activity: "primer" },
          { id: "duplicate-b", phase: "painting", activity: "primer" },
        ],
        desired,
      ),
    /duplicate active rows/i,
  )
})

test("demo preparation sources contain no operational workflow seeding calls", () => {
  const sourceUrls = [
    new URL("../prepare-track12-demo.ts", import.meta.url),
    new URL("./prepare.ts", import.meta.url),
    new URL("./supabase-demo-stand.ts", import.meta.url),
  ]
  const forbiddenPreparationCalls = [
    "importSpoolgenDefinition",
    "record_fabrication_progress",
    "record_material_check",
    "record_weld_progress",
    "record_nde_result",
    "record_erection_progress",
    "record_spool_tracking_event",
    "record_flange_progress",
    "create_test_pack",
    "record_pressure_test_stage",
  ]

  for (const sourceUrl of sourceUrls) {
    const source = existsSync(sourceUrl)
      ? readFileSync(sourceUrl, "utf8")
      : ""
    for (const forbiddenCall of forbiddenPreparationCalls) {
      assert.equal(source.includes(forbiddenCall), false)
    }
  }
})

test("production Supabase gateway exposes the complete reference write and read boundary", () => {
  const source = readFileSync(
    new URL("./supabase-demo-stand.ts", import.meta.url),
    "utf8",
  )

  assert.match(
    source,
    /implements\s+[^{]*DemoReferenceGateway/,
  )
  for (const method of [
    "reconcileReferenceBatch",
    "replaceMembershipScopes",
    "readReferences",
    "readSetupReadiness",
    "readReferenceKeys",
  ]) {
    assert.match(source, new RegExp(`async\\s+${method}\\s*\\(`))
  }
})

test("production reference reader does not hide non-active progress rows", () => {
  const source = readFileSync(
    new URL("./supabase-demo-stand.ts", import.meta.url),
    "utf8",
  )
  const queryStart = source.indexOf('.from("project_progress_weights")', source.indexOf("async readReferenceDatabaseRows"))
  const queryEnd = source.indexOf(
    "resultError(progressWeights.error",
    queryStart,
  )
  assert.notEqual(queryStart, -1)
  assert.notEqual(queryEnd, -1)
  assert.doesNotMatch(source.slice(queryStart, queryEnd), /\.eq\("status"/)
})

test("production snapshot source never substitutes the strict SpoolGen manifest for observed files", () => {
  const source = readFileSync(
    new URL("./supabase-demo-stand.ts", import.meta.url),
    "utf8",
  )
  assert.equal(source.includes("spoolgen: DEMO_MANIFEST.spoolgen"), false)
})

test("read-side mapping declares every code-owned manifest-only label field", () => {
  assert.deepEqual(MANIFEST_ONLY_REFERENCE_FIELDS, [
    "filmQuantityRules.description",
    "filmQuantityRules.status",
    "utCalculationRules.description",
    "utCalculationRules.status",
    "welders.description",
    "welderWpsQualifications.status",
    "ndeMatrixRules.description",
    "pipingMaterialRecords.description",
    "thicknessFlangeRules.description",
    "jointCategories.description",
    "pressureUnits.description",
    "pressureUnits.status",
    "unitTimeReferences.description",
    "progressWeights.description",
    "progressWeights.items.description",
    "assemblySettings.status",
    "spoolingMaterialClasses.description",
    "ralCodes.description",
    "paintMatrixRules.description",
  ])
})

test("prepareDemoStand runs every stage sequentially and evaluates the read snapshot", async () => {
  const events: string[] = []

  const report = await prepareDemoStand(
    fakePort(events),
    "demo-password",
    new Date("2026-08-11T00:00:00.000Z"),
  )

  assert.equal(report.ok, true)
  assert.deepEqual(events, [
    "users",
    "projects",
    "access",
    "system-references",
    "project-references",
    "snapshot",
  ])
  assert.ok(report.checks.length > 0)
})

test("prepareDemoStand stops at the first failed preparation or read stage", async (t) => {
  const stages = [
    "prepareUsers",
    "prepareProjects",
    "prepareAccess",
    "prepareSystemReferences",
    "prepareProjectReferences",
    "readSnapshot",
  ] as const

  for (const failedStage of stages) {
    await t.test(failedStage, async () => {
      const events: string[] = []
      const port = fakePort(events)
      const original = port[failedStage]
      Object.defineProperty(port, failedStage, {
        value: async (...args: never[]) => {
          await (original as (...values: never[]) => Promise<unknown>)(
            ...args,
          )
          throw new Error(`failed at ${failedStage}`)
        },
      })

      await assert.rejects(
        prepareDemoStand(
          port,
          "demo-password",
          new Date("2026-08-11T00:00:00.000Z"),
        ),
        new RegExp(failedStage),
      )

      assert.deepEqual(
        events,
        [
          "users",
          "projects",
          "access",
          "system-references",
          "project-references",
          "snapshot",
        ].slice(0, stages.indexOf(failedStage) + 1),
      )
    })
  }
})

test("prepareDemoStand returns a failed business report without throwing or changing it", async () => {
  const snapshot = validSnapshot()
  const projects = snapshot.projects as Array<
    (typeof snapshot.projects)[number]
  >
  projects[0] = { ...projects[0], title: "Observed mismatch" }
  const snapshotBefore = structuredClone(snapshot)
  const expectedReport = evaluateDemoStand(structuredClone(snapshot))

  const report = await prepareDemoStand(
    fakePort([], snapshot),
    "demo-password",
    new Date("2026-08-11T00:00:00.000Z"),
  )

  assert.equal(expectedReport.ok, false)
  assert.deepEqual(report, expectedReport)
  assert.deepEqual(snapshot, snapshotBefore)
})

class FakeGateway implements DemoAdminGateway {
  readonly calls: Array<{ readonly method: string; readonly payload: unknown }> = []
  authUsers: DemoAuthUserRecord[] = []
  profiles: DemoProfileRecord[] = []
  projects: DemoProjectRecord[] = []
  memberships: MembershipRecord[] = []
  functionalRoles: FunctionalRoleRecord[] = []
  subcontractorScopes: SubcontractorScopeRecord[] = []
  pdsAreaScopes: PdsAreaScopeRecord[] = []
  createUserWithoutIdForEmail: string | undefined
  failMembershipAt = Number.POSITIVE_INFINITY
  membershipAttempts = 0
  nextUser = 1
  nextProject = 1
  profileResultIds: readonly string[] | undefined
  projectUpdateResultIds: readonly string[] | undefined

  async listAuthUsers(): Promise<readonly DemoAuthUserRecord[]> {
    this.calls.push({ method: "listAuthUsers", payload: undefined })
    return this.authUsers
  }

  async updateAuthUser(
    userId: string,
    attributes: DemoAuthUserAttributes,
  ): Promise<void> {
    this.calls.push({
      method: "updateAuthUser",
      payload: { userId, attributes },
    })
  }

  async createAuthUser(
    email: string,
    attributes: DemoAuthUserAttributes,
  ): Promise<{ readonly id: string | null }> {
    this.calls.push({
      method: "createAuthUser",
      payload: { email, attributes },
    })
    return {
      id:
        email === this.createUserWithoutIdForEmail
          ? null
          : `created-user-${this.nextUser++}`,
    }
  }

  async reconcileProfile(
    userId: string,
    profile: {
      readonly fullName: string
      readonly isPlatformAdmin: boolean
    },
  ): Promise<{ readonly ids: readonly string[] }> {
    this.calls.push({
      method: "reconcileProfile",
      payload: { userId, profile },
    })
    return { ids: this.profileResultIds ?? [userId] }
  }

  async listProjects(): Promise<readonly DemoProjectRecord[]> {
    this.calls.push({ method: "listProjects", payload: undefined })
    return this.projects
  }

  async createProject(
    project: DemoProjectWrite,
  ): Promise<{ readonly id: string | null }> {
    this.calls.push({ method: "createProject", payload: project })
    return { id: `created-project-${this.nextProject++}` }
  }

  async updateProject(
    projectId: string,
    project: DemoProjectWrite,
  ): Promise<{ readonly ids: readonly string[] }> {
    this.calls.push({
      method: "updateProject",
      payload: { projectId, project },
    })
    return { ids: this.projectUpdateResultIds ?? [projectId] }
  }

  async upsertMembership(
    membership: DemoMembershipWrite,
  ): Promise<{ readonly id: string | null }> {
    this.membershipAttempts += 1
    this.calls.push({ method: "upsertMembership", payload: membership })
    if (this.membershipAttempts === this.failMembershipAt) {
      throw new Error(
        "service_role_key=FAKE-SERVICE-KEY password=FAKE-PASSWORD auth={full-payload}",
      )
    }
    return { id: `membership-${this.membershipAttempts}` }
  }

  async replaceFunctionalRoles(
    membershipId: string,
    roleCodes: readonly string[],
  ): Promise<void> {
    this.calls.push({
      method: "replaceFunctionalRoles",
      payload: { membershipId, roleCodes },
    })
  }

  async readProfiles(): Promise<readonly DemoProfileRecord[]> {
    this.calls.push({ method: "readProfiles", payload: undefined })
    return this.profiles
  }

  async readMemberships(): Promise<readonly MembershipRecord[]> {
    this.calls.push({ method: "readMemberships", payload: undefined })
    return this.memberships
  }

  async readFunctionalRoles(): Promise<readonly FunctionalRoleRecord[]> {
    this.calls.push({ method: "readFunctionalRoles", payload: undefined })
    return this.functionalRoles
  }

  async readSubcontractorScopes(): Promise<
    readonly SubcontractorScopeRecord[]
  > {
    this.calls.push({
      method: "readSubcontractorScopes",
      payload: undefined,
    })
    return this.subcontractorScopes
  }

  async readPdsAreaScopes(): Promise<readonly PdsAreaScopeRecord[]> {
    this.calls.push({ method: "readPdsAreaScopes", payload: undefined })
    return this.pdsAreaScopes
  }

  async countDirectProjectRows(
    table: Exclude<EmptyTable, "pwht_results">,
    projectId: string,
  ): Promise<number> {
    this.calls.push({
      method: "countDirectProjectRows",
      payload: { table, projectId },
    })
    return projectId === "project-a" ? 1 : 2
  }

  async countChildProjectRows(
    strategy: Extract<EmptyTableCountStrategy, { readonly kind: "child" }>,
    projectId: string,
  ): Promise<number> {
    this.calls.push({
      method: "countChildProjectRows",
      payload: { strategy, projectId },
    })
    return projectId === "project-a" ? 3 : 4
  }
}

class RecordingReferenceGateway
  extends FakeGateway
  implements DemoReferenceGateway
{
  readonly referenceEvents: string[] = []
  readonly batches: DemoReferenceWriteBatch[] = []
  failTable: keyof DemoReferencePlan | undefined
  observedReferences: ObservedDemoReferences = structuredClone(
    validSnapshot().references,
  )
  observedReadiness = {
    ready: true,
    missing: [] as string[],
  }
  observedIsolationKeys: Readonly<
    Record<ReferenceFamily, readonly string[]>
  > = validSnapshot().isolationReferenceKeys

  async reconcileReferenceBatch(
    batch: DemoReferenceWriteBatch,
  ): Promise<void> {
    this.referenceEvents.push(`write:${batch.table}`)
    this.batches.push(batch)
    if (batch.table === this.failTable) {
      throw new Error(
        "service_role_key=FAKE-SERVICE-KEY password=FAKE-PASSWORD",
      )
    }
  }

  async replaceMembershipScopes(
    replacement: DemoScopeReplacement,
  ): Promise<void> {
    this.referenceEvents.push("replace:membership-scopes")
    assert.deepEqual(
      replacement.subcontractorScopes.map(
        ({ insert, parents }) => ({
          membershipId: insert.membership_id,
          subcontractorCode: parents.subcontractorCode,
        }),
      ),
      [
        {
          membershipId: "membership-10",
          subcontractorCode: "NDE-A",
        },
      ],
    )
    assert.deepEqual(
      replacement.pdsAreaScopes.map(({ insert, parents }) => ({
        membershipId: insert.membership_id,
        pdsAreaCode: parents.pdsAreaCode,
      })),
      [{ membershipId: "membership-10", pdsAreaCode: "PDS-100" }],
    )
  }

  async readReferences(projectId: string): Promise<ObservedDemoReferences> {
    this.referenceEvents.push(`read:references:${projectId}`)
    return structuredClone(this.observedReferences)
  }

  async readSetupReadiness(projectId: string): Promise<{
    readonly ready: boolean
    readonly missing: readonly string[]
  }> {
    this.referenceEvents.push(`read:readiness:${projectId}`)
    return structuredClone(this.observedReadiness)
  }

  async readReferenceKeys(
    projectId: string,
  ): Promise<Readonly<Record<ReferenceFamily, readonly string[]>>> {
    this.referenceEvents.push(`read:isolation:${projectId}`)
    return structuredClone(this.observedIsolationKeys)
  }
}

function configuredReferenceGateway(): RecordingReferenceGateway {
  const gateway = new RecordingReferenceGateway()
  gateway.authUsers = DEMO_MANIFEST.users.map((user, index) => ({
    id: index === 0 ? "platform-id" : `user-${index}`,
    email: user.email,
    bannedUntil: null,
  }))
  gateway.projects = [
    projectRecord("golden", "project-a"),
    projectRecord("isolation", "project-b"),
    projectRecord("showcase", "project-showcase"),
  ]
  return gateway
}

async function preparedReferenceCore(
  gateway: RecordingReferenceGateway,
): Promise<SupabaseDemoStandCore> {
  const core = new SupabaseDemoStandCore(gateway)
  await core.prepareUsers("FAKE-PASSWORD")
  await core.prepareProjects()
  await core.prepareAccess()
  gateway.referenceEvents.length = 0
  gateway.batches.length = 0
  return core
}

function existingHostedGateway(): RecordingReferenceGateway {
  // Simulates a hosted stand that already has the 2026-08-13 baseline: TRACK01-A/B, their
  // users, and TRACK01-A's project_admin_a/qc_editor/nde_subcontractor memberships — but no
  // SHOWCASE-1 project, membership, or referentials yet.
  const gateway = new RecordingReferenceGateway()
  gateway.authUsers = DEMO_MANIFEST.users.map((user, index) => ({
    id: `hosted-user-${index}`,
    email: user.email,
    bannedUntil: null,
  }))
  gateway.projects = [
    projectRecord("golden", "hosted-project-a", "hosted-user-0"),
    projectRecord("isolation", "hosted-project-b", "hosted-user-0"),
  ]
  const goldenMembers: ReadonlyArray<readonly [string, string]> = [
    ["project_admin_a", "hosted-membership-admin-a"],
    ["qc_editor", "hosted-membership-qc-editor"],
    ["nde_subcontractor", "hosted-membership-nde-sub"],
  ]
  gateway.memberships = goldenMembers.map(([userKey, membershipId]) => {
    const userIndex = DEMO_MANIFEST.users.findIndex(
      (user) => user.key === userKey,
    )
    const membership = DEMO_MANIFEST.users[userIndex].memberships.find(
      (candidate) => candidate.projectCode === "TRACK01-A",
    )
    if (!membership) throw new Error(`${userKey} has no TRACK01-A membership.`)
    return {
      id: membershipId,
      projectId: "hosted-project-a",
      userId: `hosted-user-${userIndex}`,
      accessRoleCode: membership.role,
      legacyRole: "system_admin",
      isActive: true,
    }
  })
  return gateway
}

test("resolveShowcasePrerequisiteIds reads existing golden and showcase-member ids without writing anything", async () => {
  const gateway = existingHostedGateway()
  const core = new SupabaseDemoStandCore(gateway)

  await core.resolveShowcasePrerequisiteIds()

  assert.deepEqual(
    gateway.calls.map((call) => call.method),
    ["listAuthUsers", "listProjects", "readMemberships"],
  )
  // No creates, updates, or upserts of any kind — this method only reads.
  assert.equal(
    gateway.calls.some((call) =>
      [
        "createAuthUser",
        "updateAuthUser",
        "createProject",
        "updateProject",
        "upsertMembership",
      ].includes(call.method),
    ),
    false,
  )
})

test("resolveShowcasePrerequisiteIds fails clearly when a required user or membership is missing", async () => {
  const missingUser = existingHostedGateway()
  missingUser.authUsers = missingUser.authUsers.filter(
    (user) => user.email !== DEMO_MANIFEST.users[0].email,
  )
  await assert.rejects(
    new SupabaseDemoStandCore(missingUser).resolveShowcasePrerequisiteIds(),
    new RegExp(
      `${DEMO_MANIFEST.users[0].email.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")} must already exist`,
    ),
  )

  const missingMembership = existingHostedGateway()
  missingMembership.memberships = missingMembership.memberships.filter(
    (membership) => membership.id !== "hosted-membership-qc-editor",
  )
  await assert.rejects(
    new SupabaseDemoStandCore(
      missingMembership,
    ).resolveShowcasePrerequisiteIds(),
    /TRACK01-A\/qc_editor must already exist/,
  )
})

test("prepareShowcaseProject creates SHOWCASE-1 and touches no other project", async () => {
  const gateway = existingHostedGateway()
  const core = new SupabaseDemoStandCore(gateway)
  await core.resolveShowcasePrerequisiteIds()

  await core.prepareShowcaseProject()

  const writes = gateway.calls.filter((call) =>
    ["createProject", "updateProject"].includes(call.method),
  )
  assert.equal(writes.length, 1)
  assert.equal(writes[0].method, "createProject")
  assert.deepEqual(writes[0].payload, {
    activityCode: "SHOWCASE-1",
    title: DEMO_MANIFEST.projects.showcase.title,
    ownerName: DEMO_MANIFEST.projects.showcase.ownerName,
    contractorName: DEMO_MANIFEST.projects.showcase.contractorName,
    contractNumber: DEMO_MANIFEST.projects.showcase.contractNumber,
    transitDays: DEMO_MANIFEST.projects.showcase.transitDays,
    status: DEMO_MANIFEST.projects.showcase.status,
    createdBy: "hosted-user-0",
  })
})

test("prepareShowcaseProject updates an existing SHOWCASE-1 row instead of duplicating it", async () => {
  const gateway = existingHostedGateway()
  gateway.projects.push(
    projectRecord("showcase", "hosted-project-showcase", "hosted-user-0"),
  )
  const core = new SupabaseDemoStandCore(gateway)
  await core.resolveShowcasePrerequisiteIds()

  await core.prepareShowcaseProject()

  const writes = gateway.calls.filter((call) =>
    ["createProject", "updateProject"].includes(call.method),
  )
  assert.deepEqual(writes.map((call) => call.method), ["updateProject"])
  assert.deepEqual(
    (writes[0].payload as { projectId: string }).projectId,
    "hosted-project-showcase",
  )
})

test("prepareShowcaseProject requires resolveShowcasePrerequisiteIds first", async () => {
  const gateway = existingHostedGateway()
  await assert.rejects(
    new SupabaseDemoStandCore(gateway).prepareShowcaseProject(),
    /platform_admin must be resolved/,
  )
})

test("reference preparation writes system, parent, dependent, extended, progress, and final scopes in exact order", async () => {
  const gateway = configuredReferenceGateway()
  const core = await preparedReferenceCore(gateway)

  await core.prepareSystemReferences()
  await core.prepareProjectReferences(
    new Date("2026-08-11T00:00:00.000Z"),
  )

  const tableOrder = Object.keys(REFERENCE_PLAN_COUNTS)
  const projectWrites = tableOrder.slice(3, -2).map((table) => `write:${table}`)
  assert.deepEqual(gateway.referenceEvents, [
    ...tableOrder.slice(0, 3).map((table) => `write:${table}`),
    ...projectWrites,
    "replace:membership-scopes",
    // The showcase project takes the same project-scoped families in the same dependency order,
    // addressed to its own id. Scopes are golden-only, so they are not repeated, and
    // project_device_users is omitted because it would link a SHOWCASE-1 device to a TRACK01-A
    // membership.
    ...projectWrites.filter((event) => event !== "write:project_device_users"),
  ])
  assert.equal(
    gateway.batches.some((batch) =>
      JSON.stringify(batch).includes("project-b"),
    ),
    false,
  )
  assert.equal(
    gateway.batches.some((batch) =>
      JSON.stringify(batch).includes("TRACK01-B"),
    ),
    false,
  )
  assert.equal(
    gateway.batches.some((batch) =>
      JSON.stringify(batch).includes("project-showcase"),
    ),
    true,
  )
})

test("reference preparation validates all progress totals before the first system write", async () => {
  const gateway = configuredReferenceGateway()
  const core = await preparedReferenceCore(gateway)
  const item = DEMO_MANIFEST.references.progressWeights[0].items[0]
  const originalWeight = item.weight
  Object.defineProperty(item, "weight", {
    configurable: true,
    value: originalWeight + 1,
  })

  try {
    await assert.rejects(
      core.prepareSystemReferences(),
      /must total exactly 100/i,
    )
    assert.deepEqual(gateway.referenceEvents, [])
  } finally {
    Object.defineProperty(item, "weight", {
      configurable: true,
      value: originalWeight,
    })
  }
})

test("reference preparation stops at the first failed table and sanitizes the failure", async () => {
  const gateway = configuredReferenceGateway()
  const core = await preparedReferenceCore(gateway)
  gateway.failTable = "project_service_classes"

  await assert.rejects(
    core.prepareProjectReferences(new Date("2026-08-11T00:00:00.000Z")),
    (error: unknown) => {
      const message = String(error)
      assert.match(message, /project_service_classes/)
      assert.doesNotMatch(message, /FAKE-SERVICE-KEY|FAKE-PASSWORD/)
      return true
    },
  )
  assert.deepEqual(gateway.referenceEvents, [
    "write:project_subcontractors",
    "write:project_units",
    "write:project_weld_types",
    "write:project_line_services",
    "write:project_location_categories",
    "write:project_systems",
    "write:project_teams",
    "write:project_punch_codes",
    "write:project_rework_codes",
    "write:project_unit_time_references",
    "write:project_pressure_units",
    "write:project_spooling_material_types",
    "write:project_spooling_checklist_items",
    "write:piping_material_records",
    "write:project_assembly_settings",
    "write:project_devices",
    "write:project_area_classifications",
    "write:project_pds_areas",
    "write:project_service_classes",
  ])
})

test("readSnapshot combines all current core sections with observed references, readiness, isolation, and SpoolGen contract", async () => {
  const gateway = configuredReferenceGateway()
  const core = await preparedReferenceCore(gateway)
  gateway.observedReferences = {
    ...gateway.observedReferences,
    subcontractors: gateway.observedReferences.subcontractors.map((row) =>
      row.key === "FAB-A" ? { ...row, status: "archived" } : row,
    ),
  }
  gateway.observedReadiness = {
    ready: false,
    missing: ["observed readiness drift"],
  }
  gateway.observedIsolationKeys = {
    ...gateway.observedIsolationKeys,
    subcontractors: ["B-LEAK"],
  }

  const snapshot = await core.readSnapshot()

  assert.deepEqual(
    snapshot.projects.map((project) => project.activityCode),
    ["SHOWCASE-1", "TRACK01-A", "TRACK01-B"],
  )
  assert.equal(snapshot.users.length, DEMO_MANIFEST.users.length)
  assert.deepEqual(snapshot.emptyCounts, {
    "TRACK01-A": recordFromKeys(EMPTY_AT_DEMO_START, (table) =>
      table === "pwht_results" ? 3 : 1,
    ),
    "TRACK01-B": recordFromKeys(EMPTY_AT_DEMO_START, (table) =>
      table === "pwht_results" ? 4 : 2,
    ),
  })
  assert.equal(snapshot.references.subcontractors[0].status, "archived")
  assert.deepEqual(snapshot.readiness, {
    projectCode: "TRACK01-A",
    ready: false,
    missing: ["observed readiness drift"],
  })
  assert.deepEqual(snapshot.isolationReferenceKeys.subcontractors, [
    "B-LEAK",
  ])
  assert.deepEqual(snapshot.spoolgen, DEMO_MANIFEST.spoolgen)
  assert.deepEqual(gateway.referenceEvents, [
    "read:references:project-a",
    "read:readiness:project-a",
    "read:isolation:project-b",
  ])
})

test("readSnapshot uses the injected observed SpoolGen package instead of the strict manifest", async () => {
  const gateway = configuredReferenceGateway()
  const observed = buildObservedDemoSpoolgenSnapshot({})
  const core = new SupabaseDemoStandCore(gateway, async () => observed)
  await core.prepareUsers("FAKE-PASSWORD")
  await core.prepareProjects()
  await core.prepareAccess()

  const snapshot = await core.readSnapshot()

  assert.deepEqual(snapshot.spoolgen, observed)
  assert.notDeepEqual(snapshot.spoolgen, DEMO_MANIFEST.spoolgen)
  assert.deepEqual(snapshot.spoolgen.roles, [])
  assert.deepEqual(snapshot.spoolgen.hashes, {
    weld: null,
    trace: null,
    bolt: null,
    supp: null,
  })
  assert.equal(
    evaluateDemoStand(snapshot).checks.find(
      (check) => check.id === "spoolgen-package",
    )?.ok,
    false,
  )
})

test("readSnapshot sanitizes an injected SpoolGen package read failure", async () => {
  const gateway = configuredReferenceGateway()
  const core = new SupabaseDemoStandCore(gateway, async () => {
    throw new Error(
      "publishable_key=FAKE-SPOOLGEN-KEY file-contents=FAKE-CONTENTS",
    )
  })
  await core.prepareUsers("FAKE-PASSWORD")
  await core.prepareProjects()
  await core.prepareAccess()

  await assert.rejects(core.readSnapshot(), (error: unknown) => {
    const message = String(error)
    assert.match(message, /SpoolGen package/)
    assert.doesNotMatch(message, /FAKE-SPOOLGEN-KEY|FAKE-CONTENTS/)
    return true
  })
})

test("readSnapshot reports missing demo projects as business state without reference I/O", async () => {
  const gateway = new RecordingReferenceGateway()
  gateway.authUsers = []
  gateway.projects = []
  const core = new SupabaseDemoStandCore(gateway)

  const snapshot = await core.readSnapshot()

  assert.equal(snapshot.preparedOn, null)
  assert.ok(
    Object.values(snapshot.references).every((rows) => rows.length === 0),
  )
  assert.deepEqual(snapshot.readiness, {
    projectCode: "TRACK01-A",
    ready: false,
    missing: ["project:TRACK01-A"],
  })
  assert.ok(
    Object.values(snapshot.isolationReferenceKeys).every(
      (keys) => keys.length === 0,
    ),
  )
  assert.deepEqual(gateway.referenceEvents, [])
})

function projectRecord(
  key: "golden" | "isolation" | "showcase",
  id: string,
  createdBy = "platform-id",
): DemoProjectRecord {
  const project = DEMO_MANIFEST.projects[key]
  return {
    id,
    activityCode: project.activityCode,
    title: project.title,
    ownerName: project.ownerName,
    contractorName: project.contractorName,
    contractNumber: project.contractNumber,
    transitDays: project.transitDays,
    status: project.status,
    createdBy,
    createdAt: "2026-08-11T00:00:00.000Z",
  }
}

function databaseObservedProjectRow(
  overrides: Partial<DatabaseObservedProjectRow> = {},
): DatabaseObservedProjectRow {
  const project = DEMO_MANIFEST.projects.golden
  return {
    id: "project-a",
    activity_code: project.activityCode,
    title: project.title,
    owner_name: project.ownerName,
    contractor_name: project.contractorName,
    contract_number: project.contractNumber,
    maximum_transit_time_days: project.transitDays,
    status: project.status,
    created_by: "platform-id",
    created_at: "2026-08-11T00:00:00.000Z",
    ...overrides,
  }
}

function configuredGateway(): FakeGateway {
  const gateway = new FakeGateway()
  gateway.authUsers = DEMO_MANIFEST.users.map((user, index) => ({
    id: index === 0 ? "platform-id" : `user-${index}`,
    email: user.email,
    bannedUntil: null,
  }))
  gateway.projects = [
    projectRecord("golden", "project-a"),
    projectRecord("isolation", "project-b"),
  ]
  return gateway
}

class StatefulGateway extends FakeGateway {
  readonly rolesByMembership = new Map<string, Set<string>>()
  private membershipSequence = 1

  override async updateAuthUser(
    userId: string,
    attributes: DemoAuthUserAttributes,
  ): Promise<void> {
    await super.updateAuthUser(userId, attributes)
    const index = this.authUsers.findIndex((user) => user.id === userId)
    if (index >= 0) {
      this.authUsers[index] = {
        ...this.authUsers[index],
        bannedUntil: null,
      }
    }
  }

  override async createAuthUser(
    email: string,
    attributes: DemoAuthUserAttributes,
  ): Promise<{ readonly id: string | null }> {
    const created = await super.createAuthUser(email, attributes)
    if (created.id) {
      this.authUsers.push({
        id: created.id,
        email,
        bannedUntil: null,
      })
    }
    return created
  }

  override async reconcileProfile(
    userId: string,
    profile: {
      readonly email: string
      readonly fullName: string
      readonly isPlatformAdmin: boolean
    },
  ): Promise<{ readonly ids: readonly string[] }> {
    const result = await super.reconcileProfile(userId, profile)
    const observed: DemoProfileRecord = {
      id: userId,
      email: profile.email,
      fullName: profile.fullName,
      isPlatformAdmin: profile.isPlatformAdmin,
    }
    const index = this.profiles.findIndex((candidate) => candidate.id === userId)
    if (index >= 0) this.profiles[index] = observed
    else this.profiles.push(observed)
    return result
  }

  override async createProject(
    project: DemoProjectWrite,
  ): Promise<{ readonly id: string | null }> {
    const created = await super.createProject(project)
    if (created.id) {
      this.projects.push({
        id: created.id,
        ...project,
        createdAt: "2026-08-11T00:00:00.000Z",
      })
    }
    return created
  }

  override async updateProject(
    projectId: string,
    project: DemoProjectWrite,
  ): Promise<{ readonly ids: readonly string[] }> {
    const result = await super.updateProject(projectId, project)
    const index = this.projects.findIndex(
      (candidate) => candidate.id === projectId,
    )
    if (index >= 0) {
      this.projects[index] = {
        id: projectId,
        ...project,
        createdAt: this.projects[index].createdAt,
      }
    }
    return result
  }

  override async upsertMembership(
    membership: DemoMembershipWrite,
  ): Promise<{ readonly id: string | null }> {
    this.calls.push({ method: "upsertMembership", payload: membership })
    const existing = this.memberships.find(
      (candidate) =>
        candidate.projectId === membership.projectId &&
        candidate.userId === membership.userId,
    )
    if (existing) {
      Object.assign(existing, {
        accessRoleCode: membership.accessRoleCode,
        legacyRole: membership.legacyRole,
        isActive: membership.isActive,
      })
      return { id: existing.id }
    }
    const id = `state-membership-${this.membershipSequence++}`
    this.memberships.push({
      id,
      projectId: membership.projectId,
      userId: membership.userId,
      accessRoleCode: membership.accessRoleCode,
      legacyRole: membership.legacyRole,
      isActive: membership.isActive,
    })
    return { id }
  }

  override async replaceFunctionalRoles(
    membershipId: string,
    roleCodes: readonly string[],
  ): Promise<void> {
    await super.replaceFunctionalRoles(membershipId, roleCodes)
    this.rolesByMembership.set(membershipId, new Set(roleCodes))
  }
}

test("prepareUsers reconciles auth users in manifest order and exact profile names and flags", async () => {
  const gateway = new FakeGateway()
  gateway.authUsers = [
    {
      id: "existing-platform-id",
      email: DEMO_MANIFEST.users[0].email,
      bannedUntil: null,
    },
  ]
  const core = new SupabaseDemoStandCore(gateway)

  await core.prepareUsers("FAKE-PASSWORD")

  assert.equal(
    gateway.calls.filter((call) => call.method === "listAuthUsers").length,
    1,
  )
  const authWrites = gateway.calls.filter((call) =>
    ["updateAuthUser", "createAuthUser"].includes(call.method),
  )
  assert.deepEqual(
    authWrites.map((call) => call.method),
    [
      "updateAuthUser",
      "createAuthUser",
      "createAuthUser",
      "createAuthUser",
      "createAuthUser",
      "createAuthUser",
    ],
  )
  assert.deepEqual(authWrites[0].payload, {
    userId: "existing-platform-id",
    attributes: {
      password: "FAKE-PASSWORD",
      emailConfirm: true,
      banDuration: "none",
      userMetadata: {
        full_name: DEMO_MANIFEST.users[0].fullName,
      },
    },
  })
  assert.deepEqual(
    authWrites.slice(1).map((call) =>
      (call.payload as { email: string }).email,
    ),
    DEMO_MANIFEST.users.slice(1).map((user) => user.email),
  )
  assert.deepEqual(
    authWrites.map((call) =>
      (call.payload as { attributes: DemoAuthUserAttributes }).attributes,
    ),
    DEMO_MANIFEST.users.map((user) => ({
      password: "FAKE-PASSWORD",
      emailConfirm: true,
      banDuration: "none",
      userMetadata: { full_name: user.fullName },
    })),
  )
  assert.deepEqual(
    gateway.calls
      .filter((call) => call.method === "reconcileProfile")
      .map((call) => call.payload),
    DEMO_MANIFEST.users.map((user, index) => ({
      userId:
        index === 0
          ? "existing-platform-id"
          : `created-user-${index}`,
      profile: {
        email: user.email,
        fullName: user.fullName,
        isPlatformAdmin: user.platformAdmin,
      },
    })),
  )
})

test("prepareUsers rejects blank passwords and missing auth IDs without exposing credentials", async () => {
  const gateway = new FakeGateway()
  const core = new SupabaseDemoStandCore(gateway)

  await assert.rejects(core.prepareUsers("   "), /nonblank password/i)
  assert.equal(gateway.calls.length, 0)

  gateway.createUserWithoutIdForEmail = DEMO_MANIFEST.users[0].email
  await assert.rejects(
    core.prepareUsers("FAKE-PASSWORD"),
    (error: unknown) => {
      const message = String(error)
      assert.match(message, new RegExp(DEMO_MANIFEST.users[0].email))
      assert.doesNotMatch(message, /FAKE-PASSWORD|service.role|auth=/i)
      return true
    },
  )
})

test("prepareUsers rejects profile reconciliation unless exactly the requested user ID is returned", async (t) => {
  for (const ids of [
    [],
    ["wrong-profile-id"],
    ["created-user-1", "duplicate-profile-id"],
  ]) {
    await t.test(`ids=${ids.join(",") || "none"}`, async () => {
      const gateway = new FakeGateway()
      gateway.profileResultIds = ids

      await assert.rejects(
        new SupabaseDemoStandCore(gateway).prepareUsers("FAKE-PASSWORD"),
        (error: unknown) => {
          const message = String(error)
          assert.match(message, /profile.*platform-admin@example\.test/i)
          assert.doesNotMatch(message, /wrong-profile-id|duplicate-profile-id/)
          return true
        },
      )
      assert.equal(
        gateway.calls.filter((call) => call.method === "createAuthUser")
          .length,
        1,
      )
    })
  }
})

test("prepareProjects reconciles exact manifest definitions and requires the prepared platform creator", async () => {
  const gateway = configuredGateway()
  gateway.projects = [projectRecord("isolation", "existing-b", "wrong")]
  const core = new SupabaseDemoStandCore(gateway)
  await core.prepareUsers("FAKE-PASSWORD")
  gateway.calls.length = 0

  await core.prepareProjects()

  const expectedWrites = [
    DEMO_MANIFEST.projects.golden,
    DEMO_MANIFEST.projects.isolation,
    DEMO_MANIFEST.projects.showcase,
  ].map((project) => ({
    activityCode: project.activityCode,
    title: project.title,
    ownerName: project.ownerName,
    contractorName: project.contractorName,
    contractNumber: project.contractNumber,
    transitDays: project.transitDays,
    status: project.status,
    createdBy: "platform-id",
  }))
  // Golden is created, the pre-existing isolation row is repaired, and the showcase project is
  // created alongside them.
  assert.deepEqual(
    gateway.calls.map((call) => call.method),
    ["listProjects", "createProject", "updateProject", "createProject"],
  )
  assert.deepEqual(gateway.calls[1].payload, expectedWrites[0])
  assert.deepEqual(gateway.calls[2].payload, {
    projectId: "existing-b",
    project: expectedWrites[1],
  })
  assert.deepEqual(gateway.calls[3].payload, expectedWrites[2])

  const unpreparedGateway = new FakeGateway()
  await assert.rejects(
    new SupabaseDemoStandCore(unpreparedGateway).prepareProjects(),
    /platform_admin.*prepareUsers/i,
  )
  assert.equal(unpreparedGateway.calls.length, 0)
})

test("prepareProjects rejects an update that does not return exactly the target project ID", async () => {
  const gateway = configuredGateway()
  gateway.projects = [projectRecord("golden", "existing-a")]
  gateway.projectUpdateResultIds = []
  const core = new SupabaseDemoStandCore(gateway)
  await core.prepareUsers("FAKE-PASSWORD")
  gateway.calls.length = 0

  await assert.rejects(core.prepareProjects(), /TRACK01-A/)
  assert.deepEqual(
    gateway.calls.map((call) => call.method),
    ["listProjects", "updateProject"],
  )
})

test("prepareAccess writes only manifest memberships with compatible legacy roles and exact functional roles", async () => {
  const gateway = configuredGateway()
  const core = new SupabaseDemoStandCore(gateway)
  await core.prepareUsers("FAKE-PASSWORD")
  await core.prepareProjects()
  gateway.calls.length = 0

  await core.prepareAccess()

  const membershipWrites = gateway.calls.filter(
    (call) => call.method === "upsertMembership",
  )
  assert.deepEqual(
    membershipWrites.map((call) => call.payload),
    [
      {
        projectId: "project-a",
        userId: "platform-id",
        accessRoleCode: "project_admin",
        legacyRole: "system_admin",
        isActive: true,
      },
      {
        projectId: "project-b",
        userId: "platform-id",
        accessRoleCode: "project_admin",
        legacyRole: "system_admin",
        isActive: true,
      },
      {
        projectId: "created-project-1",
        userId: "platform-id",
        accessRoleCode: "project_admin",
        legacyRole: "system_admin",
        isActive: true,
      },
      {
        projectId: "project-a",
        userId: "user-2",
        accessRoleCode: "project_admin",
        legacyRole: "system_admin",
        isActive: true,
      },
      {
        projectId: "project-b",
        userId: "user-2",
        accessRoleCode: "project_reader",
        legacyRole: "project_manager",
        isActive: true,
      },
      {
        projectId: "created-project-1",
        userId: "user-2",
        accessRoleCode: "project_admin",
        legacyRole: "system_admin",
        isActive: true,
      },
      {
        projectId: "project-a",
        userId: "user-3",
        accessRoleCode: "project_editor",
        legacyRole: "qc_engineer",
        isActive: true,
      },
      {
        projectId: "created-project-1",
        userId: "user-3",
        accessRoleCode: "project_editor",
        legacyRole: "qc_engineer",
        isActive: true,
      },
      {
        projectId: "project-a",
        userId: "user-4",
        accessRoleCode: "project_reader",
        legacyRole: "project_manager",
        isActive: true,
      },
      {
        projectId: "project-a",
        userId: "user-5",
        accessRoleCode: "subcontractor",
        legacyRole: "subcontractor",
        isActive: true,
      },
    ],
  )
  assert.equal(
    membershipWrites.some((call) =>
      JSON.stringify(call.payload).includes("user-1"),
    ),
    false,
  )
  assert.deepEqual(
    gateway.calls
      .filter((call) => call.method === "replaceFunctionalRoles")
      .map((call) =>
        (call.payload as { roleCodes: readonly string[] }).roleCodes,
      ),
    DEMO_MANIFEST.users.flatMap((user) =>
      user.memberships.map((membership) => membership.functionalRoles),
    ),
  )
  assert.equal(
    gateway.calls.some((call) => /scope/i.test(call.method)),
    false,
  )
})

test("prepareAccess stops on the first gateway failure and sanitizes the error", async () => {
  const gateway = configuredGateway()
  const core = new SupabaseDemoStandCore(gateway)
  await core.prepareUsers("FAKE-PASSWORD")
  await core.prepareProjects()
  gateway.calls.length = 0
  // platform_admin now writes three memberships (A, B, SHOWCASE-1) before project_admin_a's
  // first, so the fourth write is the one that identifies TRACK01-A/project_admin_a.
  gateway.failMembershipAt = 4

  await assert.rejects(core.prepareAccess(), (error: unknown) => {
    const message = String(error)
    assert.match(message, /access.*TRACK01-A.*project_admin_a/i)
    assert.doesNotMatch(
      message,
      /FAKE-SERVICE-KEY|FAKE-PASSWORD|full-payload|service.role/i,
    )
    return true
  })
  assert.equal(
    gateway.calls.filter((call) => call.method === "upsertMembership").length,
    4,
  )
  assert.equal(
    gateway.calls.filter(
      (call) => call.method === "replaceFunctionalRoles",
    ).length,
    3,
  )
})

test("functional role reconciliation upserts desired roles before deleting only stale roles", async () => {
  const roles = new Set(["stale_role"])
  const events: string[] = []
  const gateway: FunctionalRoleReconciliationGateway = {
    async upsertFunctionalRoles(_membershipId, desiredRoles) {
      events.push(`upsert:${desiredRoles.join(",")}`)
      for (const role of desiredRoles) roles.add(role)
    },
    async listFunctionalRoles() {
      events.push("list")
      return [...roles]
    },
    async deleteFunctionalRoles(_membershipId, obsoleteRoles) {
      events.push(
        obsoleteRoles === null
          ? "delete:all"
          : `delete:${obsoleteRoles.join(",")}`,
      )
      if (obsoleteRoles === null) roles.clear()
      else for (const role of obsoleteRoles) roles.delete(role)
    },
  }

  await reconcileMembershipFunctionalRoles(gateway, "membership-1", [
    "qc_engineer",
    "nde_inspector",
  ])

  assert.deepEqual(events, [
    "upsert:qc_engineer,nde_inspector",
    "list",
    "delete:stale_role",
  ])
  assert.deepEqual(
    [...roles].sort(),
    ["nde_inspector", "qc_engineer"],
  )
})

test("functional role reconciliation never deletes existing roles when desired upsert fails", async () => {
  const events: string[] = []
  const gateway: FunctionalRoleReconciliationGateway = {
    async upsertFunctionalRoles() {
      events.push("upsert")
      throw new Error("upsert failed")
    },
    async listFunctionalRoles() {
      events.push("list")
      return ["stale_role"]
    },
    async deleteFunctionalRoles() {
      events.push("delete")
    },
  }

  await assert.rejects(
    reconcileMembershipFunctionalRoles(gateway, "membership-1", [
      "qc_engineer",
    ]),
    /upsert failed/,
  )
  assert.deepEqual(events, ["upsert"])
})

test("functional role reconciliation deletes all roles only when desired roles are empty", async () => {
  const events: string[] = []
  const gateway: FunctionalRoleReconciliationGateway = {
    async upsertFunctionalRoles() {
      events.push("upsert")
    },
    async listFunctionalRoles() {
      events.push("list")
      return []
    },
    async deleteFunctionalRoles(_membershipId, obsoleteRoles) {
      events.push(obsoleteRoles === null ? "delete:all" : "delete:some")
    },
  }

  await reconcileMembershipFunctionalRoles(gateway, "membership-1", [])

  assert.deepEqual(events, ["delete:all"])
})

test("core preparation is idempotent and repairs partial stale users, projects, memberships, and roles", async () => {
  const gateway = new StatefulGateway()
  gateway.authUsers = [
    {
      id: "platform-id",
      email: DEMO_MANIFEST.users[0].email,
      bannedUntil: "2999-01-01T00:00:00.000Z",
    },
  ]
  gateway.profiles = [
    {
      id: "platform-id",
      email: DEMO_MANIFEST.users[0].email,
      fullName: "Stale name",
      isPlatformAdmin: false,
    },
  ]
  gateway.projects = [
    {
      ...projectRecord("isolation", "project-b", "wrong-creator"),
      title: "Stale title",
      status: "inactive",
    },
  ]
  gateway.memberships = [
    {
      id: "stale-creator-membership",
      projectId: "project-b",
      userId: "platform-id",
      accessRoleCode: "project_reader",
      legacyRole: "project_manager",
      isActive: false,
    },
  ]
  gateway.rolesByMembership.set(
    "stale-creator-membership",
    new Set(["stale_role"]),
  )
  const core = new SupabaseDemoStandCore(gateway)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await core.prepareUsers("FAKE-PASSWORD")
    await core.prepareProjects()
    await core.prepareAccess()
  }

  assert.equal(gateway.authUsers.length, DEMO_MANIFEST.users.length)
  assert.equal(
    new Set(gateway.authUsers.map((user) => user.email)).size,
    DEMO_MANIFEST.users.length,
  )
  assert.deepEqual(
    gateway.profiles
      .map((profile) => ({
        email: profile.email,
        fullName: profile.fullName,
        isPlatformAdmin: profile.isPlatformAdmin,
      }))
      .sort((left, right) =>
        String(left.email).localeCompare(String(right.email)),
      ),
    DEMO_MANIFEST.users
      .map((user) => ({
        email: user.email,
        fullName: user.fullName,
        isPlatformAdmin: user.platformAdmin,
      }))
      .sort((left, right) => left.email.localeCompare(right.email)),
  )
  assert.deepEqual(
    gateway.projects
      .map(({ id: _id, createdAt: _createdAt, ...project }) => project)
      .sort((left, right) =>
        left.activityCode.localeCompare(right.activityCode),
      ),
    [
      DEMO_MANIFEST.projects.golden,
      DEMO_MANIFEST.projects.isolation,
      DEMO_MANIFEST.projects.showcase,
    ]
      .map((project) => ({
        activityCode: project.activityCode,
        title: project.title,
        ownerName: project.ownerName,
        contractorName: project.contractorName,
        contractNumber: project.contractNumber,
        transitDays: project.transitDays,
        status: project.status,
        createdBy: "platform-id",
      }))
      .sort((left, right) =>
        left.activityCode.localeCompare(right.activityCode),
      ),
  )
  assert.equal(gateway.memberships.length, 10)
  assert.equal(
    new Set(
      gateway.memberships.map(
        (membership) => `${membership.projectId}/${membership.userId}`,
      ),
    ).size,
    10,
  )

  const usersByEmail = new Map(
    gateway.authUsers.map((user) => [user.email, user.id]),
  )
  const projectsByCode = new Map(
    gateway.projects.map((project) => [project.activityCode, project.id]),
  )
  for (const user of DEMO_MANIFEST.users) {
    for (const expected of user.memberships) {
      const membership = gateway.memberships.find(
        (candidate) =>
          candidate.userId === usersByEmail.get(user.email) &&
          candidate.projectId === projectsByCode.get(expected.projectCode),
      )
      assert.ok(membership)
      assert.equal(membership.accessRoleCode, expected.role)
      assert.equal(membership.isActive, true)
      assert.deepEqual(
        [...(gateway.rolesByMembership.get(membership.id) ?? [])],
        [...expected.functionalRoles],
      )
    }
  }
})

test("readCoreSnapshot normalizes database order while preserving observed access and scopes", async () => {
  const gateway = configuredGateway()
  gateway.authUsers.reverse()
  gateway.profiles = DEMO_MANIFEST.users
    .map((user, index) => ({
      id: index === 0 ? "platform-id" : `user-${index}`,
      email: user.email,
      fullName: user.fullName,
      isPlatformAdmin: user.platformAdmin,
    }))
    .reverse()
  gateway.projects.reverse()
  gateway.memberships = [
    {
      id: "actual-qc-membership",
      projectId: "project-a",
      userId: "user-3",
      accessRoleCode: "project_reader",
      legacyRole: "project_manager",
      isActive: true,
    },
    {
      id: "creator-b",
      projectId: "project-b",
      userId: "platform-id",
      accessRoleCode: "project_admin",
      legacyRole: "system_admin",
      isActive: true,
    },
    {
      id: "creator-a",
      projectId: "project-a",
      userId: "platform-id",
      accessRoleCode: "project_admin",
      legacyRole: "system_admin",
      isActive: true,
    },
  ]
  gateway.functionalRoles = [
    { membershipId: "actual-qc-membership", roleCode: "nde_inspector" },
  ]
  gateway.subcontractorScopes = [
    { membershipId: "actual-qc-membership", code: "OBSERVED-SUB" },
  ]
  gateway.pdsAreaScopes = [
    { membershipId: "actual-qc-membership", code: "OBSERVED-PDS" },
  ]

  const snapshot = await new SupabaseDemoStandCore(
    gateway,
  ).readCoreSnapshot()

  assert.deepEqual(
    snapshot.projects.map((project) => project.activityCode),
    ["TRACK01-A", "TRACK01-B"],
  )
  assert.deepEqual(
    snapshot.users.map((user) => user.key),
    DEMO_MANIFEST.users.map((user) => user.key),
  )
  const qcUser = snapshot.users.find((user) => user.key === "qc_editor")
  assert.deepEqual(qcUser?.memberships, [
    {
      projectCode: "TRACK01-A",
      role: "project_reader",
      source: "direct",
      isActive: true,
      functionalRoles: ["nde_inspector"],
      scopes: {
        subcontractorCodes: ["OBSERVED-SUB"],
        pdsAreaCodes: ["OBSERVED-PDS"],
      },
    },
  ])
  const platformAdmin = snapshot.users.find(
    (user) => user.key === "platform_admin",
  )
  assert.deepEqual(
    platformAdmin?.memberships.map((membership) => ({
      projectCode: membership.projectCode,
      source: membership.source,
    })),
    [
      { projectCode: "TRACK01-A", source: "creator" },
      { projectCode: "TRACK01-B", source: "creator" },
    ],
  )
})

test("readCoreSnapshot preserves inactive unexpected memberships with their roles and scopes for preflight", async () => {
  const gateway = configuredGateway()
  const observer = DEMO_MANIFEST.users.find(
    (user) => user.key === "platform_observer",
  )
  assert.ok(observer)
  gateway.authUsers = [
    {
      id: "observer-id",
      email: observer.email,
      bannedUntil: null,
    },
  ]
  gateway.profiles = [
    {
      id: "observer-id",
      email: observer.email,
      fullName: observer.fullName,
      isPlatformAdmin: observer.platformAdmin,
    },
  ]
  gateway.memberships = [
    {
      id: "inactive-observer-a",
      projectId: "project-a",
      userId: "observer-id",
      accessRoleCode: "project_reader",
      legacyRole: "project_manager",
      isActive: false,
    },
  ]
  gateway.functionalRoles = [
    {
      membershipId: "inactive-observer-a",
      roleCode: "qc_engineer",
    },
  ]
  gateway.subcontractorScopes = [
    { membershipId: "inactive-observer-a", code: "FAB-A" },
  ]
  gateway.pdsAreaScopes = [
    { membershipId: "inactive-observer-a", code: "PDS-100" },
  ]

  const coreSnapshot = await new SupabaseDemoStandCore(
    gateway,
  ).readCoreSnapshot()
  const observedUser = coreSnapshot.users[0]
  assert.ok(observedUser)
  assert.deepEqual(observedUser.memberships, [
    {
      projectCode: "TRACK01-A",
      role: "project_reader",
      source: "direct",
      isActive: false,
      functionalRoles: ["qc_engineer"],
      scopes: {
        subcontractorCodes: ["FAB-A"],
        pdsAreaCodes: ["PDS-100"],
      },
    },
  ])

  const snapshot: DemoStandSnapshot = {
    ...validSnapshot(),
    users: coreSnapshot.users,
  }
  const check = evaluateDemoStand(snapshot).checks.find(
    (candidate) => candidate.id === "users/access",
  )
  assert.ok(check)
  assert.equal(check.ok, false)
  assert.match(check.actual, /track01\.platform-observer@example\.test/)
})

test("readCoreSnapshot exposes unexpected projects and their actual access for preflight", async () => {
  const gateway = configuredGateway()
  gateway.authUsers = [gateway.authUsers[3]]
  gateway.profiles = [
    {
      id: "user-3",
      email: DEMO_MANIFEST.users[3].email,
      fullName: DEMO_MANIFEST.users[3].fullName,
      isPlatformAdmin: false,
    },
  ]
  gateway.projects.push({
    id: "project-x",
    activityCode: "TRACK01-X",
    title: "Unexpected project",
    ownerName: "Unexpected owner",
    contractorName: "Unexpected contractor",
    contractNumber: "UNEXPECTED-001",
    transitDays: 9,
    status: "active",
    createdBy: "another-user",
    createdAt: "2026-08-11T00:00:00.000Z",
  })
  gateway.memberships = [
    {
      id: "unexpected-membership",
      projectId: "project-x",
      userId: "user-3",
      accessRoleCode: "project_reader",
      legacyRole: "project_manager",
      isActive: true,
    },
  ]

  const snapshot = await new SupabaseDemoStandCore(
    gateway,
  ).readCoreSnapshot()

  assert.deepEqual(
    snapshot.projects.map((project) => project.activityCode),
    ["TRACK01-A", "TRACK01-B", "TRACK01-X"],
  )
  assert.deepEqual(snapshot.projects[2], {
    key: "TRACK01-X",
    activityCode: "TRACK01-X",
    title: "Unexpected project",
    ownerName: "Unexpected owner",
    contractorName: "Unexpected contractor",
    contractNumber: "UNEXPECTED-001",
    transitDays: 9,
    status: "active",
  })
  assert.deepEqual(snapshot.users[0].memberships, [
    {
      projectCode: "TRACK01-X",
      role: "project_reader",
      source: "direct",
      isActive: true,
      functionalRoles: [],
      scopes: undefined,
    },
  ])
})

test("database project mapping preserves archived status for a preflight business mismatch", () => {
  const observed = observedProjectRecordFromDatabase(
    databaseObservedProjectRow({ status: "archived" }),
  )
  const snapshot = validSnapshot()
  ;(snapshot.projects as Array<(typeof snapshot.projects)[number]>)[0] = {
    ...snapshot.projects[0],
    status: observed.status,
  }

  assert.equal(observed.status, "archived")
  assert.doesNotThrow(() => evaluateDemoStand(snapshot))
  assert.equal(
    evaluateDemoStand(snapshot).checks.find(
      (check) => check.id === "projects",
    )?.ok,
    false,
  )
})

test("database project mapping preserves null contract number for a preflight business mismatch", () => {
  const observed = observedProjectRecordFromDatabase(
    databaseObservedProjectRow({ contract_number: null }),
  )
  const snapshot = validSnapshot()
  ;(snapshot.projects as Array<(typeof snapshot.projects)[number]>)[0] = {
    ...snapshot.projects[0],
    contractNumber: observed.contractNumber,
  }

  assert.equal(observed.contractNumber, null)
  assert.doesNotThrow(() => evaluateDemoStand(snapshot))
  assert.equal(
    evaluateDemoStand(snapshot).checks.find(
      (check) => check.id === "projects",
    )?.ok,
    false,
  )
})

test("readCoreSnapshot exposes unexpected observed users and their actual access without auth payloads", async () => {
  const gateway = configuredGateway()
  const unexpectedAuthUser = {
    id: "unexpected-user-id",
    email: "track01.unexpected@example.test",
    bannedUntil: null,
    password: "FAKE-PASSWORD",
    serviceRoleKey: "FAKE-SERVICE-KEY",
    fullAuthPayload: { token: "FAKE-AUTH-TOKEN" },
  } as DemoAuthUserRecord
  gateway.authUsers = [gateway.authUsers[3], unexpectedAuthUser]
  gateway.profiles = [
    {
      id: "user-3",
      email: DEMO_MANIFEST.users[3].email,
      fullName: DEMO_MANIFEST.users[3].fullName,
      isPlatformAdmin: false,
    },
    {
      id: "unexpected-user-id",
      email: "track01.unexpected@example.test",
      fullName: "Observed Unexpected User",
      isPlatformAdmin: false,
    },
  ]
  gateway.memberships = [
    {
      id: "unexpected-user-membership",
      projectId: "project-a",
      userId: "unexpected-user-id",
      accessRoleCode: "project_reader",
      legacyRole: "project_manager",
      isActive: true,
    },
  ]

  const snapshot = await new SupabaseDemoStandCore(
    gateway,
  ).readCoreSnapshot()

  assert.deepEqual(
    snapshot.users.map((user) => user.key),
    ["qc_editor", "auth-user:unexpected-user-id"],
  )
  assert.deepEqual(snapshot.users[1], {
    key: "auth-user:unexpected-user-id",
    email: "track01.unexpected@example.test",
    fullName: "Observed Unexpected User",
    platformAdmin: false,
    status: "active",
    memberships: [
      {
        projectCode: "TRACK01-A",
        role: "project_reader",
        source: "direct",
        isActive: true,
        functionalRoles: [],
        scopes: undefined,
      },
    ],
  })
  const serialized = JSON.stringify(snapshot)
  assert.doesNotMatch(
    serialized,
    /FAKE-PASSWORD|FAKE-SERVICE-KEY|FAKE-AUTH-TOKEN|fullAuthPayload/,
  )
})

test("readCoreSnapshot preserves unexpected access and functional role codes for preflight drift", async () => {
  const gateway = configuredGateway()
  gateway.authUsers = [gateway.authUsers[3]]
  gateway.profiles = [
    {
      id: "user-3",
      email: DEMO_MANIFEST.users[3].email,
      fullName: DEMO_MANIFEST.users[3].fullName,
      isPlatformAdmin: false,
    },
  ]
  gateway.memberships = [
    {
      id: "drifted-membership",
      projectId: "project-a",
      userId: "user-3",
      accessRoleCode: "site_admin",
      legacyRole: "project_manager",
      isActive: true,
    },
  ]
  gateway.functionalRoles = [
    { membershipId: "drifted-membership", roleCode: "project_manager" },
    { membershipId: "drifted-membership", roleCode: "arbitrary_function" },
  ]

  const snapshot = await new SupabaseDemoStandCore(
    gateway,
  ).readCoreSnapshot()

  assert.deepEqual(snapshot.users[0].memberships, [
    {
      projectCode: "TRACK01-A",
      role: "site_admin",
      source: "direct",
      isActive: true,
      functionalRoles: ["arbitrary_function", "project_manager"],
      scopes: undefined,
    },
  ])
})

test("readCoreSnapshot retains auth users without profiles and their actual access", async () => {
  const gateway = configuredGateway()
  gateway.authUsers = [
    {
      id: "profile-missing-user",
      email: "track01.profile-missing@example.test",
      bannedUntil: null,
    },
  ]
  gateway.profiles = []
  gateway.memberships = [
    {
      id: "profile-missing-membership",
      projectId: "project-a",
      userId: "profile-missing-user",
      accessRoleCode: "project_reader",
      legacyRole: "project_manager",
      isActive: true,
    },
  ]

  const snapshot = await new SupabaseDemoStandCore(
    gateway,
  ).readCoreSnapshot()

  assert.deepEqual(snapshot.users, [
    {
      key: "auth-user:profile-missing-user",
      email: "track01.profile-missing@example.test",
      fullName: "[profile unavailable]",
      platformAdmin: false,
      status: "active",
      memberships: [
        {
          projectCode: "TRACK01-A",
          role: "project_reader",
          source: "direct",
          isActive: true,
          functionalRoles: [],
          scopes: undefined,
        },
      ],
    },
  ])
})

test("readCoreSnapshot treats future bans as inactive, expired bans as active, and invalid bans as inactive", async () => {
  const gateway = configuredGateway()
  gateway.authUsers = [
    {
      id: "future-ban",
      email: "future-ban@example.test",
      bannedUntil: "2999-01-01T00:00:00.000Z",
    },
    {
      id: "expired-ban",
      email: "expired-ban@example.test",
      bannedUntil: "2000-01-01T00:00:00.000Z",
    },
    {
      id: "invalid-ban",
      email: "invalid-ban@example.test",
      bannedUntil: "not-a-date",
    },
  ]
  gateway.profiles = gateway.authUsers.map((user) => ({
    id: user.id,
    email: user.email,
    fullName: user.id,
    isPlatformAdmin: false,
  }))

  const snapshot = await new SupabaseDemoStandCore(
    gateway,
  ).readCoreSnapshot()

  assert.deepEqual(
    Object.fromEntries(
      snapshot.users.map((user) => [user.email, user.status]),
    ),
    {
      "expired-ban@example.test": "active",
      "future-ban@example.test": "inactive",
      "invalid-ban@example.test": "inactive",
    },
  )
})

test("readCoreSnapshot retains memberships whose project row is unavailable", async () => {
  const gateway = configuredGateway()
  gateway.authUsers = [gateway.authUsers[3]]
  gateway.profiles = [
    {
      id: "user-3",
      email: DEMO_MANIFEST.users[3].email,
      fullName: DEMO_MANIFEST.users[3].fullName,
      isPlatformAdmin: false,
    },
  ]
  gateway.memberships = [
    {
      id: "missing-project-membership",
      projectId: "unavailable-project-id",
      userId: "user-3",
      accessRoleCode: "project_reader",
      legacyRole: "project_manager",
      isActive: true,
    },
  ]

  const snapshot = await new SupabaseDemoStandCore(
    gateway,
  ).readCoreSnapshot()

  assert.equal(
    snapshot.users[0].memberships[0].projectCode,
    "missing-project:unavailable-project-id",
  )
})

test("readCoreSnapshot marks empty counts unavailable when a demo project is missing", async () => {
  const gateway = configuredGateway()
  gateway.projects = [projectRecord("isolation", "project-b")]

  const snapshot = await new SupabaseDemoStandCore(
    gateway,
  ).readCoreSnapshot()

  assert.deepEqual(
    snapshot.projects.map((project) => project.activityCode),
    ["TRACK01-B"],
  )
  assert.deepEqual(
    Object.values(snapshot.emptyCounts["TRACK01-A"]),
    EMPTY_AT_DEMO_START.map(() => null),
  )
  assert.ok(
    Object.values(snapshot.emptyCounts["TRACK01-B"]).every(
      (count) => count === 2 || count === 4,
    ),
  )
})

test("empty-table strategy is exhaustive, project-scoped for A and B, and uses a parent path for PWHT results", async () => {
  assert.deepEqual(Object.keys(EMPTY_TABLE_STRATEGIES), [
    ...EMPTY_AT_DEMO_START,
  ])
  assert.deepEqual(EMPTY_TABLE_STRATEGIES.pwht_results, {
    kind: "child",
    table: "pwht_results",
    parentTable: "pwht_requirements",
    childForeignKey: "pwht_requirement_id",
  })
  for (const table of EMPTY_AT_DEMO_START) {
    if (table !== "pwht_results") {
      assert.deepEqual(EMPTY_TABLE_STRATEGIES[table], {
        kind: "direct",
        table,
      })
    }
  }

  const gateway = configuredGateway()
  gateway.profiles = DEMO_MANIFEST.users.map((user, index) => ({
    id: index === 0 ? "platform-id" : `user-${index}`,
    email: user.email,
    fullName: user.fullName,
    isPlatformAdmin: user.platformAdmin,
  }))
  const snapshot = await new SupabaseDemoStandCore(
    gateway,
  ).readCoreSnapshot()
  const directCalls = gateway.calls.filter(
    (call) => call.method === "countDirectProjectRows",
  )
  const childCalls = gateway.calls.filter(
    (call) => call.method === "countChildProjectRows",
  )

  assert.equal(directCalls.length, (EMPTY_AT_DEMO_START.length - 1) * 2)
  assert.deepEqual(
    new Set(
      directCalls.map(
        (call) => (call.payload as { projectId: string }).projectId,
      ),
    ),
    new Set(["project-a", "project-b"]),
  )
  assert.deepEqual(
    childCalls.map((call) => call.payload),
    [
      {
        strategy: EMPTY_TABLE_STRATEGIES.pwht_results,
        projectId: "project-a",
      },
      {
        strategy: EMPTY_TABLE_STRATEGIES.pwht_results,
        projectId: "project-b",
      },
    ],
  )
  assert.equal(snapshot.emptyCounts["TRACK01-A"].pwht_results, 3)
  assert.equal(snapshot.emptyCounts["TRACK01-B"].pwht_results, 4)
})

test("construction validates local URL and nonblank service key before invoking the gateway factory", () => {
  const calls: unknown[] = []
  const factory = (...args: unknown[]) => {
    calls.push(args)
    return new FakeGateway()
  }
  const fakeServiceKey = "FAKE-SERVICE-KEY"

  for (const [url, key] of [
    ["https://example.com", fakeServiceKey],
    ["http://localhost:54321", "   "],
  ] as const) {
    assert.throws(
      () => createSupabaseDemoStandCore(url, key, factory),
      (error: unknown) => {
        assert.doesNotMatch(String(error), new RegExp(fakeServiceKey))
        return true
      },
    )
  }
  assert.equal(calls.length, 0)

  const core = createSupabaseDemoStandCore(
    "http://localhost:54321",
    fakeServiceKey,
    factory,
  )
  assert.ok(core instanceof SupabaseDemoStandCore)
  assert.deepEqual(calls, [
    [
      "http://localhost:54321",
      fakeServiceKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    ],
  ])
})

test("construction sanitizes a client or gateway factory failure", () => {
  const fakeServiceKey = "FAKE-SERVICE-KEY"

  assert.throws(
    () =>
      createSupabaseDemoStandCore(
        "http://localhost:54321",
        fakeServiceKey,
        () => {
          throw new Error(
            `authorization=Bearer ${fakeServiceKey} auth={full-payload}`,
          )
        },
      ),
    (error: unknown) => {
      const message = String(error)
      assert.match(message, /Supabase demo gateway/i)
      assert.doesNotMatch(
        message,
        /FAKE-SERVICE-KEY|Bearer|full-payload|authorization/i,
      )
      return true
    },
  )
})

test("auth admin pagination follows server nextPage values until null", async () => {
  const calls: Array<{ readonly page: number; readonly perPage: number }> = []
  const gateway: AuthAdminListGateway = {
    async listUsers(parameters) {
      calls.push(parameters)
      if (parameters.page === 1) {
        return {
          data: {
            users: [
              {
                id: "page-1-user",
                email: "page-1@example.test",
                banned_until: null,
              },
            ],
            nextPage: 3,
          },
          error: null,
        }
      }
      assert.equal(parameters.page, 3)
      return {
        data: {
          users: [
            {
              id: "page-3-user",
              email: "page-3@example.test",
              banned_until: "2999-01-01T00:00:00.000Z",
            },
          ],
          nextPage: null,
        },
        error: null,
      }
    },
  }

  const users = await listAllAuthUsers(gateway)

  assert.deepEqual(calls, [
    { page: 1, perPage: 1000 },
    { page: 3, perPage: 1000 },
  ])
  assert.deepEqual(users, [
    {
      id: "page-1-user",
      email: "page-1@example.test",
      bannedUntil: null,
    },
    {
      id: "page-3-user",
      email: "page-3@example.test",
      bannedUntil: "2999-01-01T00:00:00.000Z",
    },
  ])
})

test("auth admin pagination sanitizes the exact failing page", async () => {
  const gateway: AuthAdminListGateway = {
    async listUsers({ page }) {
      if (page === 1) {
        return {
          data: { users: [], nextPage: 2 },
          error: null,
        }
      }
      return {
        data: { users: [], nextPage: null },
        error: {
          message:
            "service_role_key=FAKE-SERVICE-KEY auth={full-auth-payload}",
        },
      }
    },
  }

  await assert.rejects(listAllAuthUsers(gateway), (error: unknown) => {
    const message = String(error)
    assert.match(message, /page 2/i)
    assert.doesNotMatch(
      message,
      /FAKE-SERVICE-KEY|service.role|full-auth-payload|auth=/i,
    )
    return true
  })
})

test("prepare argument parser requires exactly one explicit local reset confirmation", () => {
  assert.deepEqual(parsePrepareArguments(["--confirm-local-reset"]), {
    confirmed: true,
  })

  for (const argv of [
    [],
    ["--confirm-local-rest"],
    ["--confirm-local-reset", "--extra"],
    ["--extra", "--confirm-local-reset"],
  ]) {
    assert.throws(
      () => parsePrepareArguments(argv),
      /Pass --confirm-local-reset to replace the local demo database\./,
    )
  }
})

test("hosted prepare parser requires exactly one hosted reset confirmation", () => {
  assert.deepEqual(parseHostedPrepareArguments(["--confirm-hosted-reset"]), {
    confirmed: true,
  })

  for (const argv of [
    [],
    ["--confirm-local-reset"],
    ["--confirm-hosted-reset", "--extra"],
  ]) {
    assert.throws(
      () => parseHostedPrepareArguments(argv),
      /Pass --confirm-hosted-reset to replace the hosted demo database\./,
    )
  }
})

test("hosted scripts prefer the Marketplace secret key over the legacy service-role JWT", () => {
  assert.equal(
    hostedAdminKeyFromEnvironment({
      SUPABASE_SECRET_KEY: "current-secret-key",
      SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role-jwt",
    }),
    "current-secret-key",
  )
  assert.equal(
    hostedAdminKeyFromEnvironment({
      SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role-jwt",
    }),
    "legacy-service-role-jwt",
  )
  assert.equal(
    hostedAdminKeyFromEnvironment({
      SUPABASE_SECRET_KEY: "   ",
      SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role-jwt",
    }),
    "legacy-service-role-jwt",
  )
})

test("hosted reset links the fixed project before resetting its remote database", () => {
  const calls: unknown[][] = []

  runHostedReset((command, args, options) => {
    calls.push([command, args, options])
    return { status: 0 }
  })

  assert.deepEqual(calls, [
    [
      "supabase",
      ["link", "--project-ref", PIPEQC_HOSTED_DEMO_PROJECT_REF],
      { stdio: "inherit" },
    ],
    ["supabase", ["db", "reset", "--linked", "--yes"], { stdio: "inherit" }],
  ])
})

test("hosted preparation rejects a foreign project before any CLI or gateway call", async () => {
  const events: string[] = []
  const lines: string[] = []

  const status = await runPrepareHostedDemo(
    {
      argv: ["--confirm-hosted-reset"],
      supabaseUrl: "https://foreign-project.supabase.co",
      serviceRoleKey: "fake-service-role-key",
      password: "demo-password",
      now: VALID_PREPARE_INPUT.now,
    },
    {
      spawn: () => {
        events.push("cli")
        return { status: 0 }
      },
      createPort: () => {
        events.push("gateway")
        return fakePort(events)
      },
      writeLine: (line) => lines.push(line),
    },
  )

  assert.equal(status, 1)
  assert.deepEqual(events, [])
  assert.match(lines.join("\n"), /configured PipeQC hosted demo/i)
})

test("hosted read-only check rejects a foreign project before gateway creation", async () => {
  const events: string[] = []
  const lines: string[] = []

  const status = await runHostedCheckDemo(
    {
      supabaseUrl: "https://foreign-project.supabase.co",
      serviceRoleKey: "fake-service-role-key",
    },
    {
      createPort: () => {
        events.push("gateway")
        return fakePort(events)
      },
      evaluate: () => ({ ok: true, checks: [] }),
      writeLine: (line) => lines.push(line),
    },
  )

  assert.equal(status, 1)
  assert.deepEqual(events, [])
  assert.match(lines.join("\n"), /configured PipeQC hosted demo/i)
})

test("local reset uses the fixed Supabase command without a shell or environment arguments", () => {
  const calls: unknown[][] = []

  runLocalReset((command, args, options) => {
    calls.push([command, args, options])
    return { status: 0 }
  })

  assert.deepEqual(calls, [
    ["supabase", ["db", "reset"], { stdio: "inherit" }],
  ])
  assert.equal(
    Object.hasOwn(calls[0][2] as object, "shell"),
    false,
  )
  assert.equal(Object.hasOwn(calls[0][2] as object, "env"), false)
})

test("local reset fails safely for spawn errors, nonzero exits, and null status", async (t) => {
  const results = [
    { error: new Error("FAKE-SERVICE-KEY full spawn payload"), status: 0 },
    { status: 7 },
    { status: null },
  ]

  for (const result of results) {
    await t.test(JSON.stringify({ status: result.status, error: !!result.error }), () => {
      assert.throws(
        () => runLocalReset(() => result),
        (error: unknown) => {
          assert.match(String(error), /local database reset failed/i)
          assert.doesNotMatch(String(error), /FAKE-SERVICE-KEY|payload|status=7/i)
          return true
        },
      )
    })
  }

  assert.throws(
    () =>
      runLocalReset(() => {
        throw new Error("FAKE-SPAWN-SECRET full thrown payload")
      }),
    (error: unknown) => {
      assert.match(String(error), /local database reset failed/i)
      assert.doesNotMatch(String(error), /FAKE-SPAWN-SECRET|payload/i)
      return true
    },
  )
})

const VALID_PREPARE_INPUT = {
  argv: ["--confirm-local-reset"],
  supabaseUrl: "http://127.0.0.1:54321",
  serviceRoleKey: "fake-service-role-key",
  password: "demo-password",
  now: new Date("2026-08-11T23:45:00.000Z"),
} as const

test("prepare rejects confirmation before ambiguous environment failures and any side effect", async () => {
  const events: string[] = []
  const lines: string[] = []

  const status = await runPrepareDemo(
    {
      argv: [],
      supabaseUrl: undefined,
      serviceRoleKey: undefined,
      password: undefined,
      now: VALID_PREPARE_INPUT.now,
    },
    {
      spawn: () => {
        events.push("reset")
        return { status: 0 }
      },
      createPort: () => {
        events.push("factory")
        return fakePort(events)
      },
      writeLine: (line) => lines.push(line),
    },
  )

  assert.equal(status, 1)
  assert.deepEqual(events, [])
  assert.equal(lines.length, 1)
  assert.match(lines[0], /Pass --confirm-local-reset/)
})

test("prepare validates every environment input before reset and adapter creation", async (t) => {
  const cases = [
    {
      name: "missing URL",
      input: { ...VALID_PREPARE_INPUT, supabaseUrl: undefined },
      message: /exact local Supabase HTTP origin/i,
    },
    {
      name: "nonlocal URL",
      input: { ...VALID_PREPARE_INPUT, supabaseUrl: "https://example.com" },
      message: /exact local Supabase HTTP origin/i,
    },
    {
      name: "blank service key",
      input: { ...VALID_PREPARE_INPUT, serviceRoleKey: "   " },
      message: /nonblank Supabase service role key/i,
    },
    {
      name: "short password",
      input: { ...VALID_PREPARE_INPUT, password: "not-used" },
      message: /at least 12 characters/i,
    },
  ]

  for (const validationCase of cases) {
    await t.test(validationCase.name, async () => {
      const events: string[] = []
      const lines: string[] = []
      const status = await runPrepareDemo(validationCase.input, {
        spawn: () => {
          events.push("reset")
          return { status: 0 }
        },
        createPort: () => {
          events.push("factory")
          return fakePort(events)
        },
        writeLine: (line) => lines.push(line),
      })

      assert.equal(status, 1)
      assert.deepEqual(events, [])
      assert.match(lines.join("\n"), validationCase.message)
      assert.doesNotMatch(
        lines.join("\n"),
        /fake-service-role-key|demo-password|not-used/i,
      )
    })
  }
})

test("prepare resets, creates the adapter, and runs the exact UTC-day preparation sequence", async () => {
  const events: string[] = []
  const lines: string[] = []
  const port = fakePort(events)
  port.prepareProjectReferences = async (preparedOn) => {
    assert.equal(preparedOn.toISOString(), "2026-08-11T00:00:00.000Z")
    events.push("project-references")
  }

  const status = await runPrepareDemo(VALID_PREPARE_INPUT, {
    spawn: (command, args, options) => {
      assert.deepEqual([command, args, options], [
        "supabase",
        ["db", "reset"],
        { stdio: "inherit" },
      ])
      events.push("reset")
      return { status: 0 }
    },
    createPort: (url, key) => {
      assert.equal(url, VALID_PREPARE_INPUT.supabaseUrl)
      assert.equal(key, VALID_PREPARE_INPUT.serviceRoleKey)
      events.push("factory")
      return port
    },
    writeLine: (line) => lines.push(line),
  })

  assert.equal(status, 0)
  assert.deepEqual(events, [
    "reset",
    "factory",
    "users",
    "projects",
    "access",
    "system-references",
    "project-references",
    "snapshot",
  ])
  assert.match(lines[0], /http:\/\/127\.0\.0\.1:54321/)
  assert.match(lines[1], /local data will be replaced/i)
  assert.match(lines.join("\n"), /PASS check=projects/)
  assert.doesNotMatch(
    lines.join("\n"),
    /fake-service-role-key|demo-password/i,
  )
})

test("prepare stops before adapter creation when reset fails", async () => {
  const events: string[] = []
  const lines: string[] = []
  const status = await runPrepareDemo(VALID_PREPARE_INPUT, {
    spawn: () => {
      events.push("reset")
      return { status: 1 }
    },
    createPort: () => {
      events.push("factory")
      return fakePort(events)
    },
    writeLine: (line) => lines.push(line),
  })

  assert.equal(status, 1)
  assert.deepEqual(events, ["reset"])
  assert.match(lines.at(-1) ?? "", /FAIL.*reset/i)
})

test("prepare stops at a failed stage and reports only its safe stage name", async () => {
  const events: string[] = []
  const lines: string[] = []
  const port = fakePort(events)
  port.prepareProjects = async () => {
    events.push("projects")
    throw new Error(
      "service_role_key=FAKE-SERVICE-KEY payload={full-database-payload}",
    )
  }

  const status = await runPrepareDemo(VALID_PREPARE_INPUT, {
    spawn: () => {
      events.push("reset")
      return { status: 0 }
    },
    createPort: () => {
      events.push("factory")
      return port
    },
    writeLine: (line) => lines.push(line),
  })

  assert.equal(status, 1)
  assert.deepEqual(events, ["reset", "factory", "users", "projects"])
  assert.match(lines.at(-1) ?? "", /FAIL.*projects/i)
  assert.doesNotMatch(
    lines.join("\n"),
    /FAKE-SERVICE-KEY|full-database-payload|service.role.key/i,
  )
})

test("prepare returns failure when preflight reports a business mismatch", async () => {
  const snapshot = validSnapshot()
  const projects = snapshot.projects as Array<(typeof snapshot.projects)[number]>
  projects[0] = { ...projects[0], title: "Mismatch" }
  const lines: string[] = []

  const status = await runPrepareDemo(VALID_PREPARE_INPUT, {
    spawn: () => ({ status: 0 }),
    createPort: () => fakePort([], snapshot),
    writeLine: (line) => lines.push(line),
  })

  assert.equal(status, 1)
  assert.match(lines.join("\n"), /FAIL check=projects/)
})

test("demo check formatter exposes status and safe check identity but no report payloads or hashes", () => {
  const line = formatDemoCheck({
    id: "spoolgen-package",
    ok: false,
    expected: "token=FAKE-TOKEN expected-hash-123",
    actual: "authorization=FAKE-AUTH full-payload actual-hash-456",
    recovery: "password=FAKE-PASSWORD",
  })

  assert.match(line, /^FAIL check=spoolgen-package/)
  assert.match(line, /npm run demo:prepare -- --confirm-local-reset/)
  assert.doesNotMatch(
    line,
    /FAKE|TOKEN|AUTH|PASSWORD|payload|expected-hash|actual-hash/i,
  )
})

test("read-only check validates before factory and calls only readSnapshot then evaluate", async () => {
  const rejectedEvents: string[] = []
  const lines: string[] = []
  const snapshot = validSnapshot()

  const rejected = await runCheckDemo(
    { supabaseUrl: "https://example.com", serviceRoleKey: "not-used" },
    {
      createPort: () => {
        rejectedEvents.push("factory")
        return { readSnapshot: async () => snapshot }
      },
      evaluate: () => {
        rejectedEvents.push("evaluate")
        return evaluateDemoStand(snapshot)
      },
      writeLine: (line) => lines.push(line),
    },
  )
  assert.equal(rejected, 1)
  assert.deepEqual(rejectedEvents, [])
  assert.match(lines.at(-1) ?? "", /exact local Supabase HTTP origin/i)

  lines.length = 0
  const acceptedEvents: string[] = []
  const accepted = await runCheckDemo(
    {
      supabaseUrl: VALID_PREPARE_INPUT.supabaseUrl,
      serviceRoleKey: VALID_PREPARE_INPUT.serviceRoleKey,
    },
    {
      createPort: (url, key) => {
        assert.equal(url, VALID_PREPARE_INPUT.supabaseUrl)
        assert.equal(key, VALID_PREPARE_INPUT.serviceRoleKey)
        acceptedEvents.push("factory")
        return {
          async readSnapshot() {
            acceptedEvents.push("snapshot")
            return snapshot
          },
        }
      },
      evaluate: (value) => {
        assert.equal(value, snapshot)
        acceptedEvents.push("evaluate")
        return evaluateDemoStand(value)
      },
      writeLine: (line) => lines.push(line),
    },
  )

  assert.equal(accepted, 0)
  assert.deepEqual(acceptedEvents, ["factory", "snapshot", "evaluate"])
  assert.match(lines.join("\n"), /PASS check=projects/)
  assert.doesNotMatch(lines.join("\n"), /fake-service-role-key/i)
})

test("read-only check reports mismatch and errors without leaking source payloads", async () => {
  const lines: string[] = []
  const snapshot = validSnapshot()
  const failedReport = evaluateDemoStand(snapshot)
  const projects = failedReport.checks.find((check) => check.id === "projects")
  assert.ok(projects)
  const report = {
    ...failedReport,
    ok: false,
    checks: [
      {
        ...projects,
        ok: false,
        actual: "secret=FAKE-CHECK-SECRET full-payload",
      },
    ],
  }

  const mismatchStatus = await runCheckDemo(
    {
      supabaseUrl: VALID_PREPARE_INPUT.supabaseUrl,
      serviceRoleKey: VALID_PREPARE_INPUT.serviceRoleKey,
    },
    {
      createPort: () => ({ readSnapshot: async () => snapshot }),
      evaluate: () => report,
      writeLine: (line) => lines.push(line),
    },
  )
  assert.equal(mismatchStatus, 1)
  assert.match(lines.join("\n"), /FAIL check=projects/)
  assert.doesNotMatch(lines.join("\n"), /FAKE-CHECK-SECRET|full-payload/i)

  lines.length = 0
  const errorStatus = await runCheckDemo(
    {
      supabaseUrl: VALID_PREPARE_INPUT.supabaseUrl,
      serviceRoleKey: VALID_PREPARE_INPUT.serviceRoleKey,
    },
    {
      createPort: () => ({
        async readSnapshot() {
          throw new Error("password=FAKE-CHECK-PASSWORD full-error-payload")
        },
      }),
      evaluate: evaluateDemoStand,
      writeLine: (line) => lines.push(line),
    },
  )
  assert.equal(errorStatus, 1)
  assert.match(lines.at(-1) ?? "", /FAIL.*preflight/i)
  assert.doesNotMatch(
    lines.join("\n"),
    /FAKE-CHECK-PASSWORD|full-error-payload|password=/i,
  )
})

test("check CLI source is import-safe and contains no mutating or reset calls", () => {
  const source = readFileSync(
    new URL("../check-track12-demo.ts", import.meta.url),
    "utf8",
  )

  assert.match(source, /import\.meta\.url/)
  for (const forbidden of [
    ".prepareUsers(",
    ".prepareProjects(",
    ".prepareAccess(",
    ".prepareSystemReferences(",
    ".prepareProjectReferences(",
    ".insert(",
    ".update(",
    ".delete(",
    ".rpc(",
    "auth.admin",
    "db reset",
    "runLocalReset",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden)
  }
})

test("hosted check CLI source is import-safe and contains no mutating or reset calls", () => {
  const source = readFileSync(
    new URL("../check-hosted-demo.ts", import.meta.url),
    "utf8",
  )

  assert.match(source, /import\.meta\.url/)
  for (const forbidden of [
    ".prepareUsers(",
    ".prepareProjects(",
    ".prepareAccess(",
    ".prepareSystemReferences(",
    ".prepareProjectReferences(",
    ".insert(",
    ".update(",
    ".delete(",
    ".rpc(",
    "auth.admin",
    "db reset",
    "runHostedReset",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden)
  }
})
