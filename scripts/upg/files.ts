/**
 * Pure builders for the demo-project files: the four SpoolGen texts the manual prescribes (§13.1),
 * one Excel matrix per import (the import reads only the first sheet), and the sheets of the master
 * workbook a person opens in Excel.
 */
import { templateHeaderRow, type ImportType } from "../../modules/imports/domain/import-type"
import { errorIso, isosOf, revisionR1 } from "./builders"
import type { ProjectSpec, UpgIso } from "./spec"

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

function spoolgenMatrices(spec: ProjectSpec, isos: readonly UpgIso[]): Record<keyof SpoolgenTexts, Cell[][]> {
  const weld: Cell[][] = [WELD_HEADER]
  const trace: Cell[][] = [TRACE_HEADER]
  const supp: Cell[][] = [SUPP_HEADER]
  const bolt: Cell[][] = [BOLT_HEADER]
  for (const iso of isos) {
    const classSpec = spec.serviceClasses[iso.serviceClass]
    for (const spool of iso.spools) {
      for (const w of spool.welds) {
        weld.push([iso.isoNumber, iso.revision, iso.pdsArea, iso.serviceClass, iso.lineNumber, spool.spoolNumber, spool.weightKg, iso.serviceClass, w.weldNumber, w.weldType, w.location, w.diameterInch, w.thicknessMm])
      }
      for (const line of spool.materials) {
        trace.push([iso.isoNumber, spool.spoolNumber, line.identCode, line.description, line.quantity, line.unit, line.traceNumber])
      }
      supp.push([iso.isoNumber, spool.spoolNumber, spool.supportNumber, spool.supportType, "1"])
      bolt.push([iso.isoNumber, spool.spoolNumber, spool.flangeNumber, classSpec.flangeRating, iso.mainDiameter, spool.boltSize, spool.boltQuantity, "Flange"])
    }
  }
  return { weld, trace, supp, bolt }
}

const toText = (matrix: Cell[][]): string => matrix.map((row) => row.join("\t")).join("\n") + "\n"

export function spoolgenFiles(spec: ProjectSpec, isos: readonly UpgIso[]): SpoolgenTexts {
  const m = spoolgenMatrices(spec, isos)
  return { weld: toText(m.weld), trace: toText(m.trace), supp: toText(m.supp), bolt: toText(m.bolt) }
}

export function revisionFiles(spec: ProjectSpec): SpoolgenTexts | null {
  if (!spec.special.revision) return null
  const { iso: revisionIso } = spec.special.revision
  const iso = isosOf(spec).find((candidate) => candidate.isoNumber === revisionIso)
  if (!iso) throw new Error(`${revisionIso} is missing from the dataset.`)
  return spoolgenFiles(spec, [revisionR1(spec, iso)])
}

export function errorFiles(spec: ProjectSpec): { weld: string } | null {
  const iso = errorIso(spec)
  if (!iso) return null
  return { weld: spoolgenFiles(spec, [iso]).weld }
}

function pmlMatrix(spec: ProjectSpec): Cell[][] {
  const seen = new Map<string, Cell[]>()
  let receipt = 1
  for (const iso of isosOf(spec)) {
    for (const line of iso.spools.flatMap((spool) => spool.materials)) {
      const key = `${line.identCode}|${line.traceNumber}`
      if (seen.has(key)) continue
      seen.set(key, [`MRR-${spec.isoPrefix}-${String(receipt).padStart(3, "0")}`, line.identCode, line.traceNumber])
      receipt += 1
    }
  }
  return [templateHeaderRow("piping_material_list"), ...seen.values()]
}

/** Procedures are approved before work starts, so a weld recorded in week 1 finds a valid WPS. */
const WPS_APPROVED_DAYS_BEFORE_START = 14
/** Welders are qualified for the whole 8-week run and well beyond it. */
const WELDER_QUALIFIED_DAYS_AFTER_START = 730

function wpsMatrix(spec: ProjectSpec, startDate: string): Cell[][] {
  const approvedOn = addDays(startDate, -WPS_APPROVED_DAYS_BEFORE_START)
  return [
    templateHeaderRow("welding_procedure"),
    ...spec.weldingProcedures.map((wps) => [wps.code, wps.subcontractor, wps.materialType, wps.diameterFrom, wps.diameterTo, wps.thicknessFrom, wps.thicknessTo, approvedOn]),
  ]
}

function weldersMatrix(spec: ProjectSpec, startDate: string): Cell[][] {
  const expiresOn = addDays(startDate, WELDER_QUALIFIED_DAYS_AFTER_START)
  return [
    templateHeaderRow("welder_qualification"),
    ...spec.welders.map((welder) => [welder.code, welder.name, welder.subcontractor, welder.wpsCodes.join(","), expiresOn]),
  ]
}

function thicknessMatrix(spec: ProjectSpec): Cell[][] {
  const rows: Cell[][] = []
  for (const sc of Object.values(spec.serviceClasses)) {
    for (const [diameter, thickness] of Object.entries(sc.thicknessByDiameter)) {
      rows.push([sc.code, Number(diameter), thickness, sc.flangeRating])
    }
  }
  return [templateHeaderRow("thickness_flange"), ...rows]
}

function ndeMatrix(spec: ProjectSpec): Cell[][] {
  // Column order: Service Class, Weld Type, Weld Location, RT %, UT %, MT %, PT %, PMI %, HT %.
  return [
    templateHeaderRow("nde_matrix"),
    ...spec.ndeImportRules.map((rule) => [rule.serviceClass, rule.weldType, rule.location, rule.rt, 0, rule.mt, rule.pt, 0, 0]),
  ]
}

/**
 * One row per ISO: the import's natural key is (test pack, ISO). The spool columns name one spool
 * of the accepted revision as a cross-check. "Spool Revision" is, as in the manual, the ISO revision
 * the spool last changed in: R0 for every spool here. The server does not compare it.
 */
function compositionMatrix(spec: ProjectSpec, startDate: string): Cell[][] {
  const rows: Cell[][] = []
  const isos = isosOf(spec)
  for (const group of spec.isoGroups) {
    for (const iso of isos.filter((candidate) => candidate.testPack === group.testPack)) {
      rows.push([
        group.systemCode, group.subsystemCode, group.testPack, 0, "H", group.testPressureBar,
        addDays(startDate, 42), addDays(startDate, 55), group.priority, group.serviceClass, spec.lineService,
        2.5, group.pdsArea, iso.isoNumber, iso.revision, iso.spools[0].spoolNumber, iso.revision,
      ])
    }
  }
  return [templateHeaderRow("test_pack_composition"), ...rows]
}

export function importSheets(spec: ProjectSpec, startDate: string): ImportSheet[] {
  return [
    { importType: "piping_material_list", fileName: "01-pml.xlsx", title: "PML", matrix: pmlMatrix(spec) },
    { importType: "welding_procedure", fileName: "02-wps.xlsx", title: "WPS", matrix: wpsMatrix(spec, startDate) },
    { importType: "welder_qualification", fileName: "03-welders.xlsx", title: "Сварщики", matrix: weldersMatrix(spec, startDate) },
    { importType: "thickness_flange", fileName: "04-thickness.xlsx", title: "Толщины", matrix: thicknessMatrix(spec) },
    { importType: "nde_matrix", fileName: "05-nde-matrix.xlsx", title: "NDE", matrix: ndeMatrix(spec) },
    { importType: "test_pack_composition", fileName: "06-test-packs.xlsx", title: "Тест-пакеты", matrix: compositionMatrix(spec, startDate) },
  ]
}

const COUNT_WORDS: Record<number, string> = { 1: "одно", 2: "два", 3: "три", 4: "четыре" }

export function readmeLines(spec: ProjectSpec): string[] {
  const code = spec.project.activityCode
  const steps: string[] = [
    `Настройка проекта → Описание: создать проект ${code} (код, название, заказчик, подрядчик — лист «Ввести вручную»).`,
    `В терминале: npm run demo:project-setup -- --project ${code} --phase references` + (spec.id === "upg" ? "" : ` --dataset ${spec.id}`),
    "Настройка проекта → Импорт: файлы imports/01…05 по порядку.",
  ]
  if (spec.pwhtFormRules.length > 0) {
    const words = COUNT_WORDS[spec.pwhtFormRules.length] ?? String(spec.pwhtFormRules.length)
    const classes = [...new Set(spec.pwhtFormRules.map((rule) => rule.serviceClass))].join(", ")
    steps.push(`Справочники проекта → NDE-матрица: ввести руками ${words} правила ${classes} с PWHT (лист «Ввести вручную»).`)
  }
  const errorPart = errorIso(spec) !== null ? "сначала error/weld.txt (ожидаем блокер), затем " : ""
  steps.push(`Спулинг → Импорт: ${errorPart}spooling/weld, trace, bolt, supp.`)
  steps.push("Test Packs → Импорт состава: imports/06-test-packs.xlsx.")
  if (spec.special.revision) {
    steps.push("Неделя 3: Спулинг → Импорт revision/*.txt и решения по ревизии.")
  }
  return [
    `Демо-проект ${code} — порядок загрузки`,
    ...steps.map((text, i) => `${i + 1}. ${text}`),
  ]
}

export function workbookFileName(spec: ProjectSpec): string {
  return `${spec.project.activityCode}.xlsx`
}

function pluralDays(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return "дней"
  const mod10 = n % 10
  if (mod10 === 1) return "день"
  if (mod10 >= 2 && mod10 <= 4) return "дня"
  return "дней"
}

function manualSheet(spec: ProjectSpec): Cell[][] {
  const { project } = spec
  const days = `${project.maxTransitTimeDays} ${pluralDays(project.maxTransitTimeDays)}`
  const rows: Cell[][] = [["Что", "Код", "Описание"]]
  rows.push(["Проект", project.activityCode, `${project.projectTitle}; заказчик ${project.owner}; подрядчик ${project.contractor}; договор ${project.contractNumber}; транзит ${days}`])
  for (const area of spec.pdsAreas) rows.push(["PDS-зона", area.code, area.description])
  for (const sc of Object.values(spec.serviceClasses)) rows.push(["Класс", sc.code, `${sc.description}; материал ${sc.materialTypeCode}`])
  for (const system of spec.systems) {
    rows.push(["Система", system.code, system.description])
    for (const sub of system.subsystems) rows.push(["Подсистема", sub.code, sub.description])
  }
  for (const rule of spec.pwhtFormRules) {
    rows.push(["NDE-правило с PWHT (форма)", `${rule.serviceClass} ${rule.weldType} ${rule.location}`, `RT ${rule.rt}%, PWHT от ${rule.pwhtThresholdMm} мм`])
  }
  return rows
}

export function workbookSheets(spec: ProjectSpec, startDate: string): { name: string; matrix: Cell[][] }[] {
  const spooling = spoolgenMatrices(spec, isosOf(spec))
  return [
    { name: "README", matrix: readmeLines(spec).map((line) => [line]) },
    { name: "Ввести вручную", matrix: manualSheet(spec) },
    ...importSheets(spec, startDate).filter((sheet) => sheet.importType !== "test_pack_composition").map((sheet) => ({ name: sheet.title, matrix: sheet.matrix })),
    { name: "WELD", matrix: spooling.weld },
    { name: "TRACE", matrix: spooling.trace },
    { name: "BOLT", matrix: spooling.bolt },
    { name: "SUPP", matrix: spooling.supp },
    { name: "Тест-пакеты", matrix: compositionMatrix(spec, startDate) },
  ]
}
