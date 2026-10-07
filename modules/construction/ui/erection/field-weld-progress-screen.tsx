"use client"
 
import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useCallback, useContext, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { RotateCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DataTable, useTableUrlState } from "@/components/ui/data-table"
import { ChangeHighlight, IdentityHeadline } from "@/components/ui/record-target"
import { canVisit } from "@/components/pipeqc/navigation-model"
import { withProject } from "@/components/pipeqc/project-url"
import { useMarkInputsRecorded, useRequestLeave } from "@/components/pipeqc/unsaved-input-guard"
import { linkFrom } from "@/components/pipeqc/workspace-model"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { WELD_COLUMNS } from "../weld-columns"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { describeFieldWeldProgressGate } from "../../application/record-field-weld-progress"
import { toWeldProgressPayload } from "../../application/record-weld-progress"
import { toStageEvidence } from "../../application/describe-erection-readiness"
import {
  firstMissingPredecessor,
  type RecordableErectionStage,
} from "../../application/record-erection-progress"
import type { ErectionStage } from "../../domain/erection-stage"
import type { PointAssignment, WeldPointType } from "../../domain/weld-progress"
import {
  loadWeldFormReferentials,
  loadWeldSummaries,
  type WeldFormReferentials,
  type WeldSummary,
} from "../../infrastructure/supabase-construction-repository"
import { recordFieldWeldProgress } from "../../infrastructure/supabase-erection-repository"
import { panelMode } from "../panel-mode"
import styles from "../spool-workbench.module.css"
import {
  ERECTION_OPERATIONS,
  type ErectionOperationId,
} from "./erection-operations"
import {
  ErectionEmbeddedContext,
  ErectionScreenShell,
  useErectionCommands,
  useErectionOperationNavigation,
} from "./erection-screen-shell"
import { ErectionStageCard } from "./erection-stage-card"
import { ErectionStageTimeline } from "./erection-stage-view"
import { useErectionReadiness } from "./use-erection-readiness"

const today = () => new Date().toISOString().slice(0, 10)

const operationByStage: Record<RecordableErectionStage, ErectionOperationId> = {
  to_site: "to_site",
  erected: "erected",
  welded_bolted: "welded",
  supported: "supported",
}

const EMPTY_REFERENTIALS: WeldFormReferentials = {
  subcontractors: [],
  procedures: [],
  welders: [],
  reworkCodes: [],
}

/**
 * Field weld progress. This is the same form as the shop screen because the rules are the same
 * — `071_field_weld_parity.test.sql` pins that — with two differences the field imposes: the
 * command carries phase `erection`, and the spool must be To Site first.
 *
 * Subgroups: Field joints and Spool milestone (Welded / Bolted).
 */
export function FieldWeldProgressScreen({
  title,
  description,
  stage = "welded_bolted",
}: {
  title: string
  description: string
  /** When set, the screen also offers the stage this evidence supports. */
  stage?: RecordableErectionStage
}) {
  const tc = useTranslations("codes")
  const stageName = (stage: ErectionStage) => tc(`erectionStage.${stage}`)
  const state = useErectionReadiness()
  const { selected: currentSpool, projectId, canRecord, dataCurrent, refresh } = state
  const embedded = useContext(ErectionEmbeddedContext)
  const commands = useErectionCommands()
  const nav = useErectionOperationNavigation()
  const can = useOptionalAccess()?.can
  const activityCode = useSupabaseAuth().access?.activityCode
  const pathname = usePathname()
  const query = useSearchParams().toString()
  const here = query ? `${pathname}?${query}` : pathname
  const requestLeave = useRequestLeave()
  const markRecorded = useMarkInputsRecorded()

  const [welds, setWelds] = useState<WeldSummary[]>([])
  const [selectedWeld, setSelectedWeld] = useState<WeldSummary | null>(null)
  const [browsingJoints, setBrowsingJoints] = useState(false)

  const [referentials, setReferentials] = useState<WeldFormReferentials>(EMPTY_REFERENTIALS)
  const [subcontractorId, setSubcontractorId] = useState("")
  const [procedureId, setProcedureId] = useState("")
  const [weldOn, setWeldOn] = useState(today())
  const [rootWelderId, setRootWelderId] = useState("")
  const [capWelderId, setCapWelderId] = useState("")
  const [rootPercent, setRootPercent] = useState(50)
  const [isSaving, setIsSaving] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const [weldTable, setWeldTable] = useTableUrlState({
    namespace: "weld",
    defaults: { pageSize: embedded ? 25 : 50 },
  })

  const spoolRevisionId = currentSpool?.spoolRevisionId ?? null

  const [lastSpoolId, setLastSpoolId] = useState<string | null>(null)
  if (spoolRevisionId !== lastSpoolId) {
    setLastSpoolId(spoolRevisionId)
    setSelectedWeld(null)
    setBrowsingJoints(false)
    setSubcontractorId("")
    setProcedureId("")
    setRootWelderId("")
    setCapWelderId("")
    setRootPercent(50)
    setWeldOn(today())
  }

  const currentKey = spoolRevisionId ? `${spoolRevisionId}:${refreshToken}` : null
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const loadState: "loading" | "ready" | "error" =
    loadedKey === currentKey ? "ready" : failedKey === currentKey ? "error" : "loading"

  const subcontractorRef = useRef<HTMLSelectElement>(null)
  const procedureRef = useRef<HTMLSelectElement>(null)
  const rootWelderRef = useRef<HTMLSelectElement>(null)
  const capWelderRef = useRef<HTMLSelectElement>(null)
  const rootPercentRef = useRef<HTMLInputElement>(null)
  const weldOnRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    void loadWeldFormReferentials(getSupabaseBrowserClient(), projectId)
      .then((refs) => {
        if (!cancelled) setReferentials(refs)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Welding referentials could not be loaded.",
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  const reloadWelds = useCallback(
    async (reselectJointId?: string) => {
      if (!spoolRevisionId) return
      const client = getSupabaseBrowserClient()
      const next = await loadWeldSummaries(client, spoolRevisionId, "field")
      setWelds(next)
      if (reselectJointId) {
        const fresh = next.find((w) => w.weldJointRevisionId === reselectJointId) ?? null
        setSelectedWeld(fresh)
      } else {
        setSelectedWeld((cur) =>
          cur ? (next.find((w) => w.weldJointRevisionId === cur.weldJointRevisionId) ?? null) : null,
        )
      }
      setLoadedKey(`${spoolRevisionId}:${refreshToken}`)
    },
    [spoolRevisionId, refreshToken],
  )

  useEffect(() => {
    if (!spoolRevisionId || !currentKey) return
    let cancelled = false
    const key = currentKey
    void loadWeldSummaries(getSupabaseBrowserClient(), spoolRevisionId, "field")
      .then((loadedWelds) => {
        if (cancelled) return
        setWelds(loadedWelds)
        setLoadedKey(key)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setFailedKey(key)
        toast.error(error instanceof Error ? error.message : "Field joints could not be loaded.")
      })
    return () => {
      cancelled = true
    }
  }, [spoolRevisionId, currentKey])

  const points: PointAssignment[] =
    rootWelderId && capWelderId
      ? [
          {
            pointType: "root" as WeldPointType,
            welderQualificationId: rootWelderId,
            completionPercent: rootPercent,
            weldedOn: weldOn,
          },
          {
            pointType: "cap" as WeldPointType,
            welderQualificationId: capWelderId,
            completionPercent: 100 - rootPercent,
            weldedOn: weldOn,
          },
        ]
      : []

  const procedure = referentials.procedures.find((item) => item.id === procedureId)

  const gate =
    selectedWeld && procedure && subcontractorId
      ? describeFieldWeldProgressGate({
          weld: {
            joint: {
              weldLocation: selectedWeld.weldLocation,
              diameterInch: selectedWeld.diameterInch,
              thicknessMm: selectedWeld.thicknessMm,
              availablePointTypes: ["root", "cap"],
            },
            procedure,
            subcontractorId,
            weldOn,
            points,
            welders: referentials.welders,
            isLocked: selectedWeld.isLocked,
            phase: "erection",
          },
          toSiteOn: currentSpool?.toSiteOn ?? null,
          canRecord,
        })
      : { allowed: false, reason: "Select a field joint, a subcontractor and a WPS." }

  const save = async () => {
    if (!selectedWeld || !gate.allowed || isSaving || commands.pending || !dataCurrent || loadState !== "ready") return
    await commands.run(async () => {
      setIsSaving(true)
      const targetJointId = selectedWeld.weldJointRevisionId
      try {
        await recordFieldWeldProgress(
          getSupabaseBrowserClient(),
          toWeldProgressPayload({
            weldJointRevisionId: targetJointId,
            subcontractorId,
            weldingProcedureId: procedureId,
            points,
            dates: {
              cuttingOn: null,
              bevelingOn: null,
              fitupOn: null,
              preheatOn: null,
              weldOn,
              dwirNumber: null,
              qcFormNumber: null,
              qc13FormId: null,
              reworkCodeId: null,
            },
          }),
          crypto.randomUUID(),
        )

        const fields = [
          subcontractorRef.current,
          procedureRef.current,
          rootWelderRef.current,
          capWelderRef.current,
          rootPercentRef.current,
          weldOnRef.current,
        ].filter((el): el is HTMLInputElement | HTMLSelectElement => el !== null)
        markRecorded(fields)

        try {
          await Promise.all([reloadWelds(targetJointId), refresh()])
        } catch {
          toast.error("Recorded; status could not be refreshed. Retry refresh.")
          return
        }
        toast.success(`Field weld ${selectedWeld.weldNumber} recorded.`)
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "The field weld could not be recorded.")
      } finally {
        setIsSaving(false)
      }
    })
  }

  return (
    <ErectionScreenShell
      title={title}
      description={description}
      state={state}
      commands={commands}
    >
      {(row) => {
        const evidence = toStageEvidence(row)
        const isDone = Boolean(row.weldedBoltedOn)
        const missing = firstMissingPredecessor(stage, evidence)
        const blockedBy = !isDone && missing ? stageName(missing) : null
        const mode = panelMode({ allRecorded: isDone, blockedBy })

        const targetOp = missing ? operationByStage[missing] : null
        const targetCandidate = targetOp
          ? ERECTION_OPERATIONS.find((op) => op.id === targetOp)
          : null
        const targetHref = targetCandidate?.href ?? null
        const canOpenPredecessor = targetOp && nav ? nav.canOpenOperation(targetOp) : false
        const canVisitPredecessor = Boolean(
          targetHref && can && canVisit(targetHref.split("?")[0], can),
        )

        const predecessorAction =
          missing && targetOp ? (
            nav && canOpenPredecessor ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => nav.openOperation(targetOp)}
              >
                Open {stageName(missing)}
              </Button>
            ) : targetHref && canVisitPredecessor ? (
              <Button asChild size="sm" variant="outline">
                <Link
                  href={linkFrom(
                    withProject(
                      `${targetHref}?spool=${encodeURIComponent(row.spoolRevisionId)}`,
                      activityCode,
                    ),
                    here,
                  )}
                >
                  Open {stageName(missing)}
                </Link>
              </Button>
            ) : null
          ) : null

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
                  Recorded {row.weldedBoltedOn?.slice(0, 10)}
                </p>
                <Card>
                  <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                    <CardTitle>Field weld joints</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      columns={WELD_COLUMNS}
                      rows={welds}
                      state={weldTable}
                      onStateChange={setWeldTable}
                      rowId={(weld) => weld.weldJointRevisionId}
                      onRowClick={undefined}
                      selectedRowId={null}
                      searchPlaceholder="Search joint or WPS…"
                      emptyTitle="This spool revision has no field joints."
                      containerClassName={embedded ? "max-h-72" : undefined}
                      variant="compact"
                    />
                  </CardContent>
                </Card>
              </div>
            ) : mode === "blocked" ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Record {stageName(missing!)} before {stageName(stage)}</span>
                {predecessorAction}
              </div>
            ) : (
              <div className="space-y-4">
                <ErectionStageCard
                  row={row}
                  stage={stage}
                  canRecord={canRecord}
                  dataCurrent={state.dataCurrent}
                  onRecorded={refresh}
                />
            {embedded && selectedWeld && !browsingJoints ? null : (
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                  <CardTitle>Field joints</CardTitle>
                  {loadState === "loading" ? (
                    <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900">
                      Loading field joints…
                    </Badge>
                  ) : loadState === "error" ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Failed to load joints</Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setRefreshToken((t) => t + 1)}
                      >
                        <RotateCw className="h-3 w-3 mr-1" aria-hidden="true" /> Retry
                      </Button>
                    </div>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={WELD_COLUMNS}
                    rows={welds}
                    state={weldTable}
                    onStateChange={setWeldTable}
                    rowId={(weld) => weld.weldJointRevisionId}
                    onRowClick={(joint) => {
                      if (selectedWeld?.weldJointRevisionId === joint.weldJointRevisionId) {
                        setBrowsingJoints(false)
                        return
                      }
                      const choose = () => {
                        setSelectedWeld(joint)
                        setBrowsingJoints(false)
                        setSubcontractorId("")
                        setProcedureId("")
                        setRootWelderId("")
                        setCapWelderId("")
                        setRootPercent(50)
                        setWeldOn(today())
                      }
                      if (selectedWeld) requestLeave(choose)
                      else choose()
                    }}
                    selectedRowId={selectedWeld?.weldJointRevisionId ?? null}
                    searchPlaceholder="Search joint or WPS…"
                    emptyTitle={
                      loadState === "error"
                        ? "Field joints could not be loaded, so none are listed and nothing has been changed."
                        : "This spool revision has no field joints."
                    }
                    containerClassName={embedded ? "max-h-72" : undefined}
                    variant="compact"
                  />
                </CardContent>
              </Card>
            )}

            {selectedWeld ? (
              <div hidden={Boolean(embedded) && browsingJoints}>
                <ChangeHighlight
                  id={selectedWeld.weldJointRevisionId}
                  announce={`Now recording field weld ${selectedWeld.weldNumber}`}
                >
                  <Card>
                    <CardHeader>
                      <IdentityHeadline
                        kind="Recording field weld"
                        identity={selectedWeld.weldNumber}
                        action={
                          embedded ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setBrowsingJoints(true)}
                            >
                              Change joint
                            </Button>
                          ) : undefined
                        }
                        meta={[
                          selectedWeld.wpsCode ? `WPS ${selectedWeld.wpsCode}` : null,
                          selectedWeld.diameterInch ? `${selectedWeld.diameterInch}"` : null,
                          selectedWeld.thicknessMm ? `${selectedWeld.thicknessMm} mm` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className={styles.jointFacts}>
                        <div className={styles.jointFactItem}>
                          <span className={styles.jointFactLabel}>Weld number</span>
                          <span className={styles.jointFactValue}>{selectedWeld.weldNumber}</span>
                        </div>
                        <div className={styles.jointFactItem}>
                          <span className={styles.jointFactLabel}>Weld date</span>
                          <span className={styles.jointFactValue}>
                            {selectedWeld.weldOn ? selectedWeld.weldOn : "Not recorded"}
                          </span>
                        </div>
                        <div className={styles.jointFactItem}>
                          <span className={styles.jointFactLabel}>WPS</span>
                          <span className={styles.jointFactValue}>
                            {selectedWeld.wpsCode ?? "None"}
                          </span>
                        </div>
                        <div className={styles.jointFactItem}>
                          <span className={styles.jointFactLabel}>Welders</span>
                          <span className={styles.jointFactValue}>
                            {selectedWeld.welders && selectedWeld.welders.length > 0
                              ? selectedWeld.welders.join(", ")
                              : "None"}
                          </span>
                        </div>
                        <div className={styles.jointFactItem}>
                          <span className={styles.jointFactLabel}>Lock status</span>
                          <span className={styles.jointFactValue}>
                            {selectedWeld.isLocked ? "Locked" : "Open"}
                          </span>
                        </div>
                        <div className={styles.jointFactItem}>
                          <span className={styles.jointFactLabel}>NDE obligation</span>
                          <span className={styles.jointFactValue}>
                            {selectedWeld.obligationPending > 0
                              ? `${selectedWeld.obligationPending} open`
                              : "None"}
                          </span>
                        </div>
                        <div className={styles.jointFactItem}>
                          <span className={styles.jointFactLabel}>PWHT</span>
                          <span className={styles.jointFactValue}>
                            {selectedWeld.pwhtRequired
                              ? selectedWeld.pwhtAccepted
                                ? "Accepted"
                                : "Required, pending"
                              : "Not required"}
                          </span>
                        </div>
                      </div>

                      {selectedWeld.isLocked ? (
                        <p className="text-sm font-medium text-destructive">
                          This weld joint is locked and does not accept progress.
                        </p>
                      ) : null}

                      <div className={embedded ? styles.weldFields : "grid gap-3 sm:grid-cols-2"}>
                        <label className="text-sm font-medium">
                          Subcontractor
                          <select
                            ref={subcontractorRef}
                            className="mt-1 w-full rounded border px-2 py-1"
                            value={subcontractorId}
                            disabled={isSaving || commands.pending || selectedWeld.isLocked}
                            onChange={(event) => setSubcontractorId(event.target.value)}
                          >
                            <option value="">Select…</option>
                            {referentials.subcontractors.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.code} — {item.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm font-medium">
                          WPS
                          <select
                            ref={procedureRef}
                            className="mt-1 w-full rounded border px-2 py-1"
                            value={procedureId}
                            disabled={isSaving || commands.pending || selectedWeld.isLocked}
                            onChange={(event) => setProcedureId(event.target.value)}
                          >
                            <option value="">Select…</option>
                            {referentials.procedures.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.code}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm font-medium">
                          Root welder
                          <select
                            ref={rootWelderRef}
                            className="mt-1 w-full rounded border px-2 py-1"
                            value={rootWelderId}
                            disabled={isSaving || commands.pending || selectedWeld.isLocked}
                            onChange={(event) => setRootWelderId(event.target.value)}
                          >
                            <option value="">Select…</option>
                            {referentials.welders.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.welderCode}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm font-medium">
                          Cap welder
                          <select
                            ref={capWelderRef}
                            className="mt-1 w-full rounded border px-2 py-1"
                            value={capWelderId}
                            disabled={isSaving || commands.pending || selectedWeld.isLocked}
                            onChange={(event) => setCapWelderId(event.target.value)}
                          >
                            <option value="">Select…</option>
                            {referentials.welders.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.welderCode}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm font-medium">
                          Root percent
                          <Input
                            ref={rootPercentRef}
                            type="number"
                            min={0}
                            max={100}
                            value={rootPercent}
                            disabled={isSaving || commands.pending || selectedWeld.isLocked}
                            onChange={(event) => setRootPercent(Number(event.target.value))}
                          />
                        </label>
                        <label className="text-sm font-medium">
                          Weld date
                          <Input
                            ref={weldOnRef}
                            type="date"
                            value={weldOn}
                            disabled={isSaving || commands.pending || selectedWeld.isLocked}
                            onChange={(event) => setWeldOn(event.target.value)}
                          />
                        </label>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Root and Cap always total 100 percent; the cap takes {100 - rootPercent}.
                      </p>

                      {!dataCurrent ? (
                        <p className="text-destructive text-sm">Refresh spool status before recording.</p>
                      ) : gate.reason && !selectedWeld.isLocked ? (
                        <p className="text-sm text-destructive">{gate.reason}</p>
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
                            loadState !== "ready" ||
                            selectedWeld.isLocked
                          }
                          loading={isSaving}
                        >
                          Record field weld progress
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </ChangeHighlight>
              </div>
            ) : null}
          </div>
        )}
      </div>
    )
  }}
    </ErectionScreenShell>
  )
}
