"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DataTable, useTableUrlState } from "@/components/ui/data-table"
import { ChangeHighlight, IdentityHeadline } from "@/components/ui/record-target"
import { WELD_COLUMNS } from "../weld-columns"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { describeWeldProgressGate, toWeldProgressPayload } from "../../application/record-weld-progress"
import type { PointAssignment, WeldPointType } from "../../domain/weld-progress"
import {
  loadWeldFormReferentials,
  loadWeldSummaries,
  recordWeldProgress,
  type SpoolStatus,
  type WeldFormReferentials,
  type WeldSummary,
} from "../../infrastructure/supabase-construction-repository"
import { SpoolPicker } from "./spool-picker"

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY_REFERENTIALS: WeldFormReferentials = {
  subcontractors: [],
  procedures: [],
  welders: [],
  reworkCodes: [],
}

export function WeldProgressScreen({ projectId }: { projectId: string }) {
  const [spool, setSpool] = useState<SpoolStatus | null>(null)
  const [welds, setWelds] = useState<WeldSummary[]>([])
  const [selected, setSelected] = useState<WeldSummary | null>(null)
  const [referentials, setReferentials] = useState<WeldFormReferentials>(EMPTY_REFERENTIALS)
  const [subcontractorId, setSubcontractorId] = useState("")
  const [procedureId, setProcedureId] = useState("")
  const [weldOn, setWeldOn] = useState(today())
  const [rootWelderId, setRootWelderId] = useState("")
  const [capWelderId, setCapWelderId] = useState("")
  const [rootPercent, setRootPercent] = useState(50)
  const [refreshToken, setRefreshToken] = useState(0)
  // Browsing for another spool has to take the joint list and the record form with it:
  // they belong to the spool being replaced, and leaving them on screen invites recording
  // against a spool the operator has already moved on from.
  const [browsingSpools, setBrowsingSpools] = useState(false)
  const [weldTable, setWeldTable] = useTableUrlState({ namespace: "weld" })

  useEffect(() => {
    void loadWeldFormReferentials(getSupabaseBrowserClient(), projectId)
      .then(setReferentials)
      .catch((error: unknown) =>
        toast.error(
          error instanceof Error ? error.message : "Welding referentials could not be loaded.",
        ),
      )
  }, [projectId])

  const reloadWelds = useCallback(async () => {
    if (!spool) return
    setWelds(await loadWeldSummaries(getSupabaseBrowserClient(), spool.spoolRevisionId))
  }, [spool])

  useEffect(() => {
    if (!spool) return
    void reloadWelds().catch((error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Weld joints could not be loaded."),
    )
  }, [spool, refreshToken, reloadWelds])

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
    if (!selected || !gate.allowed) return
    try {
      await recordWeldProgress(
        getSupabaseBrowserClient(),
        toWeldProgressPayload({
          weldJointRevisionId: selected.weldJointRevisionId,
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
      setRefreshToken((token) => token + 1)
      toast.success(`Weld ${selected.weldNumber} recorded.`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "The weld could not be recorded.")
    }
  }

  return (
    <div className="space-y-4">
      <SpoolPicker
            projectId={projectId}
            value={spool?.spoolRevisionId ?? null}
            onChange={(status) => {
              setSpool(status)
              setSelected(null)
            }}
            browsing={browsingSpools}
            onBrowsingChange={setBrowsingSpools}
            refreshToken={refreshToken}
          />

      {spool && !browsingSpools ? (
        <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Shop weld joints</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={WELD_COLUMNS}
              rows={welds}
              state={weldTable}
              onStateChange={setWeldTable}
              rowId={(weld) => weld.weldJointRevisionId}
              onRowClick={setSelected}
              selectedRowId={selected?.weldJointRevisionId ?? null}
              searchPlaceholder="Search joint or WPS…"
              emptyTitle="This spool revision has no shop joints."
            />
          </CardContent>
        </Card>

        {selected ? (
          <ChangeHighlight
            id={selected.weldJointRevisionId}
            announce={`Now recording shop weld ${selected.weldNumber}`}
          >
          <Card>
            <CardHeader>
              <IdentityHeadline
                kind="Recording shop weld"
                identity={selected.weldNumber}
                meta={[
                  selected.wpsCode ? `WPS ${selected.wpsCode}` : null,
                  selected.diameterInch ? `${selected.diameterInch}"` : null,
                  selected.thicknessMm ? `${selected.thicknessMm} mm` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  Subcontractor
                  <select
                    className="mt-1 w-full rounded border px-2 py-1"
                    value={subcontractorId}
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
                <label className="text-sm">
                  WPS
                  <select
                    className="mt-1 w-full rounded border px-2 py-1"
                    value={procedureId}
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
                <label className="text-sm">
                  Root welder
                  <select
                    className="mt-1 w-full rounded border px-2 py-1"
                    value={rootWelderId}
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
                <label className="text-sm">
                  Cap welder
                  <select
                    className="mt-1 w-full rounded border px-2 py-1"
                    value={capWelderId}
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
                <label className="text-sm">
                  Root percent
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={rootPercent}
                    onChange={(event) => setRootPercent(Number(event.target.value))}
                  />
                </label>
                <label className="text-sm">
                  Weld date
                  <Input
                    type="date"
                    value={weldOn}
                    onChange={(event) => setWeldOn(event.target.value)}
                  />
                </label>
              </div>

              <p className="text-xs text-muted-foreground">
                Root and Cap always total 100 percent; the cap takes {100 - rootPercent}.
              </p>
              {gate.reason ? <p className="text-sm text-destructive">{gate.reason}</p> : null}
              <Button type="button" onClick={() => void save()} disabled={!gate.allowed}>
                Record weld progress
              </Button>
            </CardContent>
          </Card>
          </ChangeHighlight>
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
