"use client"

import { useSpoolingStore } from "@/store/spooling-store"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function SpoolingRevisionPanel() {
  const conflicts = useSpoolingStore((s) => s.revisionConflicts)
  const setRevisionAction = useSpoolingStore((s) => s.setRevisionAction)

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="text-sm font-semibold">Manual Revision Management</div>
      <div className="text-xs text-slate-600">Current revision vs incoming revision, changed welds/flanges, removed items.</div>
      <div className="space-y-2">
        {conflicts.length === 0 ? (
          <div className="text-xs text-slate-500">No revision conflicts</div>
        ) : conflicts.map((c) => (
          <div key={c.isoNo} className="rounded border border-slate-200 p-3 grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
            <div className="font-mono text-xs">{c.isoNo}</div>
            <div className="text-xs">Current: {c.currentRevision}</div>
            <div className="text-xs">Incoming: {c.incomingRevision}</div>
            <div className="text-xs">Δ welds: {c.changedWelds}</div>
            <div className="text-xs">Δ flanges: {c.changedFlanges} · Removed: {c.removedItems}</div>
            <Select value={c.action} onValueChange={(v) => setRevisionAction(c.isoNo, v as "accept" | "hold" | "reject")}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="accept">accept new revision</SelectItem>
                <SelectItem value="hold">hold for review</SelectItem>
                <SelectItem value="reject">reject import</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  )
}
