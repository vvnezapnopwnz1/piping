export type DemoStatus = "active" | "inactive"

export const DEMO_WPS_APPROVAL_OFFSET_DAYS = -180
export const DEMO_WELDER_EXPIRY_OFFSET_DAYS = 365

interface ManifestRow {
  readonly key: string
  readonly status: DemoStatus
}

interface DescribedRow extends ManifestRow {
  readonly description: string
}

interface CodedRow extends DescribedRow {
  readonly code: string
}

export interface DemoProject extends ManifestRow {
  readonly activityCode: string
  readonly title: string
  readonly ownerName: string
  readonly contractorName: string
  readonly contractNumber: string
  readonly transitDays: number
}

export type DemoProjectRole =
  | "project_admin"
  | "project_editor"
  | "project_reader"
  | "subcontractor"

export type DemoFunctionalRole =
  | "qc_engineer"
  | "nde_inspector"
  | "spooling_team"
  | "fabrication_contributor"
  | "erection_contributor"
  | "tracking_operator"

export interface DemoMembership {
  readonly projectCode: string
  readonly role: DemoProjectRole
  readonly source: "creator" | "direct"
  readonly functionalRoles: readonly DemoFunctionalRole[]
  readonly scopes?: {
    readonly subcontractorCodes: readonly string[]
    readonly pdsAreaCodes: readonly string[]
  }
}

export interface DemoUser extends ManifestRow {
  readonly email: string
  readonly fullName: string
  readonly platformAdmin: boolean
  readonly memberships: readonly DemoMembership[]
}

interface FilmQuantityRule extends DescribedRow {
  readonly minDiameterInches: number
  readonly maxDiameterInches: number
  readonly minThicknessMm: number
  readonly maxThicknessMm: number
  readonly filmCount: number
}

interface UtCalculationRule extends DescribedRow {
  readonly minDiameterInches: number
  readonly maxDiameterInches: number
  readonly pressureClass: string
  readonly coefficientA: number
  readonly coefficientB: number
}

interface AreaClassification extends CodedRow {
  readonly unitCode: string
}

interface PdsArea extends CodedRow {
  readonly areaCode: string
  readonly shopSubcontractorCode: string
  readonly fieldSubcontractorCode: string
}

interface ServiceClass extends CodedRow {
  readonly materialTypeCode: string
}

interface WeldType extends CodedRow {
  readonly countsDiameterInch: boolean
}

interface WeldingProcedure extends CodedRow {
  readonly subcontractorCode: string
  readonly materialTypeCode: string
  readonly process: "GTAW" | "SMAW"
  readonly revision: string
  readonly minDiameterInches: number
  readonly maxDiameterInches: number
  readonly minThicknessMm: number
  readonly maxThicknessMm: number
  readonly approvedOffsetDays: number
}

interface Welder extends CodedRow {
  readonly fullName: string
  readonly subcontractorCode: string
  readonly expiresOffsetDays: number
}

interface WelderWpsQualification extends ManifestRow {
  readonly welderCode: string
  readonly wpsCode: string
}

interface NdeMatrixRule extends DescribedRow {
  readonly serviceClassCode: string
  readonly weldTypeCode: string
  readonly locationType: "shop" | "field"
  readonly method: "RT" | "PT"
  readonly coveragePercent: number
  readonly materialTraceability: boolean
  readonly pwhtRequired: boolean
}

interface PipingMaterialRecord extends DescribedRow {
  readonly identCode: string
  readonly heatNumber: string
  readonly mrrNumber: string
}

interface ThicknessFlangeRule extends DescribedRow {
  readonly serviceClassCode: string
  readonly diameterInches: number
  readonly thicknessMm: number
  readonly pressureClass: string
}

interface JointCategory extends CodedRow {
  readonly completionStage:
    | "before_pressure_test"
    | "before_precommissioning"
    | "after_precommissioning"
  readonly jointDefinition: "Flange"
  readonly reason: string
  readonly coefficient: number
}

interface Team extends CodedRow {
  readonly teamType:
    | "line_check"
    | "finishing"
    | "blinding"
    | "reinstatement"
    | "jointer"
}

interface Subsystem extends CodedRow {
  readonly systemCode: string
}

interface Location extends CodedRow {
  readonly categoryCode: string
}

interface UnitTimeReference extends CodedRow {
  readonly hours: number
  readonly standard: string
}

interface ProgressWeightItem {
  readonly key: string
  readonly code: string
  readonly description: string
  readonly weight: number
}

interface ProgressWeightPhase extends DescribedRow {
  readonly phase: "prefabrication" | "painting" | "erection"
  readonly items: readonly ProgressWeightItem[]
}

interface AssemblySetting extends ManifestRow {
  readonly enabled: boolean
}

interface SpoolingMaterialClass extends CodedRow {
  readonly materialTypeCode: string
}

interface SpoolingChecklistItem extends CodedRow {
  readonly required: boolean
  readonly sortOrder: number
}

interface RalCode extends DescribedRow {
  readonly lineServiceCode: string
  readonly colorCode: string
  readonly ralCode: string
}

interface PaintMatrixRule extends DescribedRow {
  readonly lineServiceCode: string
  readonly ralCode: string
  readonly blastingRequired: boolean
  readonly primerRequired: boolean
  readonly intermediateCoats: number
  readonly finalCoats: number
  readonly totalDftMicrons: number
}

interface DeviceAssignment extends ManifestRow {
  readonly deviceCode: string
  readonly userKey: string
}

export interface DemoReferences {
  readonly systemMaterialTypes: readonly CodedRow[]
  readonly filmQuantityRules: readonly FilmQuantityRule[]
  readonly utCalculationRules: readonly UtCalculationRule[]
  readonly torquingRequirements: readonly CodedRow[]
  readonly subcontractors: readonly CodedRow[]
  readonly units: readonly CodedRow[]
  readonly areaClassifications: readonly AreaClassification[]
  readonly pdsAreas: readonly PdsArea[]
  readonly serviceClasses: readonly ServiceClass[]
  readonly weldTypes: readonly WeldType[]
  readonly weldingProcedures: readonly WeldingProcedure[]
  readonly welders: readonly Welder[]
  readonly welderWpsQualifications: readonly WelderWpsQualification[]
  readonly ndeMatrixRules: readonly NdeMatrixRule[]
  readonly pipingMaterialRecords: readonly PipingMaterialRecord[]
  readonly thicknessFlangeRules: readonly ThicknessFlangeRule[]
  readonly reworkCodes: readonly CodedRow[]
  readonly jointCategories: readonly JointCategory[]
  readonly teams: readonly Team[]
  readonly punchCodes: readonly CodedRow[]
  readonly systems: readonly CodedRow[]
  readonly subsystems: readonly Subsystem[]
  readonly lineServices: readonly CodedRow[]
  readonly pressureUnits: readonly CodedRow[]
  readonly locationCategories: readonly CodedRow[]
  readonly locations: readonly Location[]
  readonly unitTimeReferences: readonly UnitTimeReference[]
  readonly progressWeights: readonly ProgressWeightPhase[]
  readonly assemblySettings: readonly AssemblySetting[]
  readonly spoolingMaterialTypes: readonly CodedRow[]
  readonly spoolingMaterialClasses: readonly SpoolingMaterialClass[]
  readonly spoolingChecklistItems: readonly SpoolingChecklistItem[]
  readonly ralCodes: readonly RalCode[]
  readonly paintMatrixRules: readonly PaintMatrixRule[]
  readonly devices: readonly CodedRow[]
  readonly deviceAssignments: readonly DeviceAssignment[]
}

interface SpoolgenIsometric {
  readonly key: string
  readonly isometricNumber: string
  readonly revision: string
  readonly pdsAreaCode: string
  readonly serviceClassCode: string
  readonly lineNumber: string
  readonly sheetNumber: string
}

interface SpoolgenSpool {
  readonly key: string
  readonly isometricNumber: string
  readonly revision: string
  readonly spoolNumber: string
  readonly sequenceNumber: string
  readonly spoolWeightKg: string
  readonly materialClass: string
}

interface SpoolgenWeldJoint {
  readonly key: string
  readonly isometricNumber: string
  readonly revision: string
  readonly spoolNumber: string
  readonly weldNumber: string
  readonly weldTypeCode: string
  readonly locationType: "shop" | "field"
  readonly serviceClassCode: string
  readonly diameterInches: string
  readonly thicknessMm: string
}

interface SpoolgenSupport {
  readonly key: string
  readonly isometricNumber: string
  readonly revision: string
  readonly spoolNumber: string
  readonly supportNumber: string
  readonly supportType: string
  readonly quantity: string
}

interface SpoolgenFlangeJoint {
  readonly key: string
  readonly isometricNumber: string
  readonly revision: string
  readonly spoolNumber: string
  readonly flangeNumber: string
  readonly pressureClass: string
  readonly diameterInches: string
  readonly boltSize: string
  readonly boltQuantity: string
  readonly jointType: string
}

interface SpoolgenMaterial {
  readonly key: string
  readonly isometricNumber: string
  readonly revision: string
  readonly spoolNumber: string
  readonly identCode: string
  readonly description: string
  readonly quantity: string
  readonly unit: string
  readonly traceNumber: string
}

export interface DemoSpoolgenManifest {
  readonly roles: readonly ["weld", "trace", "bolt", "supp"]
  readonly hashes: {
    readonly weld: string
    readonly trace: string
    readonly bolt: string
    readonly supp: string
  }
  readonly expectedStagingRows: 20
  readonly expectedCounts: {
    readonly isometric: 2
    readonly spool: 3
    readonly weld_joint: 5
    readonly support: 2
    readonly flange_joint: 3
    readonly material: 5
  }
  readonly entities: {
    readonly isometrics: readonly SpoolgenIsometric[]
    readonly spools: readonly SpoolgenSpool[]
    readonly weldJoints: readonly SpoolgenWeldJoint[]
    readonly supports: readonly SpoolgenSupport[]
    readonly flangeJoints: readonly SpoolgenFlangeJoint[]
    readonly materials: readonly SpoolgenMaterial[]
  }
}

export const EMPTY_AT_DEMO_START = [
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
] as const

export interface DemoManifest {
  readonly setupProjectCode: string
  readonly projects: {
    readonly golden: DemoProject
    readonly isolation: DemoProject
  }
  readonly users: readonly DemoUser[]
  readonly references: DemoReferences
  readonly expectedCounts: {
    readonly projects: number
    readonly users: number
    readonly referenceRows: Readonly<Record<keyof DemoReferences, number>>
  }
  readonly spoolgen: DemoSpoolgenManifest
  readonly emptyAtDemoStart: typeof EMPTY_AT_DEMO_START
}

export function addUtcDays(base: Date, offset: number): string {
  const value = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()),
  )
  value.setUTCDate(value.getUTCDate() + offset)
  return value.toISOString().slice(0, 10)
}

export function resolveDemoDates(base: Date): {
  readonly approvedOn: string
  readonly welderExpiresOn: string
} {
  return {
    approvedOn: addUtcDays(base, DEMO_WPS_APPROVAL_OFFSET_DAYS),
    welderExpiresOn: addUtcDays(base, DEMO_WELDER_EXPIRY_OFFSET_DAYS),
  }
}

export const DEMO_MANIFEST = {
  setupProjectCode: "TRACK-SETUP-CHECK",
  projects: {
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
  },
  users: [
    {
      key: "platform_admin",
      email: "track01.platform-admin@example.test",
      fullName: "Demo Platform Administrator",
      platformAdmin: true,
      status: "active",
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
      ],
    },
    {
      key: "platform_observer",
      email: "track01.platform-observer@example.test",
      fullName: "Demo Platform Observer",
      platformAdmin: true,
      status: "active",
      memberships: [],
    },
    {
      key: "project_admin_a",
      email: "track01.project-admin-a@example.test",
      fullName: "Demo Project Administrator",
      platformAdmin: false,
      status: "active",
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
      ],
    },
    {
      key: "qc_editor",
      email: "track01.qc-editor@example.test",
      fullName: "Demo Quality Editor",
      platformAdmin: false,
      status: "active",
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
      ],
    },
    {
      key: "reader_qc",
      email: "track01.reader-qc@example.test",
      fullName: "Demo Quality Reader",
      platformAdmin: false,
      status: "active",
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
      fullName: "Demo NDE Subcontractor",
      platformAdmin: false,
      status: "active",
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
  references: {
    systemMaterialTypes: [
      {
        key: "CS",
        code: "CS",
        description: "Carbon steel piping material",
        status: "active",
      },
      {
        key: "SS316",
        code: "SS316",
        description: "Grade 316 stainless steel piping material",
        status: "active",
      },
      {
        key: "DSS",
        code: "DSS",
        description: "Duplex stainless steel piping material",
        status: "active",
      },
    ],
    filmQuantityRules: [
      {
        key: "1-3in|3-10mm",
        description: "Two-film radiography for small-bore pipe",
        minDiameterInches: 1,
        maxDiameterInches: 3,
        minThicknessMm: 3,
        maxThicknessMm: 10,
        filmCount: 2,
        status: "active",
      },
      {
        key: "4-12in|3-20mm",
        description: "Three-film radiography for medium-bore pipe",
        minDiameterInches: 4,
        maxDiameterInches: 12,
        minThicknessMm: 3,
        maxThicknessMm: 20,
        filmCount: 3,
        status: "active",
      },
    ],
    utCalculationRules: [
      {
        key: "1-3in|150#",
        description: "Small-bore ultrasonic examination calculation",
        minDiameterInches: 1,
        maxDiameterInches: 3,
        pressureClass: "150#",
        coefficientA: 1,
        coefficientB: 1,
        status: "active",
      },
      {
        key: "4-8in|150#",
        description: "Medium-bore ultrasonic examination calculation",
        minDiameterInches: 4,
        maxDiameterInches: 8,
        pressureClass: "150#",
        coefficientA: 2,
        coefficientB: 3,
        status: "active",
      },
      {
        key: "9-16in|300#",
        description: "Large-bore ultrasonic examination calculation",
        minDiameterInches: 9,
        maxDiameterInches: 16,
        pressureClass: "300#",
        coefficientA: 3,
        coefficientB: 4,
        status: "active",
      },
    ],
    torquingRequirements: [
      {
        key: "MANUAL-TORQUE",
        code: "MANUAL-TORQUE",
        description: "Calibrated manual torque wrench",
        status: "active",
      },
      {
        key: "HYDRAULIC-TORQUE",
        code: "HYDRAULIC-TORQUE",
        description: "Hydraulic torque wrench",
        status: "active",
      },
      {
        key: "HYDRAULIC-TENSION",
        code: "HYDRAULIC-TENSION",
        description: "Hydraulic bolt tensioning",
        status: "active",
      },
    ],
    subcontractors: [
      {
        key: "FAB-A",
        code: "FAB-A",
        description: "Primary fabrication contractor",
        status: "active",
      },
      {
        key: "NDE-A",
        code: "NDE-A",
        description: "Nondestructive examination contractor",
        status: "active",
      },
      {
        key: "LEGACY-CONTRACTOR",
        code: "LEGACY-CONTRACTOR",
        description: "Retired construction contractor",
        status: "inactive",
      },
    ],
    units: [
      {
        key: "U-100",
        code: "U-100",
        description: "Main process unit",
        status: "active",
      },
      {
        key: "U-200",
        code: "U-200",
        description: "Utilities unit",
        status: "active",
      },
    ],
    areaClassifications: [
      {
        key: "U-100|PROCESS",
        code: "PROCESS",
        unitCode: "U-100",
        description: "Process piping area",
        status: "active",
      },
      {
        key: "U-200|UTILITIES",
        code: "UTILITIES",
        unitCode: "U-200",
        description: "Utility piping area",
        status: "active",
      },
    ],
    pdsAreas: [
      {
        key: "PROCESS|PDS-100",
        code: "PDS-100",
        areaCode: "PROCESS",
        shopSubcontractorCode: "FAB-A",
        fieldSubcontractorCode: "FAB-A",
        description: "Process feed piping design area",
        status: "active",
      },
      {
        key: "UTILITIES|PDS-200",
        code: "PDS-200",
        areaCode: "UTILITIES",
        shopSubcontractorCode: "FAB-A",
        fieldSubcontractorCode: "FAB-A",
        description: "Plant air piping design area",
        status: "active",
      },
      {
        key: "PROCESS|PDS-300",
        code: "PDS-300",
        areaCode: "PROCESS",
        shopSubcontractorCode: "FAB-A",
        fieldSubcontractorCode: "FAB-A",
        description: "Process product piping design area",
        status: "active",
      },
    ],
    serviceClasses: [
      {
        key: "SC-CS150",
        code: "SC-CS150",
        materialTypeCode: "CS",
        description: "Carbon steel class 150 piping",
        status: "active",
      },
      {
        key: "SC-SS300",
        code: "SC-SS300",
        materialTypeCode: "SS316",
        description: "Stainless steel class 300 piping",
        status: "active",
      },
    ],
    weldTypes: [
      {
        key: "BW",
        code: "BW",
        description: "Butt weld",
        countsDiameterInch: true,
        status: "active",
      },
      {
        key: "SW",
        code: "SW",
        description: "Socket weld",
        countsDiameterInch: true,
        status: "active",
      },
      {
        key: "FW",
        code: "FW",
        description: "Fillet weld",
        countsDiameterInch: false,
        status: "active",
      },
    ],
    weldingProcedures: [
      {
        key: "WPS-CS-GTAW-01",
        code: "WPS-CS-GTAW-01",
        description: "Carbon steel gas tungsten arc welding procedure",
        subcontractorCode: "FAB-A",
        materialTypeCode: "CS",
        process: "GTAW",
        revision: "1",
        minDiameterInches: 1,
        maxDiameterInches: 24,
        minThicknessMm: 2,
        maxThicknessMm: 30,
        approvedOffsetDays: DEMO_WPS_APPROVAL_OFFSET_DAYS,
        status: "active",
      },
      {
        key: "WPS-CS-SMAW-02",
        code: "WPS-CS-SMAW-02",
        description: "Carbon steel shielded metal arc welding procedure",
        subcontractorCode: "FAB-A",
        materialTypeCode: "CS",
        process: "SMAW",
        revision: "2",
        minDiameterInches: 1,
        maxDiameterInches: 24,
        minThicknessMm: 2,
        maxThicknessMm: 30,
        approvedOffsetDays: DEMO_WPS_APPROVAL_OFFSET_DAYS,
        status: "active",
      },
      {
        key: "WPS-SS-GTAW-03",
        code: "WPS-SS-GTAW-03",
        description: "Stainless steel gas tungsten arc welding procedure",
        subcontractorCode: "FAB-A",
        materialTypeCode: "SS316",
        process: "GTAW",
        revision: "3",
        minDiameterInches: 1,
        maxDiameterInches: 24,
        minThicknessMm: 2,
        maxThicknessMm: 30,
        approvedOffsetDays: DEMO_WPS_APPROVAL_OFFSET_DAYS,
        status: "active",
      },
      {
        key: "WPS-LEGACY-04",
        code: "WPS-LEGACY-04",
        description: "Retired carbon steel repair welding procedure",
        subcontractorCode: "FAB-A",
        materialTypeCode: "CS",
        process: "SMAW",
        revision: "4",
        minDiameterInches: 1,
        maxDiameterInches: 24,
        minThicknessMm: 2,
        maxThicknessMm: 30,
        approvedOffsetDays: DEMO_WPS_APPROVAL_OFFSET_DAYS,
        status: "inactive",
      },
    ],
    welders: [
      {
        key: "WDR-001",
        code: "WDR-001",
        description: "Alex Morgan, carbon steel GTAW welder",
        fullName: "Alex Morgan",
        subcontractorCode: "FAB-A",
        expiresOffsetDays: DEMO_WELDER_EXPIRY_OFFSET_DAYS,
        status: "active",
      },
      {
        key: "WDR-002",
        code: "WDR-002",
        description: "Jordan Lee, carbon steel SMAW welder",
        fullName: "Jordan Lee",
        subcontractorCode: "FAB-A",
        expiresOffsetDays: DEMO_WELDER_EXPIRY_OFFSET_DAYS,
        status: "active",
      },
      {
        key: "WDR-003",
        code: "WDR-003",
        description: "Taylor Kim, stainless steel GTAW welder",
        fullName: "Taylor Kim",
        subcontractorCode: "FAB-A",
        expiresOffsetDays: DEMO_WELDER_EXPIRY_OFFSET_DAYS,
        status: "active",
      },
      {
        key: "WDR-004",
        code: "WDR-004",
        description: "Casey Brown, carbon steel GTAW welder",
        fullName: "Casey Brown",
        subcontractorCode: "FAB-A",
        expiresOffsetDays: DEMO_WELDER_EXPIRY_OFFSET_DAYS,
        status: "active",
      },
    ],
    welderWpsQualifications: [
      {
        key: "WDR-001|WPS-CS-GTAW-01",
        welderCode: "WDR-001",
        wpsCode: "WPS-CS-GTAW-01",
        status: "active",
      },
      {
        key: "WDR-002|WPS-CS-SMAW-02",
        welderCode: "WDR-002",
        wpsCode: "WPS-CS-SMAW-02",
        status: "active",
      },
      {
        key: "WDR-003|WPS-SS-GTAW-03",
        welderCode: "WDR-003",
        wpsCode: "WPS-SS-GTAW-03",
        status: "active",
      },
      {
        key: "WDR-004|WPS-CS-GTAW-01",
        welderCode: "WDR-004",
        wpsCode: "WPS-CS-GTAW-01",
        status: "active",
      },
    ],
    ndeMatrixRules: [
      {
        key: "SC-CS150|BW|shop",
        serviceClassCode: "SC-CS150",
        weldTypeCode: "BW",
        locationType: "shop",
        method: "RT",
        coveragePercent: 100,
        materialTraceability: true,
        pwhtRequired: false,
        description: "Full shop butt-weld radiography",
        status: "active",
      },
      {
        key: "SC-CS150|BW|field",
        serviceClassCode: "SC-CS150",
        weldTypeCode: "BW",
        locationType: "field",
        method: "RT",
        coveragePercent: 0,
        materialTraceability: false,
        pwhtRequired: false,
        description: "Field butt-weld visual acceptance path",
        status: "active",
      },
      {
        key: "SC-CS150|SW|shop",
        serviceClassCode: "SC-CS150",
        weldTypeCode: "SW",
        locationType: "shop",
        method: "PT",
        coveragePercent: 100,
        materialTraceability: true,
        pwhtRequired: false,
        description: "Full shop socket-weld penetrant examination",
        status: "active",
      },
      {
        key: "SC-SS300|BW|shop",
        serviceClassCode: "SC-SS300",
        weldTypeCode: "BW",
        locationType: "shop",
        method: "RT",
        coveragePercent: 100,
        materialTraceability: true,
        pwhtRequired: false,
        description: "Full stainless shop butt-weld radiography",
        status: "active",
      },
    ],
    pipingMaterialRecords: [
      {
        key: "ID-DEMO-100|HEAT-100-A",
        identCode: "ID-DEMO-100",
        heatNumber: "HEAT-100-A",
        mrrNumber: "MRR-DEMO-100",
        description: "Carbon steel process pipe receipt",
        status: "active",
      },
      {
        key: "ID-DEMO-200|HEAT-200-A",
        identCode: "ID-DEMO-200",
        heatNumber: "HEAT-200-A",
        mrrNumber: "MRR-DEMO-200",
        description: "Carbon steel process fitting receipt",
        status: "active",
      },
      {
        key: "ID-DEMO-300|HEAT-300-A",
        identCode: "ID-DEMO-300",
        heatNumber: "HEAT-300-A",
        mrrNumber: "MRR-DEMO-300",
        description: "Carbon steel process flange receipt",
        status: "active",
      },
      {
        key: "ID-DEMO-400|HEAT-400-A",
        identCode: "ID-DEMO-400",
        heatNumber: "HEAT-400-A",
        mrrNumber: "MRR-DEMO-400",
        description: "Carbon steel utility pipe receipt",
        status: "active",
      },
      {
        key: "ID-DEMO-500|HEAT-500-A",
        identCode: "ID-DEMO-500",
        heatNumber: "HEAT-500-A",
        mrrNumber: "MRR-DEMO-500",
        description: "Carbon steel utility fitting receipt",
        status: "active",
      },
    ],
    thicknessFlangeRules: [
      {
        key: "SC-CS150|4in|150#",
        serviceClassCode: "SC-CS150",
        diameterInches: 4,
        thicknessMm: 6,
        pressureClass: "150#",
        description: "Four-inch carbon steel flange rule",
        status: "active",
      },
      {
        key: "SC-CS150|6in|150#",
        serviceClassCode: "SC-CS150",
        diameterInches: 6,
        thicknessMm: 8.2,
        pressureClass: "150#",
        description: "Six-inch carbon steel flange rule",
        status: "active",
      },
      {
        key: "SC-SS300|8in|300#",
        serviceClassCode: "SC-SS300",
        diameterInches: 8,
        thicknessMm: 10.3,
        pressureClass: "300#",
        description: "Eight-inch stainless steel flange rule",
        status: "active",
      },
    ],
    reworkCodes: [
      {
        key: "POR",
        code: "POR",
        description: "Porosity repair",
        status: "active",
      },
      {
        key: "LOF",
        code: "LOF",
        description: "Lack of fusion repair",
        status: "active",
      },
      {
        key: "CRK",
        code: "CRK",
        description: "Crack repair",
        status: "active",
      },
    ],
    jointCategories: [
      {
        key: "X",
        code: "X",
        description: "Pressure-test boundary flange joint",
        completionStage: "before_pressure_test",
        jointDefinition: "Flange",
        reason: "Complete before hydrostatic pressure testing",
        coefficient: 0.5,
        status: "active",
      },
      {
        key: "Y",
        code: "Y",
        description: "Pre-commissioning boundary flange joint",
        completionStage: "before_precommissioning",
        jointDefinition: "Flange",
        reason: "Complete before system pre-commissioning",
        coefficient: 0.5,
        status: "active",
      },
      {
        key: "Z",
        code: "Z",
        description: "Post-commissioning flange joint",
        completionStage: "after_precommissioning",
        jointDefinition: "Flange",
        reason: "Complete after system pre-commissioning",
        coefficient: 0.5,
        status: "active",
      },
    ],
    teams: [
      {
        key: "LC-TEAM-A",
        code: "LC-TEAM-A",
        teamType: "line_check",
        description: "Line check team",
        status: "active",
      },
      {
        key: "FINISH-A",
        code: "FINISH-A",
        teamType: "finishing",
        description: "Punch item finishing team",
        status: "active",
      },
      {
        key: "BLIND-TEAM-A",
        code: "BLIND-TEAM-A",
        teamType: "blinding",
        description: "Isolation blinding team",
        status: "active",
      },
      {
        key: "REINSTATE-TEAM-A",
        code: "REINSTATE-TEAM-A",
        teamType: "reinstatement",
        description: "System reinstatement team",
        status: "active",
      },
      {
        key: "BOLT-TEAM-A",
        code: "BOLT-TEAM-A",
        teamType: "jointer",
        description: "Flange jointing team",
        status: "active",
      },
    ],
    punchCodes: [
      {
        key: "X-DEMO",
        code: "X-DEMO",
        description: "Category X punch raised during Line Check",
        status: "active",
      },
    ],
    systems: [
      {
        key: "SYS-PROCESS",
        code: "SYS-PROCESS",
        description: "Process piping system",
        status: "active",
      },
      {
        key: "SYS-UTILITIES",
        code: "SYS-UTILITIES",
        description: "Plant utilities piping system",
        status: "active",
      },
    ],
    subsystems: [
      {
        key: "SYS-PROCESS|SUB-FEED",
        code: "SUB-FEED",
        systemCode: "SYS-PROCESS",
        description: "Process feed subsystem",
        status: "active",
      },
      {
        key: "SYS-PROCESS|SUB-PRODUCT",
        code: "SUB-PRODUCT",
        systemCode: "SYS-PROCESS",
        description: "Process product subsystem",
        status: "active",
      },
      {
        key: "SYS-UTILITIES|SUB-AIR",
        code: "SUB-AIR",
        systemCode: "SYS-UTILITIES",
        description: "Plant air subsystem",
        status: "active",
      },
    ],
    lineServices: [
      {
        key: "PROCESS",
        code: "PROCESS",
        description: "Process fluid service",
        status: "active",
      },
      {
        key: "AIR",
        code: "AIR",
        description: "Plant air service",
        status: "active",
      },
      {
        key: "WATER",
        code: "WATER",
        description: "Utility water service",
        status: "active",
      },
    ],
    pressureUnits: [
      {
        key: "bar",
        code: "bar",
        description: "Pressure in bar",
        status: "active",
      },
    ],
    locationCategories: [
      {
        key: "YARD",
        code: "YARD",
        description: "Fabrication and storage yard",
        status: "active",
      },
      {
        key: "SITE",
        code: "SITE",
        description: "Construction site",
        status: "active",
      },
      {
        key: "HOLD",
        code: "HOLD",
        description: "Controlled holding area",
        status: "active",
      },
    ],
    locations: [
      {
        key: "YARD|FAB-SHOP",
        code: "FAB-SHOP",
        categoryCode: "YARD",
        description: "Main fabrication shop",
        status: "active",
      },
      {
        key: "YARD|PAINT-SHOP",
        code: "PAINT-SHOP",
        categoryCode: "YARD",
        description: "Protective coating shop",
        status: "active",
      },
      {
        key: "HOLD|LAYDOWN-A",
        code: "LAYDOWN-A",
        categoryCode: "HOLD",
        description: "Controlled pipe laydown area",
        status: "active",
      },
      {
        key: "SITE|SITE-A",
        code: "SITE-A",
        categoryCode: "SITE",
        description: "Primary erection workfront",
        status: "active",
      },
      {
        key: "SITE|TEST-AREA",
        code: "TEST-AREA",
        categoryCode: "SITE",
        description: "Pressure test staging area",
        status: "active",
      },
      {
        key: "YARD|OLD-YARD",
        code: "OLD-YARD",
        categoryCode: "YARD",
        description: "Retired storage yard",
        status: "inactive",
      },
    ],
    unitTimeReferences: [
      {
        key: "FLANGE_JOINTING",
        code: "FLANGE_JOINTING",
        description: "Flange assembly and jointing",
        hours: 10,
        standard: "Project piping flange assembly standard",
        status: "active",
      },
      {
        key: "LINE_CHECK",
        code: "LINE_CHECK",
        description: "Completed-line inspection",
        hours: 8,
        standard: "Project mechanical completion inspection standard",
        status: "active",
      },
      {
        key: "BLINDING",
        code: "BLINDING",
        description: "Test boundary blinding",
        hours: 6,
        standard: "Project pressure test isolation standard",
        status: "active",
      },
      {
        key: "REINSTATEMENT",
        code: "REINSTATEMENT",
        description: "Post-test system reinstatement",
        hours: 7,
        standard: "Project piping reinstatement standard",
        status: "active",
      },
    ],
    progressWeights: [
      {
        key: "prefabrication",
        phase: "prefabrication",
        description: "Shop prefabrication progress",
        status: "active",
        items: [
          {
            key: "prefabrication|spool_fabrication",
            code: "spool_fabrication",
            description: "Spool fabrication complete",
            weight: 30,
          },
          {
            key: "prefabrication|material_check",
            code: "material_check",
            description: "Material verification complete",
            weight: 20,
          },
          {
            key: "prefabrication|weld_progress",
            code: "weld_progress",
            description: "Welding complete",
            weight: 30,
          },
          {
            key: "prefabrication|qc_release",
            code: "qc_release",
            description: "Quality release complete",
            weight: 20,
          },
        ],
      },
      {
        key: "painting",
        phase: "painting",
        description: "Protective coating progress",
        status: "active",
        items: [
          {
            key: "painting|blasting",
            code: "blasting",
            description: "Surface preparation complete",
            weight: 20,
          },
          {
            key: "painting|primer",
            code: "primer",
            description: "Primer coat complete",
            weight: 20,
          },
          {
            key: "painting|intermediate",
            code: "intermediate",
            description: "Intermediate coat complete",
            weight: 30,
          },
          {
            key: "painting|final",
            code: "final",
            description: "Final coat complete",
            weight: 30,
          },
        ],
      },
      {
        key: "erection",
        phase: "erection",
        description: "Field erection progress",
        status: "active",
        items: [
          {
            key: "erection|to_site",
            code: "to_site",
            description: "Delivered to site",
            weight: 20,
          },
          {
            key: "erection|material_check",
            code: "material_check",
            description: "Site material verification complete",
            weight: 20,
          },
          {
            key: "erection|weld_progress",
            code: "weld_progress",
            description: "Field welding complete",
            weight: 30,
          },
          {
            key: "erection|supported",
            code: "supported",
            description: "Permanent supports complete",
            weight: 15,
          },
          {
            key: "erection|welded_bolted",
            code: "welded_bolted",
            description: "Final welded and bolted connections complete",
            weight: 15,
          },
        ],
      },
    ],
    assemblySettings: [
      {
        key: "assembly",
        enabled: false,
        status: "active",
      },
    ],
    spoolingMaterialTypes: [
      {
        key: "CS",
        code: "CS",
        description: "Carbon steel spooling material",
        status: "active",
      },
      {
        key: "SS",
        code: "SS",
        description: "Stainless steel spooling material",
        status: "active",
      },
    ],
    spoolingMaterialClasses: [
      {
        key: "CS150",
        code: "CS150",
        materialTypeCode: "CS",
        description: "Carbon steel class 150",
        status: "active",
      },
      {
        key: "CS300",
        code: "CS300",
        materialTypeCode: "CS",
        description: "Carbon steel class 300",
        status: "active",
      },
      {
        key: "SS300",
        code: "SS300",
        materialTypeCode: "SS",
        description: "Stainless steel class 300",
        status: "active",
      },
    ],
    spoolingChecklistItems: [
      {
        key: "DRAWING",
        code: "DRAWING",
        description: "Approved drawing available",
        required: true,
        sortOrder: 10,
        status: "active",
      },
      {
        key: "MATERIAL",
        code: "MATERIAL",
        description: "Material identification verified",
        required: true,
        sortOrder: 20,
        status: "active",
      },
      {
        key: "FITUP",
        code: "FITUP",
        description: "Fit-up inspection accepted",
        required: true,
        sortOrder: 30,
        status: "active",
      },
      {
        key: "WELD",
        code: "WELD",
        description: "Welding inspection accepted",
        required: true,
        sortOrder: 40,
        status: "active",
      },
      {
        key: "DIMENSION",
        code: "DIMENSION",
        description: "Dimensional inspection accepted",
        required: true,
        sortOrder: 50,
        status: "active",
      },
    ],
    ralCodes: [
      {
        key: "PROCESS|RAL 9006",
        lineServiceCode: "PROCESS",
        colorCode: "WHITE ALUMINIUM",
        ralCode: "RAL 9006",
        description: "White aluminium process service colour",
        status: "active",
      },
      {
        key: "AIR|RAL 5015",
        lineServiceCode: "AIR",
        colorCode: "SKY BLUE",
        ralCode: "RAL 5015",
        description: "Sky blue air service colour",
        status: "active",
      },
      {
        key: "WATER|RAL 6018",
        lineServiceCode: "WATER",
        colorCode: "YELLOW GREEN",
        ralCode: "RAL 6018",
        description: "Yellow green water service colour",
        status: "active",
      },
    ],
    paintMatrixRules: [
      {
        key: "PROCESS|RAL 9006",
        lineServiceCode: "PROCESS",
        ralCode: "RAL 9006",
        description: "Process piping coating system",
        blastingRequired: true,
        primerRequired: true,
        intermediateCoats: 1,
        finalCoats: 1,
        totalDftMicrons: 240,
        status: "active",
      },
      {
        key: "AIR|RAL 5015",
        lineServiceCode: "AIR",
        ralCode: "RAL 5015",
        description: "Plant air piping coating system",
        blastingRequired: true,
        primerRequired: true,
        intermediateCoats: 1,
        finalCoats: 1,
        totalDftMicrons: 200,
        status: "active",
      },
      {
        key: "WATER|RAL 6018",
        lineServiceCode: "WATER",
        ralCode: "RAL 6018",
        description: "Utility water piping coating system",
        blastingRequired: true,
        primerRequired: true,
        intermediateCoats: 1,
        finalCoats: 1,
        totalDftMicrons: 220,
        status: "active",
      },
    ],
    devices: [
      {
        key: "SCN-001",
        code: "SCN-001",
        description: "Fabrication shop scanner",
        status: "active",
      },
      {
        key: "SCN-002",
        code: "SCN-002",
        description: "Site receiving scanner",
        status: "active",
      },
      {
        key: "SCN-003",
        code: "SCN-003",
        description: "Unassigned spare scanner",
        status: "active",
      },
    ],
    deviceAssignments: [
      {
        key: "SCN-001|qc_editor",
        deviceCode: "SCN-001",
        userKey: "qc_editor",
        status: "active",
      },
      {
        key: "SCN-002|project_admin_a",
        deviceCode: "SCN-002",
        userKey: "project_admin_a",
        status: "active",
      },
    ],
  },
  expectedCounts: {
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
  },
  spoolgen: {
    roles: ["weld", "trace", "bolt", "supp"],
    hashes: {
      weld: "66c70e97cd1feebdc772b97f27bfba538d99b8cfd5264bb89597d2ebd718f926",
      trace: "3ed733edd885e03cd72509856cac9c3f918ceb80a2c2f0ce9c39f5d519448a53",
      bolt: "8377a6bffe8821c3056be08d5d272d0b07220e087499393b8aa8879c93e4ce7b",
      supp: "4ec894574e82bf27950e3d2377dc2b4f013100c561072e9e34107e64df8cbf19",
    },
    expectedStagingRows: 20,
    expectedCounts: {
      isometric: 2,
      spool: 3,
      weld_joint: 5,
      support: 2,
      flange_joint: 3,
      material: 5,
    },
    entities: {
      isometrics: [
        {
          key: "ISO-DEMO-1001|R0",
          isometricNumber: "ISO-DEMO-1001",
          revision: "R0",
          pdsAreaCode: "PDS-100",
          serviceClassCode: "SC-CS150",
          lineNumber: "P-1001",
          sheetNumber: "",
        },
        {
          key: "ISO-DEMO-2001|R0",
          isometricNumber: "ISO-DEMO-2001",
          revision: "R0",
          pdsAreaCode: "PDS-200",
          serviceClassCode: "SC-CS150",
          lineNumber: "P-2001",
          sheetNumber: "",
        },
      ],
      spools: [
        {
          key: "ISO-DEMO-1001|R0|SP-DEMO-1001-A",
          isometricNumber: "ISO-DEMO-1001",
          revision: "R0",
          spoolNumber: "SP-DEMO-1001-A",
          sequenceNumber: "1",
          spoolWeightKg: "120.5",
          materialClass: "CS150",
        },
        {
          key: "ISO-DEMO-1001|R0|SP-DEMO-1001-B",
          isometricNumber: "ISO-DEMO-1001",
          revision: "R0",
          spoolNumber: "SP-DEMO-1001-B",
          sequenceNumber: "2",
          spoolWeightKg: "98.0",
          materialClass: "CS150",
        },
        {
          key: "ISO-DEMO-2001|R0|SP-DEMO-2001-A",
          isometricNumber: "ISO-DEMO-2001",
          revision: "R0",
          spoolNumber: "SP-DEMO-2001-A",
          sequenceNumber: "3",
          spoolWeightKg: "110.0",
          materialClass: "CS150",
        },
      ],
      weldJoints: [
        {
          key: "ISO-DEMO-1001|R0|WJ-DEMO-1001-01",
          isometricNumber: "ISO-DEMO-1001",
          revision: "R0",
          spoolNumber: "SP-DEMO-1001-A",
          weldNumber: "WJ-DEMO-1001-01",
          weldTypeCode: "BW",
          locationType: "shop",
          serviceClassCode: "SC-CS150",
          diameterInches: "6",
          thicknessMm: "8.2",
        },
        {
          key: "ISO-DEMO-1001|R0|WJ-DEMO-1001-02",
          isometricNumber: "ISO-DEMO-1001",
          revision: "R0",
          spoolNumber: "SP-DEMO-1001-A",
          weldNumber: "WJ-DEMO-1001-02",
          weldTypeCode: "SW",
          locationType: "shop",
          serviceClassCode: "SC-CS150",
          diameterInches: "4",
          thicknessMm: "6.0",
        },
        {
          key: "ISO-DEMO-1001|R0|WJ-DEMO-1001-03",
          isometricNumber: "ISO-DEMO-1001",
          revision: "R0",
          spoolNumber: "SP-DEMO-1001-B",
          weldNumber: "WJ-DEMO-1001-03",
          weldTypeCode: "BW",
          locationType: "shop",
          serviceClassCode: "SC-CS150",
          diameterInches: "4",
          thicknessMm: "6.0",
        },
        {
          key: "ISO-DEMO-2001|R0|WJ-DEMO-2001-01",
          isometricNumber: "ISO-DEMO-2001",
          revision: "R0",
          spoolNumber: "SP-DEMO-2001-A",
          weldNumber: "WJ-DEMO-2001-01",
          weldTypeCode: "BW",
          locationType: "field",
          serviceClassCode: "SC-CS150",
          diameterInches: "6",
          thicknessMm: "8.2",
        },
        {
          key: "ISO-DEMO-2001|R0|WJ-DEMO-2001-02",
          isometricNumber: "ISO-DEMO-2001",
          revision: "R0",
          spoolNumber: "SP-DEMO-2001-A",
          weldNumber: "WJ-DEMO-2001-02",
          weldTypeCode: "BW",
          locationType: "field",
          serviceClassCode: "SC-CS150",
          diameterInches: "6",
          thicknessMm: "8.2",
        },
      ],
      supports: [
        {
          key: "ISO-DEMO-1001|R0|SUP-DEMO-1001-01",
          isometricNumber: "ISO-DEMO-1001",
          revision: "R0",
          spoolNumber: "SP-DEMO-1001-A",
          supportNumber: "SUP-DEMO-1001-01",
          supportType: "GUIDE",
          quantity: "2",
        },
        {
          key: "ISO-DEMO-2001|R0|SUP-DEMO-2001-01",
          isometricNumber: "ISO-DEMO-2001",
          revision: "R0",
          spoolNumber: "SP-DEMO-2001-A",
          supportNumber: "SUP-DEMO-2001-01",
          supportType: "REST",
          quantity: "1",
        },
      ],
      flangeJoints: [
        {
          key: "ISO-DEMO-1001|R0|FLG-DEMO-1001-01",
          isometricNumber: "ISO-DEMO-1001",
          revision: "R0",
          spoolNumber: "SP-DEMO-1001-A",
          flangeNumber: "FLG-DEMO-1001-01",
          pressureClass: "150#",
          diameterInches: "6",
          boltSize: '3/4"',
          boltQuantity: "8",
          jointType: "Flange",
        },
        {
          key: "ISO-DEMO-1001|R0|FLG-DEMO-1001-02",
          isometricNumber: "ISO-DEMO-1001",
          revision: "R0",
          spoolNumber: "SP-DEMO-1001-A",
          flangeNumber: "FLG-DEMO-1001-02",
          pressureClass: "150#",
          diameterInches: "6",
          boltSize: '3/4"',
          boltQuantity: "8",
          jointType: "Flange",
        },
        {
          key: "ISO-DEMO-1001|R0|FLG-DEMO-1001-03",
          isometricNumber: "ISO-DEMO-1001",
          revision: "R0",
          spoolNumber: "SP-DEMO-1001-B",
          flangeNumber: "FLG-DEMO-1001-03",
          pressureClass: "150#",
          diameterInches: "4",
          boltSize: '5/8"',
          boltQuantity: "8",
          jointType: "Flange",
        },
      ],
      materials: [
        {
          key: "ISO-DEMO-1001|R0|SP-DEMO-1001-A|ID-DEMO-100",
          isometricNumber: "ISO-DEMO-1001",
          revision: "R0",
          spoolNumber: "SP-DEMO-1001-A",
          identCode: "ID-DEMO-100",
          description: "Carbon steel pipe 6in",
          quantity: "2",
          unit: "EA",
          traceNumber: "",
        },
        {
          key: "ISO-DEMO-1001|R0|SP-DEMO-1001-A|ID-DEMO-200",
          isometricNumber: "ISO-DEMO-1001",
          revision: "R0",
          spoolNumber: "SP-DEMO-1001-A",
          identCode: "ID-DEMO-200",
          description: "Carbon steel elbow 6in",
          quantity: "1",
          unit: "EA",
          traceNumber: "",
        },
        {
          key: "ISO-DEMO-1001|R0|SP-DEMO-1001-B|ID-DEMO-300",
          isometricNumber: "ISO-DEMO-1001",
          revision: "R0",
          spoolNumber: "SP-DEMO-1001-B",
          identCode: "ID-DEMO-300",
          description: "Carbon steel pipe 4in",
          quantity: "2",
          unit: "EA",
          traceNumber: "",
        },
        {
          key: "ISO-DEMO-2001|R0|SP-DEMO-2001-A|ID-DEMO-400",
          isometricNumber: "ISO-DEMO-2001",
          revision: "R0",
          spoolNumber: "SP-DEMO-2001-A",
          identCode: "ID-DEMO-400",
          description: "Field weld fitting 6in",
          quantity: "2",
          unit: "EA",
          traceNumber: "",
        },
        {
          key: "ISO-DEMO-2001|R0|SP-DEMO-2001-A|ID-DEMO-500",
          isometricNumber: "ISO-DEMO-2001",
          revision: "R0",
          spoolNumber: "SP-DEMO-2001-A",
          identCode: "ID-DEMO-500",
          description: "Pipe support material",
          quantity: "1",
          unit: "EA",
          traceNumber: "",
        },
      ],
    },
  },
  emptyAtDemoStart: EMPTY_AT_DEMO_START,
} as const satisfies DemoManifest
