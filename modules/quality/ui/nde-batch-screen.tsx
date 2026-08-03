"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  allocateNdeBatchCandidates,
  closeNdeBatch,
  createNdeBatch,
  issueNdeBatch,
  loadNdeBatches,
  loadNdeObligations,
  recordNdeResult,
  type NdeBatch,
  type NdeObligation,
  type NdtMethod,
} from "../infrastructure/supabase-quality-repository"

export function NdeBatchScreen({ projectId }: { projectId: string }) {
  const [batches, setBatches] = useState<NdeBatch[]>([])
  const [obligations, setObligations] = useState<NdeObligation[]>([])
  const [loading, setLoading] = useState(true)

  // Create Batch Form
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [method, setMethod] = useState<NdtMethod>("rt")
  const [categoryCode, setCategoryCode] = useState("NDE100")

  // Record Result Form
  const [selectedObligationId, setSelectedObligationId] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<"accepted" | "rejected">("accepted")
  const [examinedOn, setExaminedOn] = useState(new Date().toISOString().slice(0, 10))
  const [reportNumber, setReportNumber] = useState("")

  const reload = useCallback(async () => {
    try {
      const client = getSupabaseBrowserClient()
      const [bData, oData] = await Promise.all([
        loadNdeBatches(client, projectId),
        loadNdeObligations(client, projectId),
      ])
      setBatches(bData)
      setObligations(oData)
    } catch (err: any) {
      toast.error(err.message || "Failed to load NDE data")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleCreateBatch = async () => {
    try {
      const client = getSupabaseBrowserClient()
      await createNdeBatch(
        client,
        projectId,
        method,
        categoryCode,
        null,
        null,
        crypto.randomUUID()
      )
      toast.success("NDE Batch created successfully")
      setIsCreateOpen(false)
      void reload()
    } catch (err: any) {
      toast.error(err.message || "Could not create batch")
    }
  }

  const handleAllocateCandidates = async (batchId: string) => {
    try {
      const client = getSupabaseBrowserClient()
      await allocateNdeBatchCandidates(client, batchId)
      toast.success("Candidates allocated to batch")
      void reload()
    } catch (err: any) {
      toast.error(err.message || "Candidate allocation failed")
    }
  }

  const handleIssueBatch = async (batchId: string) => {
    try {
      const client = getSupabaseBrowserClient()
      await issueNdeBatch(client, batchId)
      toast.success("NDE Batch issued")
      void reload()
    } catch (err: any) {
      toast.error(err.message || "Issuing batch failed")
    }
  }

  const handleCloseBatch = async (batchId: string) => {
    try {
      const client = getSupabaseBrowserClient()
      await closeNdeBatch(client, batchId)
      toast.success("NDE Batch closed")
      void reload()
    } catch (err: any) {
      toast.error(err.message || "Closing batch failed")
    }
  }

  const handleRecordResult = async () => {
    if (!selectedObligationId) return
    try {
      const client = getSupabaseBrowserClient()
      await recordNdeResult(
        client,
        selectedObligationId,
        outcome,
        examinedOn,
        reportNumber || null,
        null,
        null
      )
      toast.success(`Result recorded: ${outcome}`)
      setSelectedObligationId(null)
      void reload()
    } catch (err: any) {
      toast.error(err.message || "Failed to record result")
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Loading NDE Batches...</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">NDE Batch Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage NDE inspection batches, allocate candidate joints, and record test results.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>Create Batch</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New NDE Batch</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">NDT Method</label>
                <select
                  className="w-full rounded-md border p-2 text-sm"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as NdtMethod)}
                >
                  <option value="rt">RT (Radiographic Testing)</option>
                  <option value="ut">UT (Ultrasonic Testing)</option>
                  <option value="pt">PT (Penetrant Testing)</option>
                  <option value="mt">MT (Magnetic Particle)</option>
                  <option value="vt">VT (Visual Testing)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Category Code</label>
                <input
                  className="w-full rounded-md border p-2 text-sm"
                  value={categoryCode}
                  onChange={(e) => setCategoryCode(e.target.value)}
                  placeholder="e.g. NDE100, S, SS"
                />
              </div>

              <Button onClick={() => void handleCreateBatch()} className="w-full">
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Batches ({batches.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch #</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No NDE batches created yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  batches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono font-medium">{b.batchNumber}</TableCell>
                      <TableCell className="uppercase">{b.method}</TableCell>
                      <TableCell>{b.categoryCode}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            b.status === "closed"
                              ? "default"
                              : b.status === "issued"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{b.issuedOn ?? "—"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {b.status === "draft" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleAllocateCandidates(b.id)}
                            >
                              Allocate Candidates
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => void handleIssueBatch(b.id)}
                            >
                              Issue Batch
                            </Button>
                          </>
                        )}
                        {b.status === "issued" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void handleCloseBatch(b.id)}
                          >
                            Close Batch
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>NDE Obligations ({obligations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead>Disposition</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {obligations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No NDE obligations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  obligations.map((ob) => (
                    <TableRow key={ob.id}>
                      <TableCell className="uppercase font-mono">{ob.method}</TableCell>
                      <TableCell>{ob.categoryCode}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {ob.cycleKind === "original"
                            ? "Original"
                            : `${ob.cycleKind} (${ob.cycleKind === "repair" ? "R" : "T"}${ob.cycleOrdinal})`}
                        </Badge>
                      </TableCell>
                      <TableCell>{ob.requiredCoverage}%</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ob.disposition === "satisfied"
                              ? "default"
                              : ob.disposition === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {ob.disposition}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {ob.disposition === "issued" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedObligationId(ob.id)}
                          >
                            Record Result
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Record Result Dialog */}
      <Dialog
        open={Boolean(selectedObligationId)}
        onOpenChange={(open) => !open && setSelectedObligationId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record NDE Result</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Outcome</label>
              <select
                className="w-full rounded-md border p-2 text-sm"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as "accepted" | "rejected")}
              >
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Examined On</label>
              <Input
                type="date"
                value={examinedOn}
                onChange={(e) => setExaminedOn(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Report Number</label>
              <Input
                placeholder="RPT-2026-001"
                value={reportNumber}
                onChange={(e) => setReportNumber(e.target.value)}
              />
            </div>

            <Button onClick={() => void handleRecordResult()} className="w-full">
              Save Result
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
