"use client"

import { useState } from "react"
import { useSpoolingStore, SpoolingTransmittal } from "@/store/spooling-store"
import { SpoolingTransmittalDetailPanel } from "./spooling-transmittal-detail-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus } from "lucide-react"

export function SpoolingTransmittalView() {
  const transmittals = useSpoolingStore((s) => s.splTransmittals)
  const isoRecords = useSpoolingStore((s) => s.isoRecords)
  const [selected, setSelected] = useState<SpoolingTransmittal | null>(null)
  const [composing, setComposing] = useState(false)

  const releasedCount = isoRecords.filter((i) => i.status === "Released").length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          {releasedCount > 0 && (
            <p className="text-sm text-emerald-700 font-medium">
              {releasedCount} ISO{releasedCount !== 1 ? "s" : ""} ready to batch
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => setComposing(true)}>
          <Plus className="h-4 w-4 mr-1" /> Compose Batch
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Spl. Trans. No.</TableHead>
              <TableHead>Generated Date</TableHead>
              <TableHead>Target Area</TableHead>
              <TableHead className="text-center">ISO Count</TableHead>
              <TableHead>Released By</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transmittals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8 text-sm">
                  No transmittals generated yet
                </TableCell>
              </TableRow>
            ) : (
              transmittals.map((t) => (
                <TableRow key={t.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelected(t)}>
                  <TableCell className="font-mono text-sm font-medium">{t.id}</TableCell>
                  <TableCell className="text-sm text-slate-600">{t.generatedDate}</TableCell>
                  <TableCell className="text-sm">{t.targetArea}</TableCell>
                  <TableCell className="text-center text-sm font-medium">{t.isoCount}</TableCell>
                  <TableCell className="text-sm text-slate-600">{t.releasedBy}</TableCell>
                  <TableCell>
                    <Badge className={t.status === "Sent" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                      {t.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SpoolingTransmittalDetailPanel
        transmittal={selected}
        mode={selected ? "view" : "compose"}
        open={!!selected || composing}
        onClose={() => { setSelected(null); setComposing(false) }}
      />
    </div>
  )
}
