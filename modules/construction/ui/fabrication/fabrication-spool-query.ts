import type { DataTableState } from "@/components/ui/data-table"
import type { ConstructionStage } from "../../domain/construction-phase"
import type { FabricationSpoolQuery, FabricationSpoolSort } from "../../infrastructure/supabase-construction-repository"

export type FabricationStageLabelMap = Record<string, ConstructionStage | null>

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

const booleanFilter = (state: DataTableState, id: string): boolean | null => {
  const filter = state.filters.find((item) => item.id === id && item.kind === "boolean")
  return filter?.kind === "boolean" ? filter.value : null
}

const serverSortIds = new Set<FabricationSpoolSort["id"]>([
  "spoolNumber",
  "isoNumber",
  "ndePending",
  "pwhtPending",
  "isReleasable",
])

/**
 * The table keeps labels in its URL state because they are what the operator reads. This small
 * boundary converts those labels into stable database codes before any request leaves the browser.
 */
export function fabricationSpoolQueryFromTableState(
  state: DataTableState,
  stageLabels: FabricationStageLabelMap,
): FabricationSpoolQuery {
  const stageFilter = state.filters.find((item) => item.id === "currentStage" && item.kind === "select")
  const stages = stageFilter?.kind === "select"
    ? [...new Set(stageFilter.values.flatMap((label) => {
      const stage = stageLabels[label]
      return stage === undefined ? [] : [stage]
    }))]
    : null
  const supportedSort = state.sorting.find((sort) => serverSortIds.has(sort.id as FabricationSpoolSort["id"]))

  return {
    search: state.search.trim(),
    spoolNumber: textFilter(state, "spoolNumber"),
    isoNumber: textFilter(state, "isoNumber"),
    stages: stages?.length ? stages : null,
    ndePending: numberFilter(state, "ndePending"),
    pwhtPending: numberFilter(state, "pwhtPending"),
    isReleasable: booleanFilter(state, "isReleasable"),
    sort: supportedSort
      ? { id: supportedSort.id as FabricationSpoolSort["id"], desc: supportedSort.desc }
      : null,
  }
}
