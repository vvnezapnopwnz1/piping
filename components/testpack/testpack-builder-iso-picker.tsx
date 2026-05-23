"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTestpackStore } from "@/store/testpack-store"
import { cn } from "@/lib/utils"

interface Props {
  selectedIsoIds: string[]
  onChange: (next: string[]) => void
  editingTpId?: string
}

export function TestpackBuilderIsoPicker({
  selectedIsoIds,
  onChange,
  editingTpId,
}: Props) {
  const isos = useTestpackStore((s) => s.isos)
  const tps = useTestpackStore((s) => s.testPacks)
  const [search, setSearch] = useState("")

  const assignmentMap = useMemo(() => {
    const map = new Map<string, string>()
    tps.forEach((tp) => {
      if (tp.id === editingTpId) return
      tp.isoIds.forEach((isoId) => map.set(isoId, tp.id))
    })
    return map
  }, [tps, editingTpId])

  const availableIsos = useMemo(() => {
    const q = search.trim().toLowerCase()
    return isos
      .filter((iso) => !selectedIsoIds.includes(iso.id))
      .filter((iso) => (q ? iso.id.toLowerCase().includes(q) : true))
  }, [isos, selectedIsoIds, search])

  const selectedIsos = useMemo(
    () =>
      selectedIsoIds
        .map((id) => isos.find((iso) => iso.id === id))
        .filter(Boolean) as typeof isos,
    [selectedIsoIds, isos],
  )

  const moveRight = (isoId: string) => onChange([...selectedIsoIds, isoId])
  const moveLeft = (isoId: string) =>
    onChange(selectedIsoIds.filter((id) => id !== isoId))

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr]">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          Available ISOs ({availableIsos.length})
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ISO no..."
            className="h-9 pl-9 text-sm"
          />
        </div>
        <ScrollArea className="h-[280px] rounded-md border border-slate-200">
          <ul className="divide-y divide-slate-200">
            {availableIsos.map((iso) => {
              const assignedTo = assignmentMap.get(iso.id)
              return (
                <li
                  key={iso.id}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2 text-sm",
                    assignedTo ? "bg-amber-50" : "bg-white hover:bg-slate-50",
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-mono text-[13px] text-slate-900">
                      {iso.id}
                    </span>
                    {assignedTo ? (
                      <span className="text-[10px] text-amber-700">
                        Assigned to {assignedTo} — moving will reassign
                      </span>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => moveRight(iso.id)}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </li>
              )
            })}
            {availableIsos.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-400">
                No ISOs available
              </li>
            ) : null}
          </ul>
        </ScrollArea>
      </div>

      <div className="hidden flex-col items-center justify-center md:flex">
        <Badge
          variant="outline"
          className="rotate-90 text-[10px] uppercase tracking-wider text-slate-500"
        >
          Move
        </Badge>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          Selected for this TP ({selectedIsos.length})
        </p>
        <ScrollArea className="h-[316px] rounded-md border border-emerald-200 bg-emerald-50/30">
          <ul className="divide-y divide-emerald-200">
            {selectedIsos.map((iso) => (
              <li
                key={iso.id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => moveLeft(iso.id)}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="flex-1 font-mono text-[13px] text-slate-900">
                  {iso.id}
                </span>
              </li>
            ))}
            {selectedIsos.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-400">
                No ISOs selected yet
              </li>
            ) : null}
          </ul>
        </ScrollArea>
      </div>
    </div>
  )
}
