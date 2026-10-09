// scripts/upg/weeks.ts
/**
 * The eight construction weeks of UPG-1 as a list of actions with project days.
 *
 * Pure. Spool steps follow the order the commands enforce (material before release, start before
 * Sent to Paint, final QC before laydown, To Site before Erected…); release before paint is our
 * order, not a command rule. Cohort steps (NDE rounds) and
 * test pack steps sit on fixed days. Manual actions are what the walkthrough records by hand.
 */
import {
  OVERDUE_SPOOL,
  PWHT_THRESHOLD_MM,
  REJECT_WELD,
  REVISION_ISO,
  REVISION_WELD,
  UPG_ISOS,
  type Cohort,
  type UpgIso,
  type UpgSpool,
} from "./dataset"

export const UPG_WEEK_COUNT = 8
export const weekOfDay = (day: number): number => Math.floor(day / 7) + 1

export const SITUATIONS = [
  "nde_batch", "nde_reject_repair_tracer", "pwht_required", "qc_release", "paint_dft", "laydown",
  "tracking_in_out", "transit_overdue", "field_welding_nde", "field_supports", "spool_rft",
  "flange_bolting", "flange_y", "flange_z", "line_check_with_x", "x_cleared", "blinding",
  "testing", "y_reinstatement", "precommissioning", "z_reinstatement",
  "revision_during_fabrication", "partial_welding", "pack_blocked_upstream",
] as const
export type Situation = (typeof SITUATIONS)[number]

interface Common {
  readonly day: number
  readonly manual: boolean
  readonly situation?: Situation
  readonly requiresRevision?: boolean
}

export type UpgAction = Common &
  (
    | { kind: "stage"; phase: "fabrication" | "erection"; stage: "start_fab" | "sent_to_paint" | "to_site" | "erected" | "welded_bolted" | "supported"; spool: string }
    | { kind: "material_check"; spool: string }
    | { kind: "weld"; phase: "fabrication" | "erection"; spool: string; weld: string }
    | { kind: "support"; spool: string }
    | { kind: "field_support_probe"; spool: string }
    | { kind: "pwht"; spool: string }
    | { kind: "qc_release"; spool: string }
    | { kind: "paint"; spool: string; finalQcDay: number }
    | { kind: "laydown"; spool: string }
    | { kind: "tracking"; spool: string; location: "LAYDOWN-A" | "SITE-A"; direction: "in" | "out" }
    | { kind: "flange"; spool: string; flange: string; category: "X" | "Y" | "Z" }
    | { kind: "nde_round"; label: string; spools: readonly string[]; reject: readonly string[] }
    | { kind: "line_check"; testPack: string; resultDay: number; punches: readonly { iso: string; description: string }[] }
    | { kind: "item_clearance"; testPack: string; clearDay: number }
    | { kind: "blinding"; testPack: string; recordDay: number }
    | { kind: "pressure_stage"; testPack: string; stage: "testing_started" | "testing_completed" | "precommissioning_completed" }
    | { kind: "reinstatement"; testPack: string; category: "Y" | "Z"; recordDay: number }
    | { kind: "revision"; iso: string }
  )

const COHORT_START: Readonly<Record<Cohort, number>> = { A: 0, B: 3, C: 14, D: 28 }
const MANUAL_PACK = "TP-100-01"

const flangeCategory = (iso: UpgIso, spoolIndex: number): "X" | "Y" | "Z" =>
  spoolIndex !== 0 ? "X" : iso.groupIndex === 1 ? "Y" : iso.groupIndex === 2 ? "Z" : "X"

const hasThickWeld = (iso: UpgIso, spool: UpgSpool, location: "shop" | "field"): boolean =>
  iso.serviceClass === "CS300" && spool.welds.some((weld) => weld.location === location && weld.thicknessMm >= PWHT_THRESHOLD_MM)

function spoolActions(iso: UpgIso, spool: UpgSpool, spoolIndex: number): UpgAction[] {
  const start = COHORT_START[iso.cohort] + (iso.groupIndex % 3)
  const manual = iso.thread
  const s = spool.spoolNumber
  const out: UpgAction[] = []
  const push = (action: UpgAction) => out.push(action)
  const shopWelds = spool.welds.filter((weld) => weld.location === "shop" && weld.weldNumber !== REVISION_WELD)

  push({ kind: "stage", phase: "fabrication", stage: "start_fab", spool: s, day: start, manual })
  push({ kind: "material_check", spool: s, day: start + 1, manual })

  const welded = iso.cohort === "D" ? shopWelds.slice(0, Math.ceil(shopWelds.length / 2)) : shopWelds
  welded.forEach((weld, index) =>
    push({ kind: "weld", phase: "fabrication", spool: s, weld: weld.weldNumber, day: start + 2 + index, manual, situation: iso.cohort === "D" ? "partial_welding" : undefined }),
  )
  if (iso.cohort === "D") return out

  push({ kind: "support", spool: s, day: start + 9, manual })
  if (iso.isoNumber === REVISION_ISO && spoolIndex === 0) {
    push({ kind: "weld", phase: "fabrication", spool: s, weld: REVISION_WELD, day: COHORT_START.B + 13, manual, requiresRevision: true })
  }
  if (hasThickWeld(iso, spool, "shop")) push({ kind: "pwht", spool: s, day: start + 14, manual, situation: "pwht_required" })
  push({ kind: "qc_release", spool: s, day: start + 15, manual, situation: "qc_release" })
  push({ kind: "stage", phase: "fabrication", stage: "sent_to_paint", spool: s, day: start + 16, manual })
  push({ kind: "paint", spool: s, day: start + 18, finalQcDay: start + 19, manual, situation: "paint_dft" })
  push({ kind: "laydown", spool: s, day: start + 20, manual, situation: "laydown" })
  push({ kind: "tracking", spool: s, location: "LAYDOWN-A", direction: "in", day: start + 20, manual, situation: "tracking_in_out" })
  // A spool leaves the laydown only to go to site; the overdue spool leaves and never arrives.
  const erects = iso.cohort === "A" || iso.cohort === "B" || iso.groupIndex < 6
  if (!erects && s !== OVERDUE_SPOOL) return out
  push({ kind: "tracking", spool: s, location: "LAYDOWN-A", direction: "out", day: start + 22, manual, situation: s === OVERDUE_SPOOL ? "transit_overdue" : undefined })
  if (s === OVERDUE_SPOOL) return out
  push({ kind: "tracking", spool: s, location: "SITE-A", direction: "in", day: start + 23, manual })
  push({ kind: "stage", phase: "erection", stage: "to_site", spool: s, day: start + 23, manual })
  push({ kind: "stage", phase: "erection", stage: "erected", spool: s, day: start + 25, manual })
  const fieldWelds = spool.welds.filter((weld) => weld.location === "field")
  const fieldWelding = iso.cohort === "A" || iso.cohort === "B" || iso.groupIndex < 4
  if (fieldWelding) {
    for (const weld of fieldWelds) push({ kind: "weld", phase: "erection", spool: s, weld: weld.weldNumber, day: start + 26, manual })
  }
  if (iso.cohort === "C") return out

  if (hasThickWeld(iso, spool, "field")) push({ kind: "pwht", spool: s, day: start + 30, manual, situation: "pwht_required" })
  push({ kind: "stage", phase: "erection", stage: "welded_bolted", spool: s, day: start + 31, manual })
  push({ kind: "stage", phase: "erection", stage: "supported", spool: s, day: start + 32, manual, situation: "spool_rft" })
  const category = flangeCategory(iso, spoolIndex)
  push({
    kind: "flange", spool: s, flange: spool.flangeNumber, category, day: start + 32, manual,
    situation: category === "Y" ? "flange_y" : category === "Z" ? "flange_z" : "flange_bolting",
  })
  return out
}

// The thread spools are welded by hand in the walkthrough, but their NDE comes back with their
// cohort's round like any other spool's, or they could never be released.
function cohortSpools(cohort: Cohort): string[] {
  return UPG_ISOS.filter((iso) => iso.cohort === cohort).flatMap((iso) => iso.spools.map((spool) => spool.spoolNumber))
}

function roundActions(): UpgAction[] {
  const round = (label: string, cohort: Cohort, offset: number, situation: Situation, reject: string[] = []): UpgAction =>
    ({ kind: "nde_round", label, spools: cohortSpools(cohort), reject, day: COHORT_START[cohort] + offset, manual: false, situation })
  return [
    round("A-shop", "A", 11, "nde_batch", [REJECT_WELD]),
    round("A-repair", "A", 13, "nde_reject_repair_tracer"),
    round("B-shop", "B", 11, "nde_batch"),
    { kind: "nde_round", label: "B-revision", spools: [`${REVISION_ISO}-S1`], reject: [], day: COHORT_START.B + 14, manual: false, requiresRevision: true },
    round("C-shop", "C", 11, "nde_batch"),
    round("D-shop", "D", 11, "nde_batch"),
    round("A-field", "A", 29, "field_welding_nde"),
    round("B-field", "B", 29, "field_welding_nde"),
  ]
}

function packActions(): UpgAction[] {
  const pack = (testPack: string) => ({ testPack, manual: testPack === MANUAL_PACK })
  const a = (testPack: string): UpgAction[] => [
    { kind: "line_check", ...pack(testPack), day: 42, resultDay: 43, situation: "line_check_with_x",
      punches: testPack === MANUAL_PACK ? [{ iso: "UPG-100-1003", description: "Не установлена бирка на опоре" }] : [{ iso: "UPG-100-1009", description: "Не затянуты болты хомута опоры" }] },
    { kind: "item_clearance", ...pack(testPack), day: 44, clearDay: 45, situation: "x_cleared" },
    { kind: "blinding", ...pack(testPack), day: 46, recordDay: 46, situation: "blinding" },
    { kind: "pressure_stage", ...pack(testPack), stage: "testing_started", day: 47, situation: "testing" },
    { kind: "pressure_stage", ...pack(testPack), stage: "testing_completed", day: 48 },
    { kind: "reinstatement", ...pack(testPack), category: "Y", day: 49, recordDay: 50, situation: "y_reinstatement" },
    { kind: "pressure_stage", ...pack(testPack), stage: "precommissioning_completed", day: 52, situation: "precommissioning" },
    { kind: "reinstatement", ...pack(testPack), category: "Z", day: 53, recordDay: 54, situation: "z_reinstatement" },
  ]
  return [
    ...a("TP-100-01"),
    ...a("TP-100-02"),
    { kind: "line_check", ...pack("TP-200-01"), day: 43, resultDay: 44, punches: [] },
    { kind: "blinding", ...pack("TP-200-01"), day: 45, recordDay: 45 },
    { kind: "pressure_stage", ...pack("TP-200-01"), stage: "testing_started", day: 47 },
    { kind: "pressure_stage", ...pack("TP-200-01"), stage: "testing_completed", day: 50 },
    { kind: "line_check", ...pack("TP-200-02"), day: 44, resultDay: 45,
      punches: [{ iso: "UPG-200-2010", description: "Отсутствует заглушка на дренаже" }, { iso: "UPG-200-2011", description: "Повреждено покрытие у опоры" }] },
    { kind: "item_clearance", ...pack("TP-200-02"), day: 50, clearDay: 51 },
  ]
}

export function buildProjectPlan(): UpgAction[] {
  const actions: UpgAction[] = []
  for (const iso of UPG_ISOS) iso.spools.forEach((spool, index) => actions.push(...spoolActions(iso, spool, index)))
  const probe = UPG_ISOS.find((iso) => iso.cohort === "A" && !iso.thread)!.spools[0].spoolNumber
  actions.push({ kind: "field_support_probe", spool: probe, day: 30, manual: false, situation: "field_supports" })
  actions.push({ kind: "revision", iso: REVISION_ISO, day: COHORT_START.B + 12, manual: true, situation: "revision_during_fabrication" })
  actions.push(...roundActions(), ...packActions())
  return actions.map((action, order) => ({ action, order }))
    .sort((left, right) => left.action.day - right.action.day || left.order - right.order)
    .map(({ action }) => action)
}

export function buildWeekPlan(week: number, includeManual: boolean): UpgAction[] {
  return buildProjectPlan().filter((action) => weekOfDay(action.day) === week && (includeManual || !action.manual))
}

const STAGE_LABEL: Record<string, string> = {
  start_fab: "начало изготовления", sent_to_paint: "отправлена на покраску", to_site: "на площадке",
  erected: "смонтирована", welded_bolted: "сварено/собрано", supported: "закреплена",
}

export function describeAction(action: UpgAction): string {
  switch (action.kind) {
    case "stage": return `${action.spool}: ${STAGE_LABEL[action.stage]}`
    case "material_check": return `${action.spool}: проверка материалов`
    case "weld": return `${action.spool}: ${action.phase === "erection" ? "монтажная" : "цеховая"} сварка стыка ${action.weld}`
    case "support": return `${action.spool}: установка опоры в цеху`
    case "field_support_probe": return `${action.spool}: попытка записать опору на монтаже`
    case "pwht": return `${action.spool}: термообработка (PWHT)`
    case "qc_release": return `${action.spool}: выпуск QC`
    case "paint": return `${action.spool}: покраска и итоговый контроль`
    case "laydown": return `${action.spool}: на склад LAYDOWN-A`
    case "tracking": return `${action.spool}: ${action.direction === "in" ? "приход на" : "уход с"} ${action.location}`
    case "flange": return `${action.spool}: сборка фланца ${action.flange}, категория ${action.category}`
    case "nde_round": return `NDE-раунд ${action.label}: ${action.spools.length} катушек${action.reject.length ? `, брак ${action.reject.join(", ")}` : ""}`
    case "line_check": return `${action.testPack}: проверка линии, замечаний ${action.punches.length}`
    case "item_clearance": return `${action.testPack}: закрытие замечаний X`
    case "blinding": return `${action.testPack}: установка заглушек`
    case "pressure_stage": return `${action.testPack}: ${action.stage === "testing_started" ? "начало испытания" : action.stage === "testing_completed" ? "испытание завершено" : "пусконаладка завершена"}`
    case "reinstatement": return `${action.testPack}: восстановление фланцев ${action.category}`
    case "revision": return `${action.iso}: импорт ревизии R1 и решения по ревизии`
  }
}
