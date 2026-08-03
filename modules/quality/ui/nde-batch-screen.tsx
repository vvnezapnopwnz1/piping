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
  loadJointWelderIds,
  loadNdeBatches,
  loadNdeObligations,
  loadQualityReferentials,
  recordNdeResult,
  type NdeBatch,
  type NdeObligation,
  type NdtMethod,
  type QualityReferentials,
} from "../infrastructure/supabase-quality-repository"
import {
  COVERAGE_REGIMES,
  NDT_METHODS,
  jointStatusLabel,
  type CoverageRegime,
} from "../domain/nde-batch"

const METHOD_LABELS: Record<NdtMethod, string> = {
  rt: "RT (Radiographic Testing)",
  ut: "UT (Ultrasonic Testing)",
  mt: "MT (Magnetic Particle)",
  pt: "PT (Penetrant Testing)",
  pmi: "PMI (Positive Material Identification)",
  ht: "HT (Hardness Testing)",
  vt: "VT (Visual Testing)",
}

export function NdeBatchScreen({ projectId }: { projectId: string }) {
  const [batches, setBatches] = useState<NdeBatch[]>([])
  const [obligations, setObligations] = useState<NdeObligation[]>([])
  const [referentials, setReferentials] = useState<QualityReferentials>({
    welders: [],
    reworkCodes: [],
  })
  const [loading, setLoading] = useState(true)

  // Create Batch Form
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [method, setMethod] = useState<NdtMethod>("rt")
  const [coverageRegime, setCoverageRegime] = useState<CoverageRegime>("mandatory_100")
  const [targetPercentage, setTargetPercentage] = useState("100")

  // Record Result Form
  const [selectedObligationId, setSelectedObligationId] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<"accepted" | "rejected">("accepted")
  const [examinedOn, setExaminedOn] = useState(new Date().toISOString().slice(0, 10))
  const [reportNumber, setReportNumber] = useState("")
  const [defectReworkCodeId, setDefectReworkCodeId] = useState("")
  const [responsibleWelderId, setResponsibleWelderId] = useState("")
  const [jointWelderIds, setJointWelderIds] = useState<string[]>([])

  const reload = useCallback(async () => {
    try {
      const client = getSupabaseBrowserClient()
      const [bData, oData, refs] = await Promise.all([
        loadNdeBatches(client, projectId),
        loadNdeObligations(client, projectId),
        loadQualityReferentials(client, projectId),
      ])
      setBatches(bData)
      setObligations(oData)
      setReferentials(refs)
    } catch (err: any) {
      toast.error(err.message || "Failed to load NDE data")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void reload()
  }, [reload])

  // record_nde_result refuses a welder who is not on the joint (PQC42), so the
  // form offers exactly the welders who welded it.
  const openResultDialog = useCallback(
    async (obligation: NdeObligation) => {
      setSelectedObligationId(obligation.id)
      setOutcome("accepted")
      setDefectReworkCodeId("")
      setResponsibleWelderId("")
      setJointWelderIds([])
      try {
        const ids = await loadJointWelderIds(
          getSupabaseBrowserClient(),
          obligation.weldJointRevisionId,
        )
        setJointWelderIds(ids)
      } catch (err: any) {
        toast.error(err.message || "Could not load the welders on this joint")
      }
    },
    [],
  )

  const jointWelders = referentials.welders.filter((welder) =>
    jointWelderIds.includes(welder.id),
  )
  const rejectionNeedsDefectCode = outcome === "rejected" && defectReworkCodeId === ""
  const escalatedBatches = batches.filter((b) => b.escalatedAt !== null)

  const handleCreateBatch = async () => {
    try {
      const client = getSupabaseBrowserClient()
      await createNdeBatch(
        client,
        projectId,
        method,
        coverageRegime,
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
    const percentage = Number(targetPercentage)
    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      toast.error("The coverage percentage must be between 1 and 100.")
      return
    }
    try {
      const client = getSupabaseBrowserClient()
      await allocateNdeBatchCandidates(client, batchId, percentage, crypto.randomUUID())
      toast.success(`Candidates allocated to batch at ${percentage}% coverage`)
      void reload()
    } catch (err: any) {
      toast.error(err.message || "Candidate allocation failed")
    }
  }

  const handleIssueBatch = async (batchId: string) => {
    try {
      const client = getSupabaseBrowserClient()
      await issueNdeBatch(client, batchId, crypto.randomUUID())
      toast.success("NDE Batch issued")
      void reload()
    } catch (err: any) {
      toast.error(err.message || "Issuing batch failed")
    }
  }

  const handleCloseBatch = async (batchId: string) => {
    try {
      const client = getSupabaseBrowserClient()
      await closeNdeBatch(client, batchId, crypto.randomUUID())
      toast.success("NDE Batch closed")
      void reload()
    } catch (err: any) {
      toast.error(err.message || "Closing batch failed")
    }
  }

  const handleRecordResult = async () => {
    if (!selectedObligationId) return
    // The command refuses a rejection with no defect code (PQC42); catching it
    // here keeps the form from sending a request that can only fail.
    if (rejectionNeedsDefectCode) {
      toast.error("A rejected result must carry a defect code.")
      return
    }
    try {
      const client = getSupabaseBrowserClient()
      await recordNdeResult(
        client,
        selectedObligationId,
        outcome,
        examinedOn,
        reportNumber || null,
        outcome === "rejected" ? defectReworkCodeId : null,
        responsibleWelderId || null,
        crypto.randomUUID()
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
                  {NDT_METHODS.map((value) => (
                    <option key={value} value={value}>
                      {METHOD_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Coverage regime</label>
                <select
                  className="w-full rounded-md border p-2 text-sm"
                  value={coverageRegime}
                  onChange={(e) => setCoverageRegime(e.target.value as CoverageRegime)}
                >
                  {COVERAGE_REGIMES.map((regime) => (
                    <option key={regime.value} value={regime.value}>
                      {regime.label}
                    </option>
                  ))}
                </select>
              </div>

              <Button onClick={() => void handleCreateBatch()} className="w-full">
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {escalatedBatches.length > 0 && (
        <div
          role="status"
          className="rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm"
        >
          <p className="font-medium">Penalty shoot: 100 % control in force</p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">
            {escalatedBatches.map((b) => (
              <li key={b.id}>
                Batch <span className="font-mono">{b.batchNumber}</span> escalated on{" "}
                {b.escalatedAt?.slice(0, 10)} because{" "}
                {b.escalationReason === "four_rejections"
                  ? "it reached four rejected joints"
                  : "a second-level tracer was rejected"}
                . Every remaining joint of that welder is now examined at 100 %.
              </li>
            ))}
          </ul>
        </div>
      )}

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
                  <TableHead>Regime</TableHead>
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
                      <TableCell>
                        {b.coverageRegime === "mandatory_100" ? "100 %" : "Spot"}
                      </TableCell>
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
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              aria-label="Coverage percentage"
                              className="inline-block w-20 align-middle"
                              value={targetPercentage}
                              onChange={(e) => setTargetPercentage(e.target.value)}
                            />
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
                  <TableHead>Status (manual)</TableHead>
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
                      <TableCell className="font-mono">{jointStatusLabel(ob)}</TableCell>
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
                            onClick={() => void openResultDialog(ob)}
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

            {outcome === "rejected" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Defect code</label>
                <select
                  className="w-full rounded-md border p-2 text-sm"
                  value={defectReworkCodeId}
                  onChange={(e) => setDefectReworkCodeId(e.target.value)}
                >
                  <option value="">Select a defect code…</option>
                  {referentials.reworkCodes.map((code) => (
                    <option key={code.id} value={code.id}>
                      {code.code}
                      {code.description ? ` — ${code.description}` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  A rejected result must carry a defect code.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Responsible welder</label>
              <select
                className="w-full rounded-md border p-2 text-sm"
                value={responsibleWelderId}
                onChange={(e) => setResponsibleWelderId(e.target.value)}
              >
                <option value="">The report does not name a welder</option>
                {jointWelders.map((welder) => (
                  <option key={welder.id} value={welder.id}>
                    {welder.welderCode}
                    {welder.fullName ? ` — ${welder.fullName}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Only the welders on this joint may be named. Leaving it unnamed still
                forces the repair and its tracers, but counts no penalty against anyone.
              </p>
            </div>

            <Button
              onClick={() => void handleRecordResult()}
              className="w-full"
              disabled={rejectionNeedsDefectCode}
            >
              Save Result
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
