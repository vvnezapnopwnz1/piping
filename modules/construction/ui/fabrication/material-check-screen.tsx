"use client"

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ArrowRight, RotateCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { canVisit } from "@/components/pipeqc/navigation-model"
import { useMarkInputsRecorded } from "@/components/pipeqc/unsaved-input-guard"
import { linkFrom } from "@/components/pipeqc/workspace-model"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { materialReferenceHref } from "../../application/material-reference-link"
import { describeMaterialCheckGate, toMaterialCheckPayload } from "../../application/record-material-check"
import {
  loadSpoolStatus,
  recordConstructionProgress,
  recordMaterialCheck,
  requestQc13Form,
} from "../../infrastructure/supabase-construction-repository"
import { useMaterialCheckWorkspace } from "../use-material-check-workspace"
import { MaterialTracePicker } from "../material-trace-picker"
import { SpoolPicker } from "./spool-picker"
import { useContextSpool, type EmbeddedSpool } from "./use-context-spool"
import { SpoolStageTimeline } from "./spool-stage-timeline"
import { panelMode } from "../panel-mode"
import styles from "../spool-workbench.module.css"

export function MaterialCheckScreen({
  projectId,
  embedded,
}: {
  projectId: string
  embedded?: EmbeddedSpool
}) {
  const [ownSpool, setOwnSpool] = useContextSpool(projectId, { enabled: !embedded })
  const spool = embedded ? embedded.spool : ownSpool
  const setSpool = embedded ? embedded.onSpoolChange : setOwnSpool
  const spoolRevisionId = spool?.spoolRevisionId ?? null

  const [browsingSpools, setBrowsingSpools] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const pendingRef = useRef(false)

  const recordingDateInputRef = useRef<HTMLInputElement>(null)
  const markRecorded = useMarkInputsRecorded()

  const pathname = usePathname()
  const query = useSearchParams().toString()
  const here = query ? `${pathname}?${query}` : pathname
  const can = useOptionalAccess()?.can
  const auth = useSupabaseAuth()
  const activityCode = auth.access?.activityCode ?? ""
  const canOpenPml = Boolean(can && canVisit("/admin/project-referential", can))

  const weldsHref =
    spool && can && canVisit("/fabrication/weld-progress", can)
      ? linkFrom(`/fabrication/weld-progress?spool=${encodeURIComponent(spool.spoolRevisionId)}`, here)
      : null

  const {
    targetKey,
    loadState,
    error: workspaceError,
    workspace,
    drafts,
    entries,
    checkedOn,
    setCheckedOn,
    choose,
    clearChoice,
    refresh,
    applySaved,
    applyRecordedDate,
  } = useMaterialCheckWorkspace({
    projectId,
    spoolRevisionId,
  })

  const lines = workspace?.lines ?? []
  const accepted = workspace?.accepted ?? []
  const acceptedMap = useMemo(
    () => new Map(accepted.map((item) => [item.spoolRevisionMaterialId, item])),
    [accepted],
  )
  const isCheckComplete = Boolean(
    lines.length > 0 && accepted.length >= lines.length,
  )

  const recordedQc13Form = workspace?.record?.qc13Form ?? null
  const latestQc13Form = workspace?.latestQc13Form ?? null
  const hasDifferentLatestQc13 = Boolean(
    latestQc13Form && recordedQc13Form && latestQc13Form.id !== recordedQc13Form.id,
  )

  const gate = describeMaterialCheckGate(
    lines,
    entries,
    spool?.dates.start_fab ?? null,
  )

  const reloadSpool = useCallback(async () => {
    if (!spoolRevisionId) return
    const client = getSupabaseBrowserClient()
    const status = await loadSpoolStatus(client, spoolRevisionId)
    setSpool(status)
  }, [spoolRevisionId, setSpool])

  const reloadAll = useCallback(async () => {
    await Promise.all([reloadSpool(), refresh()])
  }, [reloadSpool, refresh])

  const startFab = async () => {
    if (!spool || pendingRef.current || spool.dates.start_fab !== null) return
    pendingRef.current = true
    setPendingAction("start-fab")
    try {
      await recordConstructionProgress(
        getSupabaseBrowserClient(),
        spool.spoolRevisionId,
        "start_fab",
        checkedOn,
        crypto.randomUUID(),
      )
      if (recordingDateInputRef.current) markRecorded([recordingDateInputRef.current])
      applyRecordedDate({ targetKey, checkedOn })
      try {
        await reloadAll()
      } catch {
        toast.error("Recorded; status could not be refreshed. Retry refresh.")
      }
      toast.success("Start Fab recorded.")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Start Fab could not be recorded.")
    } finally {
      pendingRef.current = false
      setPendingAction(null)
    }
  }

  const issueQc13 = async () => {
    if (!spool || pendingRef.current || spool.dates.start_fab === null) return
    pendingRef.current = true
    setPendingAction("issue-qc13")
    try {
      const form = await requestQc13Form(
        getSupabaseBrowserClient(),
        spool.spoolRevisionId,
        checkedOn,
        crypto.randomUUID(),
      )
      if (recordingDateInputRef.current) markRecorded([recordingDateInputRef.current])
      applyRecordedDate({ targetKey, checkedOn })
      try {
        await reloadAll()
      } catch {
        toast.error("Recorded; status could not be refreshed. Retry refresh.")
      }
      toast.success(`QC-13 ${form.formNumber} issued.`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "The QC-13 could not be issued.")
    } finally {
      pendingRef.current = false
      setPendingAction(null)
    }
  }

  const saveTraces = async () => {
    if (!spool || pendingRef.current || !gate.allowed || loadState !== "ready") return
    pendingRef.current = true
    setPendingAction("record-traces")
    try {
      await recordMaterialCheck(
        getSupabaseBrowserClient(),
        toMaterialCheckPayload({
          spoolRevisionId: spool.spoolRevisionId,
          checkedOn,
          qc13FormId: latestQc13Form?.id ?? null,
          entries,
        }),
        crypto.randomUUID(),
      )

      if (recordingDateInputRef.current) markRecorded([recordingDateInputRef.current])

      applySaved({
        targetKey,
        entries,
        checkedOn,
      })

      try {
        await reloadAll()
      } catch {
        toast.error("Recorded; status could not be refreshed. Retry refresh.")
      }
      toast.success("Material traces recorded.")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "The traces could not be recorded.")
    } finally {
      pendingRef.current = false
      setPendingAction(null)
    }
  }

  let nextActionNode: ReactNode = null
  if (spool) {
    if (!spool.dates.start_fab) {
      nextActionNode = (
        <span className="text-xs text-amber-800 dark:text-amber-300">
          Next step: Record Start Fab before recording material traces.
        </span>
      )
    } else if (!isCheckComplete) {
      nextActionNode = (
        <span className="text-xs text-muted-foreground">
          Next step: Select registered traces below and Record traces.
        </span>
      )
    } else {
      nextActionNode = (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Material check complete: all lines traced.
          </span>
          {embedded ? (
            embedded.canOpenOperation?.("welds") ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => embedded.onOpenOperation?.("welds")}
              >
                Open Shop welds <ArrowRight className="h-3 w-3 ml-1 inline" aria-hidden="true" />
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Shop welds not in your access</span>
            )
          ) : weldsHref ? (
            <Link href={weldsHref} className={styles.checkActionLink}>
              Open Shop welds <ArrowRight className="h-3 w-3 ml-1 inline" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      )
    }
  }

  const isDone = Boolean(spool?.dates.start_fab && spool?.dates.material_check)
  const mode = spool ? panelMode({ allRecorded: isDone, blockedBy: null }) : "actionable"

  return (
    <div className="space-y-4" data-explicit-unsaved-commit="true">
      {/* Inside the workbench the one spool list sits above every operation. */}
      {embedded ? null : (
        <SpoolPicker
          projectId={projectId}
          value={spool?.spoolRevisionId ?? null}
          selected={spool}
          onChange={setSpool}
          browsing={browsingSpools}
          onBrowsingChange={setBrowsingSpools}
          refreshToken={0}
        />
      )}

      {spool && !browsingSpools ? (
        <div className="space-y-4">
          {mode === "done" ? (
            <p className="text-xs text-muted-foreground">
              Start Fab {spool.dates.start_fab} · Material check {spool.dates.material_check} · QC-13 {recordedQc13Form?.formNumber ?? "—"}
            </p>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  {embedded ? "Start Fab and QC-13" : `${spool.isoNumber} / ${spool.spoolNumber} (${spool.revisionNumber})`}
                </CardTitle>
              </CardHeader>
            <CardContent className="space-y-3">
              {embedded ? null : <SpoolStageTimeline status={spool} />}

              {/* Compact summary at top */}
              <div className={styles.opSummary}>
                <div className={styles.opSummaryItem}>
                  <span className={styles.opSummaryLabel}>Start Fab:</span>
                  <span className={styles.opSummaryValue}>
                    {spool.dates.start_fab ? spool.dates.start_fab : "Not recorded"}
                  </span>
                </div>
                <div className={styles.opSummaryItem}>
                  <span className={styles.opSummaryLabel}>Traced lines:</span>
                  <span className={styles.opSummaryValue}>
                    {accepted.length} of {lines.length}
                  </span>
                </div>
                <div className={styles.opSummaryItem}>
                  <span className={styles.opSummaryLabel}>QC-13 form:</span>
                  <span className={styles.opSummaryValue}>
                    {recordedQc13Form?.formNumber ?? "None"}
                    {hasDifferentLatestQc13 && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        Latest: {latestQc13Form?.formNumber}
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {nextActionNode ? <div className="pt-1">{nextActionNode}</div> : null}

              <div className="flex flex-wrap items-end gap-2 pt-1">
                <label className="text-sm font-medium">
                  Recording date
                  <Input
                    ref={recordingDateInputRef}
                    type="date"
                    value={checkedOn}
                    disabled={pendingAction !== null}
                    onChange={(event) => setCheckedOn(event.target.value)}
                    className="mt-1"
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void startFab()}
                  disabled={
                    spool.dates.start_fab !== null ||
                    pendingAction !== null ||
                    loadState !== "ready"
                  }
                  loading={pendingAction === "start-fab"}
                >
                  Record Start Fab
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void issueQc13()}
                  disabled={
                    spool.dates.start_fab === null ||
                    pendingAction !== null ||
                    loadState !== "ready"
                  }
                  loading={pendingAction === "issue-qc13"}
                >
                  Issue QC-13
                </Button>
              </div>
            </CardContent>
          </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle>Material traceability</CardTitle>
              {loadState === "loading" ? (
                <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900">
                  Loading bill of materials…
                </Badge>
              ) : loadState === "error" ? (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Failed to load BOM</Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void reloadAll()}
                  >
                    <RotateCw className="h-3 w-3 mr-1" aria-hidden="true" /> Retry
                  </Button>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ident code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Heat / trace number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => {
                    const acceptedItem = acceptedMap.get(line.spoolRevisionMaterialId)
                    const draft = drafts[line.spoolRevisionMaterialId]
                    const traceState = draft
                      ? "Edited, not recorded"
                      : acceptedItem
                        ? "Recorded"
                        : "Not recorded"

                    let statusClass = "text-muted-foreground"
                    if (traceState === "Recorded") {
                      statusClass = "text-emerald-700 font-semibold dark:text-emerald-400"
                    } else if (traceState === "Edited, not recorded") {
                      statusClass = "text-amber-700 font-semibold dark:text-amber-400"
                    }

                    const pmlHref =
                      canOpenPml && spoolRevisionId && activityCode
                        ? materialReferenceHref({
                            activityCode,
                            spoolRevisionId,
                            bomRowId: line.spoolRevisionMaterialId,
                            identCode: line.identCode,
                            from: here,
                          })
                        : undefined

                    return (
                      <TableRow key={line.spoolRevisionMaterialId}>
                        <TableCell className="font-mono text-xs">{line.identCode}</TableCell>
                        <TableCell>{line.description ?? "—"}</TableCell>
                        <TableCell>
                          {line.quantity ?? "—"} {line.unit ?? ""}
                        </TableCell>
                        <TableCell className={styles.traceStatusBadge}>
                          <span className={statusClass}>{traceState}</span>
                        </TableCell>
                        <TableCell>
                          {acceptedItem ? (
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">
                                  {acceptedItem.traceNumber ?? "Evidence source unavailable"}
                                </span>
                                {pmlHref ? (
                                  <Link
                                    href={pmlHref}
                                    className="shrink-0 text-[10px] uppercase tracking-wider text-primary hover:underline"
                                  >
                                    Open PML
                                  </Link>
                                ) : null}
                              </div>
                              <span className="block text-xs text-muted-foreground">
                                MRR {acceptedItem.mrrNumber ?? "unavailable"} · {acceptedItem.status ?? "unavailable"}
                              </span>
                            </div>
                          ) : isDone ? (
                            <span className="text-sm text-muted-foreground">—</span>
                          ) : (
                            <MaterialTracePicker
                              line={line}
                              selectedDraft={draft}
                              disabled={pendingAction !== null}
                              pmlHref={pmlHref}
                              onChoose={choose}
                              onClear={clearChoice}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {loadState === "error" ? (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <p>
                    {workspaceError ?? "The bill of materials could not be loaded, so nothing is shown above."}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void reloadAll()}
                  >
                    <RotateCw className="h-3 w-3 mr-1" aria-hidden="true" /> Retry
                  </Button>
                </div>
              ) : null}

              {isCheckComplete || isDone ? null : (
                <div className={embedded ? styles.recordActions : "flex flex-wrap items-center gap-2"}>
                  <Button
                    type="button"
                    onClick={() => void saveTraces()}
                    disabled={
                      !gate.allowed ||
                      pendingAction !== null ||
                      loadState !== "ready"
                    }
                    loading={pendingAction === "record-traces"}
                  >
                    Record traces
                  </Button>
                  {gate.reason && !gate.allowed ? (
                    <span className="text-xs text-muted-foreground">{gate.reason}</span>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a spool to record material traces.</p>
      )}
    </div>
  )
}
