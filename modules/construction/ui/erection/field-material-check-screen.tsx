"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useContext, useMemo, useRef, useState } from "react"
import { RotateCw } from "lucide-react"
import { toast } from "sonner"

import { codeLabel } from "@/i18n/translator"
import { errorDetail } from "@/i18n/format"
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
  const tc = useTranslations("codes")
  const tf = useTranslations("fabrication")
  const t = useTranslations("erection.fieldMaterial")
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
          toast.error(t("recordedStatusCouldNotBe"))
          return
        }
        toast.success(t("fieldMaterialTracesRecorded"))
      } catch (error: unknown) {
        toast.error(
          t("theTracesCouldNotBe"), { description: errorDetail(error) },
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
        const blockedBy = !isDone && !row.toSiteOn ? t("toSite") : null
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
                  {t("doneSummary", { checked: row.materialCheckedOn ? row.materialCheckedOn.slice(0, 10) : "—", qc13: recordedQc13Form?.formNumber ?? "—" })}
                </p>
                <Card>
                  <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                    <CardTitle>{t("fieldMaterialCheck")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("identCode")}</TableHead>
                          <TableHead>{t("description")}</TableHead>
                          <TableHead>{t("qty")}</TableHead>
                          <TableHead>{t("status")}</TableHead>
                          <TableHead>{t("heatTraceNumber")}</TableHead>
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
                                  {acceptedItem ? t("recorded") : t("notRecorded")}
                                </span>
                              </TableCell>
                              <TableCell>
                                {acceptedItem ? (
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-sm">
                                        {acceptedItem.traceNumber ?? t("evidenceSourceUnavailable")}
                                      </span>
                                    </div>
                                    <span className="block text-xs text-muted-foreground">
                                      {tf("shared.mrrStatus", { mrr: acceptedItem.mrrNumber ?? tf("shared.unavailable"), status: acceptedItem.status ? codeLabel(tc, "status", acceptedItem.status) : tf("shared.unavailable") })}
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
                <span>{t("recordToSiteFirst")}</span>
                {nav && nav.canOpenOperation("to_site") ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => nav.openOperation("to_site")}
                  >
                    {t("openToSite")}
                  </Button>
                ) : toSiteHref ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={toSiteHref}>{t("openToSite")}</Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                  <CardTitle>{t("fieldMaterialCheck")}</CardTitle>
                  {loadState === "loading" ? (
                    <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900">
                      {t("loadingBillOfMaterials")}
                    </Badge>
                  ) : loadState === "error" ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">{t("failedToLoadBom")}</Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void reloadAll()}
                      >
                        <RotateCw className="h-3 w-3 mr-1" aria-hidden="true" /> {t("retry")}
                      </Button>
                    </div>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="text-sm font-medium">
                      {t("dateChecked")}
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
                        <TableHead>{t("identCode")}</TableHead>
                        <TableHead>{t("description")}</TableHead>
                        <TableHead>{t("qty")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead>{t("heatTraceNumber")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line) => {
                        const acceptedItem = acceptedMap.get(line.spoolRevisionMaterialId)
                        const draft = drafts[line.spoolRevisionMaterialId]
                        const traceState = draft
                          ? t("editedNotRecorded")
                          : acceptedItem
                            ? t("recorded")
                            : t("notRecorded")

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
                                      {acceptedItem.traceNumber ?? t("evidenceSourceUnavailable")}
                                    </span>
                                    {pmlHref ? (
                                      <Link
                                        href={pmlHref}
                                        className="shrink-0 text-[10px] uppercase tracking-wider text-primary hover:underline"
                                      >
                                        {t("openPml")}
                                      </Link>
                                    ) : null}
                                  </div>
                                  <span className="block text-xs text-muted-foreground">
                                    {tf("shared.mrrStatus", { mrr: acceptedItem.mrrNumber ?? tf("shared.unavailable"), status: acceptedItem.status ? codeLabel(tc, "status", acceptedItem.status) : tf("shared.unavailable") })}
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
                            {t("thisSpoolRevisionHasNo")}
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>

                  {loadState === "error" ? (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <p>
                        {workspaceError ?? t("theBillOfMaterialsCould")}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void reloadAll()}
                      >
                        <RotateCw className="h-3 w-3 mr-1" aria-hidden="true" /> {t("retry")}
                      </Button>
                    </div>
                  ) : null}

                  {!dataCurrent ? (
                    <p className="text-destructive text-sm">{t("refreshSpoolStatusBeforeRecording")}</p>
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
                        {t("recordFieldTraces")}
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
