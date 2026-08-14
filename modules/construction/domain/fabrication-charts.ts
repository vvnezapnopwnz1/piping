import { CONSTRUCTION_STAGES, stageLabel } from "./construction-phase"

type CurveRow = {
  week_start: string
  start_fab_count: number
  material_check_count: number
  fabricated_count: number
  qc_release_count: number
  sent_to_paint_count: number
  painted_count: number
  final_qc_count: number
  laydown_count: number
}

type StageDistributionRow = {
  stage: string
  stage_order: number
  spool_count: number
}

type PdsAreaProgressRow = {
  pds_area_code: string
  complete_count: number
  in_progress_count: number
  not_started_count: number
}

export type FabricationCurvePoint = {
  weekStart: string
  label: string
  startFab: number
  materialCheck: number
  fabricated: number
  qcRelease: number
  sentToPaint: number
  painted: number
  finalQc: number
  laydown: number
}

export const toFabricationCurveSeries = (rows: readonly CurveRow[]): FabricationCurvePoint[] =>
  rows.map((row) => ({
    weekStart: row.week_start,
    label: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" })
      .format(new Date(`${row.week_start}T00:00:00Z`)),
    startFab: Number(row.start_fab_count),
    materialCheck: Number(row.material_check_count),
    fabricated: Number(row.fabricated_count),
    qcRelease: Number(row.qc_release_count),
    sentToPaint: Number(row.sent_to_paint_count),
    painted: Number(row.painted_count),
    finalQc: Number(row.final_qc_count),
    laydown: Number(row.laydown_count),
  }))

export const toStageDistributionSeries = (rows: readonly StageDistributionRow[]) =>
  [...rows]
    .sort((left, right) => left.stage_order - right.stage_order)
    .map((row) => ({
      stage: row.stage,
      label: row.stage === "not_started"
        ? "Not started"
        : stageLabel(row.stage as (typeof CONSTRUCTION_STAGES)[number]),
      count: Number(row.spool_count),
    }))

export const toPdsAreaProgressSeries = (rows: readonly PdsAreaProgressRow[]) =>
  rows.map((row) => ({
    area: row.pds_area_code,
    complete: Number(row.complete_count),
    inProgress: Number(row.in_progress_count),
    notStarted: Number(row.not_started_count),
  }))

export const hasFabricationChartData = (series: readonly unknown[]): boolean => series.length > 0
