// scripts/upg/spec.ts
/**
 * The shape of a demo project. One ProjectSpec describes a whole project as plain data; the
 * builders (builders.ts), the file writers (files.ts), the referentials (references.ts), the weekly
 * plan (weeks.ts) and the runners are derived from it, so a second project is a second object,
 * not a copy of the code. No derived data lives here (no ISO list): builders.ts computes it.
 */
import type { PackStep } from "./weeks"

export type ServiceClassCode = string
export type MaterialTypeCode = "CS" | "SS316"
export type Cohort = "A" | "B" | "C" | "D"
export type WeldLocation = "shop" | "field"

export interface ServiceClassSpec {
  readonly code: ServiceClassCode
  readonly description: string
  readonly materialTypeCode: MaterialTypeCode
  readonly flangeRating: "150#" | "300#"
  /** Wall thickness by nominal diameter, mm. Every diameter a weld uses must be listed. */
  readonly thicknessByDiameter: Readonly<Record<number, number>>
  /** Main-run diameters, cycled per ISO inside its group. */
  readonly mainDiameters: readonly number[]
  /** Small-bore branch welds are socket welds at this diameter; null when the class has none. */
  readonly branchDiameter: number | null
}

export interface SystemSpec {
  readonly code: string
  readonly description: string
  readonly subsystems: readonly { readonly code: string; readonly description: string }[]
}

export interface PdsAreaSpec {
  readonly code: string
  readonly description: string
}

export interface LineServiceSpec {
  readonly code: string
  readonly description: string
}

export interface IsoGroup {
  readonly cohort: Cohort
  readonly systemCode: string
  readonly subsystemCode: string
  readonly serviceClass: ServiceClassCode
  readonly pdsArea: string
  readonly firstSeq: number
  readonly count: number
  readonly testPack: string
  readonly testPressureBar: number
  readonly priority: string
}

export interface UpgWeld {
  readonly weldNumber: string
  readonly weldType: "BW" | "SW"
  readonly location: WeldLocation
  readonly diameterInch: number
  readonly thicknessMm: number
}

export interface UpgMaterialLine {
  readonly identCode: string
  readonly description: string
  readonly quantity: string
  readonly unit: "M" | "EA"
  readonly traceNumber: string
}

export interface UpgSpool {
  readonly spoolNumber: string
  readonly weightKg: string
  readonly welds: readonly UpgWeld[]
  readonly supportNumber: string
  readonly supportType: string
  readonly flangeNumber: string
  readonly boltSize: string
  readonly boltQuantity: number
  readonly materials: readonly UpgMaterialLine[]
}

export interface UpgIso {
  readonly isoNumber: string
  readonly revision: string
  readonly seq: number
  readonly cohort: Cohort
  /** Position inside its ISO group, from 0. weeks.ts staggers and caps by it. */
  readonly groupIndex: number
  readonly systemCode: string
  readonly subsystemCode: string
  readonly serviceClass: ServiceClassCode
  readonly pdsArea: string
  readonly lineNumber: string
  readonly mainDiameter: number
  readonly testPack: string
  readonly thread: boolean
  readonly spools: readonly UpgSpool[]
}

export interface WeldingProcedureSpec {
  readonly code: string
  readonly subcontractor: string
  readonly materialType: MaterialTypeCode
  readonly diameterFrom: number
  readonly diameterTo: number
  readonly thicknessFrom: number
  readonly thicknessTo: number
}

export interface WelderSpec {
  readonly code: string
  readonly name: string
  readonly subcontractor: string
  readonly wpsCodes: readonly string[]
}

export interface NdeRuleSpec {
  readonly serviceClass: ServiceClassCode
  readonly weldType: "BW" | "SW"
  readonly location: WeldLocation
  readonly rt: number
  readonly mt: number
  readonly pt: number
}

export type PwhtFormRule = NdeRuleSpec & { readonly pwhtThresholdMm: number }

/** The one-spool ISO that only the error file set holds: its diameter has no thickness rule, so the server blocks it. */
export interface ErrorIsoSpec {
  readonly isoNumber: string
  readonly seq: number
  readonly serviceClass: ServiceClassCode
  readonly systemCode: string
  readonly subsystemCode: string
  readonly pdsArea: string
  readonly testPack: string
  readonly diameterInch: number
  readonly thicknessMm: number
  readonly weightKg: string
}

export interface ProjectSpec {
  /** The --dataset value ("upg", "nps") and the prefix of every idempotency key (actionKey). */
  readonly id: string
  /** Repo-relative directory of the generated files, e.g. "fixtures/demo-project". */
  readonly fixtureDir: string
  readonly project: {
    readonly activityCode: string
    readonly projectTitle: string
    readonly owner: string
    readonly contractor: string
    readonly contractNumber: string
    readonly maxTransitTimeDays: number
  }
  readonly shopSubcontractor: string
  readonly fieldSubcontractor: string
  /** The line service a spool is painted under. */
  readonly lineService: string
  readonly lineServices: readonly LineServiceSpec[]
  /** areaCode of every PDS area in the referentials, and the prefix of their keys. */
  readonly pdsAreaCode: string
  readonly serviceClasses: Readonly<Record<ServiceClassCode, ServiceClassSpec>>
  readonly systems: readonly SystemSpec[]
  readonly pdsAreas: readonly PdsAreaSpec[]
  /**
   * Cohorts set the pace: A finishes the whole process, B ends tested or ready for test, C stops
   * mid-erection, D never leaves the shop. weeks.ts reads the cohort, not the ISO number.
   */
  readonly isoGroups: readonly IsoGroup[]
  readonly weldingProcedures: readonly WeldingProcedureSpec[]
  /** Only the materials the project welds: a carbon-steel-only project has no SS316 entry. */
  readonly wpsByMaterial: Readonly<Partial<Record<MaterialTypeCode, { readonly shop: string; readonly field: string }>>>
  readonly welders: readonly WelderSpec[]
  /** Rows of the NDE matrix Excel import. A class with PWHT is absent: see pwhtFormRules. */
  readonly ndeImportRules: readonly NdeRuleSpec[]
  /**
   * The NDE matrix import has no PWHT columns (modules/imports/domain/import-types.json), so these
   * rules are entered by hand in Project Referential → NDE matrix. load-project.ts creates them
   * through the same repository function the form uses.
   */
  readonly pwhtFormRules: readonly PwhtFormRule[]
  /** Welds of a PWHT class at or above this wall thickness need PWHT. Entered by hand in the NDE matrix form. */
  readonly pwhtThresholdMm: number
  /** ISO numbers are `${isoPrefix}-${floor(seq / 1000)}00-${seq}`; material receipts are MRR-${isoPrefix}-001. */
  readonly isoPrefix: string
  /** The medium code inside a line number: `${diameter}-${lineCode}-${seq}-${class}`. */
  readonly lineCode: string
  readonly special: {
    /** Recorded by hand in the UI, in step with the weeks. */
    readonly threadIsos: readonly string[]
    /** The ISO that gets revision R1 while its spools are in the shop, and the shop weld R1 adds. */
    readonly revision: { readonly iso: string; readonly weld: string } | null
    /** Rejected in the first shop NDE round; produces a repair and tracers. */
    readonly rejectWeld: string | null
    /** The field weld of this ISO's first spool has a diameter no field WPS covers: an import warning, never welded. */
    readonly wpsGap: { readonly iso: string; readonly fieldDiameterInch: number } | null
    readonly errorIso: ErrorIsoSpec | null
    /** Leaves the laydown and never arrives on site: a Transit Out alert. */
    readonly overdueSpool: string | null
  }
  /** First project day of each cohort. */
  readonly cohortStart: Readonly<Record<Cohort, number>>
  /** The test pack the walkthrough records by hand; its steps are `manual`. */
  readonly manualPack: string | null
  /** Test pack steps in plan order; `manual` is derived from manualPack. */
  readonly packScenario: readonly PackStep[]
}
