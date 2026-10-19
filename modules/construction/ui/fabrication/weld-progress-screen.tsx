"use client"

import { useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { toast } from "sonner"
import { RotateCw } from "lucide-react"

import { errorDetail } from "@/i18n/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DataTable, useTableUrlState } from "@/components/ui/data-table"
import { ChangeHighlight, IdentityHeadline } from "@/components/ui/record-target"
import { useMarkInputsRecorded, useRequestLeave } from "@/components/pipeqc/unsaved-input-guard"
import { weldColumns } from "../weld-columns"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { describeWeldProgressGate, toWeldProgressPayload } from "../../application/record-weld-progress"
import { weldFormChoices } from "../../application/weld-form-choices"
import type { PointAssignment, WeldPointType } from "../../domain/weld-progress"
import {
  loadAreaSubcontractors,
  loadSpoolStatus,
  loadWeldFormReferentials,
  loadWeldSummaries,
  recordWeldProgress,
  type AreaSubcontractors,
  type WeldFormReferentials,
  type WeldSummary,
} from "../../infrastructure/supabase-construction-repository"
import { SpoolPicker } from "./spool-picker"
import { useContextSpool, type EmbeddedSpool } from "./use-context-spool"
import { panelMode } from "../panel-mode"
import styles from "../spool-workbench.module.css"
import { useGateReason } from "../gate-reason"

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY_REFERENTIALS: WeldFormReferentials = {
  subcontractors: [],
  procedures: [],
  welders: [],
  reworkCodes: [],
}

export function WeldProgressScreen({
  projectId,
  embedded,
}: {
  projectId: string
  embedded?: EmbeddedSpool
}) {
  const reasonText = useGateReason()
  const t = useTranslations("fabrication.weldProgress")
  const twc = useTranslations("fabrication.weldColumns")
  const weldColumnsList = useMemo(() => weldColumns(twc), [twc])
  const [ownSpool, setOwnSpool] = useContextSpool(projectId, { enabled: !embedded })
  const spool = embedded ? embedded.spool : ownSpool
  const setSpool = embedded ? embedded.onSpoolChange : setOwnSpool
  const spoolRevisionId = spool?.spoolRevisionId ?? null

  const [welds, setWelds] = useState<WeldSummary[]>([])
  const [selected, setSelected] = useState<WeldSummary | null>(null)
  const [browsingJoints, setBrowsingJoints] = useState(false)
  const requestLeave = useRequestLeave()
  const markRecorded = useMarkInputsRecorded()

  const [referentials, setReferentials] = useState<WeldFormReferentials>(EMPTY_REFERENTIALS)
  const [pickedSubcontractorId, setSubcontractorId] = useState("")
  const [areaFor, setAreaFor] = useState<{ spoolRevisionId: string; area: AreaSubcontractors | null } | null>(null)
  const [procedureId, setProcedureId] = useState("")
  const [weldOn, setWeldOn] = useState(today())
  const [rootWelderId, setRootWelderId] = useState("")
  const [capWelderId, setCapWelderId] = useState("")
  const [rootPercent, setRootPercent] = useState(50)
  const [refreshToken, setRefreshToken] = useState(0)
  const [browsingSpools, setBrowsingSpools] = useState(false)
  const [weldTable, setWeldTable] = useTableUrlState({
    namespace: "weld",
    defaults: { pageSize: embedded ? 25 : 50 },
  })

  const [lastSpoolId, setLastSpoolId] = useState<string | null>(null)
  if (spoolRevisionId !== lastSpoolId) {
    setLastSpoolId(spoolRevisionId)
    setSelected(null)
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

  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const pendingRef = useRef(false)

  const subcontractorRef = useRef<HTMLSelectElement>(null)
  const procedureRef = useRef<HTMLSelectElement>(null)
  const rootWelderRef = useRef<HTMLSelectElement>(null)
  const capWelderRef = useRef<HTMLSelectElement>(null)
  const rootPercentRef = useRef<HTMLInputElement>(null)
  const weldOnRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    void loadWeldFormReferentials(getSupabaseBrowserClient(), projectId)
      .then((refs) => {
        if (!cancelled) setReferentials(refs)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          toast.error(
            t("weldingReferentialsCouldNotBe"), { description: errorDetail(error) },
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    if (!spoolRevisionId) return
    let cancelled = false
    void loadAreaSubcontractors(getSupabaseBrowserClient(), spoolRevisionId)
      .then((loaded) => {
        if (!cancelled) setAreaFor({ spoolRevisionId, area: loaded })
      })
      .catch((error: unknown) => {
        if (!cancelled) toast.error(t("weldingReferentialsCouldNotBe"), { description: errorDetail(error) })
      })
    return () => {
      cancelled = true
    }
  }, [spoolRevisionId])

  const reloadWelds = useCallback(
    async (reselectJointId?: string) => {
      if (!spoolRevisionId) return
      const key = `${spoolRevisionId}:${refreshToken}`
      const client = getSupabaseBrowserClient()
      const [newStatus, nextWelds] = await Promise.all([
        loadSpoolStatus(client, spoolRevisionId),
        loadWeldSummaries(client, spoolRevisionId, "shop"),
      ])
      setSpool(newStatus)
      setWelds(nextWelds)
      if (reselectJointId) {
        const fresh = nextWelds.find((w) => w.weldJointRevisionId === reselectJointId) ?? null
        setSelected(fresh)
      }
      setLoadedKey(key)
    },
    [spoolRevisionId, refreshToken, setSpool],
  )

  useEffect(() => {
    if (!spoolRevisionId || !currentKey) return
    let cancelled = false
    const key = currentKey
    void loadWeldSummaries(getSupabaseBrowserClient(), spoolRevisionId, "shop")
      .then((loadedWelds) => {
        if (cancelled) return
        setWelds(loadedWelds)
        setLoadedKey(key)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setFailedKey(key)
        toast.error(t("weldJointsCouldNotBe"), { description: errorDetail(error) })
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

  const area = areaFor && areaFor.spoolRevisionId === spoolRevisionId ? areaFor.area : null
  const choices = weldFormChoices({
    weldLocation: selected?.weldLocation ?? "shop",
    area,
    pickedSubcontractorId,
    procedures: referentials.procedures,
    welders: referentials.welders,
  })
  const subcontractorId = choices.subcontractorId
  const fixedSubcontractor = referentials.subcontractors.find((item) => item.id === subcontractorId)
  const procedure = referentials.procedures.find((item) => item.id === procedureId)

  const gate =
    selected && procedure && subcontractorId
      ? describeWeldProgressGate({
          joint: {
            weldLocation: selected.weldLocation,
            diameterInch: selected.diameterInch,
            thicknessMm: selected.thicknessMm,
            availablePointTypes: ["root", "cap"],
          },
          procedure,
          subcontractorId,
          weldOn,
          points,
          welders: referentials.welders,
          isLocked: selected.isLocked,
          phase: "fabrication",
        })
      : ({ allowed: false, reason: { code: "select_joint_wps" } } as const)

  const save = async () => {
    if (!selected || !gate.allowed || pendingRef.current || loadState !== "ready") return
    pendingRef.current = true
    setPendingAction("record-weld")
    const targetJointId = selected.weldJointRevisionId
    try {
      await recordWeldProgress(
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
        await reloadWelds(targetJointId)
      } catch {
        toast.error(t("recordedStatusCouldNotBe"))
      }
      toast.success(t("weldRecorded", { weld: selected.weldNumber }))
    } catch (error: unknown) {
      toast.error(t("theWeldCouldNotBe"), { description: errorDetail(error) })
    } finally {
      pendingRef.current = false
      setPendingAction(null)
    }
  }

  const isDone = Boolean(spool?.dates.fabricated)
  const mode = spool ? panelMode({ allRecorded: isDone, blockedBy: null }) : "actionable"

  return (
    <div className="space-y-4" data-explicit-unsaved-commit="true">
      {/* Inside the workbench the one spool list sits above every operation. */}
      {embedded ? null : (
        <SpoolPicker
          projectId={projectId}
          value={spool?.spoolRevisionId ?? null}
          selected={spool}
          onChange={(status) => {
            setSpool(status)
            setSelected(null)
          }}
          browsing={browsingSpools}
          onBrowsingChange={setBrowsingSpools}
          refreshToken={refreshToken}
        />
      )}

      {spool && !browsingSpools ? (
        <div className="space-y-4">
          {embedded && selected && !browsingJoints ? null : (
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle>{t("shopWeldJoints")}</CardTitle>
                {loadState === "loading" ? (
                  <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900">
                    {t("loadingJoints")}
                  </Badge>
                ) : loadState === "error" ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{t("failedToLoadJoints")}</Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setRefreshToken((t) => t + 1)}
                    >
                      <RotateCw className="h-3 w-3 mr-1" aria-hidden="true" /> {t("retry")}
                    </Button>
                  </div>
                ) : null}
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={weldColumnsList}
                  rows={welds}
                  state={weldTable}
                  onStateChange={setWeldTable}
                  rowId={(weld) => weld.weldJointRevisionId}
                  onRowClick={
                    mode === "done"
                      ? undefined
                      : (joint) => {
                          if (selected?.weldJointRevisionId === joint.weldJointRevisionId) {
                            setBrowsingJoints(false)
                            return
                          }
                          const choose = () => {
                            setSelected(joint)
                            setBrowsingJoints(false)
                            setSubcontractorId("")
                            setProcedureId("")
                            setRootWelderId("")
                            setCapWelderId("")
                            setRootPercent(50)
                            setWeldOn(today())
                          }
                          if (selected) requestLeave(choose)
                          else choose()
                        }
                  }
                  selectedRowId={mode === "done" ? null : (selected?.weldJointRevisionId ?? null)}
                  searchPlaceholder={t("searchJointOrWps")}
                  emptyTitle={t("thisSpoolRevisionHasNo")}
                  containerClassName={embedded ? "max-h-72" : undefined}
                  variant="compact"
                />
              </CardContent>
            </Card>
          )}

          {mode === "actionable" && selected ? (
            <div hidden={Boolean(embedded) && browsingJoints}>
              <ChangeHighlight
                id={selected.weldJointRevisionId}
                announce={t("nowRecording", { weld: selected.weldNumber })}
              >
                <Card>
                  <CardHeader>
                    <IdentityHeadline
                      kind={t("recordingShopWeld")}
                      identity={selected.weldNumber}
                      action={
                        embedded ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setBrowsingJoints(true)}
                          >
                            {t("changeJoint")}
                          </Button>
                        ) : undefined
                      }
                      meta={[
                        selected.wpsCode ? `WPS ${selected.wpsCode}` : null,
                        selected.diameterInch ? `${selected.diameterInch}"` : null,
                        selected.thicknessMm ? `${selected.thicknessMm} mm` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Server facts about this joint */}
                    <div className={styles.jointFacts}>
                      <div className={styles.jointFactItem}>
                        <span className={styles.jointFactLabel}>{t("weldNumber")}</span>
                        <span className={styles.jointFactValue}>{selected.weldNumber}</span>
                      </div>
                      <div className={styles.jointFactItem}>
                        <span className={styles.jointFactLabel}>{t("weldDate")}</span>
                        <span className={styles.jointFactValue}>
                          {selected.weldOn ? selected.weldOn : t("notRecorded")}
                        </span>
                      </div>
                      <div className={styles.jointFactItem}>
                        <span className={styles.jointFactLabel}>WPS</span>
                        <span className={styles.jointFactValue}>
                          {selected.wpsCode ?? t("none")}
                        </span>
                      </div>
                      <div className={styles.jointFactItem}>
                        <span className={styles.jointFactLabel}>{t("welders")}</span>
                        <span className={styles.jointFactValue}>
                          {selected.welders && selected.welders.length > 0
                            ? selected.welders.join(", ")
                            : t("none")}
                        </span>
                      </div>
                      <div className={styles.jointFactItem}>
                        <span className={styles.jointFactLabel}>{t("lockStatus")}</span>
                        <span className={styles.jointFactValue}>
                          {selected.isLocked ? t("locked") : t("open")}
                        </span>
                      </div>
                      <div className={styles.jointFactItem}>
                        <span className={styles.jointFactLabel}>{t("ndeObligation")}</span>
                        <span className={styles.jointFactValue}>
                          {selected.obligationPending > 0
                            ? t("openCount", { count: selected.obligationPending })
                            : t("none")}
                        </span>
                      </div>
                      <div className={styles.jointFactItem}>
                        <span className={styles.jointFactLabel}>PWHT</span>
                        <span className={styles.jointFactValue}>
                          {selected.pwhtRequired
                            ? selected.pwhtAccepted
                              ? t("accepted")
                              : t("requiredPending")
                            : t("notRequired")}
                        </span>
                      </div>
                    </div>

                    {selected.isLocked ? (
                      <p className="text-sm font-medium text-destructive">
                        {t("thisWeldJointIsLocked")}
                      </p>
                    ) : null}

                    <div className={embedded ? styles.weldFields : "grid gap-3 sm:grid-cols-2"}>
                      {choices.isFixedByArea ? (
                        <div className="text-sm font-medium">
                          {t("subcontractor")}
                          <p className="mt-1 w-full rounded border bg-muted px-2 py-1 font-normal">
                            {fixedSubcontractor
                              ? `${fixedSubcontractor.code} — ${fixedSubcontractor.name}`
                              : "—"}
                          </p>
                          <span className="text-xs font-normal text-muted-foreground">
                            {t("subcontractorFromArea")}
                          </span>
                        </div>
                      ) : (
                        <label className="text-sm font-medium">
                          {t("subcontractor")}
                          <select
                            ref={subcontractorRef}
                            className="mt-1 w-full rounded border px-2 py-1"
                            value={subcontractorId}
                            disabled={pendingAction !== null || selected.isLocked}
                            onChange={(event) => {
                              setSubcontractorId(event.target.value)
                              setProcedureId("")
                              setRootWelderId("")
                              setCapWelderId("")
                            }}
                          >
                            <option value="">{t("select")}</option>
                            {referentials.subcontractors.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.code} — {item.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <label className="text-sm font-medium">
                        WPS
                        <select
                          ref={procedureRef}
                          className="mt-1 w-full rounded border px-2 py-1"
                          value={procedureId}
                          disabled={pendingAction !== null || selected.isLocked}
                          onChange={(event) => setProcedureId(event.target.value)}
                        >
                          <option value="">{t("select")}</option>
                          {choices.procedures.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.code}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium">
                        {t("rootWelder")}
                        <select
                          ref={rootWelderRef}
                          className="mt-1 w-full rounded border px-2 py-1"
                          value={rootWelderId}
                          disabled={pendingAction !== null || selected.isLocked}
                          onChange={(event) => setRootWelderId(event.target.value)}
                        >
                          <option value="">{t("select")}</option>
                          {choices.welders.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.welderCode}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium">
                        {t("capWelder")}
                        <select
                          ref={capWelderRef}
                          className="mt-1 w-full rounded border px-2 py-1"
                          value={capWelderId}
                          disabled={pendingAction !== null || selected.isLocked}
                          onChange={(event) => setCapWelderId(event.target.value)}
                        >
                          <option value="">{t("select")}</option>
                          {choices.welders.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.welderCode}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium">
                        {t("rootPercent")}
                        <Input
                          ref={rootPercentRef}
                          type="number"
                          min={0}
                          max={100}
                          value={rootPercent}
                          disabled={pendingAction !== null || selected.isLocked}
                          onChange={(event) => setRootPercent(Number(event.target.value))}
                          className="mt-1"
                        />
                      </label>
                      <label className="text-sm font-medium">
                        {t("weldDate")}
                        <Input
                          ref={weldOnRef}
                          type="date"
                          value={weldOn}
                          disabled={pendingAction !== null || selected.isLocked}
                          onChange={(event) => setWeldOn(event.target.value)}
                          className="mt-1"
                        />
                      </label>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {t("rootCapHint", { cap: 100 - rootPercent })}
                    </p>
                    {gate.reason && !selected.isLocked ? (
                      <p className="text-sm text-destructive">{gate.reason ? reasonText(gate.reason) : null}</p>
                    ) : null}
                    <div className={embedded ? styles.recordActions : undefined}>
                      <Button
                        type="button"
                        onClick={() => void save()}
                        disabled={
                          !gate.allowed ||
                          pendingAction !== null ||
                          loadState !== "ready" ||
                          selected.isLocked
                        }
                        loading={pendingAction === "record-weld"}
                      >
                        {t("recordWeldProgress")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </ChangeHighlight>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
