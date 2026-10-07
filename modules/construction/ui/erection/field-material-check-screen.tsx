"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useContext, useMemo, useRef, useState } from "react"
import { RotateCw } from "lucide-react"
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
import { panelMode } from "../panel-mode"
import styles from "../spool-workbench.module.css"
import {
  ErectionEmbeddedContext,
  ErectionScreenShell,
  useErectionCommands,
  useErectionOperationNavigation,
} from "./erection-screen-shell"
import { ErectionStageTimeline } from "./erection-stage-view"
import { useErectionReadiness } from "./use-erection-readiness"
import { useGateReason } from "../gate-reason"

/**
 * Field material check. Each BOM row takes a trace the user selects from the eligible PML
 * records the server offers; recorded rows are read-only.
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
  const reasonText = useGateReason()
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

  const recordedQc13Form = workspace?.record?.qc13Form ?? null
  const latestQc13Form = workspace?.latestQc13Form ?? null

  const isCheckComplete = Boolean(
    lines.length > 0 && accepted.length >= lines.length,
  )

  const gate = describeFieldMaterialCheckGate({
    lines,
    entries,
    toSiteOn: selected?.toSiteOn ?? null,
    canRecord,
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
      try {
        await recordFieldMaterialCheck(
          getSupabaseBrowserClient(),
          toMaterialCheckPayload({
            spoolRevisionId,
            checkedOn,
            qc13FormId: latestQc13Form?.id ?? null,
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
        toast.success("Field material traces recorded.")
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
      {(row) => {
        const isDone = Boolean(row.materialCheckedOn)
        const blockedBy = !isDone && !row.toSiteOn ? "To site" : null
        const mode = panelMode({ allRecorded: isDone, blockedBy })

        return (
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

            {mode === "done" ? (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Checked {row.materialCheckedOn ? row.materialCheckedOn.slice(0, 10) : "—"} · QC-13 {recordedQc13Form?.formNumber ?? "—"}
                </p>
                <Card>
                  <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                    <CardTitle>Field Material Check</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                          return (
                            <TableRow key={line.spoolRevisionMaterialId}>
                              <TableCell className="font-mono text-xs">{line.identCode}</TableCell>
                              <TableCell>{line.description ?? "—"}</TableCell>
                              <TableCell>
                                {line.quantity ?? "—"} {line.unit ?? ""}
                              </TableCell>
                              <TableCell className={styles.traceStatusBadge}>
                                <span className="text-emerald-700 font-semibold dark:text-emerald-400">
                                  {acceptedItem ? "Recorded" : "Not recorded"}
                                </span>
                              </TableCell>
                              <TableCell>
                                {acceptedItem ? (
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-sm">
                                        {acceptedItem.traceNumber ?? "Evidence source unavailable"}
                                      </span>
                                    </div>
                                    <span className="block text-xs text-muted-foreground">
                                      MRR {acceptedItem.mrrNumber ?? "unavailable"} · {acceptedItem.status ?? "unavailable"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ) : mode === "blocked" ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Record To Site first</span>
                {nav && nav.canOpenOperation("to_site") ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => nav.openOperation("to_site")}
                  >
                    Open To site
                  </Button>
                ) : toSiteHref ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={toSiteHref}>Open To site</Link>
                  </Button>
                ) : null}
              </div>
            ) : (
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
                  ) : null}

                  {isCheckComplete ? null : (
                    <div className={embedded ? styles.recordActions : "flex flex-wrap items-center gap-2"}>
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
                        Record field traces
                      </Button>
                      {gate.reason && !gate.allowed ? (
                        <span className="text-xs text-muted-foreground">{gate.reason ? reasonText(gate.reason) : null}</span>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )
      }}
    </ErectionScreenShell>
  )
}
