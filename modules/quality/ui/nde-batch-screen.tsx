"use client"

import { useTranslations } from "next-intl"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { errorDetail } from "@/i18n/format"
import { codeLabel } from "@/i18n/translator"
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
import { useNameWorkContext, useWorkContextParam } from "@/components/pipeqc/work-context"
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
  type BatchStatus,
  type CoverageRegime,
  type ObligationDisposition,
} from "../domain/nde-batch"

/**
 * The inspector's worklist. Method, cycle and disposition are the three things an inspector
 * narrows by — "show me the open RT repairs" — so all three are faceted rather than left to the
 * search box, which cannot express "one of these two".
 */
type BatchTranslator = ReturnType<typeof useTranslations<"nde.batch">>
type CodesTranslator = ReturnType<typeof useTranslations<"codes">>

function createObligationColumns(t: BatchTranslator, tc: CodesTranslator): ReadonlyArray<DataColumn<NdeObligation>> {
  return [
    { id: "spoolNumber", header: t("columns.spool"), value: (ob) => ob.spoolNumber, searchable: true, filter: "text", className: "font-mono" },
    { id: "weldNumber", header: t("columns.joint"), value: (ob) => ob.weldNumber, searchable: true, filter: "text", pinned: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "batchNumber", header: t("columns.batch"), value: (ob) => ob.batchNumber, searchable: true, filter: "select", className: "font-mono" },
    { id: "method", header: t("columns.method"), value: (ob) => codeLabel(tc, "ndeMethod", ob.method), filter: "select", className: "font-mono" },
    { id: "jointStatus", header: t("columns.manualStatus"), value: (ob) => jointStatusLabel(ob), filter: "select", className: "font-mono" },
    {
      id: "cycle",
      header: t("columns.cycle"),
      value: (ob) => ob.cycleKind === "original"
        ? t("cycle.original")
        : t("cycle.value", { kind: t(`cycle.${ob.cycleKind}`), ordinal: ob.cycleOrdinal }),
      filter: "select",
      cell: (ob) => (
        <Badge variant="outline">
          {ob.cycleKind === "original"
            ? t("cycle.original")
            : t("cycle.badge", {
              kind: t(`cycle.${ob.cycleKind}`),
              code: `${ob.cycleKind === "repair" ? "R" : "T"}${ob.cycleOrdinal}`,
            })}
        </Badge>
      ),
    },
    {
      id: "requiredCoverage",
      header: t("columns.coverage"),
      numeric: true,
      value: (ob) => ob.requiredCoverage,
      filter: "number",
      cell: (ob) => t("coveragePercent", { percentage: ob.requiredCoverage }),
    },
    {
      id: "disposition",
      header: t("columns.disposition"),
      value: (ob) => batchStatusLabel(t, tc, ob.disposition),
      filter: "select",
      cell: (ob) => (
        <StatusBadge
          status={ob.disposition}
          label={batchStatusLabel(t, tc, ob.disposition)}
          tone={ob.disposition === "satisfied" ? "success" : undefined}
        />
      ),
    },
  ]
}

function batchStatusLabel(
  t: BatchTranslator,
  tc: CodesTranslator,
  status: BatchStatus | ObligationDisposition,
): string {
  switch (status) {
    case "draft": return tc("status.draft")
    case "issued": return tc("status.issued")
    case "pending": return tc("status.pending")
    case "rejected": return tc("status.rejected")
    case "superseded": return tc("status.superseded")
    case "returned": return t("batchStatus.returned")
    case "closed": return t("batchStatus.closed")
    case "satisfied": return t("batchStatus.satisfied")
    case "waived": return t("batchStatus.waived")
  }
}

export function NdeBatchScreen({ projectId }: { projectId: string }) {
  const t = useTranslations("nde.batch")
  const tc = useTranslations("codes")
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
      toast.error(t("errors.failedToLoadNdeData"), { description: errorDetail(err) })
    } finally {
      setLoading(false)
    }
  }, [projectId, t])

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
        toast.error(t("errors.couldNotLoadTheWelders"), { description: errorDetail(err) })
      }
    },
    [t],
  )

  // Only an issued obligation can take a result, so the button is absent rather than disabled on
  // the rest — a disabled control on every row reads as a broken screen.
  const obligationColumns = useMemo(
    () => [
      ...createObligationColumns(t, tc),
      {
        id: "action",
        header: t("action"),
        sortable: false,
        alwaysVisible: true,
        numeric: true,
        value: () => "",
        cell: (ob: NdeObligation) =>
          ob.disposition === "issued" ? (
            <Button size="sm" variant="outline" data-help="nde-record" onClick={() => void openResultDialog(ob)}>
              {t("recordResult")}
            </Button>
          ) : null,
      } satisfies DataColumn<NdeObligation>,
    ],
    [openResultDialog, t, tc],
  )

  const jointWelders = referentials.welders.filter((welder) =>
    jointWelderIds.includes(welder.id),
  )
  const rejectionNeedsDefectCode = outcome === "rejected" && defectReworkCodeId === ""
  const selectedObligation = obligations.find((ob) => ob.id === selectedObligationId) ?? null
  // A spool handed over by a blocker link narrows the worklist to its obligations; the chip in the
  // page head clears it again.
  const [spoolContext] = useWorkContextParam("spool")
  const visibleObligations = useMemo(
    () => (spoolContext ? obligations.filter((ob) => ob.spoolRevisionId === spoolContext) : obligations),
    [obligations, spoolContext],
  )
  useNameWorkContext("spool", spoolContext, visibleObligations[0]?.spoolNumber)
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
      toast.success(t("success.ndeBatchCreated"))
      setIsCreateOpen(false)
      void reload()
    } catch (err: any) {
      toast.error(t("errors.couldNotCreateBatch"), { description: errorDetail(err) })
    }
  }

  // Allocation is durable and picks the joints itself, so the operator sees the candidate set
  // first. nde_batch_candidates is the same set allocate_nde_batch_candidates computes internally.
  const openAllocationPreview = async (batchId: string) => {
    const percentage = Number(targetPercentage)
    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      toast.error(t("validation.coveragePercentage"))
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
        t("errors.couldNotPreviewAllocationCandidates"), { description: errorDetail(err) },
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
      toast.success(t("success.candidatesAllocated", { count: allocated, percentage }))
      setPreviewBatchId(null)
      void reload()
    } catch (err: any) {
      toast.error(t("errors.candidateAllocationFailed"), { description: errorDetail(err) })
    } finally {
      setAllocating(false)
    }
  }

  const handleIssueBatch = async (batchId: string) => {
    try {
      const client = getSupabaseBrowserClient()
      await issueNdeBatch(client, batchId, crypto.randomUUID())
      toast.success(t("success.ndeBatchIssued"))
      void reload()
    } catch (err: any) {
      toast.error(t("errors.issuingBatchFailed"), { description: errorDetail(err) })
    }
  }

  const handleCloseBatch = async (batchId: string) => {
    try {
      const client = getSupabaseBrowserClient()
      await closeNdeBatch(client, batchId, crypto.randomUUID())
      toast.success(t("success.ndeBatchClosed"))
      void reload()
    } catch (err: any) {
      toast.error(t("errors.closingBatchFailed"), { description: errorDetail(err) })
    }
  }

  const handleRecordResult = async () => {
    if (!selectedObligationId) return
    // The command refuses a rejection with no defect code (PQC42); catching it
    // here keeps the form from sending a request that can only fail.
    if (rejectionNeedsDefectCode) {
      toast.error(t("validation.rejectedRequiresDefectCode"))
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
      toast.success(t("success.resultRecorded", { outcome: t(`outcomeCode.${outcome}`) }))
      setSelectedObligationId(null)
      void reload()
    } catch (err: any) {
      toast.error(t("errors.failedToRecordResult"), { description: errorDetail(err) })
    }
  }

  if (loading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl tracking-tight">{t("ndeBatchManagement")}</h1>
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
            <Button>{t("createBatch")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("newNdeBatch")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("ndtMethod")}</label>
                <select
                  className="w-full rounded-md border p-2 text-sm"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as NdtMethod)}
                >
                  {NDT_METHODS.map((value) => (
                    <option key={value} value={value}>
                      {tc(`ndeMethod.${value}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("coverageRegime")}</label>
                <select
                  className="w-full rounded-md border p-2 text-sm"
                  value={coverageRegime}
                  onChange={(e) => setCoverageRegime(e.target.value as CoverageRegime)}
                >
                  {COVERAGE_REGIMES.map((regime) => (
                    <option key={regime} value={regime}>
                      {t(`coverageRegimeOption.${regime}`)}
                    </option>
                  ))}
                </select>
              </div>

              <Button onClick={() => void handleCreateBatch()} className="w-full">
                {t("create")}
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
          <p className="font-medium">{t("penaltyShoot100ControlIn")}</p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">
            {escalatedBatches.map((b) => (
              <li key={b.id}>
                {t.rich("escalatedBatch", {
                  batchNumber: b.batchNumber,
                  date: b.escalatedAt?.slice(0, 10) ?? "—",
                  reason: b.escalationReason === "four_rejections"
                    ? t("escalationReason.fourRejections")
                    : t("escalationReason.secondLevelTracer"),
                  batch: (chunks) => <span className="font-mono">{chunks}</span>,
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("batches", { count: batches.length })}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("batch")}</TableHead>
                  <TableHead>{t("method")}</TableHead>
                  <TableHead>{t("regime")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("obligations")}</TableHead>
                  <TableHead>{t("issuedOn")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {t("noNdeBatchesCreatedYet")}
                    </TableCell>
                  </TableRow>
                ) : (
                  batches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono font-medium">{b.batchNumber}</TableCell>
                      <TableCell className="uppercase">{codeLabel(tc, "ndeMethod", b.method)}</TableCell>
                      <TableCell>
                        {t(`coverageRegimeSummary.${b.coverageRegime}`)}
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
                          {batchStatusLabel(t, tc, b.status)}
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
                              aria-label={t("coveragePercentage")}
                              className="inline-block w-20 align-middle"
                              value={targetPercentage}
                              onChange={(e) => setTargetPercentage(e.target.value)}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void openAllocationPreview(b.id)}
                            >
                              {t("allocateCandidates")}
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => void handleIssueBatch(b.id)}
                            >
                              {t("issueBatch")}
                            </Button>
                          </>
                        )}
                        {b.status === "issued" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void handleCloseBatch(b.id)}
                          >
                            {t("closeBatch")}
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
            <CardTitle>
              {spoolContext
                ? t("ndeObligationsForSpool", { shown: visibleObligations.length, total: obligations.length })
                : t("ndeObligations", { count: obligations.length })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={obligationColumns}
              rows={visibleObligations}
              state={obligationTable}
              onStateChange={setObligationTable}
              rowId={(ob) => ob.id}
              loading={loading}
              searchPlaceholder={t("searchJointSpoolOrBatch")}
              emptyTitle={spoolContext ? t("noNdeObligationForThe") : t("noNdeObligationsFound")}
              emptyDescription={
                spoolContext
                  ? t("clearTheSelectedSpoolIn")
                  : t("obligationsAppearOnceAWeld")
              }
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
              {t("allocateCandidatesFor", {
                batch: batches.find((b) => b.id === previewBatchId)?.batchNumber ?? t("batchFallback"),
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {previewLoading ? (
              <p className="text-sm text-muted-foreground">{t("loadingCandidateJoints")}</p>
            ) : previewCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noCandidateJointsAreAvailable")}
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {t("candidatePreview", { count: previewCandidates.length, percentage: targetPercentage })}
                </p>
                <div className="max-h-64 overflow-y-auto rounded border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("joint")}</TableHead>
                        <TableHead>{t("weldedOn")}</TableHead>
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
              {t("allocateAtPercentage", { percentage: targetPercentage })}
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
                ? t("recordNdeResultFor", {
                  weldNumber: selectedObligation.weldNumber,
                  status: jointStatusLabel(selectedObligation),
                })
                : t("recordNdeResult")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("outcome")}</label>
              <select
                className="w-full rounded-md border p-2 text-sm"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as "accepted" | "rejected")}
              >
                <option value="accepted">{t("accepted")}</option>
                <option value="rejected">{t("rejected")}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("examinedOn")}</label>
              <Input
                type="date"
                value={examinedOn}
                onChange={(e) => setExaminedOn(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("reportNumber")}</label>
              <Input
                placeholder="RPT-2026-001"
                value={reportNumber}
                onChange={(e) => setReportNumber(e.target.value)}
              />
            </div>

            {outcome === "rejected" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("defectCode")}</label>
                <select
                  className="w-full rounded-md border p-2 text-sm"
                  value={defectReworkCodeId}
                  onChange={(e) => setDefectReworkCodeId(e.target.value)}
                >
                  <option value="">{t("selectADefectCode")}</option>
                  {referentials.reworkCodes.map((code) => (
                    <option key={code.id} value={code.id}>
                      {code.code}
                      {code.description ? ` — ${code.description}` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {t("validation.rejectedRequiresDefectCode")}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("responsibleWelder")}</label>
              <select
                className="w-full rounded-md border p-2 text-sm"
                value={responsibleWelderId}
                onChange={(e) => setResponsibleWelderId(e.target.value)}
              >
                <option value="">{t("theReportDoesNotName")}</option>
                {jointWelders.map((welder) => (
                  <option key={welder.id} value={welder.id}>
                    {welder.welderCode}
                    {welder.fullName ? ` — ${welder.fullName}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {t("onlyTheWeldersOnThis")}
              </p>
            </div>

            <Button
              onClick={() => void handleRecordResult()}
              className="w-full"
              disabled={rejectionNeedsDefectCode}
            >
              {t("saveResult")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
