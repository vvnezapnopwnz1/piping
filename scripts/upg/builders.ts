// scripts/upg/builders.ts
/**
 * Pure builders for demo-project domain entities (ISOs, spools, welds, materials).
 *
 * Parameterized by ProjectSpec so the same generation rules produce different project
 * datasets without duplicating logic.
 */
import type {
  ProjectSpec,
  ServiceClassCode,
  UpgIso,
  UpgMaterialLine,
  UpgSpool,
  UpgWeld,
  WeldLocation,
} from "./spec"

const BOLT_SIZE: Readonly<Record<number, string>> = {
  2: '5/8"', 3: '5/8"', 4: '5/8"', 6: '3/4"', 8: '3/4"', 10: '7/8"', 12: '7/8"', 14: '1"',
  // 16–24" are used by 300# classes only (NPS-1). The table does not follow the rating: the sizes above are 150# values.
  16: '1-1/4"', 20: '1-1/4"', 24: '1-1/2"', // оценка: from memory of the B16.5 300# table, not re-checked
}
const SUPPORT_TYPES = ["SHOE", "GUIDE", "ANCHOR"] as const

const boltQuantity = (diameter: number): number => (diameter <= 3 ? 4 : diameter <= 8 ? 8 : 12)
const pad2 = (value: number): string => String(value).padStart(2, "0")

export const isoNumberOf = (spec: ProjectSpec, seq: number): string => `${spec.isoPrefix}-${Math.floor(seq / 1000)}00-${seq}`

export const heatNumber = (serviceClass: string, kind: "PIPE" | "ELB" | "FLG", diameter: number): string =>
  `H-${serviceClass}-${kind}-${diameter}`

export function materialLines(spec: ProjectSpec, serviceClass: string, diameter: number): UpgMaterialLine[] {
  const rating = spec.serviceClasses[serviceClass].flangeRating
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

function weldsFor(spec: ProjectSpec, iso: WeldContext, spoolIndex: number, globalIndex: number): UpgWeld[] {
  const classSpec = spec.serviceClasses[iso.serviceClass]
  const shopCount = 4 + ((globalIndex + spoolIndex) % 3)
  const welds: UpgWeld[] = []
  for (let ordinal = 1; ordinal <= shopCount; ordinal += 1) {
    const branch = ordinal === 3 && classSpec.branchDiameter !== null
    const diameter = branch ? (classSpec.branchDiameter as number) : iso.mainDiameter
    welds.push({
      weldNumber: `${iso.seq}-S${spoolIndex + 1}-W${pad2(ordinal)}`,
      weldType: branch ? "SW" : "BW",
      location: "shop",
      diameterInch: diameter,
      thicknessMm: classSpec.thicknessByDiameter[diameter],
    })
  }
  const { wpsGap } = spec.special
  const fieldDiameter = wpsGap !== null && iso.isoNumber === wpsGap.iso && spoolIndex === 0 ? wpsGap.fieldDiameterInch : iso.mainDiameter
  welds.push({
    weldNumber: `${iso.seq}-S${spoolIndex + 1}-FW1`,
    weldType: "BW",
    location: "field",
    diameterInch: fieldDiameter,
    thicknessMm: classSpec.thicknessByDiameter[fieldDiameter],
  })
  return welds
}

function spoolsFor(spec: ProjectSpec, iso: WeldContext, globalIndex: number): UpgSpool[] {
  const spoolCount = globalIndex % 3 === 0 ? 3 : 2
  const spools: UpgSpool[] = []
  for (let index = 0; index < spoolCount; index += 1) {
    spools.push({
      spoolNumber: `${iso.isoNumber}-S${index + 1}`,
      weightKg: (80 + iso.mainDiameter * 12 + index * 7).toFixed(1),
      welds: weldsFor(spec, iso, index, globalIndex),
      supportNumber: `${iso.seq}-S${index + 1}-SUP1`,
      supportType: SUPPORT_TYPES[(globalIndex + index) % SUPPORT_TYPES.length],
      flangeNumber: `${iso.seq}-S${index + 1}-F1`,
      boltSize: BOLT_SIZE[iso.mainDiameter],
      boltQuantity: boltQuantity(iso.mainDiameter),
      materials: materialLines(spec, iso.serviceClass, iso.mainDiameter),
    })
  }
  return spools
}

export function buildIsos(spec: ProjectSpec): UpgIso[] {
  const isos: UpgIso[] = []
  let globalIndex = 0
  for (const group of spec.isoGroups) {
    const classSpec = spec.serviceClasses[group.serviceClass]
    for (let groupIndex = 0; groupIndex < group.count; groupIndex += 1) {
      const seq = group.firstSeq + groupIndex
      const isoNumber = isoNumberOf(spec, seq)
      const mainDiameter = classSpec.mainDiameters[groupIndex % classSpec.mainDiameters.length]
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
        lineNumber: `${mainDiameter}-${spec.lineCode}-${seq}-${group.serviceClass}`,
        mainDiameter,
        testPack: group.testPack,
        thread: spec.special.threadIsos.includes(isoNumber),
        spools: spoolsFor(spec, context, globalIndex),
      })
      globalIndex += 1
    }
  }
  return isos
}

const cache = new WeakMap<ProjectSpec, readonly UpgIso[]>()

export function isosOf(spec: ProjectSpec): readonly UpgIso[] {
  const existing = cache.get(spec)
  if (existing) return existing
  const isos = buildIsos(spec)
  cache.set(spec, isos)
  return isos
}

export function isoByNumber(spec: ProjectSpec, isoNumber: string): UpgIso | undefined {
  return isosOf(spec).find((iso) => iso.isoNumber === isoNumber)
}

export function spoolByNumber(spec: ProjectSpec, spoolNumber: string): { iso: UpgIso; spool: UpgSpool } | undefined {
  for (const iso of isosOf(spec)) {
    const spool = iso.spools.find((candidate) => candidate.spoolNumber === spoolNumber)
    if (spool) return { iso, spool }
  }
  return undefined
}

/** Revision R1: spool S1 gains one shop butt weld. Nothing else changes. */
export function revisionR1(spec: ProjectSpec, iso: UpgIso): UpgIso {
  if (!spec.special.revision) throw new Error("ProjectSpec has no revision configured")
  const [first, ...rest] = iso.spools
  const classSpec = spec.serviceClasses[iso.serviceClass]
  const added: UpgWeld = {
    weldNumber: spec.special.revision.weld,
    weldType: "BW",
    location: "shop",
    diameterInch: iso.mainDiameter,
    thicknessMm: classSpec.thicknessByDiameter[iso.mainDiameter],
  }
  const shop = first.welds.filter((weld) => weld.location === "shop")
  const field = first.welds.filter((weld) => weld.location === "field")
  return { ...iso, revision: "R1", spools: [{ ...first, welds: [...shop, added, ...field] }, ...rest] }
}

/** One ISO, one spool: no thickness rule covers it, so the server blocks the job. */
export function errorIso(spec: ProjectSpec): UpgIso | null {
  const err = spec.special.errorIso
  if (!err) return null
  const { seq, isoNumber, diameterInch, thicknessMm, serviceClass, weightKg, systemCode, subsystemCode, pdsArea, testPack } = err
  const spoolNumber = `${isoNumber}-S1`
  const weld = (ordinal: number, location: WeldLocation): UpgWeld => ({
    weldNumber: `${seq}-S1-${location === "shop" ? `W${pad2(ordinal)}` : "FW1"}`,
    weldType: "BW",
    location,
    diameterInch,
    thicknessMm,
  })
  return {
    isoNumber,
    revision: "R0",
    seq,
    cohort: "D",
    groupIndex: 0,
    systemCode,
    subsystemCode,
    serviceClass,
    pdsArea,
    lineNumber: `${diameterInch}-${spec.lineCode}-${seq}-${serviceClass}`,
    mainDiameter: diameterInch,
    testPack,
    thread: false,
    spools: [
      {
        spoolNumber,
        weightKg,
        welds: [weld(1, "shop"), weld(2, "shop"), weld(1, "field")],
        supportNumber: `${seq}-S1-SUP1`,
        supportType: "SHOE",
        flangeNumber: `${seq}-S1-F1`,
        boltSize: BOLT_SIZE[diameterInch],
        boltQuantity: boltQuantity(diameterInch),
        materials: materialLines(spec, serviceClass, diameterInch),
      },
    ],
  }
}
