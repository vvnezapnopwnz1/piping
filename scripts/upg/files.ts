/**
 * Pure builders for the UPG-1 files: the four SpoolGen texts the manual prescribes (§13.1), one
 * Excel matrix per import (the import reads only the first sheet), and the sheets of the master
 * workbook a person opens in Excel.
 */
import { templateHeaderRow, type ImportType } from "../../modules/imports/domain/import-type"
import {
  ERROR_ISO,
  ISO_GROUPS,
  LINE_SERVICE,
  NDE_IMPORT_RULES,
  PDS_AREAS,
  PWHT_FORM_RULES,
  REVISION_ISO,
  SERVICE_CLASSES,
  SYSTEMS,
  UPG_ISOS,
  WELDERS,
  WELDING_PROCEDURES,
  errorIso,
  revisionR1,
  type UpgIso,
} from "./dataset"

export const UPG_FIXTURE_DIR = "fixtures/demo-project"
export const START_OFFSET_DAYS = 56

export type Cell = string | number
export type SpoolgenTexts = { weld: string; trace: string; supp: string; bolt: string }

export interface ImportSheet {
  readonly importType: ImportType
  readonly fileName: string
  readonly title: string
  readonly matrix: Cell[][]
}

const WELD_HEADER = ["ISO_NUMBER", "ISO_REVISION", "PDS_AREA", "SERVICE_CLASS", "LINE_NUMBER", "SPOOL_NUMBER", "SPOOL_WEIGHT_KG", "MATERIAL_CLASS", "WELD_NUMBER", "WELD_TYPE", "WELD_LOCATION", "DIAMETER_INCH", "THICKNESS_MM"]
const TRACE_HEADER = ["ISO_NUMBER", "SPOOL_NUMBER", "IDENT_CODE", "DESCRIPTION", "QUANTITY", "UNIT", "TRACE_NUMBER"]
const SUPP_HEADER = ["ISO_NUMBER", "SPOOL_NUMBER", "SUPPORT_NUMBER", "SUPPORT_TYPE", "QUANTITY"]
const BOLT_HEADER = ["ISO_NUMBER", "SPOOL_NUMBER", "FLANGE_NUMBER", "FLANGE_RATING", "DIAMETER_INCH", "BOLT_SIZE", "BOLT_QUANTITY", "JOINT_TYPE"]

export function addDays(isoDate: string, days: number): string {
  const value = new Date(`${isoDate}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function resolveStartDate(existing: { startDate: string } | null, today: string, newStart: boolean): string {
  if (existing && !newStart) return existing.startDate
  return addDays(today, -START_OFFSET_DAYS)
}

function spoolgenMatrices(isos: readonly UpgIso[]): Record<keyof SpoolgenTexts, Cell[][]> {
  const weld: Cell[][] = [WELD_HEADER]
  const trace: Cell[][] = [TRACE_HEADER]
  const supp: Cell[][] = [SUPP_HEADER]
  const bolt: Cell[][] = [BOLT_HEADER]
  for (const iso of isos) {
    const spec = SERVICE_CLASSES[iso.serviceClass]
    for (const spool of iso.spools) {
      for (const w of spool.welds) {
        weld.push([iso.isoNumber, iso.revision, iso.pdsArea, iso.serviceClass, iso.lineNumber, spool.spoolNumber, spool.weightKg, iso.serviceClass, w.weldNumber, w.weldType, w.location, w.diameterInch, w.thicknessMm])
      }
      for (const line of spool.materials) {
        trace.push([iso.isoNumber, spool.spoolNumber, line.identCode, line.description, line.quantity, line.unit, line.traceNumber])
      }
      supp.push([iso.isoNumber, spool.spoolNumber, spool.supportNumber, spool.supportType, "1"])
      bolt.push([iso.isoNumber, spool.spoolNumber, spool.flangeNumber, spec.flangeRating, iso.mainDiameter, spool.boltSize, spool.boltQuantity, "Flange"])
    }
  }
  return { weld, trace, supp, bolt }
}

const toText = (matrix: Cell[][]): string => matrix.map((row) => row.join("\t")).join("\n") + "\n"

export function spoolgenFiles(isos: readonly UpgIso[]): SpoolgenTexts {
  const m = spoolgenMatrices(isos)
  return { weld: toText(m.weld), trace: toText(m.trace), supp: toText(m.supp), bolt: toText(m.bolt) }
}

export function revisionFiles(): SpoolgenTexts {
  const iso = UPG_ISOS.find((candidate) => candidate.isoNumber === REVISION_ISO)
  if (!iso) throw new Error(`${REVISION_ISO} is missing from the dataset.`)
  return spoolgenFiles([revisionR1(iso)])
}

export function errorFiles(): { weld: string } {
  return { weld: spoolgenFiles([errorIso()]).weld }
}

function pmlMatrix(): Cell[][] {
  const seen = new Map<string, Cell[]>()
  let receipt = 1
  for (const iso of UPG_ISOS) {
    for (const line of iso.spools.flatMap((spool) => spool.materials)) {
      const key = `${line.identCode}|${line.traceNumber}`
      if (seen.has(key)) continue
      seen.set(key, [`MRR-UPG-${String(receipt).padStart(3, "0")}`, line.identCode, line.traceNumber])
      receipt += 1
    }
  }
  return [templateHeaderRow("piping_material_list"), ...seen.values()]
}

/** Procedures are approved before work starts, so a weld recorded in week 1 finds a valid WPS. */
const WPS_APPROVED_DAYS_BEFORE_START = 14
/** Welders are qualified for the whole 8-week run and well beyond it. */
const WELDER_QUALIFIED_DAYS_AFTER_START = 730

function wpsMatrix(startDate: string): Cell[][] {
  const approvedOn = addDays(startDate, -WPS_APPROVED_DAYS_BEFORE_START)
  return [
    templateHeaderRow("welding_procedure"),
    ...WELDING_PROCEDURES.map((wps) => [wps.code, wps.subcontractor, wps.materialType, wps.diameterFrom, wps.diameterTo, wps.thicknessFrom, wps.thicknessTo, approvedOn]),
  ]
}

function weldersMatrix(startDate: string): Cell[][] {
  const expiresOn = addDays(startDate, WELDER_QUALIFIED_DAYS_AFTER_START)
  return [
    templateHeaderRow("welder_qualification"),
    ...WELDERS.map((welder) => [welder.code, welder.name, welder.subcontractor, welder.wpsCodes.join(","), expiresOn]),
  ]
}

function thicknessMatrix(): Cell[][] {
  const rows: Cell[][] = []
  for (const spec of Object.values(SERVICE_CLASSES)) {
    for (const [diameter, thickness] of Object.entries(spec.thicknessByDiameter)) {
      rows.push([spec.code, Number(diameter), thickness, spec.flangeRating])
    }
  }
  return [templateHeaderRow("thickness_flange"), ...rows]
}

function ndeMatrix(): Cell[][] {
  // Column order: Service Class, Weld Type, Weld Location, RT %, UT %, MT %, PT %, PMI %, HT %.
  return [
    templateHeaderRow("nde_matrix"),
    ...NDE_IMPORT_RULES.map((rule) => [rule.serviceClass, rule.weldType, rule.location, rule.rt, 0, rule.mt, rule.pt, 0, 0]),
  ]
}

/**
 * One row per ISO: the import's natural key is (test pack, ISO). The spool columns name one spool
 * of the accepted revision as a cross-check. "Spool Revision" is, as in the manual, the ISO revision
 * the spool last changed in: R0 for every spool here. The server does not compare it.
 */
function compositionMatrix(startDate: string): Cell[][] {
  const rows: Cell[][] = []
  for (const group of ISO_GROUPS) {
    for (const iso of UPG_ISOS.filter((candidate) => candidate.testPack === group.testPack)) {
      rows.push([
        group.systemCode, group.subsystemCode, group.testPack, 0, "H", group.testPressureBar,
        addDays(startDate, 42), addDays(startDate, 55), group.priority, group.serviceClass, LINE_SERVICE,
        2.5, group.pdsArea, iso.isoNumber, iso.revision, iso.spools[0].spoolNumber, iso.revision,
      ])
    }
  }
  return [templateHeaderRow("test_pack_composition"), ...rows]
}

export function importSheets(startDate: string): ImportSheet[] {
  return [
    { importType: "piping_material_list", fileName: "01-pml.xlsx", title: "PML", matrix: pmlMatrix() },
    { importType: "welding_procedure", fileName: "02-wps.xlsx", title: "WPS", matrix: wpsMatrix(startDate) },
    { importType: "welder_qualification", fileName: "03-welders.xlsx", title: "Сварщики", matrix: weldersMatrix(startDate) },
    { importType: "thickness_flange", fileName: "04-thickness.xlsx", title: "Толщины", matrix: thicknessMatrix() },
    { importType: "nde_matrix", fileName: "05-nde-matrix.xlsx", title: "NDE", matrix: ndeMatrix() },
    { importType: "test_pack_composition", fileName: "06-test-packs.xlsx", title: "Тест-пакеты", matrix: compositionMatrix(startDate) },
  ]
}

export const README_LINES: readonly string[] = [
  "Демо-проект UPG-1 — порядок загрузки",
  "1. Настройка проекта → Описание: создать проект UPG-1 (код, название, заказчик, подрядчик — лист «Ввести вручную»).",
  "2. В терминале: npm run demo:project-setup -- --project UPG-1 --phase references",
  "3. Настройка проекта → Импорт: файлы imports/01…05 по порядку.",
  "4. Справочники проекта → NDE-матрица: ввести руками два правила CS300 с PWHT (лист «Ввести вручную»).",
  "5. Спулинг → Импорт: сначала error/weld.txt (ожидаем блокер), затем spooling/weld, trace, bolt, supp.",
  "6. Test Packs → Импорт состава: imports/06-test-packs.xlsx.",
  "7. Неделя 3: Спулинг → Импорт revision/*.txt и решения по ревизии.",
]

function manualSheet(): Cell[][] {
  const rows: Cell[][] = [["Что", "Код", "Описание"]]
  rows.push(["Проект", "UPG-1", "Установка подготовки газа УПГ-1; заказчик ТОО «Демо Газ»; подрядчик ТОО «Демо Монтаж»; договор DM-2026-014; транзит 3 дня"])
  for (const area of PDS_AREAS) rows.push(["PDS-зона", area.code, area.description])
  for (const spec of Object.values(SERVICE_CLASSES)) rows.push(["Класс", spec.code, `${spec.description}; материал ${spec.materialTypeCode}`])
  for (const system of SYSTEMS) {
    rows.push(["Система", system.code, system.description])
    for (const sub of system.subsystems) rows.push(["Подсистема", sub.code, sub.description])
  }
  for (const rule of PWHT_FORM_RULES) {
    rows.push(["NDE-правило с PWHT (форма)", `${rule.serviceClass} ${rule.weldType} ${rule.location}`, `RT ${rule.rt}%, PWHT от ${rule.pwhtThresholdMm} мм`])
  }
  return rows
}

export function workbookSheets(startDate: string): { name: string; matrix: Cell[][] }[] {
  const spooling = spoolgenMatrices(UPG_ISOS)
  return [
    { name: "README", matrix: README_LINES.map((line) => [line]) },
    { name: "Ввести вручную", matrix: manualSheet() },
    ...importSheets(startDate).filter((sheet) => sheet.importType !== "test_pack_composition").map((sheet) => ({ name: sheet.title, matrix: sheet.matrix })),
    { name: "WELD", matrix: spooling.weld },
    { name: "TRACE", matrix: spooling.trace },
    { name: "BOLT", matrix: spooling.bolt },
    { name: "SUPP", matrix: spooling.supp },
    { name: "Тест-пакеты", matrix: compositionMatrix(startDate) },
  ]
}

export { ERROR_ISO }
