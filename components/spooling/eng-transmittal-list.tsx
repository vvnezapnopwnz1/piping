"use client"

import { useState } from "react"
import { useSpoolingStore, EngTransmittal } from "@/store/spooling-store"
import { EngTransmittalDetailPanel } from "./eng-transmittal-detail-panel"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Inbox } from "lucide-react"

export function EngTransmittalList() {
  const transmittals = useSpoolingStore((s) => s.engTransmittals)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<EngTransmittal | null>(null)

  const filtered = transmittals.filter(
    (t) =>
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.sourceTeam.toLowerCase().includes(search.toLowerCase())
  )

  const pendingCount = transmittals.filter((t) => t.status === "Pending").length

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 flex items-center gap-2">
          <Inbox className="h-4 w-4" />
          {pendingCount} transmittal{pendingCount > 1 ? "s" : ""} awaiting acceptance
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          className="pl-8"
          placeholder="Search transmittal # or source..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Transmittal #</TableHead>
              <TableHead>Source Team</TableHead>
              <TableHead>Received Date</TableHead>
              <TableHead className="text-center">ISO Count</TableHead>
              <TableHead className="text-center">New / Rev</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8 text-sm">
                  No transmittals found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => setSelected(t)}
                >
                  <TableCell className="font-mono text-sm font-medium">{t.id}</TableCell>
                  <TableCell className="text-sm">{t.sourceTeam}</TableCell>
                  <TableCell className="text-sm text-slate-600">{t.receivedDate}</TableCell>
                  <TableCell className="text-center text-sm font-medium">{t.isoCount}</TableCell>
                  <TableCell className="text-center text-sm">
                    <span className="text-emerald-700">{t.newCount} new</span>
                    {t.revisionCount > 0 && (
                      <span className="text-amber-700 ml-1">· {t.revisionCount} rev</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        t.status === "Accepted"
                          ? "bg-emerald-100 text-emerald-800"
                          : t.status === "Pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-sky-100 text-sky-800"
                      }
                    >
                      {t.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EngTransmittalDetailPanel
        transmittal={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
