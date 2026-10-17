import { compareCodes, formatDocumentDate, type Cell, type DocumentLocale, type DocumentTable } from "./document"
import {
  byWeld,
  head,
  ISO_COLUMNS,
  list,
  pwht,
  WELD_HISTORY_COLUMNS,
  word,
  type RegisterLabels,
} from "./registers"
import type { NdeRegisterRow, PunchRow, TestPackDocumentRow, WeldLogRow } from "./report"

export interface DossierIso {
  isoNumber: string
  revisionNumber: string
  lineNumber: string | null
}

/** Everything one test pack's handover dossier prints, read in a single go. */
export interface TestPackDossierSnapshot {
  pack: TestPackDocumentRow
  isos: DossierIso[]
  welds: WeldLogRow[]
  nde: NdeRegisterRow[]
  punch: PunchRow[]
}

export interface DossierLabels extends RegisterLabels {
  sections: Record<"pack" | "act" | "isos" | "weldHistory" | "nde" | "punch", string>
  facts: Record<
    | "testPack" | "system" | "subsystem" | "lineService" | "medium" | "testPressure" | "location"
    | "composition" | "rftOn" | "testingStarted" | "testingCompleted" | "precommissioning" | "testDate",
    string
  >
  composition: (isos: number, welds: number) => string
  act: {
    groups: Record<"pipeline" | "operating" | "strength" | "tightness", string>
    columns: Record<
      | "number" | "pipeline" | "pressure" | "temperature" | "medium" | "testType" | "testPressure"
      | "duration" | "pressureDrop" | "allowedDrop",
      string
    >
    testType: Record<"hydraulic" | "pneumatic", string>
    conclusion: string
    signatures: Record<"position" | "name" | "signature" | "date", string>
    footnote: string
  }
}

/** A blank to be filled in by hand on the printed act. */
const BLANK = "________________"
const HANDWRITTEN_ROW_HEIGHT = 26

export function toMegapascal(value: number, unit: string): number {
  const megapascal = unit === "psi" ? value * 0.00689476 : unit === "bar" ? value / 10 : value
  return Math.round(megapascal * 1000) / 1000
}

function formatNumber(value: number, locale: DocumentLocale): string {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-GB", { maximumFractionDigits: 3 }).format(value)
}

/** Test medium H is a hydraulic test, P a pneumatic one; a visual check has no pressure test type. */
function testType(medium: string, labels: DossierLabels): string | null {
  if (medium === "H") return labels.act.testType.hydraulic
  if (medium === "P") return labels.act.testType.pneumatic
  return null
}

export function packFacts(snapshot: TestPackDossierSnapshot, labels: DossierLabels): Cell[][] {
  const { pack } = snapshot
  const date = (value: string | null) => formatDocumentDate(value, labels.locale)
  return [
    [labels.facts.testPack, `${pack.testPackNumber} · ${labels.columns.revision} ${pack.revisionNo}`],
    [labels.facts.system, [pack.systemCode, pack.systemDescription].filter(Boolean).join(" — ")],
    [labels.facts.subsystem, [pack.subsystemCode, pack.subsystemDescription].filter(Boolean).join(" — ")],
    [labels.facts.lineService, pack.lineServiceCode || null],
    [labels.facts.medium, word(labels.medium, pack.testMedium)],
    [labels.facts.testPressure, `${formatNumber(pack.testPressure, labels.locale)} ${pack.pressureUnit}`],
    [labels.facts.location, pack.location || null],
    [labels.facts.composition, labels.composition(snapshot.isos.length, snapshot.welds.length)],
    [labels.facts.rftOn, date(pack.rftOn)],
    [labels.facts.testingStarted, date(pack.testingStartedOn)],
    [labels.facts.testingCompleted, date(pack.testingCompletedOn)],
    [labels.facts.precommissioning, date(pack.precommissioningCompletedOn)],
  ]
}

export function actFacts(snapshot: TestPackDossierSnapshot, labels: DossierLabels): Cell[][] {
  const { pack } = snapshot
  return [
    [labels.facts.testPack, pack.testPackNumber],
    [labels.facts.location, pack.location || null],
    [labels.facts.testDate, formatDocumentDate(pack.testingCompletedOn, labels.locale) ?? BLANK],
  ]
}

/**
 * The pressure test act laid out as appendix 21 of the МЧС РК instruction (order 359): one row per pipeline
 * (line) of the pack. PipeQC fills the pipeline, the line service, the test type and the test pressure; the
 * measured values stay empty for the commission to write in.
 */
export function actTable(snapshot: TestPackDossierSnapshot, labels: DossierLabels): DocumentTable {
  const { pack } = snapshot
  const lines = new Map<string, string[]>()
  for (const iso of snapshot.isos) {
    const key = iso.lineNumber ?? ""
    lines.set(key, [...(lines.get(key) ?? []), iso.isoNumber])
  }
  const pressure = formatNumber(toMegapascal(pack.testPressure, pack.pressureUnit), labels.locale)
  const body: Cell[][] = [...lines.entries()]
    .sort(([a], [b]) => compareCodes(a, b))
    .map(([line, isos], index) => {
      const isoList = [...isos].sort(compareCodes).join(", ")
      return [
        index + 1,
        line ? `${line} (${isoList})` : isoList,
        null,
        null,
        pack.lineServiceCode || null,
        testType(pack.testMedium, labels),
        pressure,
        null,
        null,
        null,
        null,
        null,
      ]
    })
  const columns = labels.act.columns
  return {
    groups: [
      { label: labels.act.groups.pipeline, span: 2 },
      { label: labels.act.groups.operating, span: 3 },
      { label: labels.act.groups.strength, span: 3 },
      { label: labels.act.groups.tightness, span: 4 },
    ],
    head: [
      columns.number, columns.pipeline, columns.pressure, columns.temperature, columns.medium,
      columns.testType, columns.testPressure, columns.duration,
      columns.testPressure, columns.duration, columns.pressureDrop, columns.allowedDrop,
    ],
    body,
    rowHeight: HANDWRITTEN_ROW_HEIGHT,
  }
}

export function signatureTable(labels: DossierLabels): DocumentTable {
  const { signatures } = labels.act
  return {
    head: [signatures.position, signatures.name, signatures.signature, signatures.date],
    body: [[null, null, null, null], [null, null, null, null], [null, null, null, null]],
    rowHeight: HANDWRITTEN_ROW_HEIGHT,
  }
}

export function conclusionLine(labels: DossierLabels): string {
  return `${labels.act.conclusion} ${BLANK}${BLANK}${BLANK}`
}

export function isoTable(snapshot: TestPackDossierSnapshot, labels: RegisterLabels): DocumentTable {
  const body: Cell[][] = [...snapshot.isos]
    .sort((a, b) => compareCodes(a.isoNumber, b.isoNumber))
    .map((iso) => [iso.isoNumber, iso.revisionNumber, iso.lineNumber])
  return { head: head(ISO_COLUMNS, labels), body }
}

/** Every weld of the pack, shop and field, with the NDE results and report numbers of that weld. */
export function weldHistoryTable(snapshot: TestPackDossierSnapshot, labels: RegisterLabels): DocumentTable {
  const ndeByWeld = new Map<string, NdeRegisterRow[]>()
  for (const row of snapshot.nde) {
    const key = `${row.isoNumber}|${row.spoolNumber}|${row.weldNumber}`
    ndeByWeld.set(key, [...(ndeByWeld.get(key) ?? []), row])
  }
  const body: Cell[][] = [...snapshot.welds].sort(byWeld).map((weld) => {
    const nde = [...(ndeByWeld.get(`${weld.isoNumber}|${weld.spoolNumber}|${weld.weldNumber}`) ?? [])]
      .sort((a, b) => compareCodes(a.method, b.method))
    const results = nde.map((row) =>
      `${word(labels.method, row.method)}: ${row.outcome ? word(labels.outcome, row.outcome) : word(labels.disposition, row.disposition)}`)
    const reports = [...new Set(nde.flatMap((row) => (row.reportNumber ? [row.reportNumber] : [])))]
    return [
      weld.isoNumber,
      weld.spoolNumber,
      weld.weldNumber,
      word(labels.location, weld.weldLocation),
      weld.diameterInch,
      weld.thicknessMm,
      weld.wpsCode,
      list(weld.welderCodes),
      formatDocumentDate(weld.weldOn, labels.locale),
      results.length > 0 ? results.join("; ") : null,
      list(reports),
      pwht(weld, labels),
      list(weld.traceNumbers),
    ]
  })
  return { head: head(WELD_HISTORY_COLUMNS, labels), body }
}
