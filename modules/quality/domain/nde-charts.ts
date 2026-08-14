type OutcomeTrendRow = {
  week_start: string
  accepted_count: number
  rejected_count: number
}

type WorkflowRow = {
  status: string
  status_order: number
  obligation_count: number
}

type MethodRow = {
  method: string
  pending_count: number
  allocated_count: number
  issued_count: number
  accepted_count: number
  rejected_count: number
}

const WORKFLOW_LABELS: Record<string, string> = {
  pending: "Pending allocation",
  allocated: "Allocated",
  issued: "Issued to inspector",
  result_recorded: "Inspected",
}

const METHOD_ORDER = ["rt", "ut", "mt", "pt", "pmi", "ht", "vt"]

export const toNdeOutcomeTrendSeries = (rows: readonly OutcomeTrendRow[]) =>
  rows.map((row) => ({
    weekStart: row.week_start,
    label: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" })
      .format(new Date(`${row.week_start}T00:00:00Z`)),
    accepted: Number(row.accepted_count),
    rejected: Number(row.rejected_count),
  }))

export const toNdeWorkflowSeries = (rows: readonly WorkflowRow[]) =>
  [...rows]
    .sort((left, right) => left.status_order - right.status_order)
    .map((row) => ({
      status: row.status,
      label: WORKFLOW_LABELS[row.status] ?? row.status,
      count: Number(row.obligation_count),
    }))

export const toNdeMethodSeries = (rows: readonly MethodRow[]) =>
  [...rows]
    .sort((left, right) => METHOD_ORDER.indexOf(left.method) - METHOD_ORDER.indexOf(right.method))
    .map((row) => ({
      method: row.method.toUpperCase(),
      pending: Number(row.pending_count),
      allocated: Number(row.allocated_count),
      issued: Number(row.issued_count),
      accepted: Number(row.accepted_count),
      rejected: Number(row.rejected_count),
    }))

export const hasNdeChartData = (series: readonly unknown[]): boolean => series.length > 0
