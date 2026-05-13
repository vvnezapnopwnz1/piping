"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { cn } from "@/lib/utils"
import type { WeldJoint } from "@/lib/weld-data"
import {
  Download,
  Pencil,
  Lock,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react"

interface WeldTableProps {
  data: WeldJoint[]
  onSelectJoint: (joint: WeldJoint) => void
  selectedJointId?: string
}

type SortKey = keyof WeldJoint
type SortDir = "asc" | "desc" | null

export function WeldTable({ data, onSelectJoint, selectedJointId }: WeldTableProps) {
  const [search, setSearch] = useState("")
  const [showCompleted, setShowCompleted] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc")
      else if (sortDir === "desc") { setSortKey(null); setSortDir(null) }
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const filtered = data
    .filter((row) => {
      if (!showCompleted && row.status === "Completed") return false
      if (!search) return true
      const q = search.toLowerCase()
      return (
        row.jointNo.toLowerCase().includes(q) ||
        row.spoolNo.toLowerCase().includes(q) ||
        row.isoNo.toLowerCase().includes(q) ||
        row.welderCode.toLowerCase().includes(q) ||
        row.dwirNo.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (!sortKey || !sortDir) return 0
      const av = String(a[sortKey] ?? "")
      const bv = String(b[sortKey] ?? "")
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 text-slate-400 ml-1" />
    if (sortDir === "asc") return <ChevronUp className="w-3 h-3 text-sky-600 ml-1" />
    return <ChevronDown className="w-3 h-3 text-sky-600 ml-1" />
  }

  const ColHeader = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-slate-900 transition-colors"
      onClick={() => handleSort(col)}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon col={col} />
      </span>
    </th>
  )

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Table Header */}
      <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-slate-900">Weld Progress</h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800 border border-sky-300">
            847 joints
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Show Completed Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              className={cn(
                "relative w-8 h-4 rounded-full transition-colors",
                showCompleted ? "bg-sky-600" : "bg-slate-300"
              )}
              onClick={() => setShowCompleted(!showCompleted)}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform",
                  showCompleted ? "translate-x-4" : "translate-x-0.5"
                )}
              />
            </div>
            <span className="text-xs text-slate-600">Show completed</span>
          </label>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search joints…"
              className="pl-8 h-8 w-56 bg-slate-50 border-slate-300 text-slate-900 text-xs placeholder:text-slate-500 focus-visible:ring-sky-600"
            />
          </div>

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm min-w-[1100px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-100 border-b border-slate-200">
              <ColHeader label="Joint No" col="jointNo" />
              <ColHeader label="Spool No" col="spoolNo" />
              <ColHeader label="ISO No" col="isoNo" />
              <ColHeader label="Dia-inch" col="diaInch" />
              <ColHeader label="Material Type" col="materialType" />
              <ColHeader label="WPS No" col="wpsNo" />
              <ColHeader label="Welder Code" col="welderCode" />
              <ColHeader label="Weld Date" col="weldDate" />
              <ColHeader label="DWIR No" col="dwirNo" />
              <ColHeader label="Status" col="status" />
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-16">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => {
              const isRejected = row.status === "Rejected"
              const isSelected = row.id === selectedJointId
              return (
                <tr
                  key={row.id}
                  onClick={() => onSelectJoint(row)}
                  className={cn(
                    "border-b border-slate-200 cursor-pointer transition-colors",
                    isRejected && "bg-red-100",
                    !isRejected && i % 2 === 0 && "bg-white",
                    !isRejected && i % 2 !== 0 && "bg-slate-50",
                    isSelected && "bg-sky-100 border-sky-300",
                    !isSelected && "hover:bg-slate-100"
                  )}
                >
                  {/* Joint No */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="font-semibold text-sky-600 hover:text-sky-700 text-xs font-mono">
                      {row.jointNo}
                    </span>
                  </td>

                  {/* Spool No */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="text-xs text-slate-700 font-mono">{row.spoolNo}</span>
                  </td>

                  {/* ISO No */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="text-xs text-slate-600">{row.isoNo}</span>
                  </td>

                  {/* Dia-inch */}
                  <td className="px-3 py-2.5 whitespace-nowrap text-center">
                    <span className="text-xs text-slate-700 font-mono">{row.diaInch}</span>
                  </td>

                  {/* Material Type */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="text-xs text-slate-700">{row.materialType}</span>
                  </td>

                  {/* WPS No */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="text-xs text-slate-600 font-mono">{row.wpsNo}</span>
                  </td>

                  {/* Welder Code */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="text-xs text-slate-700 font-mono">{row.welderCode}</span>
                  </td>

                  {/* Weld Date */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="text-xs text-slate-600">{row.weldDate || "—"}</span>
                  </td>

                  {/* DWIR No */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="text-xs text-slate-600 font-mono">{row.dwirNo}</span>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <StatusBadge status={row.status} />
                  </td>

                  {/* Action */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {row.isLocked ? (
                      <span
                        title="Weld progressed — locked"
                        className="inline-flex items-center justify-center w-7 h-7 rounded text-slate-400"
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectJoint(row)
                        }}
                        title="Edit weld entry"
                        className="inline-flex items-center justify-center w-7 h-7 rounded border border-slate-300 bg-white text-slate-500 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-300 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Search className="w-8 h-8 mb-3 opacity-40" />
            <p className="text-sm">No weld joints match your filters</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
        <span className="text-xs text-slate-600">
          Showing {filtered.length} of {data.length} joints
        </span>
        <span className="text-xs text-slate-600">
          Click a row or{" "}
          <span className="text-slate-500">
            <Pencil className="w-3 h-3 inline" />
          </span>{" "}
          to open detail panel
        </span>
      </div>
    </div>
  )
}
