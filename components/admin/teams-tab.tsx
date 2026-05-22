"use client"

import { useMemo, useState } from "react"
import { ChevronDown, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"

import {
  useAdminStore,
  type TeamType,
  getTeamTypeLabel,
} from "@/store/admin-store"
import { AddTeamDialog } from "./add-team-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn, formatDate } from "@/lib/utils"

const TEAM_SECTIONS: { type: TeamType; title: string }[] = [
  { type: "lineCheck", title: "Line Check Teams" },
  { type: "blinding", title: "Blinding Teams" },
  { type: "finishing", title: "Finishing Teams" },
  { type: "reinstatement", title: "Reinstatement Teams" },
  { type: "jointer", title: "Jointer List" },
]

export function TeamsTab() {
  const teams = useAdminStore((s) => s.teams)
  const toggleTeamActive = useAdminStore((s) => s.toggleTeamActive)

  const [openSections, setOpenSections] = useState<Record<TeamType, boolean>>({
    lineCheck: true,
    blinding: true,
    finishing: true,
    reinstatement: true,
    jointer: true,
  })

  const kpis = useMemo(() => {
    const total = teams.length
    const active = teams.filter((t) => t.active).length
    return { total, active }
  }, [teams])

  const handleToggle = async (code: string, name: string) => {
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 200))
    toggleTeamActive(code)
    toast.success(`${name} updated`)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Testpack team references — line check, blinding, finishing,
        reinstatement, and jointer lists.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="text-slate-500">Total Members:</span>
          <span className="font-semibold text-slate-900">{kpis.total}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="text-slate-500">Active:</span>
          <span className="font-semibold text-emerald-600">{kpis.active}</span>
        </div>
      </div>

      <div className="space-y-3">
        {TEAM_SECTIONS.map(({ type, title }) => {
          const sectionTeams = teams.filter((t) => t.type === type)
          const isOpen = openSections[type]

          return (
            <Collapsible
              key={type}
              open={isOpen}
              onOpenChange={(next) =>
                setOpenSections((s) => ({ ...s, [type]: next }))
              }
              className="rounded-xl border border-slate-200 bg-white overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-sm font-semibold text-slate-800"
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-slate-500 transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                    {title}
                    <span className="text-xs font-normal text-slate-500">
                      ({sectionTeams.filter((t) => t.active).length} active)
                    </span>
                  </button>
                </CollapsibleTrigger>
                <AddTeamDialog defaultType={type} />
              </div>
              <CollapsibleContent>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/80">
                      <tr className="border-b border-slate-100">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                          Code
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                          Name
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                          Created
                        </th>
                        <th className="px-3 py-2 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {sectionTeams.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-5 py-6 text-center text-sm text-slate-500"
                          >
                            No members in {getTeamTypeLabel(type)}.
                          </td>
                        </tr>
                      )}
                      {sectionTeams.map((team, i) => (
                        <tr
                          key={team.code}
                          className={cn(
                            "border-b border-slate-100",
                            i % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                            !team.active && "opacity-60"
                          )}
                        >
                          <td className="px-3 py-2 font-mono text-xs">
                            {team.code}
                          </td>
                          <td className="px-3 py-2 text-xs">{team.name}</td>
                          <td className="px-3 py-2">
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
                          <td className="px-3 py-2 text-xs text-slate-500">
                            {formatDate(team.createdAt)}
                          </td>
                          <td className="px-3 py-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                >
                                  <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleToggle(team.code, team.name)
                                  }
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
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </div>
    </div>
  )
}
