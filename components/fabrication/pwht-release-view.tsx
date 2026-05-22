"use client"

import { useMemo, useState } from "react"
import { Search, Flame } from "lucide-react"
import { useWeldsStore } from "@/store"
import { useErectionStore } from "@/store/erection-store"
import { usePwhtStore } from "@/store/pwht-store"
import type { WeldJoint } from "@/lib/weld-data"
import type { FieldWeldJoint } from "@/lib/erection-weld-data"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PwhtReleaseDetailPanel } from "./pwht-release-detail-panel"

type PwhtFilter = "All" | "Awaiting" | "Released"
const FILTERS: PwhtFilter[] = ["All", "Awaiting", "Released"]

type PwhtRow = (WeldJoint | FieldWeldJoint) & { source: "shop" | "field" }

export function PwhtReleaseView() {
  const shopWelds = useWeldsStore((s) => s.welds)
  const fieldWelds = useErectionStore((s) => s.fieldWelds)
  const releases = usePwhtStore((s) => s.releases)
  const [filter, setFilter] = useState<PwhtFilter>("Awaiting")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<PwhtRow | null>(null)

  const unified = useMemo<PwhtRow[]>(
    () => [
      ...shopWelds
        .filter((w) => w.pwhtRequired)
        .map((w) => ({ ...w, source: "shop" as const })),
      ...fieldWelds
        .filter((w) => w.pwhtRequired)
        .map((w) => ({ ...w, source: "field" as const })),
    ],
    [shopWelds, fieldWelds],
  )

  const releaseMap = useMemo(
    () => new Map(releases.map((r) => [r.weldId, r])),
    [releases],
  )

  const rows = useMemo(() => {
    return unified.filter((w) => {
      const released = !!w.pwhtDate || releaseMap.has(w.id)
      if (filter === "Awaiting" && released) return false
      if (filter === "Released" && !released) return false
      if (search) {
        const term = search.toLowerCase()
        if (
          !w.jointNo.toLowerCase().includes(term) &&
          !w.spoolNo.toLowerCase().includes(term)
        ) {
          return false
        }
      }
      return true
    })
  }, [unified, releaseMap, filter, search])

  const counts = useMemo(() => {
    const released = unified.filter(
      (w) => !!w.pwhtDate || releaseMap.has(w.id),
    ).length
    return {
      All: unified.length,
      Awaiting: unified.length - released,
      Released: released,
    }
  }, [unified, releaseMap])

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[720px] gap-4 overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-2">
        <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Flame className="h-4 w-4 text-amber-600" />
          PWHT Release
        </h1>
        <p className="text-sm text-slate-500">
          Post-Weld Heat Treatment release queue. Enter lab certificate to unblock
          downstream QC.
        </p>
      </div>

      <div className="shrink-0 px-6 flex items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {f}
            <span
              className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-semibold ${
                filter === f
                  ? "bg-sky-500 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      <div className="shrink-0 px-6">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search joint or spool..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 pb-6 overflow-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <p className="text-sm">No welds at this filter.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Joint No</TableHead>
                <TableHead>Spool No</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Material / Dia</TableHead>
                <TableHead>WPS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PWHT date</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((w) => {
                const rel = releaseMap.get(w.id)
                const released = !!w.pwhtDate || !!rel
                return (
                  <TableRow
                    key={w.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => !released && setSelected(w)}
                  >
                    <TableCell className="font-mono text-sm">
                      {w.jointNo}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-slate-600">
                      {w.spoolNo}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          w.source === "field"
                            ? "bg-violet-100 text-violet-800 text-xs"
                            : "bg-sky-100 text-sky-800 text-xs"
                        }
                      >
                        {w.source === "field" ? "Field" : "Shop"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {w.materialType} · {w.diaInch}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{w.wpsNo}</TableCell>
                    <TableCell>
                      {released ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                          Released
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 text-xs">
                          Awaiting
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {w.pwhtDate ?? rel?.pwhtDate ?? "—"}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <PwhtReleaseDetailPanel
        weld={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
