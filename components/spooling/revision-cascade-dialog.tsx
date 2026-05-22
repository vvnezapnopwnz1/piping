"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useSpoolingStore } from "@/store/spooling-store"
import { AlertTriangle } from "lucide-react"

const REV_OPTIONS = ["R1", "R2", "R3", "R4"]

interface Props {
  open: boolean
  onClose: () => void
}

export function RevisionCascadeDialog({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [selectedIso, setSelectedIso] = useState("")
  const [newRev, setNewRev] = useState("")
  const [reason, setReason] = useState("")
  const isoRecords = useSpoolingStore((s) => s.isoRecords)
  const applyRevision = useSpoolingStore((s) => s.applyRevision)

  const activeISOs = isoRecords.filter((i) => i.status !== "Superseded")
  const selectedRecord = isoRecords.find((i) => i.id === selectedIso && i.status !== "Superseded")

  const hasRounds = (selectedRecord?.totalRounds ?? 0) > 0
  const isInFab = selectedRecord?.status === "Released"

  async function handleApply() {
    if (!selectedIso || !newRev || !reason.trim()) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 200))
    applyRevision(selectedIso, newRev, reason)
    toast.success(`${selectedIso} → ${newRev} applied — old version superseded`)
    setLoading(false)
    setSelectedIso("")
    setNewRev("")
    setReason("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Revision</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>ISO</Label>
            <Select value={selectedIso} onValueChange={setSelectedIso}>
              <SelectTrigger><SelectValue placeholder="Select ISO..." /></SelectTrigger>
              <SelectContent>
                {activeISOs.map((iso) => (
                  <SelectItem key={`${iso.id}-${iso.rev}`} value={iso.id}>
                    {iso.id} ({iso.rev})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRecord && (
            <div className="rounded-md bg-slate-50 border p-3 space-y-1 text-sm">
              <div>Current rev: <span className="font-medium">{selectedRecord.rev}</span></div>
              <div>Status: <Badge className="text-xs">{selectedRecord.status}</Badge></div>
              {hasRounds && (
                <div className="text-amber-700">{selectedRecord.totalRounds} checking round(s) will be archived</div>
              )}
            </div>
          )}

          {isInFab && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              This ISO is Released — it may already be in the Fabrication module. Coordinate with QC team before applying revision.
            </div>
          )}

          <div className="space-y-2">
            <Label>New Revision</Label>
            <Select value={newRev} onValueChange={setNewRev}>
              <SelectTrigger><SelectValue placeholder="Select new rev..." /></SelectTrigger>
              <SelectContent>
                {REV_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reason for revision</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Client change / design correction / material update..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleApply}
            disabled={!selectedIso || !newRev || !reason.trim() || loading}
          >
            {loading ? "Applying..." : "Apply Revision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
