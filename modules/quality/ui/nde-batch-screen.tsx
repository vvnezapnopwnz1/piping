"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { DataTable, useTableUrlState, type DataColumn } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
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
  loadNdeBatchObligationCounts,
  loadNdeBatches,
  loadNdeObligations,
  loadQualityReferentials,
  previewNdeBatchCandidates,
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

/**
 * The inspector's worklist. Method, cycle and disposition are the three things an inspector
 * narrows by — "show me the open RT repairs" — so all three are faceted rather than left to the
 * search box, which cannot express "one of these two".
 */
const OBLIGATION_COLUMNS: ReadonlyArray<DataColumn<NdeObligation>> = [
  { id: "spoolNumber", header: "Spool", value: (ob) => ob.spoolNumber, searchable: true, filter: "text", className: "font-mono" },
  { id: "weldNumber", header: "Joint", value: (ob) => ob.weldNumber, searchable: true, filter: "text", pinned: true, alwaysVisible: true, className: "font-mono font-medium" },
  { id: "batchNumber", header: "Batch", value: (ob) => ob.batchNumber, searchable: true, filter: "select", className: "font-mono" },
  { id: "method", header: "Method", value: (ob) => ob.method, filter: "select", className: "font-mono uppercase" },
  { id: "jointStatus", header: "Status (manual)", value: (ob) => jointStatusLabel(ob), filter: "select", className: "font-mono" },
  {
    id: "cycle",
    header: "Cycle",
    value: (ob) => (ob.cycleKind === "original" ? "Original" : `${ob.cycleKind} ${ob.cycleOrdinal}`),
    filter: "select",
    cell: (ob) => (
      <Badge variant="outline">
        {ob.cycleKind === "original"
          ? "Original"
          : `${ob.cycleKind} (${ob.cycleKind === "repair" ? "R" : "T"}${ob.cycleOrdinal})`}
      </Badge>
    ),
  },
  {
    id: "requiredCoverage",
    header: "Coverage",
    numeric: true,
    value: (ob) => ob.requiredCoverage,
    filter: "number",
    cell: (ob) => `${ob.requiredCoverage}%`,
  },
  {
    id: "disposition",
    header: "Disposition",
    value: (ob) => ob.disposition,
    filter: "select",
    cell: (ob) => (
      <StatusBadge status={ob.disposition} tone={ob.disposition === "satisfied" ? "success" : undefined} />
    ),
  },
]

export function NdeBatchScreen({ projectId }: { projectId: string }) {
  const [batches, setBatches] = useState<NdeBatch[]>([])
  const [obligationCounts, setObligationCounts] = useState<Record<string, number>>({})
  const [obligations, setObligations] = useState<NdeObligation[]>([])
  const [referentials, setReferentials] = useState<QualityReferentials>({
    welders: [],
    reworkCodes: [],
  })
  const [loading, setLoading] = useState(true)
  const [obligationTable, setObligationTable] = useTableUrlState({ namespace: "ob" })

  // Create Batch Form
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [method, setMethod] = useState<NdtMethod>("rt")
  const [coverageRegime, setCoverageRegime] = useState<CoverageRegime>("mandatory_100")
  const [targetPercentage, setTargetPercentage] = useState("100")

  // Allocation preview
  const [previewBatchId, setPreviewBatchId] = useState<string | null>(null)
  const [previewCandidates, setPreviewCandidates] = useState<
    { obligationId: string; weldNumber: string; weldedOn: string | null }[]
  >([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [allocating, setAllocating] = useState(false)

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
      const [bData, oData, refs, counts] = await Promise.all([
        loadNdeBatches(client, projectId),
        loadNdeObligations(client, projectId),
        loadQualityReferentials(client, projectId),
        loadNdeBatchObligationCounts(client, projectId),
      ])
      setBatches(bData)
      setObligations(oData)
      setReferentials(refs)
      setObligationCounts(counts)
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
      // The report number is per examination, not per session. Carrying the previous
      // joint's number over is how a report gets filed against the wrong weld.
      setReportNumber("")
      setExaminedOn(new Date().toISOString().slice(0, 10))
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

  // Only an issued obligation can take a result, so the button is absent rather than disabled on
  // the rest — a disabled control on every row reads as a broken screen.
  const obligationColumns = useMemo(
    () => [
      ...OBLIGATION_COLUMNS,
      {
        id: "action",
        header: "Action",
        sortable: false,
        alwaysVisible: true,
        numeric: true,
        value: () => "",
        cell: (ob: NdeObligation) =>
          ob.disposition === "issued" ? (
            <Button size="sm" variant="outline" onClick={() => void openResultDialog(ob)}>
              Record Result
            </Button>
          ) : null,
      } satisfies DataColumn<NdeObligation>,
    ],
    [openResultDialog],
  )

  const jointWelders = referentials.welders.filter((welder) =>
    jointWelderIds.includes(welder.id),
  )
  const rejectionNeedsDefectCode = outcome === "rejected" && defectReworkCodeId === ""
  const selectedObligation = obligations.find((ob) => ob.id === selectedObligationId) ?? null
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

  // Allocation is durable and picks the joints itself, so the operator sees the candidate set
  // first. nde_batch_candidates is the same set allocate_nde_batch_candidates computes internally.
  const openAllocationPreview = async (batchId: string) => {
    const percentage = Number(targetPercentage)
    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      toast.error("The coverage percentage must be between 1 and 100.")
      return
    }
    setPreviewBatchId(batchId)
    setPreviewLoading(true)
    setPreviewCandidates([])
    try {
      const candidates = await previewNdeBatchCandidates(getSupabaseBrowserClient(), batchId)
      setPreviewCandidates(candidates)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not preview allocation candidates",
      )
      setPreviewBatchId(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleAllocateCandidates = async () => {
    if (!previewBatchId || allocating) return
    const percentage = Number(targetPercentage)
    setAllocating(true)
    try {
      const client = getSupabaseBrowserClient()
      const allocated = await allocateNdeBatchCandidates(
        client,
        previewBatchId,
        percentage,
        crypto.randomUUID(),
      )
      toast.success(
        `${allocated} candidate${allocated === 1 ? "" : "s"} allocated to batch at ${percentage}% coverage`,
      )
      setPreviewBatchId(null)
      void reload()
    } catch (err: any) {
      toast.error(err.message || "Candidate allocation failed")
    } finally {
      setAllocating(false)
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

  if (loading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">NDE Batch Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage NDE inspection batches, allocate candidate joints, and record test results.
          </p>
        </div>

        {/*
          Reopening the dialog resets it. Keeping the previous regime made the 2026-08-04
          walk create a Spot batch where a 100 % batch was meant, twice, and the mistake
          only surfaced later as a PQC41 refusal on an empty issue.
        */}
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            if (open) {
              setMethod("rt")
              setCoverageRegime("mandatory_100")
            }
            setIsCreateOpen(open)
          }}
        >
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
          className="border-danger-border bg-danger-bg text-danger-fg rounded-md border px-4 py-3 text-sm"
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
                  <TableHead>Obligations</TableHead>
                  <TableHead>Issued On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
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
                      <TableCell>{obligationCounts[b.id] ?? 0}</TableCell>
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
                              onClick={() => void openAllocationPreview(b.id)}
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
            <DataTable
              columns={obligationColumns}
              rows={obligations}
              state={obligationTable}
              onStateChange={setObligationTable}
              rowId={(ob) => ob.id}
              loading={loading}
              searchPlaceholder="Search joint, spool or batch…"
              emptyTitle="No NDE obligations found."
              emptyDescription="Obligations appear once a weld with an NDE requirement is recorded."
            />
          </CardContent>
        </Card>
      </div>

      {/* Allocation Preview Dialog — shows the candidate set before the durable allocation */}
      <Dialog
        open={Boolean(previewBatchId)}
        onOpenChange={(open) => !open && !allocating && setPreviewBatchId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Allocate candidates —{" "}
              {batches.find((b) => b.id === previewBatchId)?.batchNumber ?? "batch"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {previewLoading ? (
              <p className="text-sm text-muted-foreground">Loading candidate joints…</p>
            ) : previewCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No candidate joints are available for this batch. Allocating would take nothing.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {previewCandidates.length} candidate joint
                  {previewCandidates.length === 1 ? "" : "s"} at {targetPercentage}% coverage. The
                  server picks the final set; a spot regime takes a subset of these.
                </p>
                <div className="max-h-64 overflow-y-auto rounded border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Joint</TableHead>
                        <TableHead>Welded On</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewCandidates.map((candidate) => (
                        <TableRow key={candidate.obligationId}>
                          <TableCell className="font-mono">{candidate.weldNumber}</TableCell>
                          <TableCell>{candidate.weldedOn ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
            <Button
              onClick={() => void handleAllocateCandidates()}
              className="w-full"
              disabled={previewLoading || allocating || previewCandidates.length === 0}
            >
              {`Allocate at ${targetPercentage}% coverage`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Result Dialog */}
      <Dialog
        open={Boolean(selectedObligationId)}
        onOpenChange={(open) => !open && setSelectedObligationId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedObligation
                ? `Record NDE Result — ${selectedObligation.weldNumber} (${jointStatusLabel(selectedObligation)})`
                : "Record NDE Result"}
            </DialogTitle>
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
