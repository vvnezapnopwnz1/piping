import assert from "node:assert/strict"
import test from "node:test"

import {
  DEMO_MANIFEST,
  DEMO_WELDER_EXPIRY_OFFSET_DAYS,
  DEMO_WPS_APPROVAL_OFFSET_DAYS,
  EMPTY_AT_DEMO_START,
  EXEMPT_FROM_EMPTY_AT_DEMO_START,
  SHOWCASE_PROJECT_CODE,
  addUtcDays,
  resolveDemoDates,
  type DemoManifest,
  type DemoReferences,
} from "./manifest"

const REFERENCE_COUNTS = {
  systemMaterialTypes: 3,
  filmQuantityRules: 2,
  utCalculationRules: 3,
  torquingRequirements: 3,
  subcontractors: 3,
  units: 2,
  areaClassifications: 2,
  pdsAreas: 3,
  serviceClasses: 2,
  weldTypes: 3,
  weldingProcedures: 4,
  welders: 4,
  welderWpsQualifications: 4,
  ndeMatrixRules: 4,
  pipingMaterialRecords: 5,
  thicknessFlangeRules: 3,
  reworkCodes: 3,
  jointCategories: 3,
  teams: 5,
  punchCodes: 1,
  systems: 2,
  subsystems: 3,
  lineServices: 3,
  pressureUnits: 1,
  locationCategories: 3,
  locations: 6,
  unitTimeReferences: 4,
  progressWeights: 3,
  assemblySettings: 1,
  spoolingMaterialTypes: 2,
  spoolingMaterialClasses: 3,
  spoolingChecklistItems: 5,
  ralCodes: 3,
  paintMatrixRules: 3,
  devices: 3,
  deviceAssignments: 2,
} as const satisfies Readonly<Record<keyof DemoReferences, number>>

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

const EXPECTED_COUNT_KEYS_ARE_EXACT: Equal<
  keyof DemoManifest["expectedCounts"]["referenceRows"],
  keyof DemoReferences
> = true

function assertUnique(values: readonly string[], label: string): void {
  assert.equal(new Set(values).size, values.length, `${label} must be unique`)
}

function byKey<T extends { readonly key: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((left, right) => left.key.localeCompare(right.key))
}

function assertCanonicalKeys<T extends { readonly key: string }>(
  rows: readonly T[],
  canonicalKey: (row: T) => string,
  label: string,
): void {
  const actualKeys = rows.map((row) => row.key)
  assert.deepEqual(
    actualKeys,
    rows.map(canonicalKey),
    `${label} keys must use the canonical format`,
  )
  assertUnique(actualKeys, `${label} keys`)
}

test("types expected reference counts with every manifest family exactly once", () => {
  assert.equal(EXPECTED_COUNT_KEYS_ARE_EXACT, true)
})

test("locks the demo projects and stable access identities", () => {
  assert.equal(DEMO_MANIFEST.setupProjectCode, "TRACK-SETUP-CHECK")
  assert.deepEqual(DEMO_MANIFEST.projects, {
    golden: {
      key: "golden",
      activityCode: "TRACK01-A",
      title: "PipeQC Demo Project",
      ownerName: "Demo Owner",
      contractorName: "Demo EPC",
      contractNumber: "DEMO-A-001",
      transitDays: 3,
      status: "active",
    },
    isolation: {
      key: "isolation",
      activityCode: "TRACK01-B",
      title: "PipeQC Isolation Control",
      ownerName: "Demo Owner",
      contractorName: "Demo EPC",
      contractNumber: "DEMO-B-001",
      transitDays: 3,
      status: "active",
    },
    showcase: {
      key: "showcase",
      activityCode: "SHOWCASE-1",
      title: "PipeQC Showcase Project",
      ownerName: "Demo Owner",
      contractorName: "Demo EPC",
      contractNumber: "DEMO-S-001",
      transitDays: 3,
      status: "active",
    },
  })

  assert.deepEqual(
    DEMO_MANIFEST.users.map((user) => ({
      key: user.key,
      email: user.email,
      platformAdmin: user.platformAdmin,
      memberships: user.memberships,
    })),
    [
      {
        key: "platform_admin",
        email: "track01.platform-admin@example.test",
        platformAdmin: true,
        memberships: [
          {
            projectCode: "TRACK01-A",
            role: "project_admin",
            source: "creator",
            functionalRoles: [],
          },
          {
            projectCode: "TRACK01-B",
            role: "project_admin",
            source: "creator",
            functionalRoles: [],
          },
          {
            projectCode: "SHOWCASE-1",
            role: "project_admin",
            source: "creator",
            functionalRoles: [],
          },
        ],
      },
      {
        key: "platform_observer",
        email: "track01.platform-observer@example.test",
        platformAdmin: true,
        memberships: [],
      },
      {
        key: "project_admin_a",
        email: "track01.project-admin-a@example.test",
        platformAdmin: false,
        memberships: [
          {
            projectCode: "TRACK01-A",
            role: "project_admin",
            source: "direct",
            functionalRoles: [],
          },
          {
            projectCode: "TRACK01-B",
            role: "project_reader",
            source: "direct",
            functionalRoles: [],
          },
          {
            projectCode: "SHOWCASE-1",
            role: "project_admin",
            source: "direct",
            functionalRoles: [],
          },
        ],
      },
      {
        key: "qc_editor",
        email: "track01.qc-editor@example.test",
        platformAdmin: false,
        memberships: [
          {
            projectCode: "TRACK01-A",
            role: "project_editor",
            source: "direct",
            functionalRoles: [
              "qc_engineer",
              "nde_inspector",
              "spooling_team",
              "fabrication_contributor",
              "erection_contributor",
              "tracking_operator",
            ],
          },
          {
            projectCode: "SHOWCASE-1",
            role: "project_editor",
            source: "direct",
            functionalRoles: [
              "qc_engineer",
              "nde_inspector",
              "spooling_team",
              "fabrication_contributor",
              "erection_contributor",
              "tracking_operator",
            ],
          },
        ],
      },
      {
        key: "reader_qc",
        email: "track01.reader-qc@example.test",
        platformAdmin: false,
        memberships: [
          {
            projectCode: "TRACK01-A",
            role: "project_reader",
            source: "direct",
            functionalRoles: ["qc_engineer"],
          },
        ],
      },
      {
        key: "nde_subcontractor",
        email: "track01.nde-subcontractor@example.test",
        platformAdmin: false,
        memberships: [
          {
            projectCode: "TRACK01-A",
            role: "subcontractor",
            source: "direct",
            functionalRoles: ["nde_inspector"],
            scopes: {
              subcontractorCodes: ["NDE-A"],
              pdsAreaCodes: ["PDS-100"],
            },
          },
        ],
      },
    ],
  )
  assert.equal(DEMO_MANIFEST.users.length, 6)
  assertUnique(
    DEMO_MANIFEST.users.map((user) => user.key),
    "user keys",
  )
  assertUnique(
    DEMO_MANIFEST.users.map((user) => user.email),
    "user emails",
  )
})

test("locks every rich reference family count, status, and stable key", () => {
  const referencesByFamily = new Map(
    Object.entries(DEMO_MANIFEST.references),
  )

  for (const [family, expectedCount] of Object.entries(REFERENCE_COUNTS)) {
    const rows = referencesByFamily.get(family)
    assert.ok(rows, `${family} must exist in the manifest`)
    assert.equal(rows.length, expectedCount, `${family} count`)
    assertUnique(
      rows.map((row) => row.key),
      `${family} keys`,
    )
    assert.ok(
      rows.every((row) => row.status === "active" || row.status === "inactive"),
      `${family} statuses`,
    )
  }

  assert.deepEqual(DEMO_MANIFEST.expectedCounts, {
    projects: 2,
    users: 6,
    referenceRows: {
      systemMaterialTypes: 3,
      filmQuantityRules: 2,
      utCalculationRules: 3,
      torquingRequirements: 3,
      subcontractors: 3,
      units: 2,
      areaClassifications: 2,
      pdsAreas: 3,
      serviceClasses: 2,
      weldTypes: 3,
      weldingProcedures: 4,
      welders: 4,
      welderWpsQualifications: 4,
      ndeMatrixRules: 4,
      pipingMaterialRecords: 5,
      thicknessFlangeRules: 3,
      reworkCodes: 3,
      jointCategories: 3,
      teams: 5,
      punchCodes: 1,
      systems: 2,
      subsystems: 3,
      lineServices: 3,
      pressureUnits: 1,
      locationCategories: 3,
      locations: 6,
      unitTimeReferences: 4,
      progressWeights: 13,
      assemblySettings: 1,
      spoolingMaterialTypes: 2,
      spoolingMaterialClasses: 3,
      spoolingChecklistItems: 5,
      ralCodes: 3,
      paintMatrixRules: 3,
      devices: 3,
      deviceAssignments: 2,
    },
  })
})

test("locks reference relationships and deliberate inactive lifecycle rows", () => {
  const references = DEMO_MANIFEST.references

  assert.deepEqual(
    references.systemMaterialTypes.map(({ code, status }) => ({ code, status })),
    [
      { code: "CS", status: "active" },
      { code: "SS316", status: "active" },
      { code: "DSS", status: "active" },
    ],
  )
  assert.deepEqual(
    references.filmQuantityRules.map(
      ({ minDiameterInches, maxDiameterInches, minThicknessMm, maxThicknessMm, filmCount }) =>
        ({ minDiameterInches, maxDiameterInches, minThicknessMm, maxThicknessMm, filmCount }),
    ),
    [
      {
        minDiameterInches: 1,
        maxDiameterInches: 3,
        minThicknessMm: 3,
        maxThicknessMm: 10,
        filmCount: 2,
      },
      {
        minDiameterInches: 4,
        maxDiameterInches: 12,
        minThicknessMm: 3,
        maxThicknessMm: 20,
        filmCount: 3,
      },
    ],
  )
  assert.deepEqual(
    references.utCalculationRules.map(
      ({ minDiameterInches, maxDiameterInches, pressureClass, coefficientA, coefficientB }) =>
        ({ minDiameterInches, maxDiameterInches, pressureClass, coefficientA, coefficientB }),
    ),
    [
      {
        minDiameterInches: 1,
        maxDiameterInches: 3,
        pressureClass: "150#",
        coefficientA: 1,
        coefficientB: 1,
      },
      {
        minDiameterInches: 4,
        maxDiameterInches: 8,
        pressureClass: "150#",
        coefficientA: 2,
        coefficientB: 3,
      },
      {
        minDiameterInches: 9,
        maxDiameterInches: 16,
        pressureClass: "300#",
        coefficientA: 3,
        coefficientB: 4,
      },
    ],
  )
  assert.deepEqual(
    references.torquingRequirements.map(({ code }) => code),
    ["MANUAL-TORQUE", "HYDRAULIC-TORQUE", "HYDRAULIC-TENSION"],
  )

  assert.deepEqual(
    references.subcontractors.map(({ code, status }) => ({ code, status })),
    [
      { code: "FAB-A", status: "active" },
      { code: "NDE-A", status: "active" },
      { code: "LEGACY-CONTRACTOR", status: "inactive" },
    ],
  )
  assert.deepEqual(
    references.areaClassifications.map(({ code, unitCode }) => ({ code, unitCode })),
    [
      { code: "PROCESS", unitCode: "U-100" },
      { code: "UTILITIES", unitCode: "U-200" },
    ],
  )
  assert.deepEqual(
    references.pdsAreas.map(
      ({ code, areaCode, shopSubcontractorCode, fieldSubcontractorCode }) => ({
        code,
        areaCode,
        shopSubcontractorCode,
        fieldSubcontractorCode,
      }),
    ),
    [
      {
        code: "PDS-100",
        areaCode: "PROCESS",
        shopSubcontractorCode: "FAB-A",
        fieldSubcontractorCode: "FAB-A",
      },
      {
        code: "PDS-200",
        areaCode: "UTILITIES",
        shopSubcontractorCode: "FAB-A",
        fieldSubcontractorCode: "FAB-A",
      },
      {
        code: "PDS-300",
        areaCode: "PROCESS",
        shopSubcontractorCode: "FAB-A",
        fieldSubcontractorCode: "FAB-A",
      },
    ],
  )
  assert.deepEqual(
    references.serviceClasses.map(({ code, materialTypeCode }) => ({ code, materialTypeCode })),
    [
      { code: "SC-CS150", materialTypeCode: "CS" },
      { code: "SC-SS300", materialTypeCode: "SS316" },
    ],
  )
  assert.deepEqual(
    references.weldTypes.map(({ code, countsDiameterInch }) => ({ code, countsDiameterInch })),
    [
      { code: "BW", countsDiameterInch: true },
      { code: "SW", countsDiameterInch: true },
      { code: "FW", countsDiameterInch: false },
    ],
  )

  assert.deepEqual(
    references.weldingProcedures.map(({ code, materialTypeCode, process, status }) => ({
      code,
      materialTypeCode,
      process,
      status,
    })),
    [
      { code: "WPS-CS-GTAW-01", materialTypeCode: "CS", process: "GTAW", status: "active" },
      { code: "WPS-CS-SMAW-02", materialTypeCode: "CS", process: "SMAW", status: "active" },
      { code: "WPS-SS-GTAW-03", materialTypeCode: "SS316", process: "GTAW", status: "active" },
      { code: "WPS-LEGACY-04", materialTypeCode: "CS", process: "SMAW", status: "inactive" },
    ],
  )
  assert.ok(
    references.weldingProcedures.every(
      (wps) =>
        wps.subcontractorCode === "FAB-A" &&
        wps.minDiameterInches === 1 &&
        wps.maxDiameterInches === 24 &&
        wps.minThicknessMm === 2 &&
        wps.maxThicknessMm === 30 &&
        wps.approvedOffsetDays === DEMO_WPS_APPROVAL_OFFSET_DAYS,
    ),
  )
  assert.deepEqual(
    references.welders.map(
      ({ code, fullName, subcontractorCode, expiresOffsetDays }) => ({
        code,
        fullName,
        subcontractorCode,
        expiresOffsetDays,
      }),
    ),
    [
      { code: "WDR-001", fullName: "Alex Morgan" },
      { code: "WDR-002", fullName: "Jordan Lee" },
      { code: "WDR-003", fullName: "Taylor Kim" },
      { code: "WDR-004", fullName: "Casey Brown" },
    ].map(({ code, fullName }) => ({
      code,
      fullName,
      subcontractorCode: "FAB-A",
      expiresOffsetDays: DEMO_WELDER_EXPIRY_OFFSET_DAYS,
    })),
  )
  const activeWpsCodes = new Set(
    references.weldingProcedures
      .filter((wps) => wps.status === "active")
      .map((wps) => wps.code),
  )
  for (const welder of references.welders) {
    assert.ok(
      references.welderWpsQualifications.some(
        (qualification) =>
          qualification.welderCode === welder.code &&
          activeWpsCodes.has(qualification.wpsCode),
      ),
      `${welder.code} must have an active WPS qualification`,
    )
  }

  assert.deepEqual(
    references.locations.map(({ code, categoryCode, status }) => ({ code, categoryCode, status })),
    [
      { code: "FAB-SHOP", categoryCode: "YARD", status: "active" },
      { code: "PAINT-SHOP", categoryCode: "YARD", status: "active" },
      { code: "LAYDOWN-A", categoryCode: "HOLD", status: "active" },
      { code: "SITE-A", categoryCode: "SITE", status: "active" },
      { code: "TEST-AREA", categoryCode: "SITE", status: "active" },
      { code: "OLD-YARD", categoryCode: "YARD", status: "inactive" },
    ],
  )
})

test("locks QC, traceability, construction, coating, and device references", () => {
  const references = DEMO_MANIFEST.references

  assert.deepEqual(
    references.ndeMatrixRules.map(
      ({ serviceClassCode, weldTypeCode, locationType, method, coveragePercent, materialTraceability, pwhtRequired }) => ({
        serviceClassCode,
        weldTypeCode,
        locationType,
        method,
        coveragePercent,
        materialTraceability,
        pwhtRequired,
      }),
    ),
    [
      { serviceClassCode: "SC-CS150", weldTypeCode: "BW", locationType: "shop", method: "RT", coveragePercent: 100, materialTraceability: true, pwhtRequired: false },
      { serviceClassCode: "SC-CS150", weldTypeCode: "BW", locationType: "field", method: "RT", coveragePercent: 0, materialTraceability: false, pwhtRequired: false },
      { serviceClassCode: "SC-CS150", weldTypeCode: "SW", locationType: "shop", method: "PT", coveragePercent: 100, materialTraceability: true, pwhtRequired: false },
      { serviceClassCode: "SC-SS300", weldTypeCode: "BW", locationType: "shop", method: "RT", coveragePercent: 100, materialTraceability: true, pwhtRequired: false },
    ],
  )
  assert.deepEqual(
    references.pipingMaterialRecords.map(({ identCode, heatNumber, mrrNumber, status }) => ({ identCode, heatNumber, mrrNumber, status })),
    [100, 200, 300, 400, 500].map((value) => ({
      identCode: `ID-DEMO-${value}`,
      heatNumber: `HEAT-${value}-A`,
      mrrNumber: `MRR-DEMO-${value}`,
      status: "active",
    })),
  )
  assert.deepEqual(
    references.thicknessFlangeRules.map(({ serviceClassCode, diameterInches, thicknessMm, pressureClass }) => ({ serviceClassCode, diameterInches, thicknessMm, pressureClass })),
    [
      { serviceClassCode: "SC-CS150", diameterInches: 4, thicknessMm: 6, pressureClass: "150#" },
      { serviceClassCode: "SC-CS150", diameterInches: 6, thicknessMm: 8.2, pressureClass: "150#" },
      { serviceClassCode: "SC-SS300", diameterInches: 8, thicknessMm: 10.3, pressureClass: "300#" },
    ],
  )
  assert.deepEqual(references.reworkCodes.map(({ code }) => code), ["POR", "LOF", "CRK"])
  assert.deepEqual(
    references.jointCategories.map(({ code, completionStage, jointDefinition, coefficient }) => ({ code, completionStage, jointDefinition, coefficient })),
    [
      { code: "X", completionStage: "before_pressure_test", jointDefinition: "Flange", coefficient: 0.5 },
      { code: "Y", completionStage: "before_precommissioning", jointDefinition: "Flange", coefficient: 0.5 },
      { code: "Z", completionStage: "after_precommissioning", jointDefinition: "Flange", coefficient: 0.5 },
    ],
  )
  assertUnique(references.jointCategories.map((category) => category.reason), "joint category reasons")
  // `assign_item_clearance` refuses any team whose type is not `finishing` (PQC97), so without
  // FINISH-A the X → Item Clearance demo path cannot be walked after a clean prepare.
  assert.deepEqual(
    references.teams.map(({ code, teamType }) => ({ code, teamType })),
    [
      { code: "LC-TEAM-A", teamType: "line_check" },
      { code: "FINISH-A", teamType: "finishing" },
      { code: "BLIND-TEAM-A", teamType: "blinding" },
      { code: "REINSTATE-TEAM-A", teamType: "reinstatement" },
      { code: "BOLT-TEAM-A", teamType: "jointer" },
    ],
  )
  assert.deepEqual(
    references.teams.map(({ code, description, status }) => ({ code, description, status })).filter((row) => row.code === "FINISH-A"),
    [{ code: "FINISH-A", description: "Punch item finishing team", status: "active" }],
  )
  // `record_line_check_result` refuses a punch code that is missing or inactive (PQC95).
  assert.deepEqual(
    references.punchCodes.map(({ code, description, status }) => ({ code, description, status })),
    [{ code: "X-DEMO", description: "Category X punch raised during Line Check", status: "active" }],
  )
  assert.deepEqual(references.systems.map(({ code }) => code), ["SYS-PROCESS", "SYS-UTILITIES"])
  assert.deepEqual(
    references.subsystems.map(({ code, systemCode }) => ({ code, systemCode })),
    [
      { code: "SUB-FEED", systemCode: "SYS-PROCESS" },
      { code: "SUB-PRODUCT", systemCode: "SYS-PROCESS" },
      { code: "SUB-AIR", systemCode: "SYS-UTILITIES" },
    ],
  )
  assert.deepEqual(references.lineServices.map(({ code }) => code), ["PROCESS", "AIR", "WATER"])
  assert.deepEqual(references.pressureUnits.map(({ code }) => code), ["bar"])
  assert.deepEqual(references.locationCategories.map(({ code }) => code), ["YARD", "SITE", "HOLD"])
  assert.deepEqual(
    references.unitTimeReferences.map(({ code, hours }) => ({ code, hours })),
    [
      { code: "FLANGE_JOINTING", hours: 10 },
      { code: "LINE_CHECK", hours: 8 },
      { code: "BLINDING", hours: 6 },
      { code: "REINSTATEMENT", hours: 7 },
    ],
  )
  assert.ok(references.unitTimeReferences.every((row) => row.standard.trim().length > 0))

  assert.deepEqual(references.assemblySettings, [
    { key: "assembly", enabled: false, status: "active" },
  ])
  assert.deepEqual(references.spoolingMaterialTypes.map(({ code }) => code), ["CS", "SS"])
  assert.deepEqual(
    references.spoolingMaterialClasses.map(({ code, materialTypeCode }) => ({ code, materialTypeCode })),
    [
      { code: "CS150", materialTypeCode: "CS" },
      { code: "CS300", materialTypeCode: "CS" },
      { code: "SS300", materialTypeCode: "SS" },
    ],
  )
  assert.deepEqual(
    references.spoolingChecklistItems.map(({ code, required, sortOrder }) => ({ code, required, sortOrder })),
    ["DRAWING", "MATERIAL", "FITUP", "WELD", "DIMENSION"].map((code, index) => ({
      code,
      required: true,
      sortOrder: (index + 1) * 10,
    })),
  )
  assert.deepEqual(
    references.ralCodes.map(({ lineServiceCode, colorCode, ralCode }) => ({
      lineServiceCode,
      colorCode,
      ralCode,
    })),
    [
      {
        lineServiceCode: "PROCESS",
        colorCode: "WHITE ALUMINIUM",
        ralCode: "RAL 9006",
      },
      {
        lineServiceCode: "AIR",
        colorCode: "SKY BLUE",
        ralCode: "RAL 5015",
      },
      {
        lineServiceCode: "WATER",
        colorCode: "YELLOW GREEN",
        ralCode: "RAL 6018",
      },
    ],
  )
  assert.deepEqual(
    references.paintMatrixRules.map(({ lineServiceCode, ralCode, blastingRequired, primerRequired, intermediateCoats, finalCoats, totalDftMicrons }) => ({ lineServiceCode, ralCode, blastingRequired, primerRequired, intermediateCoats, finalCoats, totalDftMicrons })),
    [
      { lineServiceCode: "PROCESS", ralCode: "RAL 9006", blastingRequired: true, primerRequired: true, intermediateCoats: 1, finalCoats: 1, totalDftMicrons: 240 },
      { lineServiceCode: "AIR", ralCode: "RAL 5015", blastingRequired: true, primerRequired: true, intermediateCoats: 1, finalCoats: 1, totalDftMicrons: 200 },
      { lineServiceCode: "WATER", ralCode: "RAL 6018", blastingRequired: true, primerRequired: true, intermediateCoats: 1, finalCoats: 1, totalDftMicrons: 220 },
    ],
  )
  assert.deepEqual(references.devices.map(({ code, status }) => ({ code, status })), [
    { code: "SCN-001", status: "active" },
    { code: "SCN-002", status: "active" },
    { code: "SCN-003", status: "active" },
  ])
  assert.deepEqual(
    references.deviceAssignments.map(({ deviceCode, userKey }) => ({ deviceCode, userKey })),
    [
      { deviceCode: "SCN-001", userKey: "qc_editor" },
      { deviceCode: "SCN-002", userKey: "project_admin_a" },
    ],
  )
  assert.equal(
    new Set<string>(
      references.deviceAssignments.map((assignment) => assignment.deviceCode),
    ).has("SCN-003"),
    false,
  )
})

test("locks three active progress phases at exactly 100 percent", () => {
  assert.deepEqual(
    DEMO_MANIFEST.references.progressWeights.map((phase) => ({
      phase: phase.phase,
      status: phase.status,
      items: phase.items.map(({ code, weight }) => ({ code, weight })),
    })),
    [
      {
        phase: "prefabrication",
        status: "active",
        items: [
          { code: "spool_fabrication", weight: 30 },
          { code: "material_check", weight: 20 },
          { code: "weld_progress", weight: 30 },
          { code: "qc_release", weight: 20 },
        ],
      },
      {
        phase: "painting",
        status: "active",
        items: [
          { code: "blasting", weight: 20 },
          { code: "primer", weight: 20 },
          { code: "intermediate", weight: 30 },
          { code: "final", weight: 30 },
        ],
      },
      {
        phase: "erection",
        status: "active",
        items: [
          { code: "to_site", weight: 20 },
          { code: "material_check", weight: 20 },
          { code: "weld_progress", weight: 30 },
          { code: "supported", weight: 15 },
          { code: "welded_bolted", weight: 15 },
        ],
      },
    ],
  )

  for (const phase of DEMO_MANIFEST.references.progressWeights) {
    assert.equal(
      phase.items.reduce((total, item) => total + item.weight, 0),
      100,
      `${phase.phase} total`,
    )
    assertUnique(
      phase.items.map((item) => item.key),
      `${phase.phase} progress item keys`,
    )
  }
})

test("locks the four-role SpoolGen package and its 20 staging rows", () => {
  assert.deepEqual(DEMO_MANIFEST.spoolgen.roles, ["weld", "trace", "bolt", "supp"])
  assert.deepEqual(DEMO_MANIFEST.spoolgen.hashes, {
    weld: "66c70e97cd1feebdc772b97f27bfba538d99b8cfd5264bb89597d2ebd718f926",
    trace: "3ed733edd885e03cd72509856cac9c3f918ceb80a2c2f0ce9c39f5d519448a53",
    bolt: "8377a6bffe8821c3056be08d5d272d0b07220e087499393b8aa8879c93e4ce7b",
    supp: "4ec894574e82bf27950e3d2377dc2b4f013100c561072e9e34107e64df8cbf19",
  })
  assert.equal(DEMO_MANIFEST.spoolgen.expectedStagingRows, 20)
  assert.deepEqual(DEMO_MANIFEST.spoolgen.expectedCounts, {
    isometric: 2,
    spool: 3,
    weld_joint: 5,
    support: 2,
    flange_joint: 3,
    material: 5,
  })

  const entities = DEMO_MANIFEST.spoolgen.entities
  assert.equal(entities.isometrics.length, 2)
  assert.equal(entities.spools.length, 3)
  assert.equal(entities.weldJoints.length, 5)
  assert.equal(entities.supports.length, 2)
  assert.equal(entities.flangeJoints.length, 3)
  assert.equal(entities.materials.length, 5)
  assert.equal(
    Object.values(entities).reduce((total, rows) => total + rows.length, 0),
    20,
  )

  const isometricParentKeys = new Set<string>(
    entities.isometrics.map((row) => row.key),
  )
  const spoolParentKeys = new Set<string>(entities.spools.map((row) => row.key))
  for (const spool of entities.spools) {
    assert.ok(
      isometricParentKeys.has(`${spool.isometricNumber}|${spool.revision}`),
      `${spool.key} must resolve an isometric parent`,
    )
  }
  const spoolChildren = [
    ...entities.weldJoints.map((row) => ({ family: "weld", row })),
    ...entities.materials.map((row) => ({ family: "material", row })),
    ...entities.flangeJoints.map((row) => ({ family: "flange", row })),
    ...entities.supports.map((row) => ({ family: "support", row })),
  ]
  for (const { family, row } of spoolChildren) {
    assert.ok(
      spoolParentKeys.has(
        `${row.isometricNumber}|${row.revision}|${row.spoolNumber}`,
      ),
      `${family} ${row.key} must resolve a spool parent`,
    )
  }

  const weldTypeCodes = new Set(
    DEMO_MANIFEST.references.weldTypes.map((row) => row.code),
  )
  for (const weld of entities.weldJoints) {
    assert.ok(
      weldTypeCodes.has(weld.weldTypeCode),
      `${weld.key} must resolve weld type ${weld.weldTypeCode}`,
    )
  }
  for (const material of entities.materials) {
    assert.equal(
      DEMO_MANIFEST.references.pipingMaterialRecords.filter(
        (row) => row.identCode === material.identCode,
      ).length,
      1,
      `${material.key} must resolve one exact PML ident`,
    )
  }

  assert.deepEqual(
    byKey(entities.isometrics),
    byKey([
      { key: "ISO-DEMO-1001|R0", isometricNumber: "ISO-DEMO-1001", revision: "R0", pdsAreaCode: "PDS-100", serviceClassCode: "SC-CS150", lineNumber: "P-1001", sheetNumber: "" },
      { key: "ISO-DEMO-2001|R0", isometricNumber: "ISO-DEMO-2001", revision: "R0", pdsAreaCode: "PDS-200", serviceClassCode: "SC-CS150", lineNumber: "P-2001", sheetNumber: "" },
    ]),
  )
  assert.deepEqual(
    byKey(entities.spools),
    byKey([
      { key: "ISO-DEMO-1001|R0|SP-DEMO-1001-A", isometricNumber: "ISO-DEMO-1001", revision: "R0", spoolNumber: "SP-DEMO-1001-A", sequenceNumber: "1", spoolWeightKg: "120.5", materialClass: "CS150" },
      { key: "ISO-DEMO-1001|R0|SP-DEMO-1001-B", isometricNumber: "ISO-DEMO-1001", revision: "R0", spoolNumber: "SP-DEMO-1001-B", sequenceNumber: "2", spoolWeightKg: "98.0", materialClass: "CS150" },
      { key: "ISO-DEMO-2001|R0|SP-DEMO-2001-A", isometricNumber: "ISO-DEMO-2001", revision: "R0", spoolNumber: "SP-DEMO-2001-A", sequenceNumber: "3", spoolWeightKg: "110.0", materialClass: "CS150" },
    ]),
  )
  assert.deepEqual(
    byKey(entities.weldJoints),
    byKey([
      { key: "ISO-DEMO-1001|R0|WJ-DEMO-1001-01", isometricNumber: "ISO-DEMO-1001", revision: "R0", spoolNumber: "SP-DEMO-1001-A", weldNumber: "WJ-DEMO-1001-01", weldTypeCode: "BW", locationType: "shop", serviceClassCode: "SC-CS150", diameterInches: "6", thicknessMm: "8.2" },
      { key: "ISO-DEMO-1001|R0|WJ-DEMO-1001-02", isometricNumber: "ISO-DEMO-1001", revision: "R0", spoolNumber: "SP-DEMO-1001-A", weldNumber: "WJ-DEMO-1001-02", weldTypeCode: "SW", locationType: "shop", serviceClassCode: "SC-CS150", diameterInches: "4", thicknessMm: "6.0" },
      { key: "ISO-DEMO-1001|R0|WJ-DEMO-1001-03", isometricNumber: "ISO-DEMO-1001", revision: "R0", spoolNumber: "SP-DEMO-1001-B", weldNumber: "WJ-DEMO-1001-03", weldTypeCode: "BW", locationType: "shop", serviceClassCode: "SC-CS150", diameterInches: "4", thicknessMm: "6.0" },
      { key: "ISO-DEMO-2001|R0|WJ-DEMO-2001-01", isometricNumber: "ISO-DEMO-2001", revision: "R0", spoolNumber: "SP-DEMO-2001-A", weldNumber: "WJ-DEMO-2001-01", weldTypeCode: "BW", locationType: "field", serviceClassCode: "SC-CS150", diameterInches: "6", thicknessMm: "8.2" },
      { key: "ISO-DEMO-2001|R0|WJ-DEMO-2001-02", isometricNumber: "ISO-DEMO-2001", revision: "R0", spoolNumber: "SP-DEMO-2001-A", weldNumber: "WJ-DEMO-2001-02", weldTypeCode: "BW", locationType: "field", serviceClassCode: "SC-CS150", diameterInches: "6", thicknessMm: "8.2" },
    ]),
  )
  assert.deepEqual(
    byKey(entities.supports),
    byKey([
      { key: "ISO-DEMO-1001|R0|SUP-DEMO-1001-01", isometricNumber: "ISO-DEMO-1001", revision: "R0", spoolNumber: "SP-DEMO-1001-A", supportNumber: "SUP-DEMO-1001-01", supportType: "GUIDE", quantity: "2" },
      { key: "ISO-DEMO-2001|R0|SUP-DEMO-2001-01", isometricNumber: "ISO-DEMO-2001", revision: "R0", spoolNumber: "SP-DEMO-2001-A", supportNumber: "SUP-DEMO-2001-01", supportType: "REST", quantity: "1" },
    ]),
  )
  assert.deepEqual(
    byKey(entities.flangeJoints),
    byKey([
      { key: "ISO-DEMO-1001|R0|FLG-DEMO-1001-01", isometricNumber: "ISO-DEMO-1001", revision: "R0", spoolNumber: "SP-DEMO-1001-A", flangeNumber: "FLG-DEMO-1001-01", pressureClass: "150#", diameterInches: "6", boltSize: '3/4"', boltQuantity: "8", jointType: "Flange" },
      { key: "ISO-DEMO-1001|R0|FLG-DEMO-1001-02", isometricNumber: "ISO-DEMO-1001", revision: "R0", spoolNumber: "SP-DEMO-1001-A", flangeNumber: "FLG-DEMO-1001-02", pressureClass: "150#", diameterInches: "6", boltSize: '3/4"', boltQuantity: "8", jointType: "Flange" },
      { key: "ISO-DEMO-1001|R0|FLG-DEMO-1001-03", isometricNumber: "ISO-DEMO-1001", revision: "R0", spoolNumber: "SP-DEMO-1001-B", flangeNumber: "FLG-DEMO-1001-03", pressureClass: "150#", diameterInches: "4", boltSize: '5/8"', boltQuantity: "8", jointType: "Flange" },
    ]),
  )
  assert.deepEqual(
    byKey(entities.materials),
    byKey([
      { key: "ISO-DEMO-1001|R0|SP-DEMO-1001-A|ID-DEMO-100", isometricNumber: "ISO-DEMO-1001", revision: "R0", spoolNumber: "SP-DEMO-1001-A", identCode: "ID-DEMO-100", description: "Carbon steel pipe 6in", quantity: "2", unit: "EA", traceNumber: "" },
      { key: "ISO-DEMO-1001|R0|SP-DEMO-1001-A|ID-DEMO-200", isometricNumber: "ISO-DEMO-1001", revision: "R0", spoolNumber: "SP-DEMO-1001-A", identCode: "ID-DEMO-200", description: "Carbon steel elbow 6in", quantity: "1", unit: "EA", traceNumber: "" },
      { key: "ISO-DEMO-1001|R0|SP-DEMO-1001-B|ID-DEMO-300", isometricNumber: "ISO-DEMO-1001", revision: "R0", spoolNumber: "SP-DEMO-1001-B", identCode: "ID-DEMO-300", description: "Carbon steel pipe 4in", quantity: "2", unit: "EA", traceNumber: "" },
      { key: "ISO-DEMO-2001|R0|SP-DEMO-2001-A|ID-DEMO-400", isometricNumber: "ISO-DEMO-2001", revision: "R0", spoolNumber: "SP-DEMO-2001-A", identCode: "ID-DEMO-400", description: "Field weld fitting 6in", quantity: "2", unit: "EA", traceNumber: "" },
      { key: "ISO-DEMO-2001|R0|SP-DEMO-2001-A|ID-DEMO-500", isometricNumber: "ISO-DEMO-2001", revision: "R0", spoolNumber: "SP-DEMO-2001-A", identCode: "ID-DEMO-500", description: "Pipe support material", quantity: "1", unit: "EA", traceNumber: "" },
    ]),
  )
})

test("locks all project-scoped tables that must be empty at demo start", () => {
  assert.deepEqual(EMPTY_AT_DEMO_START, [
    "import_jobs",
    "isometrics",
    "construction_progress_events",
    "material_check_records",
    "weld_progress_records",
    "pwht_results",
    "paint_progress_records",
    "quality_release_records",
    "laydown_records",
    "support_progress_records",
    "nde_batches",
    "nde_results",
    "spool_location_events",
    "flange_progress_records",
    "flange_reinstatement_records",
    "test_packs",
    "line_check_results",
    "punch_items",
    "blinding_records",
    "pressure_test_requests",
    "pressure_test_stage_events",
  ])
  assert.deepEqual(DEMO_MANIFEST.emptyAtDemoStart, EMPTY_AT_DEMO_START)
  assertUnique(EMPTY_AT_DEMO_START, "empty-at-start table names")
})

test("the manifest declares a showcase project that is exempt from the empty-at-start rule", () => {
  assert.equal(DEMO_MANIFEST.projects.showcase.activityCode, "SHOWCASE-1")
  assert.equal(SHOWCASE_PROJECT_CODE, "SHOWCASE-1")
  assert.notEqual(
    DEMO_MANIFEST.projects.showcase.activityCode,
    DEMO_MANIFEST.projects.golden.activityCode,
  )
  assert.equal(EXEMPT_FROM_EMPTY_AT_DEMO_START.includes(SHOWCASE_PROJECT_CODE), true)
  assert.equal(
    (EXEMPT_FROM_EMPTY_AT_DEMO_START as readonly string[]).includes("TRACK01-A"),
    false,
  )
})

test("uses canonical keys independently in every manifest family", () => {
  const references = DEMO_MANIFEST.references

  assertCanonicalKeys(references.systemMaterialTypes, (row) => row.code, "system material types")
  assertCanonicalKeys(
    references.filmQuantityRules,
    (row) =>
      `${row.minDiameterInches}-${row.maxDiameterInches}in|${row.minThicknessMm}-${row.maxThicknessMm}mm`,
    "film quantity rules",
  )
  assertCanonicalKeys(
    references.utCalculationRules,
    (row) => `${row.minDiameterInches}-${row.maxDiameterInches}in|${row.pressureClass}`,
    "UT calculation rules",
  )
  assertCanonicalKeys(references.torquingRequirements, (row) => row.code, "torquing requirements")
  assertCanonicalKeys(references.subcontractors, (row) => row.code, "subcontractors")
  assertCanonicalKeys(references.units, (row) => row.code, "units")
  assertCanonicalKeys(
    references.areaClassifications,
    (row) => `${row.unitCode}|${row.code}`,
    "area classifications",
  )
  assertCanonicalKeys(
    references.pdsAreas,
    (row) => `${row.areaCode}|${row.code}`,
    "PDS areas",
  )
  assertCanonicalKeys(references.serviceClasses, (row) => row.code, "service classes")
  assertCanonicalKeys(references.weldTypes, (row) => row.code, "weld types")
  assertCanonicalKeys(references.weldingProcedures, (row) => row.code, "welding procedures")
  assertCanonicalKeys(references.welders, (row) => row.code, "welders")
  assertCanonicalKeys(
    references.welderWpsQualifications,
    (row) => `${row.welderCode}|${row.wpsCode}`,
    "welder WPS qualifications",
  )
  assertCanonicalKeys(
    references.ndeMatrixRules,
    (row) => `${row.serviceClassCode}|${row.weldTypeCode}|${row.locationType}`,
    "NDE matrix rules",
  )
  assertCanonicalKeys(
    references.pipingMaterialRecords,
    (row) => `${row.identCode}|${row.heatNumber}`,
    "piping material records",
  )
  assertCanonicalKeys(
    references.thicknessFlangeRules,
    (row) => `${row.serviceClassCode}|${row.diameterInches}in|${row.pressureClass}`,
    "thickness flange rules",
  )
  assertCanonicalKeys(references.reworkCodes, (row) => row.code, "rework codes")
  assertCanonicalKeys(references.jointCategories, (row) => row.code, "joint categories")
  assertCanonicalKeys(references.teams, (row) => row.code, "teams")
  assertCanonicalKeys(references.punchCodes, (row) => row.code, "punch codes")
  assertCanonicalKeys(references.systems, (row) => row.code, "systems")
  assertCanonicalKeys(
    references.subsystems,
    (row) => `${row.systemCode}|${row.code}`,
    "subsystems",
  )
  assertCanonicalKeys(references.lineServices, (row) => row.code, "line services")
  assertCanonicalKeys(references.pressureUnits, (row) => row.code, "pressure units")
  assertCanonicalKeys(references.locationCategories, (row) => row.code, "location categories")
  assertCanonicalKeys(
    references.locations,
    (row) => `${row.categoryCode}|${row.code}`,
    "locations",
  )
  assertCanonicalKeys(references.unitTimeReferences, (row) => row.code, "unit time references")
  assertCanonicalKeys(references.progressWeights, (row) => row.phase, "progress phases")
  for (const phase of references.progressWeights) {
    const items: readonly { readonly key: string; readonly code: string }[] =
      phase.items
    assertCanonicalKeys(
      items,
      (item) => `${phase.phase}|${item.code}`,
      `${phase.phase} progress items`,
    )
  }
  assertCanonicalKeys(references.assemblySettings, () => "assembly", "assembly settings")
  assertCanonicalKeys(references.spoolingMaterialTypes, (row) => row.code, "spooling material types")
  assertCanonicalKeys(references.spoolingMaterialClasses, (row) => row.code, "spooling material classes")
  assertCanonicalKeys(references.spoolingChecklistItems, (row) => row.code, "spooling checklist items")
  assertCanonicalKeys(
    references.ralCodes,
    (row) => `${row.lineServiceCode}|${row.ralCode}`,
    "RAL codes",
  )
  assertCanonicalKeys(
    references.paintMatrixRules,
    (row) => `${row.lineServiceCode}|${row.ralCode}`,
    "paint matrix rules",
  )
  assertCanonicalKeys(references.devices, (row) => row.code, "devices")
  assertCanonicalKeys(
    references.deviceAssignments,
    (row) => `${row.deviceCode}|${row.userKey}`,
    "device assignments",
  )

  const entities = DEMO_MANIFEST.spoolgen.entities
  assertCanonicalKeys(
    entities.isometrics,
    (row) => `${row.isometricNumber}|${row.revision}`,
    "SpoolGen isometrics",
  )
  assertCanonicalKeys(
    entities.spools,
    (row) => `${row.isometricNumber}|${row.revision}|${row.spoolNumber}`,
    "SpoolGen spools",
  )
  assertCanonicalKeys(
    entities.weldJoints,
    (row) => `${row.isometricNumber}|${row.revision}|${row.weldNumber}`,
    "SpoolGen weld joints",
  )
  assertCanonicalKeys(
    entities.supports,
    (row) => `${row.isometricNumber}|${row.revision}|${row.supportNumber}`,
    "SpoolGen supports",
  )
  assertCanonicalKeys(
    entities.flangeJoints,
    (row) => `${row.isometricNumber}|${row.revision}|${row.flangeNumber}`,
    "SpoolGen flange joints",
  )
  assertCanonicalKeys(
    entities.materials,
    (row) =>
      `${row.isometricNumber}|${row.revision}|${row.spoolNumber}|${row.identCode}`,
    "SpoolGen materials",
  )
})

test("uses stable codes rather than hard-coded UUID parent references", () => {
  assert.doesNotMatch(
    JSON.stringify(DEMO_MANIFEST),
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
  )

  const descriptions = JSON.stringify(DEMO_MANIFEST).match(/"description":"([^"]*)"/g) ?? []
  assert.ok(descriptions.length > 0)
  assert.ok(descriptions.every((description) => !/Track\s*\d+/i.test(description)))
})

test("resolves dates from UTC preparation day without local timezone drift", () => {
  const base = new Date("2026-08-10T23:30:00.000Z")

  assert.equal(DEMO_WPS_APPROVAL_OFFSET_DAYS, -180)
  assert.equal(DEMO_WELDER_EXPIRY_OFFSET_DAYS, 365)
  assert.equal(addUtcDays(base, DEMO_WPS_APPROVAL_OFFSET_DAYS), "2026-02-11")
  assert.equal(addUtcDays(base, DEMO_WELDER_EXPIRY_OFFSET_DAYS), "2027-08-10")
  assert.deepEqual(resolveDemoDates(base), {
    approvedOn: "2026-02-11",
    welderExpiresOn: "2027-08-10",
  })
})
