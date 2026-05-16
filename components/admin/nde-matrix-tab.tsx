"use client"

import { useMemo } from "react"

import { NDE_MATRIX } from "@/lib/engineering-references"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const SERVICE_CLASS_STYLES: Record<string, string> = {
  "Class 1": "bg-red-50 text-red-700 border-red-200",
  "Class 2": "bg-amber-50 text-amber-700 border-amber-200",
  "Class 3": "bg-sky-50 text-sky-700 border-sky-200",
  Utility: "bg-slate-100 text-slate-600 border-slate-300",
}

export function NdeMatrixTab() {
  const kpis = useMemo(() => {
    const distinctClasses = new Set(NDE_MATRIX.map((r) => r.serviceClass))
    return {
      rows: NDE_MATRIX.length,
      classesCovered: distinctClasses.size,
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Header note */}
      <p className="text-sm text-slate-500">
        NDE method matrix — derived from §3.9 (ASME B31.3 service class). Edit
        via project setup.
      </p>

      {/* KPI strip */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="text-slate-500">Rows:</span>
          <span className="font-semibold text-slate-900">{kpis.rows}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="text-slate-500">Service classes covered:</span>
          <span className="font-semibold text-slate-900">
            {kpis.classesCovered}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Service Class
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Diameter
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Thickness
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Primary Method
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Coverage
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Secondary
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Coverage
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Acceptance
                </th>
              </tr>
            </thead>
            <tbody>
              {NDE_MATRIX.map((r, i) => (
                <tr
                  key={r.id}
                  className={cn(
                    "border-b border-slate-100 transition-colors",
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                  )}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        SERVICE_CLASS_STYLES[r.serviceClass]
                      )}
                    >
                      {r.serviceClass}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-700">
                    {r.diameterRange}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-700">
                    {r.thicknessRange}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-700">
                    {r.primaryMethod}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                    {r.primaryCoverage}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-700">
                    {r.secondaryMethod ?? (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                    {r.secondaryCoverage ?? (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                    {r.acceptanceCriterion}
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
