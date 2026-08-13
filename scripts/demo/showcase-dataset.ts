/**
 * The showcase dataset: eight isometrics carrying twelve weeks of backdated progress.
 *
 * Everything here is pure. The shape of the dataset — how many spools sit at which stage, and on
 * which dates — is decided and tested without a database, so a mistake surfaces in a unit test
 * rather than half-way through seeding a stand.
 *
 * Two rules this module exists to enforce:
 *
 * 1. **Time depth, not row count.** Charts need weekly buckets. Ten isometrics whose progress all
 *    lands on one date draw a vertical line; the same ten spread over twelve weeks draw an
 *    S-curve. Row counts stay deliberately small — far under PostgREST's `max_rows = 1000`.
 * 2. **Only recordable stages are emitted as stages.** `material_check`, `fabricated`,
 *    `qc_release`, `painted`, `final_qc` and `laydown` are derived
 *    (`construction_phase_stages.is_recordable = false`, seeded in
 *    `supabase/migrations/20260810091000_construction_phase_policy.sql`). They are produced by
 *    `record_material_check`, `record_weld_progress`, `release_quality_record`,
 *    `record_paint_progress` and `record_laydown`, whose dates travel in their own fields.
 */

import { addUtcDays } from "./manifest"

/** Weeks of history the dataset spans. Week 0 is the oldest, week 11 ends on the base date. */
export const SHOWCASE_WEEK_COUNT = 12

const WELDS_PER_SPOOL = 7
const SPOOL_LETTERS = ["A", "B"] as const

/** Referential codes, all seeded for the showcase project by `prepareProjectReferences`. */
const SERVICE_CLASS = "SC-CS150"
const MATERIAL_CLASS = "CS150"

/**
 * Bill-of-materials lines, keyed to receipts the manifest already seeds into
 * `piping_material_records`. `record_material_check` matches on ident code **and** trace number,
 * so both must exist in the PML or the check is refused with "Active piping material evidence is
 * missing".
 */
export const SHOWCASE_MATERIALS = [
  {
    identCode: "ID-DEMO-100",
    traceNumber: "HEAT-100-A",
    description: "Carbon steel pipe 6in",
    quantity: "2",
  },
  {
    identCode: "ID-DEMO-200",
    traceNumber: "HEAT-200-A",
    description: "Carbon steel elbow 6in",
    quantity: "1",
  },
] as const

export const SHOWCASE_ISO_NUMBERS = [
  "SHOW-1001",
  "SHOW-1002",
  "SHOW-1003",
  "SHOW-1004",
  "SHOW-1005",
  "SHOW-1006",
  "SHOW-1007",
  "SHOW-1008",
] as const

const PDS_AREA_BY_ISO: Readonly<Record<string, string>> = {
  "SHOW-1001": "PDS-100",
  "SHOW-1002": "PDS-100",
  "SHOW-1003": "PDS-100",
  "SHOW-1004": "PDS-200",
  "SHOW-1005": "PDS-200",
  "SHOW-1006": "PDS-200",
  "SHOW-1007": "PDS-300",
  "SHOW-1008": "PDS-300",
}

/**
 * How far along the fabrication ladder a spool has travelled. Each rung implies every rung below
 * it, so `laydown` means the spool has a start date, a material check, every weld, a quality
 * release, a paint record and a laydown record.
 */
export type ShowcaseLadderRung =
  | "none"
  | "material_check"
  | "welding"
  | "qc_release"
  | "painted"
  | "laydown"

interface LadderEntry {
  readonly rung: ShowcaseLadderRung
  /** Week the spool starts fabrication in. Later rungs consume the weeks after it. */
  readonly startWeek: number
  /** Whether the spool continues into erection. Only fully fabricated spools do. */
  readonly erection?: "partial" | "rft"
}

/**
 * Sixteen spools laddered so the cumulative curve rises across the whole window instead of
 * stepping once. `SP-1008-B` is deliberately untouched: the module sweep needs a spool with
 * nothing recorded, and the edit pass needs somewhere safe to record a first date.
 */
const SPOOL_LADDER: Readonly<Record<string, LadderEntry>> = {
  "SP-1001-A": { rung: "laydown", startWeek: 0, erection: "rft" },
  "SP-1001-B": { rung: "laydown", startWeek: 0, erection: "partial" },
  "SP-1002-A": { rung: "laydown", startWeek: 1, erection: "partial" },
  "SP-1002-B": { rung: "laydown", startWeek: 2, erection: "partial" },
  "SP-1003-A": { rung: "painted", startWeek: 1 },
  "SP-1003-B": { rung: "painted", startWeek: 2 },
  "SP-1004-A": { rung: "painted", startWeek: 3 },
  "SP-1004-B": { rung: "qc_release", startWeek: 3 },
  "SP-1005-A": { rung: "qc_release", startWeek: 4 },
  "SP-1005-B": { rung: "qc_release", startWeek: 5 },
  "SP-1006-A": { rung: "welding", startWeek: 5 },
  "SP-1006-B": { rung: "welding", startWeek: 7 },
  "SP-1007-A": { rung: "welding", startWeek: 8 },
  "SP-1007-B": { rung: "material_check", startWeek: 9 },
  "SP-1008-A": { rung: "material_check", startWeek: 10 },
  "SP-1008-B": { rung: "none", startWeek: 11 },
}

const RUNG_ORDER: readonly ShowcaseLadderRung[] = [
  "none",
  "material_check",
  "welding",
  "qc_release",
  "painted",
  "laydown",
]

function reaches(entry: LadderEntry, rung: ShowcaseLadderRung): boolean {
  return RUNG_ORDER.indexOf(entry.rung) >= RUNG_ORDER.indexOf(rung)
}

export interface ShowcaseStage {
  readonly phase: "fabrication" | "erection"
  readonly stage: string
  readonly occurredOn: string
}

export interface ShowcaseWeldedJoint {
  readonly weldNumber: string
  readonly weldedOn: string
  /**
   * Position in the welder rotation. The seeder maps it onto the welders actually qualified for
   * the WPS it selects, taking root from the rotation and cap from the next position — they must
   * differ, because `weld_point_assignments` is unique on
   * (weld_progress_record_id, welder_qualification_id).
   *
   * Welder identity is deliberately NOT decided here: `record_weld_progress` rejects a welder who
   * is not qualified for the record's WPS, and which welders hold which qualification is a fact
   * about the seeded referentials, not about the dataset's shape.
   */
  readonly welderRotation: number
}

export interface ShowcaseSpoolPlan {
  readonly isoNumber: string
  readonly spoolNumber: string
  /** Stages recorded through `record_construction_progress` / `record_erection_progress`. */
  readonly stages: readonly ShowcaseStage[]
  /** Dates for the derived-stage commands. Absent when the spool never reaches that stage. */
  readonly materialCheckOn?: string
  readonly supportsInstalledOn?: string
  readonly qualityReleaseOn?: string
  readonly paintedOn?: string
  readonly finalQcOn?: string
  readonly laydownOn?: string
  readonly weldedJoints: readonly ShowcaseWeldedJoint[]
}

export interface ShowcaseProgressPlan {
  readonly spools: readonly ShowcaseSpoolPlan[]
}

const isoSuffix = (isoNumber: string): string => isoNumber.replace("SHOW-", "")

export const showcaseSpoolNumber = (
  isoNumber: string,
  letter: string,
): string => `SP-${isoSuffix(isoNumber)}-${letter}`

export const showcaseWeldNumber = (
  spoolNumber: string,
  ordinal: number,
): string => `WJ-${spoolNumber.replace("SP-", "")}-${String(ordinal).padStart(2, "0")}`

/** Which welds on a spool sit in the field rather than the shop. */
function isFieldWeld(entry: LadderEntry, ordinal: number): boolean {
  return entry.erection !== undefined && ordinal > 5
}

/**
 * Service class, weld type and location together must hit a seeded NDE matrix rule, or the
 * server-side import revalidation raises `SRV_NDE_MATRIX_MISSING` and refuses the job. The
 * manifest covers `SC-CS150` for BW/shop, BW/field and SW/shop — but **not** SW/field, so field
 * welds are always butt welds. `SHOWCASE_WELD_COMBINATIONS` states the same fact for the tests.
 */
function weldType(location: string, ordinal: number): string {
  if (location === "field") return "BW"
  return ordinal % 3 === 0 ? "SW" : "BW"
}

/** Every (weld type, location) pair the generator is allowed to emit for `SC-CS150`. */
export const SHOWCASE_WELD_COMBINATIONS: readonly string[] = [
  "BW|shop",
  "SW|shop",
  "BW|field",
]

/**
 * Days after a spool's start week, one per ladder step. The commands enforce ordering — a release
 * cannot precede fabrication completion, laydown cannot precede final QC — so these must be
 * strictly increasing, and `stepDatesAreOrdered` in the tests holds them to it.
 */
const STEP_DAYS = {
  startFab: 0,
  materialCheck: 2,
  firstWeld: 7,
  supports: 15,
  qualityRelease: 17,
  sentToPaint: 19,
  painted: 21,
  finalQc: 23,
  laydown: 25,
  firstErection: 28,
} as const

/**
 * A date inside the twelve-week window. `dayFromStart` counts days after the spool's start week,
 * and the result is clamped so nothing lands in the future — a future progress date would be both
 * wrong and invisible on a chart that stops at today.
 */
function ladderDate(baseDate: Date, startWeek: number, dayFromStart: number): string {
  const oldest = -7 * (SHOWCASE_WEEK_COUNT - 1)
  return addUtcDays(baseDate, Math.min(oldest + startWeek * 7 + dayFromStart, 0))
}

export function buildShowcaseSpoolgenFiles(isoNumber: string): {
  weld: string
  trace: string
  supp: string
  bolt: string
} {
  const suffix = isoSuffix(isoNumber)
  const pdsArea = PDS_AREA_BY_ISO[isoNumber]
  if (!pdsArea) throw new Error(`${isoNumber} has no PDS area.`)

  const weldRows: string[] = []
  const traceRows: string[] = []
  const suppRows: string[] = []
  const boltRows: string[] = []

  for (const letter of SPOOL_LETTERS) {
    const spoolNumber = showcaseSpoolNumber(isoNumber, letter)
    const entry = SPOOL_LADDER[spoolNumber]
    if (!entry) throw new Error(`${spoolNumber} is not on the ladder.`)
    const weight = letter === "A" ? "120.5" : "98.0"

    for (let ordinal = 1; ordinal <= WELDS_PER_SPOOL; ordinal += 1) {
      const diameter = ordinal % 2 === 0 ? "4" : "6"
      const location = isFieldWeld(entry, ordinal) ? "field" : "shop"
      weldRows.push(
        [
          isoNumber,
          "R0",
          pdsArea,
          SERVICE_CLASS,
          `P-${suffix}`,
          spoolNumber,
          weight,
          MATERIAL_CLASS,
          showcaseWeldNumber(spoolNumber, ordinal),
          weldType(location, ordinal),
          location,
          diameter,
          diameter === "6" ? "8.2" : "6.0",
        ].join("\t"),
      )
    }

    // Material lines must resolve against the project's PML: `record_material_check` looks up
    // `piping_material_records` by ident code AND trace number, and refuses the item when no
    // active row matches. So these reuse the manifest's seeded receipts rather than inventing
    // codes. Unlike `demo-data/spoolgen/trace.txt`, the trace column is filled in — that file
    // leaves it blank for an operator to type during the live walkthrough.
    for (const material of SHOWCASE_MATERIALS) {
      traceRows.push(
        [
          isoNumber,
          spoolNumber,
          material.identCode,
          material.description,
          material.quantity,
          "EA",
          material.traceNumber,
        ].join("\t"),
      )
    }
    suppRows.push(
      [isoNumber, spoolNumber, `SUP-${suffix}-${letter}01`, "GUIDE", "2"].join("\t"),
    )
    boltRows.push(
      [isoNumber, spoolNumber, `FLG-${suffix}-${letter}01`, "150#", "6", '3/4"', "8", "Flange"].join("\t"),
    )
  }

  const WELD_HEADER = [
    "ISO_NUMBER", "ISO_REVISION", "PDS_AREA", "SERVICE_CLASS", "LINE_NUMBER", "SPOOL_NUMBER",
    "SPOOL_WEIGHT_KG", "MATERIAL_CLASS", "WELD_NUMBER", "WELD_TYPE", "WELD_LOCATION",
    "DIAMETER_INCH", "THICKNESS_MM",
  ].join("\t")
  const TRACE_HEADER = ["ISO_NUMBER", "SPOOL_NUMBER", "IDENT_CODE", "DESCRIPTION", "QUANTITY", "UNIT", "TRACE_NUMBER"].join("\t")
  const SUPP_HEADER = ["ISO_NUMBER", "SPOOL_NUMBER", "SUPPORT_NUMBER", "SUPPORT_TYPE", "QUANTITY"].join("\t")
  const BOLT_HEADER = ["ISO_NUMBER", "SPOOL_NUMBER", "FLANGE_NUMBER", "FLANGE_RATING", "DIAMETER_INCH", "BOLT_SIZE", "BOLT_QUANTITY", "JOINT_TYPE"].join("\t")

  return {
    weld: [WELD_HEADER, ...weldRows].join("\n") + "\n",
    trace: [TRACE_HEADER, ...traceRows].join("\n") + "\n",
    supp: [SUPP_HEADER, ...suppRows].join("\n") + "\n",
    bolt: [BOLT_HEADER, ...boltRows].join("\n") + "\n",
  }
}

export function buildShowcaseProgressPlan(baseDate: Date): ShowcaseProgressPlan {
  const spools: ShowcaseSpoolPlan[] = []
  let welderCursor = 0

  for (const isoNumber of SHOWCASE_ISO_NUMBERS) {
    for (const letter of SPOOL_LETTERS) {
      const spoolNumber = showcaseSpoolNumber(isoNumber, letter)
      const entry = SPOOL_LADDER[spoolNumber]
      if (!entry) throw new Error(`${spoolNumber} is not on the ladder.`)

      if (entry.rung === "none") {
        spools.push({ isoNumber, spoolNumber, stages: [], weldedJoints: [] })
        continue
      }

      const start = entry.startWeek
      const on = (dayFromStart: number) => ladderDate(baseDate, start, dayFromStart)
      const stages: ShowcaseStage[] = [
        { phase: "fabrication", stage: "start_fab", occurredOn: on(STEP_DAYS.startFab) },
      ]

      // A spool short of `qc_release` has only some of its welds done, which is what keeps
      // `fabricated` underived and leaves joints open for the edit pass.
      const weldedCount = reaches(entry, "qc_release") ? WELDS_PER_SPOOL : 4
      const weldedJoints: ShowcaseWeldedJoint[] = []
      for (let ordinal = 1; ordinal <= weldedCount; ordinal += 1) {
        // Field welds belong to the erection module: `record_weld_progress` refuses them with
        // "Joint … is a field weld and belongs to the assembly or erection module". They stay
        // unwelded here, which is also what happens on a real site.
        if (isFieldWeld(entry, ordinal)) continue
        weldedJoints.push({
          weldNumber: showcaseWeldNumber(spoolNumber, ordinal),
          // One weld a day, so `fabricated` lands before the support and release steps.
          weldedOn: on(STEP_DAYS.firstWeld + (ordinal - 1)),
          welderRotation: welderCursor++,
        })
      }

      const plan: {
        -readonly [Key in keyof ShowcaseSpoolPlan]: ShowcaseSpoolPlan[Key]
      } = {
        isoNumber,
        spoolNumber,
        stages,
        weldedJoints,
        materialCheckOn: on(STEP_DAYS.materialCheck),
      }

      if (reaches(entry, "qc_release")) {
        // `release_quality_record` refuses a spool whose supports are not installed
        // ("Supports are incomplete: 0 of 1 installed"), so the support date comes first, and it
        // refuses a release date before the fabrication completion date.
        plan.supportsInstalledOn = on(STEP_DAYS.supports)
        plan.qualityReleaseOn = on(STEP_DAYS.qualityRelease)
      }
      if (reaches(entry, "painted")) {
        stages.push({
          phase: "fabrication",
          stage: "sent_to_paint",
          occurredOn: on(STEP_DAYS.sentToPaint),
        })
        plan.paintedOn = on(STEP_DAYS.painted)
      }
      if (reaches(entry, "laydown")) {
        // `record_laydown` refuses a spool without a final QC, and `final_qc` is derived from the
        // paint record's `final_qc_on` — the same command that derives `painted`.
        plan.finalQcOn = on(STEP_DAYS.finalQc)
        plan.laydownOn = on(STEP_DAYS.laydown)
      }

      if (entry.erection !== undefined) {
        const erectionStages =
          entry.erection === "rft"
            ? ["to_site", "erected", "welded_bolted", "supported"]
            : ["to_site", "erected"]
        erectionStages.forEach((stage, index) => {
          stages.push({
            phase: "erection",
            stage,
            occurredOn: on(STEP_DAYS.firstErection + index * 3),
          })
        })
      }

      spools.push(plan)
    }
  }

  return { spools }
}

/**
 * What the module sweep compares the data-table footers against. PostgREST truncates silently at
 * `max_rows = 1000` (`supabase/config.toml`), and the repositories do not paginate server-side, so
 * a footer below these numbers is the only visible symptom.
 */
export const SHOWCASE_EXPECTED_COUNTS = {
  isometrics: SHOWCASE_ISO_NUMBERS.length,
  spoolRevisions: SHOWCASE_ISO_NUMBERS.length * SPOOL_LETTERS.length,
  weldJointRevisions:
    SHOWCASE_ISO_NUMBERS.length * SPOOL_LETTERS.length * WELDS_PER_SPOOL,
  constructionEvents: countPlanned((spool) => spool.stages.length),
  weldProgressRecords: countPlanned((spool) => spool.weldedJoints.length),
} as const

function countPlanned(select: (spool: ShowcaseSpoolPlan) => number): number {
  // The counts are structural, so any base date produces the same totals.
  return buildShowcaseProgressPlan(new Date("2026-01-01T00:00:00.000Z")).spools.reduce(
    (total, spool) => total + select(spool),
    0,
  )
}
