/** Chart rows carry codes; the interface passes the words for them (codes namespace, week format). */
type Label = (code: string) => string

export const toErectionCurveSeries = (rows: readonly Record<string, string | number>[], weekLabel: Label) => rows.map((row) => ({
  weekStart: String(row.week_start),
  label: weekLabel(String(row.week_start)),
  toSite: Number(row.to_site_count), erected: Number(row.erected_count), weldedBolted: Number(row.welded_bolted_count), supported: Number(row.supported_count), rft: Number(row.rft_count),
}))

export const toErectionStageSeries = (rows: readonly Record<string, string | number>[], stageName: Label) => [...rows]
  .sort((a, b) => Number(a.stage_order) - Number(b.stage_order))
  .map((row) => ({ stage: String(row.stage), label: stageName(String(row.stage)), count: Number(row.spool_count) }))

export const toErectionBlockerSeries = (rows: readonly Record<string, string | number>[], blockerLabel: Label) => [...rows]
  .sort((a, b) => Number(a.blocker_order) - Number(b.blocker_order))
  .map((row) => ({ blocker: String(row.blocker), label: blockerLabel(String(row.blocker)), count: Number(row.spool_count) }))
