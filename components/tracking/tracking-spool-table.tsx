"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowUpRight,
  MapPin,
  MoreHorizontal,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useScopeLock } from "@/lib/scope-lock"
import { STAGE_COLOR } from "@/lib/spool-data"
import { deriveBarcode } from "@/lib/spool-tracking"
import { ActiveSpoolChip } from "./active-spool-chip"
import { TrackingDetailPanel } from "./tracking-detail-panel"
import { useTrackingEnrichedRows } from "./use-tracking-rows"

interface Props {
  selectedLocation: string | null
  selectedSpool?: string | null
  onSelectSpool?: (spoolNo: string | null) => void
  activeOnly?: boolean
}

const PAGE_SIZE = 25

export function TrackingSpoolTable({
  selectedLocation,
  selectedSpool: controlledSpool,
  onSelectSpool,
  activeOnly = false,
}: Props) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [internalSpool, setInternalSpool] = useState<string | null>(null)

  const selectedSpool = controlledSpool !== undefined ? controlledSpool : internalSpool
  const setSelectedSpool = onSelectSpool ?? setInternalSpool

  const rows = useTrackingEnrichedRows()
  const scope = useScopeLock()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (!scope.isInScope(row.spool.pdsAreaCode)) return false
      if (activeOnly && !row.isActive) return false
      if (selectedLocation && row.cur?.location !== selectedLocation) return false
      const barcode = deriveBarcode(row.spool.spoolNo).toLowerCase()
      if (
        q &&
        !row.spool.spoolNo.toLowerCase().includes(q) &&
        !row.spool.isoNo.toLowerCase().includes(q) &&
        !barcode.includes(q)
      ) {
        return false
      }
      return true
    })
  }, [rows, scope, selectedLocation, search, activeOnly])

  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  const selectedRow = selectedSpool
    ? rows.find((r) => r.spool.spoolNo === selectedSpool) ?? null
    : null

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="gap-2 border-b border-slate-200 pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">Spool locations</CardTitle>
              <CardDescription>
                Real-time location tracking — {filtered.length} spools
                {selectedLocation ? ` at ${selectedLocation}` : ""}
              </CardDescription>
            </div>
            <div className="relative min-w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Search by spool no, ISO no..."
                className="h-9 border-slate-300 bg-slate-50 pl-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-200 bg-slate-100">
                  {[
                    "Spool No",
                    "ISO No",
                    "Barcode",
                    "Current location",
                    "Fab stage",
                    "Days",
                    "Last scan",
                    "Flag",
                    "Active",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => {
                  const isSelected = selectedSpool === row.spool.spoolNo
                  const stageColor = row.fabStage ? STAGE_COLOR[row.fabStage] : null
                  const barcode = deriveBarcode(row.spool.spoolNo)
                  return (
                    <tr
                      key={row.spool.spoolNo}
                      onClick={() => setSelectedSpool(row.spool.spoolNo)}
                      className={cn(
                        "cursor-pointer border-b border-slate-200 transition-colors",
                        index % 2 === 0 ? "bg-white" : "bg-slate-50",
                        isSelected
                          ? "border-sky-300 bg-sky-100"
                          : "hover:bg-slate-100",
                      )}
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="font-mono text-[13px] font-semibold text-sky-600">
                          {row.spool.spoolNo}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-[13px] text-slate-600">
                        {row.spool.isoNo || "—"}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[13px] text-slate-700">
                        {barcode}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-[13px]",
                            row.transitOut.isTransitOut
                              ? "text-red-700"
                              : "text-slate-700",
                          )}
                        >
                          <MapPin
                            className={cn(
                              "h-3.5 w-3.5",
                              row.transitOut.isTransitOut
                                ? "text-red-500"
                                : "text-slate-400",
                            )}
                          />
                          {row.cur?.location ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {row.fabStage && stageColor ? (
                          <span
                            className={cn(
                              "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
                              stageColor.bg,
                              stageColor.text,
                            )}
                          >
                            {row.fabStage}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2.5 whitespace-nowrap text-[13px] font-medium",
                          (row.cur?.daysInLocation ?? 0) > 14
                            ? "text-red-600"
                            : (row.cur?.daysInLocation ?? 0) > 7
                              ? "text-amber-600"
                              : "text-slate-700",
                        )}
                      >
                        {row.cur?.daysInLocation ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-[13px] text-slate-600">
                        {row.cur?.lastScan?.slice(0, 10) ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {row.transitOut.isTransitOut ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-red-50">
                                <ArrowUpRight className="h-4 w-4 text-red-600" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={8}>
                              Out from {row.transitOut.fromLocation} for{" "}
                              {row.transitOut.outFor} days
                            </TooltipContent>
                          </Tooltip>
                        ) : row.inconsistency.isInconsistent ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-amber-200 bg-amber-50">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={8}>
                              {row.inconsistency.reason}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <ActiveSpoolChip isActive={row.isActive} />
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setSelectedSpool(row.spool.spoolNo)}
                            >
                              View history
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setSelectedSpool(row.spool.spoolNo)}
                            >
                              Manual relocate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
        <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-3 text-xs text-slate-600 md:flex-row md:items-center md:justify-between">
          <span>
            Showing {filtered.length === 0 ? 0 : pageStart + 1}-
            {Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
            spools
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-slate-300 px-3 text-xs"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
              {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-slate-300 px-3 text-xs"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
      <TrackingDetailPanel
        row={selectedRow}
        open={!!selectedRow}
        onClose={() => setSelectedSpool(null)}
      />
    </>
  )
}
