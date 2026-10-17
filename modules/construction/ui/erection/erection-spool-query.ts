import type { DataTableState } from "@/components/ui/data-table"
import type { ErectionStage } from "../../domain/erection-stage"
import type { ErectionSpoolQuery, ErectionSpoolSort } from "../../infrastructure/supabase-erection-repository"

export type ErectionStageLabelMap = Record<string, ErectionStage | null>

const textFilter = (state: DataTableState, id: string): string | null => {
  const filter = state.filters.find((item) => item.id === id && item.kind === "text")
  const value = filter?.kind === "text" ? filter.value.trim() : ""
  return value || null
}

const numberFilter = (
  state: DataTableState,
  id: string,
): { min: number | null; max: number | null } | null => {
  const filter = state.filters.find((item) => item.id === id && item.kind === "number")
  return filter?.kind === "number" ? { min: filter.min, max: filter.max } : null
}

const dateFilter = (state: DataTableState, id: string): { from: string | null; to: string | null } | null => {
  const filter = state.filters.find((item) => item.id === id && item.kind === "date")
  return filter?.kind === "date" ? { from: filter.from, to: filter.to } : null
}

const booleanFilter = (state: DataTableState, id: string): boolean | null => {
  const filter = state.filters.find((item) => item.id === id && item.kind === "boolean")
  return filter?.kind === "boolean" ? filter.value : null
}

const serverSortIds = new Set<ErectionSpoolSort["id"]>([
  "spoolNumber",
  "isoNumber",
  "ndePending",
  "pwhtPending",
  "isRft",
])

/**
 * The table keeps labels in its URL state because they are what the operator reads. This small
 * boundary turns them into the database's stage codes before any request leaves the browser.
 */
export function erectionSpoolQueryFromTableState(
  state: DataTableState,
  stageLabels: ErectionStageLabelMap,
  spoolRevisionId: string | null = null,
): ErectionSpoolQuery {
  const stageFilter = state.filters.find((item) => item.id === "stage" && item.kind === "select")
  const stages = stageFilter?.kind === "select"
    ? [...new Set(stageFilter.values.flatMap((label) => {
      const stage = stageLabels[label]
      return stage === undefined ? [] : [stage]
    }))]
    : null
  const supportedSort = state.sorting.find((sort) => serverSortIds.has(sort.id as ErectionSpoolSort["id"]))

  return {
    search: state.search.trim(),
    spoolNumber: textFilter(state, "spoolNumber"),
    isoNumber: textFilter(state, "isoNumber"),
    spoolRevisionId,
    stages: stages?.length ? stages : null,
    ndePending: numberFilter(state, "ndePending"),
    pwhtPending: numberFilter(state, "pwhtPending"),
    toSiteOn: dateFilter(state, "toSiteOn"),
    isRft: booleanFilter(state, "isRft"),
    sort: supportedSort
      ? { id: supportedSort.id as ErectionSpoolSort["id"], desc: supportedSort.desc }
      : null,
  }
}
