"use client";

import { useState, useMemo } from "react";
import { MoreHorizontal, Search } from "lucide-react";

import {
  useAdminStore,
  type TeamType,
  getTeamTypeLabel,
} from "@/store/admin-store";
import { AddTeamDialog } from "./add-team-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatDate } from "@/lib/utils";

const TYPE_OPTIONS: (TeamType | "all")[] = [
  "all",
  "lineCheck",
  "blinding",
  "finishing",
  "reinstatement",
  "jointer",
];

const TYPE_LABELS: Record<TeamType | "all", string> = {
  all: "All",
  lineCheck: "Line Check",
  blinding: "Blinding",
  finishing: "Finishing",
  reinstatement: "Reinstatement",
  jointer: "Jointer",
};

export function TeamsTab() {
  const teams = useAdminStore((s) => s.teams);
  const toggleTeamActive = useAdminStore((s) => s.toggleTeamActive);

  const [filterType, setFilterType] = useState<TeamType | "all">("all");
  const [search, setSearch] = useState("");

  const activeCounts = useMemo(() => {
    const counts: Record<TeamType, number> = {
      lineCheck: 0,
      blinding: 0,
      finishing: 0,
      reinstatement: 0,
      jointer: 0,
    };
    teams.forEach((t) => {
      if (t.active) counts[t.type]++;
    });
    return counts;
  }, [teams]);

  const filtered = useMemo(() => {
    let rows = [...teams];
    if (filterType !== "all") {
      rows = rows.filter((t) => t.type === filterType);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [teams, filterType, search]);

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="flex flex-wrap items-center gap-3">
        {(
          [
            "lineCheck",
            "blinding",
            "finishing",
            "reinstatement",
            "jointer",
          ] as TeamType[]
        ).map((type) => (
          <div
            key={type}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs"
          >
            <span className="text-slate-500">{getTeamTypeLabel(type)}:</span>
            <span className="font-semibold text-slate-900">
              {activeCounts[type]}
            </span>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {TYPE_OPTIONS.map((type) => (
            <Button
              key={type}
              variant={filterType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(type)}
              className={cn(
                "h-7 text-xs",
                filterType === type
                  ? "bg-sky-600 hover:bg-sky-700 text-white"
                  : "text-slate-600",
              )}
            >
              {TYPE_LABELS[type]}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code or name…"
              className="h-8 w-56 pl-8 text-xs"
            />
          </div>
          <AddTeamDialog />
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
                  Name
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Type
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Created
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-10">
                  Actions
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
                    No teams match the current filters.
                  </td>
                </tr>
              )}
              {filtered.map((team, i) => (
                <tr
                  key={team.code}
                  className={cn(
                    "border-b border-slate-100 transition-colors",
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                  )}
                >
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-slate-700">
                    {team.code}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-700">
                    {team.name}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                    {getTeamTypeLabel(team.type)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {team.active ? (
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
                        Inactive
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">
                    {formatDate(team.createdAt)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4 text-slate-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => toggleTeamActive(team.code)}
                        >
                          {team.active ? "Deactivate" : "Reactivate"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
