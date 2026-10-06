"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { RotateCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DataTable, useTableUrlState } from "@/components/ui/data-table"
import { ChangeHighlight, IdentityHeadline } from "@/components/ui/record-target"
import { useMarkInputsRecorded, useRequestLeave } from "@/components/pipeqc/unsaved-input-guard"
import { WELD_COLUMNS } from "../weld-columns"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { describeWeldProgressGate, toWeldProgressPayload } from "../../application/record-weld-progress"
import type { PointAssignment, WeldPointType } from "../../domain/weld-progress"
import {
  loadSpoolStatus,
  loadWeldFormReferentials,
  loadWeldSummaries,
  recordWeldProgress,
  type WeldFormReferentials,
  type WeldSummary,
} from "../../infrastructure/supabase-construction-repository"
import { SpoolPicker } from "./spool-picker"
import { useContextSpool, type EmbeddedSpool } from "./use-context-spool"
import styles from "../spool-workbench.module.css"

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
  const [subcontractorId, setSubcontractorId] = useState("")
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
      const key = `${spoolRevisionId}:${refreshToken}`
      const client = getSupabaseBrowserClient()
      const [newStatus, nextWelds] = await Promise.all([
        loadSpoolStatus(client, spoolRevisionId),
        loadWeldSummaries(client, spoolRevisionId),
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
    void loadWeldSummaries(getSupabaseBrowserClient(), spoolRevisionId)
      .then((loadedWelds) => {
        if (cancelled) return
        setWelds(loadedWelds)
        setLoadedKey(key)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setFailedKey(key)
        toast.error(error instanceof Error ? error.message : "Weld joints could not be loaded.")
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
      : { allowed: false, reason: "Select a joint, a subcontractor and a WPS." }

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
        toast.error("Recorded; status could not be refreshed. Retry refresh.")
      }
      toast.success(`Weld ${selected.weldNumber} recorded.`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "The weld could not be recorded.")
    } finally {
      pendingRef.current = false
      setPendingAction(null)
    }
  }

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
                <CardTitle>Shop weld joints</CardTitle>
                {loadState === "loading" ? (
                  <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900">
                    Loading joints…
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
                  }}
                  selectedRowId={selected?.weldJointRevisionId ?? null}
                  searchPlaceholder="Search joint or WPS…"
                  emptyTitle="This spool revision has no shop joints."
                  containerClassName={embedded ? "max-h-72" : undefined}
                />
              </CardContent>
            </Card>
          )}

          {selected ? (
            <div hidden={Boolean(embedded) && browsingJoints}>
              <ChangeHighlight
                id={selected.weldJointRevisionId}
                announce={`Now recording shop weld ${selected.weldNumber}`}
              >
                <Card>
                  <CardHeader>
                    <IdentityHeadline
                      kind="Recording shop weld"
                      identity={selected.weldNumber}
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
                        <span className={styles.jointFactLabel}>Weld number</span>
                        <span className={styles.jointFactValue}>{selected.weldNumber}</span>
                      </div>
                      <div className={styles.jointFactItem}>
                        <span className={styles.jointFactLabel}>Weld date</span>
                        <span className={styles.jointFactValue}>
                          {selected.weldOn ? selected.weldOn : "Not recorded"}
                        </span>
                      </div>
                      <div className={styles.jointFactItem}>
                        <span className={styles.jointFactLabel}>WPS</span>
                        <span className={styles.jointFactValue}>
                          {selected.wpsCode ?? "None"}
                        </span>
                      </div>
                      <div className={styles.jointFactItem}>
                        <span className={styles.jointFactLabel}>Welders</span>
                        <span className={styles.jointFactValue}>
                          {selected.welders && selected.welders.length > 0
                            ? selected.welders.join(", ")
                            : "None"}
                        </span>
                      </div>
                      <div className={styles.jointFactItem}>
                        <span className={styles.jointFactLabel}>Lock status</span>
                        <span className={styles.jointFactValue}>
                          {selected.isLocked ? "Locked" : "Open"}
                        </span>
                      </div>
                      <div className={styles.jointFactItem}>
                        <span className={styles.jointFactLabel}>NDE obligation</span>
                        <span className={styles.jointFactValue}>
                          {selected.obligationPending > 0
                            ? `${selected.obligationPending} open`
                            : "None"}
                        </span>
                      </div>
                      <div className={styles.jointFactItem}>
                        <span className={styles.jointFactLabel}>PWHT</span>
                        <span className={styles.jointFactValue}>
                          {selected.pwhtRequired
                            ? selected.pwhtAccepted
                              ? "Accepted"
                              : "Required, pending"
                            : "Not required"}
                        </span>
                      </div>
                    </div>

                    {selected.isLocked ? (
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
                          disabled={pendingAction !== null || selected.isLocked}
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
                          disabled={pendingAction !== null || selected.isLocked}
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
                          disabled={pendingAction !== null || selected.isLocked}
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
                          disabled={pendingAction !== null || selected.isLocked}
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
                          disabled={pendingAction !== null || selected.isLocked}
                          onChange={(event) => setRootPercent(Number(event.target.value))}
                          className="mt-1"
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Weld date
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
                      Root and Cap always total 100 percent; the cap takes {100 - rootPercent}.
                    </p>
                    {gate.reason && !selected.isLocked ? (
                      <p className="text-sm text-destructive">{gate.reason}</p>
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
                        Record weld progress
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </ChangeHighlight>
            </div>
          ) : (
            <Card>
              <CardContent className="text-muted-foreground py-6 text-sm">
                Select a weld joint above to record its progress.
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  )
}
