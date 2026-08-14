import { erectionStageLabel, type ErectionStage } from "./erection-stage"

const blockerLabels: Record<string, string> = {
  welded_bolted: "Welded / Bolted not recorded",
  supported: "Support not recorded",
  nde: "Open NDE",
  pwht: "Open PWHT",
}

export const toErectionCurveSeries = (rows: readonly Record<string, string | number>[]) => rows.map((row) => ({
  weekStart: String(row.week_start),
  label: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${row.week_start}T00:00:00Z`)),
  toSite: Number(row.to_site_count), erected: Number(row.erected_count), weldedBolted: Number(row.welded_bolted_count), supported: Number(row.supported_count), rft: Number(row.rft_count),
}))

export const toErectionStageSeries = (rows: readonly Record<string, string | number>[]) => [...rows]
  .sort((a, b) => Number(a.stage_order) - Number(b.stage_order))
  .map((row) => ({ stage: String(row.stage), label: row.stage === "not_started" ? "Not started" : erectionStageLabel(row.stage as ErectionStage), count: Number(row.spool_count) }))

export const toErectionBlockerSeries = (rows: readonly Record<string, string | number>[]) => [...rows]
  .sort((a, b) => Number(a.blocker_order) - Number(b.blocker_order))
  .map((row) => ({ blocker: String(row.blocker), label: blockerLabels[String(row.blocker)] ?? String(row.blocker), count: Number(row.spool_count) }))
