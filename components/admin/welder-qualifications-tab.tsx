"use client"

import { useMemo } from "react"

import { WELDER_QUALIFICATIONS } from "@/lib/welder-qualifications"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function WelderQualificationsTab() {
  const today = useMemo(() => new Date(), [])
  const currentQuarterStart = useMemo(() => {
    const q = Math.floor(today.getMonth() / 3)
    return new Date(today.getFullYear(), q * 3, 1)
  }, [today])
  const currentQuarterEnd = useMemo(() => {
    const q = Math.floor(today.getMonth() / 3)
    return new Date(today.getFullYear(), q * 3 + 3, 0)
  }, [today])

  const kpis = useMemo(() => {
    const total = WELDER_QUALIFICATIONS.length
    const wpsSet = new Set<string>()
    let expiring = 0

    WELDER_QUALIFICATIONS.forEach((w) => {
      w.qualifiedWPS.forEach((wps) => wpsSet.add(wps))
      const expiry = new Date(w.qualificationExpiresOn)
      if (expiry >= currentQuarterStart && expiry <= currentQuarterEnd) {
        expiring++
      }
    })

    return {
      total,
      distinctWps: wpsSet.size,
      expiring,
    }
  }, [currentQuarterStart, currentQuarterEnd])

  return (
    <div className="space-y-4">
      {/* Header note */}
      <p className="text-sm text-slate-500">
        Welder qualifications are derived from §3.6 records. Edit via the IDS
        import flow.
      </p>

      {/* KPI strip */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="text-slate-500">Total welders:</span>
          <span className="font-semibold text-slate-900">{kpis.total}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="text-slate-500">Qualified WPS codes:</span>
          <span className="font-semibold text-slate-900">{kpis.distinctWps}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="text-slate-500">Expiring this quarter:</span>
          <span className="font-semibold text-slate-900">
            {kpis.expiring > 0 ? kpis.expiring : "—"}
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
                  Welder Code
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Name
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Qualified WPS
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Qualification Date
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Expiry
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {WELDER_QUALIFICATIONS.map((w, i) => {
                const isExpired = new Date(w.qualificationExpiresOn) < today
                const visibleWps = w.qualifiedWPS.slice(0, 3)
                const remaining = w.qualifiedWPS.length - 3

                return (
                  <tr
                    key={w.welderCode}
                    className={cn(
                      "border-b border-slate-100 transition-colors",
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    )}
                  >
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-slate-700">
                      {w.welderCode}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-700">
                      {w.fullName}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {visibleWps.map((wps) => (
                          <Badge
                            key={wps}
                            variant="outline"
                            className="text-[10px] border-slate-200 text-slate-600 bg-slate-50"
                          >
                            {wps}
                          </Badge>
                        ))}
                        {remaining > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-slate-200 text-slate-500 bg-slate-50"
                          >
                            +{remaining} more
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">
                      {/* No qualification date in data — show creation placeholder or dash */}
                      —
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">
                      {new Date(
                        w.qualificationExpiresOn
                      ).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {isExpired ? (
                        <Badge
                          variant="outline"
                          className="bg-red-50 text-red-700 border-red-200 text-xs"
                        >
                          Expired
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
                        >
                          Valid
                        </Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
              {/* Empty-state padding if list is short */}
              {WELDER_QUALIFICATIONS.length < 8 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-sm text-slate-400"
                  >
                    End of list
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
