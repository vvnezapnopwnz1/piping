// scripts/upg/dataset.ts
/**
 * UPG-1: a small gas treatment unit described as plain data.
 *
 * Pure and deterministic. The import files (files.ts), the referentials (references.ts) and the
 * weekly plan (weeks.ts) are all derived from this one description, so they cannot disagree
 * about a number.
 */

export const UPG_PROJECT = {
  activityCode: "UPG-1",
  projectTitle: "Установка подготовки газа УПГ-1",
  owner: "ТОО «Демо Газ»",
  contractor: "ТОО «Демо Монтаж»",
  contractNumber: "DM-2026-014",
  maxTransitTimeDays: 3,
} as const

export const SHOP_SUBCONTRACTOR = "FAB-A"
export const FIELD_SUBCONTRACTOR = "ERC-A"
export const LINE_SERVICE = "PROCESS"
/** CS300 welds at or above this wall thickness need PWHT. Entered by hand in the NDE matrix form. */
export const PWHT_THRESHOLD_MM = 12

export type ServiceClassCode = "CS150" | "CS300" | "SS150"
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

export const SERVICE_CLASSES: Readonly<Record<ServiceClassCode, ServiceClassSpec>> = {
  CS150: {
    code: "CS150",
    description: "Углеродистая сталь, 150#",
    materialTypeCode: "CS",
    flangeRating: "150#",
    thicknessByDiameter: { 2: 3.91, 3: 5.49, 4: 6.02, 6: 7.11, 8: 8.18, 12: 9.53 },
    mainDiameters: [4, 6, 8, 3],
    branchDiameter: 2,
  },
  CS300: {
    code: "CS300",
    description: "Углеродистая сталь, 300#, толстостенная",
    materialTypeCode: "CS",
    flangeRating: "300#",
    thicknessByDiameter: { 6: 10.97, 8: 12.7, 10: 15.09 },
    mainDiameters: [8, 10, 6],
    branchDiameter: null,
  },
  SS150: {
    code: "SS150",
    description: "Нержавеющая сталь 316, 150#",
    materialTypeCode: "SS316",
    flangeRating: "150#",
    thicknessByDiameter: { 2: 2.77, 3: 3.05, 4: 3.05, 6: 3.4 },
    mainDiameters: [3, 4, 6],
    branchDiameter: 2,
  },
}

export interface SystemSpec {
  readonly code: string
  readonly description: string
  readonly subsystems: readonly { readonly code: string; readonly description: string }[]
}

export const SYSTEMS: readonly SystemSpec[] = [
  {
    code: "100",
    description: "Входная сепарация",
    subsystems: [
      { code: "100-01", description: "Сепаратор С-101" },
      { code: "100-02", description: "Узел замера газа" },
    ],
  },
  {
    code: "200",
    description: "Осушка газа",
    subsystems: [
      { code: "200-01", description: "Абсорбер К-201" },
      { code: "200-02", description: "Регенерация гликоля" },
    ],
  },
  {
    code: "300",
    description: "Топливный газ и факел",
    subsystems: [
      { code: "300-01", description: "Топливный газ" },
      { code: "300-02", description: "Факельный коллектор" },
    ],
  },
]

export const PDS_AREAS = [
  { code: "A-100", description: "Площадка входной сепарации" },
  { code: "A-200", description: "Площадка осушки газа" },
  { code: "A-300", description: "Площадка топливного газа и факела" },
] as const

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

/**
 * Cohorts set the pace: A finishes the whole process, B ends tested or ready for test, C stops
 * mid-erection, D never leaves the shop. weeks.ts reads the cohort, not the ISO number.
 */
export const ISO_GROUPS: readonly IsoGroup[] = [
  { cohort: "A", systemCode: "100", subsystemCode: "100-01", serviceClass: "CS150", pdsArea: "A-100", firstSeq: 1001, count: 5, testPack: "TP-100-01", testPressureBar: 29.5, priority: "Высокий" },
  { cohort: "A", systemCode: "100", subsystemCode: "100-02", serviceClass: "CS150", pdsArea: "A-100", firstSeq: 1006, count: 5, testPack: "TP-100-02", testPressureBar: 29.5, priority: "Высокий" },
  { cohort: "B", systemCode: "200", subsystemCode: "200-01", serviceClass: "CS300", pdsArea: "A-200", firstSeq: 2001, count: 6, testPack: "TP-200-01", testPressureBar: 76.6, priority: "Обычный" },
  { cohort: "B", systemCode: "200", subsystemCode: "200-02", serviceClass: "CS300", pdsArea: "A-200", firstSeq: 2007, count: 6, testPack: "TP-200-02", testPressureBar: 76.6, priority: "Обычный" },
  { cohort: "C", systemCode: "300", subsystemCode: "300-01", serviceClass: "SS150", pdsArea: "A-300", firstSeq: 3001, count: 10, testPack: "TP-300-01", testPressureBar: 27.6, priority: "Обычный" },
  { cohort: "D", systemCode: "300", subsystemCode: "300-02", serviceClass: "CS150", pdsArea: "A-300", firstSeq: 3011, count: 8, testPack: "TP-300-02", testPressureBar: 29.5, priority: "Низкий" },
]

/** Recorded by hand in the UI, in step with the weeks. Part of TP-100-01. */
export const THREAD_ISOS: readonly string[] = ["UPG-100-1001", "UPG-100-1002"]
/** Gets revision R1 in week 3, while its spools are in the shop. */
export const REVISION_ISO = "UPG-200-2005"
export const REVISION_WELD = "2005-S1-W09"
/** Rejected in the first shop NDE round; produces a repair and tracers. */
export const REJECT_WELD = "1003-S1-W02"
/** Its S1 field weld is 12" and no field WPS covers it: an import warning, never welded. */
export const WPS_GAP_ISO = "UPG-300-3018"
/** Only in the error file set: CS150 at 14" has no thickness rule, so the server blocks it. */
export const ERROR_ISO = "UPG-300-3099"
/** Leaves the laydown and never arrives on site: a Transit Out alert. */
export const OVERDUE_SPOOL = "UPG-300-3009-S1"

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

export const WELDING_PROCEDURES: readonly WeldingProcedureSpec[] = [
  { code: "WPS-CS-01", subcontractor: SHOP_SUBCONTRACTOR, materialType: "CS", diameterFrom: 0.5, diameterTo: 24, thicknessFrom: 2, thicknessTo: 40 },
  { code: "WPS-SS-01", subcontractor: SHOP_SUBCONTRACTOR, materialType: "SS316", diameterFrom: 0.5, diameterTo: 12, thicknessFrom: 1, thicknessTo: 20 },
  { code: "WPS-CS-F01", subcontractor: FIELD_SUBCONTRACTOR, materialType: "CS", diameterFrom: 0.5, diameterTo: 10, thicknessFrom: 2, thicknessTo: 40 },
  { code: "WPS-SS-F01", subcontractor: FIELD_SUBCONTRACTOR, materialType: "SS316", diameterFrom: 0.5, diameterTo: 12, thicknessFrom: 1, thicknessTo: 20 },
]

export const WPS_BY_MATERIAL: Readonly<Record<MaterialTypeCode, { readonly shop: string; readonly field: string }>> = {
  CS: { shop: "WPS-CS-01", field: "WPS-CS-F01" },
  SS316: { shop: "WPS-SS-01", field: "WPS-SS-F01" },
}

export interface WelderSpec {
  readonly code: string
  readonly name: string
  readonly subcontractor: string
  readonly wpsCodes: readonly string[]
}

export const WELDERS: readonly WelderSpec[] = [
  { code: "S-01", name: "Ахметов Ерлан", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01", "WPS-SS-01"] },
  { code: "S-02", name: "Ким Виктор", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01", "WPS-SS-01"] },
  { code: "S-03", name: "Сейткали Арман", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01"] },
  { code: "S-04", name: "Петров Игорь", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01"] },
  { code: "S-05", name: "Нурланов Данияр", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01", "WPS-SS-01"] },
  { code: "S-06", name: "Иванов Сергей", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-SS-01"] },
  { code: "F-01", name: "Жумабаев Талгат", subcontractor: FIELD_SUBCONTRACTOR, wpsCodes: ["WPS-CS-F01", "WPS-SS-F01"] },
  { code: "F-02", name: "Смирнов Олег", subcontractor: FIELD_SUBCONTRACTOR, wpsCodes: ["WPS-CS-F01"] },
  { code: "F-03", name: "Каримов Руслан", subcontractor: FIELD_SUBCONTRACTOR, wpsCodes: ["WPS-CS-F01", "WPS-SS-F01"] },
  { code: "F-04", name: "Ли Андрей", subcontractor: FIELD_SUBCONTRACTOR, wpsCodes: ["WPS-SS-F01"] },
]

export interface NdeRuleSpec {
  readonly serviceClass: ServiceClassCode
  readonly weldType: "BW" | "SW"
  readonly location: WeldLocation
  readonly rt: number
  readonly mt: number
  readonly pt: number
}

/** Rows of the NDE matrix Excel import. CS300 is absent: it carries PWHT, see PWHT_FORM_RULES. */
export const NDE_IMPORT_RULES: readonly NdeRuleSpec[] = [
  { serviceClass: "CS150", weldType: "BW", location: "shop", rt: 10, mt: 0, pt: 0 },
  { serviceClass: "CS150", weldType: "BW", location: "field", rt: 10, mt: 0, pt: 0 },
  { serviceClass: "CS150", weldType: "SW", location: "shop", rt: 0, mt: 10, pt: 0 },
  { serviceClass: "SS150", weldType: "BW", location: "shop", rt: 10, mt: 0, pt: 0 },
  { serviceClass: "SS150", weldType: "BW", location: "field", rt: 10, mt: 0, pt: 0 },
  { serviceClass: "SS150", weldType: "SW", location: "shop", rt: 0, mt: 0, pt: 10 },
]

/**
 * The NDE matrix import has no PWHT columns (modules/imports/domain/import-types.json), so these
 * two rules are entered by hand in Project Referential → NDE matrix. load-project.ts creates them
 * through the same repository function the form uses.
 */
export const PWHT_FORM_RULES: readonly (NdeRuleSpec & { readonly pwhtThresholdMm: number })[] = [
  { serviceClass: "CS300", weldType: "BW", location: "shop", rt: 100, mt: 0, pt: 0, pwhtThresholdMm: PWHT_THRESHOLD_MM },
  { serviceClass: "CS300", weldType: "BW", location: "field", rt: 100, mt: 0, pt: 0, pwhtThresholdMm: PWHT_THRESHOLD_MM },
]

const BOLT_SIZE: Readonly<Record<number, string>> = {
  2: '5/8"', 3: '5/8"', 4: '5/8"', 6: '3/4"', 8: '3/4"', 10: '7/8"', 12: '7/8"', 14: '1"',
}
const SUPPORT_TYPES = ["SHOE", "GUIDE", "ANCHOR"] as const

const boltQuantity = (diameter: number): number => (diameter <= 3 ? 4 : diameter <= 8 ? 8 : 12)
const pad2 = (value: number): string => String(value).padStart(2, "0")

export const isoNumberOf = (seq: number): string => `UPG-${Math.floor(seq / 1000)}00-${seq}`

export const heatNumber = (serviceClass: ServiceClassCode, kind: "PIPE" | "ELB" | "FLG", diameter: number): string =>
  `H-${serviceClass}-${kind}-${diameter}`

export function materialLines(serviceClass: ServiceClassCode, diameter: number): UpgMaterialLine[] {
  const rating = SERVICE_CLASSES[serviceClass].flangeRating
  return [
    { identCode: `${serviceClass}-PIPE-${diameter}`, description: `Труба ${diameter}" ${serviceClass}`, quantity: "6", unit: "M", traceNumber: heatNumber(serviceClass, "PIPE", diameter) },
    { identCode: `${serviceClass}-ELB-${diameter}`, description: `Отвод 90° ${diameter}" ${serviceClass}`, quantity: "2", unit: "EA", traceNumber: heatNumber(serviceClass, "ELB", diameter) },
    { identCode: `${serviceClass}-FLG-${diameter}`, description: `Фланец WN ${diameter}" ${rating}`, quantity: "1", unit: "EA", traceNumber: heatNumber(serviceClass, "FLG", diameter) },
  ]
}

interface WeldContext {
  readonly isoNumber: string
  readonly seq: number
  readonly serviceClass: ServiceClassCode
  readonly mainDiameter: number
}

function weldsFor(iso: WeldContext, spoolIndex: number, globalIndex: number): UpgWeld[] {
  const spec = SERVICE_CLASSES[iso.serviceClass]
  const shopCount = 4 + ((globalIndex + spoolIndex) % 3)
  const welds: UpgWeld[] = []
  for (let ordinal = 1; ordinal <= shopCount; ordinal += 1) {
    const branch = ordinal === 3 && spec.branchDiameter !== null
    const diameter = branch ? (spec.branchDiameter as number) : iso.mainDiameter
    welds.push({
      weldNumber: `${iso.seq}-S${spoolIndex + 1}-W${pad2(ordinal)}`,
      weldType: branch ? "SW" : "BW",
      location: "shop",
      diameterInch: diameter,
      thicknessMm: spec.thicknessByDiameter[diameter],
    })
  }
  const fieldDiameter = iso.isoNumber === WPS_GAP_ISO && spoolIndex === 0 ? 12 : iso.mainDiameter
  welds.push({
    weldNumber: `${iso.seq}-S${spoolIndex + 1}-FW1`,
    weldType: "BW",
    location: "field",
    diameterInch: fieldDiameter,
    thicknessMm: spec.thicknessByDiameter[fieldDiameter],
  })
  return welds
}

function spoolsFor(iso: WeldContext, globalIndex: number): UpgSpool[] {
  const spoolCount = globalIndex % 3 === 0 ? 3 : 2
  const spools: UpgSpool[] = []
  for (let index = 0; index < spoolCount; index += 1) {
    spools.push({
      spoolNumber: `${iso.isoNumber}-S${index + 1}`,
      weightKg: (80 + iso.mainDiameter * 12 + index * 7).toFixed(1),
      welds: weldsFor(iso, index, globalIndex),
      supportNumber: `${iso.seq}-S${index + 1}-SUP1`,
      supportType: SUPPORT_TYPES[(globalIndex + index) % SUPPORT_TYPES.length],
      flangeNumber: `${iso.seq}-S${index + 1}-F1`,
      boltSize: BOLT_SIZE[iso.mainDiameter],
      boltQuantity: boltQuantity(iso.mainDiameter),
      materials: materialLines(iso.serviceClass, iso.mainDiameter),
    })
  }
  return spools
}

export function buildUpgIsos(): UpgIso[] {
  const isos: UpgIso[] = []
  let globalIndex = 0
  for (const group of ISO_GROUPS) {
    const spec = SERVICE_CLASSES[group.serviceClass]
    for (let groupIndex = 0; groupIndex < group.count; groupIndex += 1) {
      const seq = group.firstSeq + groupIndex
      const isoNumber = isoNumberOf(seq)
      const mainDiameter = spec.mainDiameters[groupIndex % spec.mainDiameters.length]
      const context: WeldContext = { isoNumber, seq, serviceClass: group.serviceClass, mainDiameter }
      isos.push({
        isoNumber,
        revision: "R0",
        seq,
        cohort: group.cohort,
        groupIndex,
        systemCode: group.systemCode,
        subsystemCode: group.subsystemCode,
        serviceClass: group.serviceClass,
        pdsArea: group.pdsArea,
        lineNumber: `${mainDiameter}-NG-${seq}-${group.serviceClass}`,
        mainDiameter,
        testPack: group.testPack,
        thread: THREAD_ISOS.includes(isoNumber),
        spools: spoolsFor(context, globalIndex),
      })
      globalIndex += 1
    }
  }
  return isos
}

export const UPG_ISOS: readonly UpgIso[] = buildUpgIsos()

export function isoByNumber(isoNumber: string): UpgIso | undefined {
  return UPG_ISOS.find((iso) => iso.isoNumber === isoNumber)
}

export function spoolByNumber(spoolNumber: string): { iso: UpgIso; spool: UpgSpool } | undefined {
  for (const iso of UPG_ISOS) {
    const spool = iso.spools.find((candidate) => candidate.spoolNumber === spoolNumber)
    if (spool) return { iso, spool }
  }
  return undefined
}

/** Revision R1 of REVISION_ISO: spool S1 gains one shop butt weld. Nothing else changes. */
export function revisionR1(iso: UpgIso): UpgIso {
  const [first, ...rest] = iso.spools
  const spec = SERVICE_CLASSES[iso.serviceClass]
  const added: UpgWeld = {
    weldNumber: REVISION_WELD,
    weldType: "BW",
    location: "shop",
    diameterInch: iso.mainDiameter,
    thicknessMm: spec.thicknessByDiameter[iso.mainDiameter],
  }
  const shop = first.welds.filter((weld) => weld.location === "shop")
  const field = first.welds.filter((weld) => weld.location === "field")
  return { ...iso, revision: "R1", spools: [{ ...first, welds: [...shop, added, ...field] }, ...rest] }
}

/** One ISO, one spool, CS150 at 14": no thickness rule covers it, so the server blocks the job. */
export function errorIso(): UpgIso {
  const seq = 3099
  const spoolNumber = `${ERROR_ISO}-S1`
  const weld = (ordinal: number, location: WeldLocation): UpgWeld => ({
    weldNumber: `${seq}-S1-${location === "shop" ? `W${pad2(ordinal)}` : "FW1"}`,
    weldType: "BW",
    location,
    diameterInch: 14,
    thicknessMm: 11.13,
  })
  return {
    isoNumber: ERROR_ISO,
    revision: "R0",
    seq,
    cohort: "D",
    groupIndex: 0,
    systemCode: "300",
    subsystemCode: "300-02",
    serviceClass: "CS150",
    pdsArea: "A-300",
    lineNumber: `14-NG-${seq}-CS150`,
    mainDiameter: 14,
    testPack: "TP-300-02",
    thread: false,
    spools: [
      {
        spoolNumber,
        weightKg: "260.0",
        welds: [weld(1, "shop"), weld(2, "shop"), weld(1, "field")],
        supportNumber: `${seq}-S1-SUP1`,
        supportType: "SHOE",
        flangeNumber: `${seq}-S1-F1`,
        boltSize: BOLT_SIZE[14],
        boltQuantity: 12,
        materials: materialLines("CS150", 14),
      },
    ],
  }
}
