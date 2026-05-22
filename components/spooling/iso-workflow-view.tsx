"use client"

import { useState } from "react"
import { useSpoolingStore, ISORecord, ISOStatus } from "@/store/spooling-store"
import { RevisionCascadeDialog } from "./revision-cascade-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search } from "lucide-react"

const STATUS_CHIPS: { label: string; value: ISOStatus | "All" }[] = [
  { label: "All", value: "All" },
  { label: "Received", value: "Received" },
  { label: "Checked Out", value: "Checked Out" },
  { label: "In Checking", value: "In Checking" },
  { label: "Released", value: "Released" },
  { label: "On Hold", value: "On Hold" },
]

function statusBadgeClass(status: ISOStatus): string {
  switch (status) {
    case "Received":     return "bg-amber-100 text-amber-800"
    case "Checked Out":  return "bg-sky-100 text-sky-800"
    case "In Checking":  return "bg-violet-100 text-violet-800"
    case "Released":     return "bg-emerald-100 text-emerald-800"
    case "On Hold":      return "bg-red-100 text-red-800"
    case "Superseded":   return "bg-slate-100 text-slate-600"
    default:             return "bg-slate-100 text-slate-600"
  }
}

interface Props {
  onSelectISO: (iso: ISORecord) => void
}

export function IsoWorkflowView({ onSelectISO }: Props) {
  const isoRecords = useSpoolingStore((s) => s.isoRecords)
  const [activeChip, setActiveChip] = useState<ISOStatus | "All">("All")
  const [search, setSearch] = useState("")
  const [showRevision, setShowRevision] = useState(false)

  const filtered = isoRecords.filter((iso) => {
    if (activeChip !== "All" && iso.status !== activeChip) return false
    if (search && !iso.id.toLowerCase().includes(search.toLowerCase()) &&
        !iso.pdsArea.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-wrap gap-2">
          {STATUS_CHIPS.map((chip) => {
            const count = chip.value === "All"
              ? isoRecords.length
              : isoRecords.filter((i) => i.status === chip.value).length
            return (
              <Button
                key={chip.value}
                size="sm"
                variant={activeChip === chip.value ? "default" : "outline"}
                onClick={() => setActiveChip(chip.value)}
                className="h-7 text-xs"
              >
                {chip.label} {count > 0 && <span className="ml-1 text-xs opacity-70">({count})</span>}
              </Button>
            )
          })}
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowRevision(true)}>
          Apply Revision
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          className="pl-8"
          placeholder="Search ISO # or PDS area..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>ISO #</TableHead>
              <TableHead>Rev</TableHead>
              <TableHead>PDS Area</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Spooled By</TableHead>
              <TableHead className="text-center">Rounds</TableHead>
              <TableHead>Hold Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-500 py-8 text-sm">
                  No ISO records match the current filter
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((iso, index) => (
                <TableRow
                  key={`${iso.id}-${iso.rev}-${iso.status}-${index}`}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => onSelectISO(iso)}
                >
                  <TableCell className="font-mono text-sm font-medium">{iso.id}</TableCell>
                  <TableCell className="text-sm">{iso.rev}</TableCell>
                  <TableCell className="text-sm text-slate-600">{iso.pdsArea}</TableCell>
                  <TableCell className="text-sm">{iso.serviceClass}</TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClass(iso.status)}>{iso.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{iso.spooledBy ?? "—"}</TableCell>
                  <TableCell className="text-center">
                    {iso.totalRounds > 0 ? (
                      <span className={`text-sm font-medium ${iso.totalRounds >= 4 ? "text-red-600" : "text-slate-700"}`}>
                        {iso.totalRounds}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {iso.activeHold ? (
                      <Badge className="bg-red-100 text-red-800 text-xs">{iso.activeHold.holdType}</Badge>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RevisionCascadeDialog open={showRevision} onClose={() => setShowRevision(false)} />
    </div>
  )
}
