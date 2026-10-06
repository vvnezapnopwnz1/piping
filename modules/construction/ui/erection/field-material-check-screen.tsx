"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useContext, useMemo, useRef, useState } from "react"
import { ArrowRight, RotateCw } from "lucide-react"
import { toast } from "sonner"

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
import { withProject } from "@/components/pipeqc/project-url"
import { useMarkInputsRecorded } from "@/components/pipeqc/unsaved-input-guard"
import { linkFrom } from "@/components/pipeqc/workspace-model"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { materialReferenceHref } from "../../application/material-reference-link"
import { describeFieldMaterialCheckGate } from "../../application/record-field-material-check"
import { toMaterialCheckPayload } from "../../application/record-material-check"
import { recordFieldMaterialCheck } from "../../infrastructure/supabase-erection-repository"
import { useMaterialCheckWorkspace } from "../use-material-check-workspace"
import { MaterialTracePicker } from "../material-trace-picker"
import styles from "../spool-workbench.module.css"
import {
  ErectionEmbeddedContext,
  ErectionScreenShell,
  useErectionCommands,
  useErectionOperationNavigation,
} from "./erection-screen-shell"
import { ErectionStageTimeline } from "./erection-stage-view"
import { useErectionReadiness } from "./use-erection-readiness"

/**
 * Field material check. Every ident code is selected by the user from registered PML;
 * supports exact identity reconciliation, PML deep links, and reconfirming check dates.
 *
 * One record per spool revision (T07-D2): if this spool was already material-checked in the
 * shop, recording here re-confirms that same record and takes over its date. The screen says
 * so rather than hiding it.
 */
export function FieldMaterialCheckScreen({
  title,
  description,
}: {
  title: string
  description: string
}) {
  const state = useErectionReadiness()
  const { selected, canRecord, dataCurrent, refresh } = state
  const embedded = useContext(ErectionEmbeddedContext)
  const commands = useErectionCommands()
  const nav = useErectionOperationNavigation()
  const markRecorded = useMarkInputsRecorded()
  const can = useOptionalAccess()?.can
  const activityCode = useSupabaseAuth().access?.activityCode
  const canOpenPml = Boolean(can && canVisit("/admin/project-referential", can))
  const pathname = usePathname()
  const query = useSearchParams().toString()
  const here = query ? `${pathname}?${query}` : pathname

  const [isSaving, setIsSaving] = useState(false)
  const recordingDateInputRef = useRef<HTMLInputElement>(null)

  const spoolRevisionId = selected?.spoolRevisionId ?? null

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
    refresh: refreshWorkspace,
    applySaved,
  } = useMaterialCheckWorkspace({
    projectId: selected?.projectId,
    spoolRevisionId,
  })

  const lines = workspace?.lines ?? []
  const accepted = workspace?.accepted ?? []
  const acceptedMap = useMemo(
    () => new Map(accepted.map((item) => [item.spoolRevisionMaterialId, item])),
    [accepted],
  )
  const acceptedLineIds = useMemo(
    () => accepted.map((item) => item.spoolRevisionMaterialId),
    [accepted],
  )

  const recordedQc13Form = workspace?.record?.qc13Form ?? null
  const latestQc13Form = workspace?.latestQc13Form ?? null
  const hasDifferentLatestQc13 = Boolean(
    latestQc13Form && recordedQc13Form && latestQc13Form.id !== recordedQc13Form.id,
  )

  const isCheckComplete = Boolean(
    lines.length > 0 && accepted.length >= lines.length,
  )
  const isReconfirmMode = isCheckComplete && entries.length === 0

  const gate = describeFieldMaterialCheckGate({
    lines,
    entries,
    toSiteOn: selected?.toSiteOn ?? null,
    canRecord,
    allowEmptyWhenAllAccepted: true,
    acceptedLineIds,
  })

  const reloadAll = async () => {
    await Promise.all([refreshWorkspace(), refresh()])
  }

  const save = async () => {
    if (
      !spoolRevisionId ||
      !gate.allowed ||
      isSaving ||
      commands.pending ||
      !dataCurrent ||
      loadState !== "ready"
    ) {
      return
    }

    await commands.run(async () => {
      setIsSaving(true)
      const isReconfirm = isReconfirmMode
      try {
        const activeQc13Id = latestQc13Form?.id ?? recordedQc13Form?.id ?? null
        await recordFieldMaterialCheck(
          getSupabaseBrowserClient(),
          toMaterialCheckPayload({
            spoolRevisionId,
            checkedOn,
            qc13FormId: activeQc13Id,
            entries,
          }),
          crypto.randomUUID(),
        )

        if (recordingDateInputRef.current) {
          markRecorded([recordingDateInputRef.current])
        }

        applySaved({
          targetKey,
          entries,
          checkedOn,
        })

        try {
          await reloadAll()
        } catch {
          toast.error("Recorded; status could not be refreshed. Retry refresh.")
          return
        }
        toast.success(
          isReconfirm
            ? "Field material check date reconfirmed."
            : "Field material traces recorded.",
        )
      } catch (error: unknown) {
        toast.error(
          error instanceof Error ? error.message : "The traces could not be recorded.",
        )
      } finally {
        setIsSaving(false)
      }
    })
  }

  const toSiteHref =
    can && canVisit("/erection/to-site", can)
      ? linkFrom(
          withProject(`/erection/to-site?spool=${encodeURIComponent(selected?.spoolRevisionId ?? "")}`, activityCode),
          here,
        )
      : null

  return (
    <ErectionScreenShell
      title={title}
      description={description}
      state={state}
      commands={commands}
    >
      {(row) => (
        <div className="space-y-4" data-explicit-unsaved-commit="true">
          {embedded ? null : (
            <Card>
              <CardHeader>
                <CardTitle>
                  {row.isoNumber} / {row.spoolNumber} ({row.revisionNumber})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ErectionStageTimeline row={row} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle>Field Material Check</CardTitle>
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
            <CardContent className="space-y-4">
              <div className={styles.opSummary}>
                <div className={styles.opSummaryItem}>
                  <span className={styles.opSummaryLabel}>Traced lines:</span>
                  <span className={styles.opSummaryValue}>
                    {accepted.length} of {lines.length}
                  </span>
                </div>
                <div className={styles.opSummaryItem}>
                  <span className={styles.opSummaryLabel}>Last checked:</span>
                  <span className={styles.opSummaryValue}>
                    {row.materialCheckedOn ? row.materialCheckedOn.slice(0, 10) : "Not recorded"}
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

              {row.materialCheckedOn ? (
                <p className="text-muted-foreground text-xs">
                  A spool revision carries one material check whichever phase performed it, so
                  recording here re-confirms the existing record and takes over its date. The
                  phase of each check stays visible in the progress ledger.
                </p>
              ) : null}

              {!row.toSiteOn ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  <span>To Site is required before checking field material.</span>
                  {nav && nav.canOpenOperation("to_site") ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => nav.openOperation("to_site")}
                    >
                      Go to To site <ArrowRight className="h-3.5 w-3.5 ml-1 inline" aria-hidden="true" />
                    </Button>
                  ) : toSiteHref ? (
                    <Link href={toSiteHref} className={styles.checkActionLink}>
                      Go to To site <ArrowRight className="h-3.5 w-3.5 ml-1 inline" aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap items-end gap-3">
                <label className="text-sm font-medium">
                  Date checked
                  <Input
                    ref={recordingDateInputRef}
                    type="date"
                    value={checkedOn}
                    disabled={isSaving || commands.pending}
                    onChange={(event) => setCheckedOn(event.target.value)}
                    className="mt-1"
                  />
                </label>
              </div>

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
                          ) : (
                            <MaterialTracePicker
                              targetKey={targetKey}
                              line={line}
                              selectedDraft={draft}
                              disabled={isSaving || commands.pending}
                              pmlHref={pmlHref}
                              onChoose={choose}
                              onClear={clearChoice}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {lines.length === 0 && loadState === "ready" ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground text-sm">
                        This spool revision has no bill of materials to check.
                      </TableCell>
                    </TableRow>
                  ) : null}
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

              {!dataCurrent ? (
                <p className="text-destructive text-sm">Refresh spool status before recording.</p>
              ) : gate.reason ? (
                <p className="text-muted-foreground text-sm">{gate.reason}</p>
              ) : null}

              <div className={embedded ? styles.recordActions : undefined}>
                <Button
                  type="button"
                  onClick={() => void save()}
                  disabled={
                    !gate.allowed ||
                    isSaving ||
                    commands.pending ||
                    !dataCurrent ||
                    loadState !== "ready"
                  }
                  loading={isSaving}
                >
                  {isReconfirmMode ? "Reconfirm check date" : "Record field traces"}
                </Button>
              </div>

              <p className="text-muted-foreground text-xs">
                Material Check is derived, not entered: it appears on the ledger under the
                erection phase once every ident code carries a trace the PML accepts.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </ErectionScreenShell>
  )
}
