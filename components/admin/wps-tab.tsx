"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { WPS_LIST } from "@/lib/engineering-references";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";

export function WpsTab() {
  const [search, setSearch] = useState("");

  const kpis = useMemo(() => {
    const total = WPS_LIST.length;
    const active = WPS_LIST.filter((w) => w.status === "Active").length;
    const superseded = WPS_LIST.filter((w) => w.status === "Superseded").length;
    return { total, active, superseded };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return WPS_LIST;
    const q = search.toLowerCase();
    return WPS_LIST.filter(
      (w) =>
        w.code.toLowerCase().includes(q) ||
        w.baseMaterial.toLowerCase().includes(q) ||
        w.fillerMaterial.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div className="space-y-4">
      {/* Header note */}
      <p className="text-sm text-slate-500">
        Welding Procedure Specifications — imported from §3.5. Edit via the IDS
        import flow.
      </p>

      {/* KPI strip */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="text-slate-500">Total WPS:</span>
          <span className="font-semibold text-slate-900">{kpis.total}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="text-slate-500">Active:</span>
          <span className="font-semibold text-slate-900">{kpis.active}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="text-slate-500">Superseded:</span>
          <span className="font-semibold text-slate-900">
            {kpis.superseded}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search code, base material, filler…"
          className="h-8 w-72 pl-8 text-xs"
        />
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
                  Process
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Base Material
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Filler
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Positions
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Thickness
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Diameter
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Revision
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Approved
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-8 text-center text-sm text-slate-500"
                  >
                    No WPS records match the current search.
                  </td>
                </tr>
              )}
              {filtered.map((w, i) => {
                const visiblePos = w.positions.slice(0, 4);
                const remaining = w.positions.length - 4;
                return (
                  <tr
                    key={w.code}
                    className={cn(
                      "border-b border-slate-100 transition-colors",
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                    )}
                  >
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-slate-700">
                      {w.code}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-700">
                      {w.process}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-700">
                      {w.baseMaterial}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                      {w.fillerMaterial}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {visiblePos.map((p) => (
                          <Badge
                            key={p}
                            variant="outline"
                            className="text-[10px] border-slate-200 text-slate-600 bg-slate-50"
                          >
                            {p}
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
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                      {w.thicknessRange}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                      {w.diameterRange}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                      {w.revision}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">
                      {formatDate(w.approvedDate)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {w.status === "Active" ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-slate-100 text-slate-600 border-slate-300 text-xs"
                        >
                          Superseded
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
