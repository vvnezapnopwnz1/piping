"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import { REWORK_CODES } from "@/lib/engineering-references"
import type { ReworkCode } from "@/lib/engineering-references"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const CATEGORY_OPTIONS: ("All" | ReworkCode["category"])[] = [
  "All",
  "Surface defect",
  "Internal defect",
  "Geometry",
  "Material",
  "Procedure",
]

const SEVERITY_STYLES: Record<string, string> = {
  Minor: "bg-slate-100 text-slate-600 border-slate-300",
  Major: "bg-amber-50 text-amber-700 border-amber-200",
  Critical: "bg-red-50 text-red-700 border-red-200",
}

export function ReworkCodesTab() {
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState<
    "All" | ReworkCode["category"]
  >("All")

  const kpis = useMemo(() => {
    const total = REWORK_CODES.length
    const critical = REWORK_CODES.filter((r) => r.severity === "Critical")
      .length
    const major = REWORK_CODES.filter((r) => r.severity === "Major").length
    const minor = REWORK_CODES.filter((r) => r.severity === "Minor").length
    return { total, critical, major, minor }
  }, [])

  const filtered = useMemo(() => {
    let rows = [...REWORK_CODES]
    if (filterCategory !== "All") {
      rows = rows.filter((r) => r.category === filterCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.shortName.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
      )
    }
    return rows
  }, [search, filterCategory])

  return (
    <div className="space-y-4">
      {/* Header note */}
      <p className="text-sm text-slate-500">
        Weld rework reasons — §3.10. Used by QC engineers when rejecting an NDE
        batch.
      </p>

      {/* KPI strip */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="text-slate-500">Total codes:</span>
          <span className="font-semibold text-slate-900">{kpis.total}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="text-slate-500">Critical:</span>
          <span className="font-semibold text-slate-900">
            {kpis.critical}
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="text-slate-500">Major:</span>
          <span className="font-semibold text-slate-900">{kpis.major}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="text-slate-500">Minor:</span>
          <span className="font-semibold text-slate-900">{kpis.minor}</span>
        </div>
      </div>

      {/* Filter + Search row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {CATEGORY_OPTIONS.map((cat) => (
            <Button
              key={cat}
              variant={filterCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterCategory(cat)}
              className={cn(
                "h-7 text-xs",
                filterCategory === cat
                  ? "bg-sky-600 hover:bg-sky-700 text-white"
                  : "text-slate-600"
              )}
            >
              {cat}
            </Button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, name, or description…"
            className="h-8 w-64 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Code
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Short Name
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Description
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Category
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Severity
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Default Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-sm text-slate-500"
                  >
                    No rework codes match the current filters.
                  </td>
                </tr>
              )}
              {filtered.map((r, i) => (
                <tr
                  key={r.code}
                  className={cn(
                    "border-b border-slate-100 transition-colors",
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                  )}
                >
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-slate-700">
                    {r.code}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-slate-700">
                    {r.shortName}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600 max-w-md">
                    {r.description}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                    {r.category}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        SEVERITY_STYLES[r.severity]
                      )}
                    >
                      {r.severity}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                    {r.defaultAction}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
